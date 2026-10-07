import path from 'node:path'
import { existsSync } from 'node:fs'
import { cp, mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { prisma } from './prisma.js'
import {
  hasFiles,
  isSlug,
  LEGACY_TEMPLATES_DIR,
  registerTemplateSlug,
  slugDir,
  snapshotLive,
  syncTemplateMedia,
  TEMPLATES_DIR,
  THUMBS_FOLDER,
  THUMBS_META,
  type TemplateManifest,
} from './templateFiles.js'
import { UPLOAD_DIR } from '../routes/uploads.js'

/**
 * 디자인 템플릿 공용 도우미.
 * 사이트에 적용되는 헤더·푸터·화면별 레이아웃은 전부 '활성 템플릿' 한 벌에서 나온다.
 * (/api/design 과 /api/site-pages/layouts 도 활성 템플릿을 읽고 쓴다)
 */

type TemplateRow = {
  id: number
  slug?: string | null
  name: string
  description: string
  author: string
  version: string
  builtin: boolean
  active: boolean
  header: string
  footer: string
  pageLayouts: string
  license?: string
  coreVersion?: string
  requires?: string
  changelog?: string
  createdAt: Date
  updatedAt: Date
}

/** JSON 배열 문자열을 배열로 — 깨져 있으면 빈 배열로 본다. */
function parseJsonArray<T>(raw: string | undefined): T[] {
  try {
    const v = JSON.parse(raw ?? '[]')
    return Array.isArray(v) ? (v as T[]) : []
  } catch {
    return []
  }
}

export function parseLayouts(raw: string): Record<string, string> {
  try {
    const map = JSON.parse(raw)
    return map && typeof map === 'object' && !Array.isArray(map) ? (map as Record<string, string>) : {}
  } catch {
    return {}
  }
}

export function toTemplateResponse(row: TemplateRow) {
  return {
    id: row.id,
    slug: row.slug ?? '',
    name: row.name,
    description: row.description,
    author: row.author,
    version: row.version,
    builtin: row.builtin,
    active: row.active,
    header: row.header,
    footer: row.footer,
    pageLayouts: parseLayouts(row.pageLayouts),
    license: row.license ?? '',
    coreVersion: row.coreVersion ?? '',
    requires: parseJsonArray(row.requires),
    changelog: parseJsonArray(row.changelog),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

/**
 * 기본 제공 'Basic' 템플릿이 없으면 만든다.
 * 처음 상태는 이 프로젝트가 배포될 때의 모습 그대로 —
 * 기본 헤더·푸터에, 약관·개인정보 화면만 좌측 메뉴 서브를 쓴다.
 *
 * Basic 은 지워지지 않는 기본값이다. 다른 템플릿을 켜면 비활성으로 남고,
 * 다시 켜면 마지막으로 쓰던 Basic 모습으로 돌아온다. 그래서 이름·헤더·푸터는 바꿀 수 없다.
 */
export async function ensureBuiltin(): Promise<TemplateRow> {
  const found = await prisma.siteTemplate.findFirst({ where: { builtin: true }, orderBy: { id: 'asc' } })
  const row =
    found ??
    (await prisma.siteTemplate.create({
      data: {
        name: 'Basic',
        slug: 'basic',
        description: '워드앤코드 관리자 기본 템플릿 샘플',
        author: 'wordncode',
        builtin: true,
        active: true,
        header: 'basic',
        footer: 'basic',
        pageLayouts: JSON.stringify({ '/terms': 'left', '/privacy': 'left' }),
      },
    }))

  // 기본 템플릿은 지금 사이트 소스를 그대로 담은 샘플이다. 파일이 없으면 만들어 둔다.
  // 단 다른 템플릿이 켜져 있으면 지금 사이트는 그 템플릿의 모습이라 담지 않는다 — Basic 이 남의 화면으로 덮인다.
  const otherActive = row.active ? null : await prisma.siteTemplate.findFirst({ where: { active: true } })
  await syncTemplateFolders()
  // 동기화가 이미 끝난 뒤 새로 만든 행일 수 있어 폴더 이름을 직접 알려 둔다.
  if (row.slug) registerTemplateSlug(row.id, row.slug)
  if (!hasFiles(row.id) && !otherActive) {
    await snapshotLive(row.id, {
      type: 'wnc-template',
      name: row.name,
      description: row.description,
      version: row.version,
      author: row.author,
      header: row.header,
      footer: row.footer,
      pageLayouts: parseLayouts(row.pageLayouts),
      slug: row.slug ?? 'basic',
    })
    await syncTemplateMedia(row.id)
  }
  return row
}

/* ------------------------------------------------------------------
 * 템플릿 폴더 ↔ DB 맞추기
 * ------------------------------------------------------------------ */

/** 이름으로 폴더 이름을 만든다 — 영문·숫자만 남긴다. 한글 이름처럼 남는 게 없으면 빈 문자열. */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
}

/** 겹치지 않는 폴더 이름 — 이미 있으면 -2, -3 … 을 붙인다. DB 와 폴더 둘 다 본다. */
export async function uniqueSlug(base: string, fallback: string): Promise<string> {
  const root = isSlug(base) ? base : fallback
  for (let n = 1; ; n++) {
    const candidate = n === 1 ? root : `${root}-${n}`
    const taken = await prisma.siteTemplate.findUnique({ where: { slug: candidate } })
    if (!taken && !existsSync(slugDir(candidate))) return candidate
  }
}

let syncing: Promise<void> | null = null

/**
 * 템플릿 폴더와 DB 를 맞춘다. 서버가 뜰 때와 목록을 읽을 때 부른다(한 번만 돈다).
 *
 * 1) 폴더 이름이 없는 템플릿(예전 방식)에 이름을 붙이고, 예전 보관함(uploads/templates/<id>)과
 *    예전 미리보기(uploads/template-thumbs)를 templates/<slug>/ 로 옮긴다.
 * 2) templates/ 에 있는데 DB 에 없는 폴더(git 으로 받은 템플릿)는 꺼진 템플릿으로 등록한다.
 * 3) 파일 함수가 id 로 폴더를 찾을 수 있게 id → 폴더 이름을 알려 준다.
 */
export function syncTemplateFolders(): Promise<void> {
  syncing ??= doSync().catch((e) => {
    syncing = null
    throw e
  })
  return syncing
}

async function doSync() {
  await mkdir(TEMPLATES_DIR, { recursive: true })
  const rows = await prisma.siteTemplate.findMany({ orderBy: { id: 'asc' } })

  for (const row of rows) {
    let slug = row.slug
    if (!slug) {
      // 기본 제공은 basic, 그 밖에는 이름 → 헤더 키 → template-<id> 순으로 고른다. (인테리어 → interior)
      const fromName = slugify(row.name)
      const fromHeader = row.header !== 'basic' ? slugify(row.header) : ''
      slug = await uniqueSlug(row.builtin ? 'basic' : fromName || fromHeader, `template-${row.id}`)
      await prisma.siteTemplate.update({ where: { id: row.id }, data: { slug } })
    }
    registerTemplateSlug(row.id, slug)

    const dir = slugDir(slug)
    const legacy = path.join(LEGACY_TEMPLATES_DIR, String(row.id))
    if (existsSync(legacy)) {
      if (!existsSync(path.join(dir, 'template.json'))) {
        await mkdir(path.dirname(dir), { recursive: true })
        await cp(legacy, dir, { recursive: true })
        // 매니페스트에 폴더 이름을 적고, 화면이 쓰는 이미지·영상을 함께 담는다.
        await stampSlug(dir, slug)
        await syncTemplateMedia(row.id)
      }
      await rm(legacy, { recursive: true, force: true })
    }
    // 예전 미리보기 — uploads/template-thumbs/<id>-main.jpg …
    const oldThumbs = path.join(UPLOAD_DIR, 'template-thumbs')
    const oldMain = path.join(oldThumbs, `${row.id}-main.jpg`)
    if (existsSync(oldMain)) {
      const to = path.join(dir, THUMBS_FOLDER)
      await mkdir(to, { recursive: true })
      for (const [from, name] of [
        [`${row.id}-main.jpg`, 'main.jpg'],
        [`${row.id}-sub.jpg`, 'sub.jpg'],
        [`${row.id}.json`, THUMBS_META],
      ]) {
        if (existsSync(path.join(oldThumbs, from))) await rename(path.join(oldThumbs, from), path.join(to, name))
      }
    }
  }

  // git 으로 받은 템플릿 — 폴더는 있는데 DB 에 없으면 꺼진 템플릿으로 등록한다.
  const known = new Set(
    (await prisma.siteTemplate.findMany({ select: { slug: true } })).map((r) => r.slug).filter(Boolean) as string[],
  )
  for (const entry of await readdir(TEMPLATES_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory() || !isSlug(entry.name) || known.has(entry.name)) continue
    const manifestFile = path.join(TEMPLATES_DIR, entry.name, 'template.json')
    if (!existsSync(manifestFile)) continue
    let manifest: TemplateManifest
    try {
      manifest = JSON.parse(await readFile(manifestFile, 'utf8')) as TemplateManifest
    } catch {
      console.warn(`[templates] ${entry.name}/template.json 을 읽지 못해 등록하지 않았습니다.`)
      continue
    }
    if (manifest.type !== 'wnc-template' || !manifest.name?.trim()) continue
    const hasBuiltin = await prisma.siteTemplate.findFirst({ where: { builtin: true } })
    const created = await prisma.siteTemplate.create({
      data: {
        slug: entry.name,
        name: manifest.name.trim(),
        description: manifest.description?.trim() ?? '',
        author: manifest.author ?? '',
        version: manifest.version?.trim() || '1.0.0',
        // 저장소의 basic 폴더는 기본 제공 Basic 이다 — 새 PC 에서도 같은 자리를 차지한다.
        builtin: entry.name === 'basic' && !hasBuiltin,
        header: manifest.header ?? 'basic',
        footer: manifest.footer ?? 'basic',
        pageLayouts: JSON.stringify(manifest.pageLayouts ?? {}),
        license: manifest.license ?? '',
        coreVersion: manifest.coreVersion ?? '',
        requires: JSON.stringify(manifest.requires ?? []),
        changelog: JSON.stringify(manifest.changelog ?? []),
      },
    })
    registerTemplateSlug(created.id, entry.name)
  }

  // 기본 제공 표시는 basic 폴더의 템플릿에만 붙는다.
  // 예전에 Basic 행이 다른 디자인(인테리어)으로 덮이면서 표시가 그쪽에 남고, 진짜 Basic 은
  // 일반 템플릿으로 다시 등록된 일이 있었다 — 그러면 인테리어는 지울 수 없고 Basic 은 지울 수 있게 된다.
  const basic = await prisma.siteTemplate.findUnique({ where: { slug: 'basic' } })
  if (basic) {
    await prisma.siteTemplate.updateMany({ where: { builtin: true, NOT: { id: basic.id } }, data: { builtin: false } })
    if (!basic.builtin) await prisma.siteTemplate.update({ where: { id: basic.id }, data: { builtin: true } })
  }
}

/** 매니페스트에 폴더 이름을 적는다. */
async function stampSlug(dir: string, slug: string) {
  const file = path.join(dir, 'template.json')
  if (!existsSync(file)) return
  try {
    const manifest = JSON.parse(await readFile(file, 'utf8')) as TemplateManifest
    if (manifest.slug === slug) return
    await writeFile(file, JSON.stringify({ ...manifest, slug }, null, 2), 'utf8')
  } catch {
    // 매니페스트가 깨져 있으면 그대로 둔다 — 목록·정보 창에서 드러난다.
  }
}

/** 활성 템플릿을 돌려준다. 없으면 기본 템플릿을 만들어 켠다. */
export async function loadActiveTemplate(): Promise<TemplateRow> {
  const active = await prisma.siteTemplate.findFirst({ where: { active: true }, orderBy: { id: 'asc' } })
  if (active) return active
  const builtin = await ensureBuiltin()
  if (builtin.active) return builtin
  return prisma.siteTemplate.update({ where: { id: builtin.id }, data: { active: true } })
}
