import path from 'node:path'
import { existsSync, mkdirSync } from 'node:fs'
import { copyFile, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import AdmZip from 'adm-zip'

/**
 * 템플릿 파일 묶음.
 *
 * 템플릿 하나는 저장소 맨 위 templates/<slug>/ 폴더 하나다. 화면 코드뿐 아니라
 * 그 화면이 쓰는 이미지·영상·아이콘과 메뉴·페이지·컴포넌트 설정까지 한 폴더에 담는다.
 * git 에 함께 올라가므로 다른 PC 에서도 같은 템플릿을 쓰고, 내보낼 때는 이 폴더를 zip 으로 묶는다.
 *
 *   template.json      이름·버전·헤더·푸터·화면별 레이아웃
 *   data.json          데모 데이터 — 메뉴 트리·페이지 샘플 (없어도 된다)
 *   components.json    컴포넌트 설정 — 헤더·푸터 옵션, 메인·서브 비주얼 등 디자인 값 (없어도 된다)
 *   pages/*.tsx        홈페이지 화면 (apps/web/src/pages/site)
 *   layouts/*          레이아웃과 등록부 (apps/web/src/layouts)
 *   components/*.tsx   화면·레이아웃이 가져다 쓰는 부품 (apps/web/src/components)
 *   public/**          화면·설정이 쓰는 정적 파일 — 사이트 public 과 같은 경로 (public/images/interior/hero-main.png)
 *   uploads/**         관리자가 올린 파일 중 화면·설정이 쓰는 것 — uploads 와 같은 경로
 *   thumbs/            미리보기 — 메인·서브페이지를 찍은 그림
 */

/** 실제 사이트 소스 — 서버는 apps/api 에서 도므로 형제 폴더를 가리킨다. */
const WEB_SRC = path.resolve(process.cwd(), '../web/src')
const LIVE = {
  pages: path.join(WEB_SRC, 'pages/site'),
  layouts: path.join(WEB_SRC, 'layouts'),
  components: path.join(WEB_SRC, 'components'),
}

/** 템플릿 보관함 — 저장소 맨 위 templates/ (git 에 함께 올라간다). 서버는 apps/api 에서 돈다. */
export const TEMPLATES_DIR = path.resolve(process.cwd(), '../../templates')
/** 예전 보관함 — uploads/templates/<id>. 서버가 뜰 때 새 보관함으로 옮긴다. */
export const LEGACY_TEMPLATES_DIR = path.resolve(process.cwd(), 'uploads/templates')
/** 사이트의 정적 파일과 업로드 파일 — 템플릿의 public/·uploads/ 가 이 두 곳과 짝을 이룬다. */
const WEB_PUBLIC = path.resolve(process.cwd(), '../web/public')
const UPLOADS = path.resolve(process.cwd(), 'uploads')
const MEDIA = { public: WEB_PUBLIC, uploads: UPLOADS } as const
type MediaRoot = keyof typeof MEDIA
const MEDIA_ROOTS = Object.keys(MEDIA) as MediaRoot[]
/** 미리보기 폴더와 그 설명 파일 — templateThumbs 가 쓴다. */
export const THUMBS_FOLDER = 'thumbs'
export const THUMBS_META = 'thumbs.json'
/** 템플릿에 담는 파일 — 그림·영상·소리·글꼴·문서 */
const MEDIA_EXT = /\.(png|jpe?g|gif|webp|avif|svg|ico|bmp|mp4|webm|mov|m4v|ogv|mp3|wav|ogg|m4a|woff2?|ttf|otf|eot|pdf)$/i
/** 템플릿을 적용하기 전 원본을 남겨 두는 곳 */
const APPLY_BACKUP_DIR = path.resolve(process.cwd(), 'uploads/template-apply-backups')

/** 묶음 안의 폴더 이름 → 실제 사이트 폴더 */
const FOLDERS = ['pages', 'layouts', 'components'] as const
type Folder = (typeof FOLDERS)[number]

export interface TemplateManifest {
  type: 'wnc-template'
  name: string
  description?: string
  version?: string
  author?: string
  header?: string
  footer?: string
  pageLayouts?: Record<string, string>
  /** 아래는 사람이 적어 두는 값 — 비어 있으면 매니페스트에 담지 않는다. */
  license?: string
  coreVersion?: string
  requires?: string[]
  changelog?: { version: string; date: string; notes: string }[]
  /** 폴더 이름 — 가져올 때 이 이름을 먼저 써 본다. */
  slug?: string
}

/**
 * 템플릿 id → 폴더 이름. DB 에서 읽어 채운다(templates.ts 의 syncTemplateFolders).
 * 파일 함수들은 id 만 받고, 어느 폴더인지는 여기서 찾는다.
 */
const slugs = new Map<number, string>()

export function registerTemplateSlug(id: number, slug: string) {
  slugs.set(id, slug)
}

/** 폴더 이름으로 쓸 수 있는지 — 영문 소문자·숫자·하이픈 */
export function isSlug(value: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 60
}

export function slugDir(slug: string): string {
  if (!isSlug(slug)) throw new Error(`잘못된 템플릿 폴더 이름입니다: ${slug}`)
  return path.join(TEMPLATES_DIR, slug)
}

export function templateDir(id: number): string {
  const slug = slugs.get(id)
  if (!slug) throw new Error(`${id}번 템플릿의 폴더를 찾지 못했습니다. 서버를 다시 시작해 주세요.`)
  return slugDir(slug)
}

/** 이 템플릿의 파일이 보관되어 있는지 */
export function hasFiles(id: number): boolean {
  return existsSync(path.join(templateDir(id), 'template.json'))
}

const DATA_FILE = 'data.json'

/** 이 템플릿에 데모 데이터(메뉴·페이지)가 담겨 있는지 */
export function hasData(id: number): boolean {
  return existsSync(path.join(templateDir(id), DATA_FILE))
}

/** 담긴 데모 데이터 — 검증은 부르는 쪽(templateData)이 한다. 없거나 깨져 있으면 null. */
export async function readTemplateData(id: number): Promise<unknown | null> {
  const file = path.join(templateDir(id), DATA_FILE)
  if (!existsSync(file)) return null
  try {
    return JSON.parse(await readFile(file, 'utf8'))
  } catch {
    return null
  }
}

export async function writeTemplateData(id: number, data: unknown): Promise<void> {
  const dir = templateDir(id)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  await writeFile(path.join(dir, DATA_FILE), JSON.stringify(data, null, 2), 'utf8')
}

const COMPONENTS_FILE = 'components.json'

/**
 * 이 템플릿의 컴포넌트 설정 — 검증은 부르는 쪽이 한다. 없거나 깨져 있으면 null.
 * 메인 비주얼 사진처럼 화면 파일이 아니라 설정값으로 정해지는 디자인도 템플릿마다 따로 가진다.
 */
export async function readTemplateComponents(id: number): Promise<unknown | null> {
  const file = path.join(templateDir(id), COMPONENTS_FILE)
  if (!existsSync(file)) return null
  try {
    return JSON.parse(await readFile(file, 'utf8'))
  } catch {
    return null
  }
}

export async function writeTemplateComponents(id: number, settings: unknown): Promise<void> {
  const dir = templateDir(id)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  await writeFile(path.join(dir, COMPONENTS_FILE), JSON.stringify(settings, null, 2), 'utf8')
}

/** 다룰 수 있는 파일인지 — 소스와 스타일만 담는다. */
function isSourceName(name: string): boolean {
  return /\.(tsx|ts|css)$/.test(name) && !name.startsWith('.')
}

async function listSources(dir: string): Promise<string[]> {
  if (!existsSync(dir)) return []
  return (await readdir(dir)).filter(isSourceName).sort()
}

/**
 * 파일들이 가져다 쓰는 부품 이름을 모은다.
 * 부품이 또 다른 부품을 쓰는 경우까지 따라가 빠짐없이 담는다.
 */
async function collectComponents(seeds: string[]): Promise<Set<string>> {
  const found = new Set<string>()
  const queue: string[] = []

  const scan = (text: string) => {
    for (const m of text.matchAll(/from\s+'(?:\.\.\/)*(?:\.\/)?components\/([A-Za-z0-9_]+)'/g)) {
      if (!found.has(m[1])) {
        found.add(m[1])
        queue.push(m[1])
      }
    }
  }

  for (const file of seeds) scan(await readFile(file, 'utf8'))
  while (queue.length > 0) {
    const name = queue.shift() as string
    const file = path.join(LIVE.components, `${name}.tsx`)
    if (existsSync(file)) scan(await readFile(file, 'utf8'))
  }
  return found
}

/**
 * 지금 사이트 소스를 템플릿 파일로 담는다.
 * 기본 제공 템플릿을 처음 만들 때와, 사이트를 고친 내용을 템플릿에 담을 때 쓴다.
 */
export async function snapshotLive(id: number, manifest: TemplateManifest): Promise<number> {
  const dir = templateDir(id)
  // 코드 폴더만 새로 담는다 — 데이터·설정·미리보기는 따로 갱신되고, 이미지·영상은 syncTemplateMedia 가 맞춘다.
  for (const folder of FOLDERS) {
    await rm(path.join(dir, folder), { recursive: true, force: true })
    await mkdir(path.join(dir, folder), { recursive: true })
  }

  const pageNames = await listSources(LIVE.pages)
  const layoutNames = await listSources(LIVE.layouts)

  for (const name of pageNames) await copyFile(path.join(LIVE.pages, name), path.join(dir, 'pages', name))
  for (const name of layoutNames) await copyFile(path.join(LIVE.layouts, name), path.join(dir, 'layouts', name))

  // 화면·레이아웃이 쓰는 부품만 담는다 — 관리자 전용 부품은 들어가지 않는다.
  const seeds = [
    ...pageNames.map((n) => path.join(LIVE.pages, n)),
    ...layoutNames.map((n) => path.join(LIVE.layouts, n)),
  ]
  const components = await collectComponents(seeds)
  let count = pageNames.length + layoutNames.length
  for (const name of components) {
    const src = path.join(LIVE.components, `${name}.tsx`)
    if (!existsSync(src)) continue
    await copyFile(src, path.join(dir, 'components', `${name}.tsx`))
    count += 1
  }

  await writeFile(path.join(dir, 'template.json'), JSON.stringify(manifest, null, 2), 'utf8')
  return count
}

/* ------------------------------------------------------------------
 * 이미지·영상 — 화면 코드와 설정에 적힌 경로를 찾아 실제 파일을 함께 담는다
 * ------------------------------------------------------------------ */

/**
 * 글에서 사이트 파일 경로를 찾는다. '/images/main/a.jpg' → 'public/images/main/a.jpg',
 * '/uploads/2026/b.png' → 'uploads/2026/b.png'. 조립식 경로(`${name}.jpg`)는 알 수 없어 건너뛴다.
 */
export function findMediaRefs(text: string): Set<string> {
  const found = new Set<string>()
  for (const m of text.matchAll(/(?<![\w.:/])\/((?:uploads|images|videos|video|media|icons|fonts|files|assets)\/[^'"`\s)?#<>\\]+)/g)) {
    const ref = m[1]
    if (ref.includes('${') || ref.split('/').some((p) => p === '..' || p === '') || !MEDIA_EXT.test(ref)) continue
    found.add(ref.startsWith('uploads/') ? ref : `public/${ref}`)
  }
  return found
}

/** 폴더 안의 파일을 하위 폴더까지 모은다 — 'a/b/c.png' 처럼 상대 경로로 */
async function walk(dir: string, prefix = ''): Promise<string[]> {
  if (!existsSync(dir)) return []
  const out: string[] = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isDirectory()) out.push(...(await walk(path.join(dir, entry.name), rel)))
    else out.push(rel)
  }
  return out
}

/** 'public/images/a.png' → 사이트의 실제 파일 위치 */
function liveMediaPath(ref: string): string {
  const [root, ...rest] = ref.split('/')
  return path.join(MEDIA[root as MediaRoot], ...rest)
}

/**
 * 템플릿이 쓰는 이미지·영상을 지금 사이트에서 찾아 템플릿 폴더에 담는다.
 * 화면 코드(pages·layouts·components)와 메뉴·페이지(data.json)·컴포넌트 설정(components.json)을 훑는다.
 * 담은 파일 수와, 경로는 적혀 있는데 사이트에 없어 못 담은 경로를 돌려준다.
 */
export async function syncTemplateMedia(id: number): Promise<{ media: number; missing: string[] }> {
  const dir = templateDir(id)
  const texts: string[] = []
  for (const folder of FOLDERS) {
    for (const name of await listSources(path.join(dir, folder))) texts.push(await readFile(path.join(dir, folder, name), 'utf8'))
  }
  for (const file of [DATA_FILE, COMPONENTS_FILE]) {
    if (existsSync(path.join(dir, file))) texts.push(await readFile(path.join(dir, file), 'utf8'))
  }
  const refs = new Set<string>()
  for (const text of texts) for (const ref of findMediaRefs(text)) refs.add(ref)

  for (const root of MEDIA_ROOTS) await rm(path.join(dir, root), { recursive: true, force: true })
  let media = 0
  const missing: string[] = []
  for (const ref of [...refs].sort()) {
    const from = liveMediaPath(ref)
    if (!existsSync(from)) {
      missing.push(`/${ref.replace(/^public\//, '')}`)
      continue
    }
    const to = path.join(dir, ...ref.split('/'))
    await mkdir(path.dirname(to), { recursive: true })
    await copyFile(from, to)
    media += 1
  }
  return { media, missing }
}

/** 담긴 이미지·영상 수 */
export async function countMedia(id: number): Promise<number> {
  let count = 0
  for (const root of MEDIA_ROOTS) count += (await walk(path.join(templateDir(id), root))).length
  return count
}

/**
 * 폴더의 public/·uploads/ 를 사이트에 덮어쓴다. 내용이 같은 파일은 건너뛰고,
 * 바뀌는 파일은 원래 것을 backupRoot 에 같은 구조로 남긴다. 바꾼 파일 수를 돌려준다.
 */
async function overlayMedia(fromDir: string, backupRoot: string): Promise<number> {
  let changed = 0
  for (const root of MEDIA_ROOTS) {
    for (const rel of await walk(path.join(fromDir, root))) {
      if (!MEDIA_EXT.test(rel)) continue
      const from = path.join(fromDir, root, ...rel.split('/'))
      const target = path.join(MEDIA[root], ...rel.split('/'))
      if (await sameFile(from, target)) continue
      if (existsSync(target)) {
        const keep = path.join(backupRoot, root, ...rel.split('/'))
        await mkdir(path.dirname(keep), { recursive: true })
        await copyFile(target, keep)
      }
      await mkdir(path.dirname(target), { recursive: true })
      await copyFile(from, target)
      changed += 1
    }
  }
  return changed
}

/** 두 파일이 같은지 — 같으면 덮어쓰지도, 백업하지도 않는다. */
async function sameFile(a: string, b: string): Promise<boolean> {
  if (!existsSync(a) || !existsSync(b)) return false
  const [sa, sb] = await Promise.all([stat(a), stat(b)])
  if (sa.size !== sb.size) return false
  const [ba, bb] = await Promise.all([readFile(a), readFile(b)])
  return ba.equals(bb)
}

/** 보관된 파일 수 — 목록에 '파일 n개'로 보여 준다. */
export async function countFiles(id: number): Promise<number> {
  const dir = templateDir(id)
  if (!existsSync(dir)) return 0
  let count = 0
  for (const folder of FOLDERS) count += (await listSources(path.join(dir, folder))).length
  return count
}

/** 보관된 파일 목록 — 폴더별 파일 이름 */
export async function listFiles(id: number): Promise<{ folder: Folder; files: string[] }[]> {
  const dir = templateDir(id)
  return Promise.all(FOLDERS.map(async (folder) => ({ folder, files: await listSources(path.join(dir, folder)) })))
}

export async function readManifest(id: number): Promise<TemplateManifest | null> {
  const file = path.join(templateDir(id), 'template.json')
  if (!existsSync(file)) return null
  try {
    return JSON.parse(await readFile(file, 'utf8')) as TemplateManifest
  } catch {
    return null
  }
}

/** 매니페스트만 새로 쓴다 — 이름·버전을 고치거나 활성 구성이 바뀌었을 때. */
export async function writeManifest(id: number, manifest: TemplateManifest): Promise<void> {
  const dir = templateDir(id)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  await writeFile(path.join(dir, 'template.json'), JSON.stringify(manifest, null, 2), 'utf8')
}

/** 보관된 파일을 zip 으로 묶는다 — 내보내기가 이 결과를 그대로 내려준다. */
export async function packZip(id: number): Promise<Buffer> {
  const dir = templateDir(id)
  const zip = new AdmZip()
  const manifest = path.join(dir, 'template.json')
  if (existsSync(manifest)) zip.addLocalFile(manifest)
  const dataFile = path.join(dir, DATA_FILE)
  if (existsSync(dataFile)) zip.addLocalFile(dataFile)
  const componentsFile = path.join(dir, COMPONENTS_FILE)
  if (existsSync(componentsFile)) zip.addLocalFile(componentsFile)
  for (const folder of FOLDERS) {
    for (const name of await listSources(path.join(dir, folder))) {
      zip.addLocalFile(path.join(dir, folder, name), folder)
    }
  }
  // 이미지·영상과 미리보기 — 폴더 구조 그대로 담는다.
  for (const root of [...MEDIA_ROOTS, THUMBS_FOLDER]) {
    for (const rel of await walk(path.join(dir, root))) {
      const zipPath = path.posix.join(root, path.posix.dirname(rel))
      zip.addLocalFile(path.join(dir, root, ...rel.split('/')), zipPath === root + '/.' ? root : zipPath)
    }
  }
  return zip.toBuffer()
}

/**
 * 올린 zip 을 풀어 템플릿 파일로 저장한다.
 * 묶음 밖으로 새는 경로(../ 등)와 다룰 수 없는 파일은 버린다.
 */
export async function unpackZip(buffer: Buffer, id: number): Promise<{ manifest: TemplateManifest; files: number; hasData: boolean }> {
  const zip = new AdmZip(buffer)
  const entries = zip.getEntries()

  const manifestEntry = entries.find((e) => !e.isDirectory && path.basename(e.entryName) === 'template.json')
  if (!manifestEntry) {
    throw new Error('template.json 이 없습니다. 내보내기로 받은 템플릿 zip 인지 확인해 주세요.')
  }
  let manifest: TemplateManifest
  try {
    manifest = JSON.parse(manifestEntry.getData().toString('utf8')) as TemplateManifest
  } catch {
    throw new Error('template.json 을 읽을 수 없습니다. 파일이 손상되지 않았는지 확인해 주세요.')
  }
  if (manifest?.type !== 'wnc-template' || !manifest.name?.trim()) {
    throw new Error('워드앤코드 템플릿 형식이 아닙니다. template.json 의 type 과 name 을 확인해 주세요.')
  }

  const dir = templateDir(id)
  await rm(dir, { recursive: true, force: true })
  for (const folder of FOLDERS) await mkdir(path.join(dir, folder), { recursive: true })

  let files = 0
  let hasDataFile = false
  for (const entry of entries) {
    if (entry.isDirectory) continue
    const parts = entry.entryName.split('/').filter((p) => p && p !== '.')
    // 이미지·영상·미리보기 — public/·uploads/·thumbs/ 아래를 폴더 구조 그대로 푼다(한 겹 감싸임까지 허용).
    const mediaAt = parts.findIndex((p) => (MEDIA_ROOTS as string[]).includes(p) || p === THUMBS_FOLDER)
    if (mediaAt >= 0 && mediaAt <= 1) {
      const rel = parts.slice(mediaAt)
      const file = rel[rel.length - 1]
      // 묶음 밖으로 새는 경로와 다룰 수 없는 파일은 버린다.
      if (rel.length < 2 || rel.some((p) => p === '..' || p.startsWith('.')) || !(MEDIA_EXT.test(file) || file === THUMBS_META)) continue
      const to = path.join(dir, ...rel)
      if (!to.startsWith(dir + path.sep)) continue
      await mkdir(path.dirname(to), { recursive: true })
      await writeFile(to, entry.getData())
      continue
    }
    // 압축을 풀면 폴더가 한 겹 더 있을 수 있어(templates/pages/..) 뒤에서부터 본다.
    const name = parts[parts.length - 1]
    const folder = parts[parts.length - 2] as Folder | undefined
    // 데모 데이터 — 매니페스트처럼 폴더 한 겹 감싸임도 허용한다(단 pages/ 같은 소스 폴더 안은 제외).
    // 깨진 JSON 과 지나친 크기는 조용히 버리지 않고 알린다.
    if (name === DATA_FILE && (!folder || !FOLDERS.includes(folder))) {
      const data = entry.getData()
      if (data.length > 10 * 1024 * 1024) {
        throw new Error('data.json 이 10MB 를 넘습니다. 메뉴·페이지 데이터만 담았는지 확인해 주세요.')
      }
      try {
        JSON.parse(data.toString('utf8'))
      } catch {
        throw new Error('data.json 을 읽을 수 없습니다. 파일이 손상되지 않았는지 확인해 주세요.')
      }
      await writeFile(path.join(dir, DATA_FILE), data)
      hasDataFile = true
      continue
    }
    // 컴포넌트 설정 — 데모 데이터와 같은 규칙으로 받는다. 규격 검증은 적용할 때 한다.
    if (name === COMPONENTS_FILE && (!folder || !FOLDERS.includes(folder))) {
      const raw = entry.getData()
      if (raw.length > 1024 * 1024) throw new Error('components.json 이 1MB 를 넘습니다. 컴포넌트 설정만 담았는지 확인해 주세요.')
      try {
        JSON.parse(raw.toString('utf8'))
      } catch {
        throw new Error('components.json 을 읽을 수 없습니다. 파일이 손상되지 않았는지 확인해 주세요.')
      }
      await writeFile(path.join(dir, COMPONENTS_FILE), raw)
      continue
    }
    if (!folder || !FOLDERS.includes(folder)) continue
    if (!isSourceName(name) || name.includes('..')) continue
    await writeFile(path.join(dir, folder, name), entry.getData())
    files += 1
  }

  await writeFile(path.join(dir, 'template.json'), JSON.stringify(manifest, null, 2), 'utf8')
  return { manifest, files, hasData: hasDataFile }
}

/**
 * 템플릿 파일을 실제 사이트에 덮어쓴다 — 이 템플릿을 켤 때 부른다.
 * 덮어쓰기 전 원본은 시각별 폴더에 남겨, 잘못되면 되돌릴 수 있다.
 */
export async function applyToLive(id: number): Promise<{ applied: number; media: number; backup: string }> {
  const dir = templateDir(id)
  if (!hasFiles(id)) throw new Error('이 템플릿에는 보관된 파일이 없습니다.')

  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupRoot = path.join(APPLY_BACKUP_DIR, stamp)
  let applied = 0

  for (const folder of FOLDERS) {
    const from = path.join(dir, folder)
    const to = LIVE[folder]
    const names = await listSources(from)
    if (names.length === 0) continue
    await mkdir(path.join(backupRoot, folder), { recursive: true })
    if (!existsSync(to)) await mkdir(to, { recursive: true })

    for (const name of names) {
      const target = path.join(to, name)
      // 지금 파일을 먼저 백업한다. (새로 생기는 파일은 백업할 것이 없다)
      if (existsSync(target)) await copyFile(target, path.join(backupRoot, folder, name))
      await copyFile(path.join(from, name), target)
      applied += 1
    }
  }
  // 템플릿이 담아 온 이미지·영상도 제자리(사이트 public·uploads)에 둔다.
  const media = await overlayMedia(dir, backupRoot)
  return { applied, media, backup: stamp }
}

/** 백업 폴더에 그 시점의 메뉴·페이지 데이터를 남긴다 — 되돌리기가 함께 되돌린다. */
export async function writeBackupData(stamp: string, data: unknown): Promise<void> {
  if (!isStamp(stamp)) throw new Error('잘못된 백업 이름입니다.')
  const dir = path.join(APPLY_BACKUP_DIR, stamp)
  await mkdir(dir, { recursive: true })
  await writeFile(path.join(dir, DATA_FILE), JSON.stringify(data, null, 2), 'utf8')
}

/** 백업에 그 시점의 컴포넌트 설정을 남긴다 — 되돌리기가 함께 되돌린다. */
export async function writeBackupComponents(stamp: string, settings: unknown): Promise<void> {
  if (!isStamp(stamp)) throw new Error('잘못된 백업 이름입니다.')
  const dir = path.join(APPLY_BACKUP_DIR, stamp)
  await mkdir(dir, { recursive: true })
  await writeFile(path.join(dir, COMPONENTS_FILE), JSON.stringify(settings, null, 2), 'utf8')
}

export async function readBackupComponents(stamp: string): Promise<unknown | null> {
  if (!isStamp(stamp)) throw new Error('잘못된 백업 이름입니다.')
  const file = path.join(APPLY_BACKUP_DIR, stamp, COMPONENTS_FILE)
  if (!existsSync(file)) return null
  try {
    return JSON.parse(await readFile(file, 'utf8'))
  } catch {
    return null
  }
}

/** 백업에 담긴 메뉴·페이지 데이터 — 없거나 깨져 있으면 null. */
export async function readBackupData(stamp: string): Promise<unknown | null> {
  if (!isStamp(stamp)) throw new Error('잘못된 백업 이름입니다.')
  const file = path.join(APPLY_BACKUP_DIR, stamp, DATA_FILE)
  if (!existsSync(file)) return null
  try {
    return JSON.parse(await readFile(file, 'utf8'))
  } catch {
    return null
  }
}

/** 적용 백업 이름인지 — 시각 형식만 다룬다. 바깥 경로로 새지 않게 한다. */
function isStamp(name: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T[\d-]+Z$/.test(name)
}

const BACKUP_META_FILE = 'meta.json'

/** 이 백업이 어느 템플릿을 쓰던 때의 모습인지 — 되돌릴 때 그 템플릿을 다시 켠다. */
export interface ApplyBackupMeta {
  templateId: number
  templateName: string
}

export async function writeBackupMeta(stamp: string, meta: ApplyBackupMeta): Promise<void> {
  if (!isStamp(stamp)) throw new Error('잘못된 백업 이름입니다.')
  const dir = path.join(APPLY_BACKUP_DIR, stamp)
  await mkdir(dir, { recursive: true })
  await writeFile(path.join(dir, BACKUP_META_FILE), JSON.stringify(meta, null, 2), 'utf8')
}

/** 백업의 템플릿 기록 — 예전 백업(기록 없음)이거나 깨져 있으면 null. */
export async function readBackupMeta(stamp: string): Promise<ApplyBackupMeta | null> {
  if (!isStamp(stamp)) throw new Error('잘못된 백업 이름입니다.')
  const file = path.join(APPLY_BACKUP_DIR, stamp, BACKUP_META_FILE)
  if (!existsSync(file)) return null
  try {
    const meta = JSON.parse(await readFile(file, 'utf8')) as Partial<ApplyBackupMeta>
    return Number.isInteger(meta.templateId)
      ? { templateId: meta.templateId as number, templateName: String(meta.templateName ?? '') }
      : null
  } catch {
    return null
  }
}

export interface ApplyBackup {
  /** 폴더 이름이자 식별자 — 되돌릴 때 그대로 보낸다. */
  stamp: string
  createdAt: string
  files: number
  /** 메뉴·페이지 데이터도 담겨 있는지 */
  hasData: boolean
  /** 이 모습을 쓰던 템플릿 — 예전 백업은 비어 있다. */
  templateId: number | null
  templateName: string
}

/**
 * 템플릿을 적용하기 전 남겨 둔 원본 목록 — 최근 것이 위다.
 * 되돌리면 그 시점의 사이트 파일로 되돌아간다.
 */
export async function listApplyBackups(): Promise<ApplyBackup[]> {
  if (!existsSync(APPLY_BACKUP_DIR)) return []
  const names = (await readdir(APPLY_BACKUP_DIR)).filter(isStamp).sort().reverse()
  return Promise.all(
    names.map(async (stamp) => {
      const dir = path.join(APPLY_BACKUP_DIR, stamp)
      let files = 0
      for (const folder of FOLDERS) files += (await listSources(path.join(dir, folder))).length
      for (const root of MEDIA_ROOTS) files += (await walk(path.join(dir, root))).length
      // 폴더 이름이 곧 시각이다. '2026-09-03T09-52-46-792Z' → ISO 로 되돌린다.
      const iso = stamp.replace(/T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/, 'T$1:$2:$3.$4Z')
      const meta = await readBackupMeta(stamp)
      return {
        stamp,
        createdAt: iso,
        files,
        hasData: existsSync(path.join(dir, DATA_FILE)),
        templateId: meta?.templateId ?? null,
        templateName: meta?.templateName ?? '',
      }
    }),
  )
}

/** 이 백업에 담긴 파일 목록 — 되돌리기 전에 무엇이 바뀌는지 보여 준다. */
export async function listApplyBackupFiles(stamp: string): Promise<{ folder: Folder; files: string[] }[]> {
  if (!isStamp(stamp)) throw new Error('잘못된 백업 이름입니다.')
  const dir = path.join(APPLY_BACKUP_DIR, stamp)
  return Promise.all(FOLDERS.map(async (folder) => ({ folder, files: await listSources(path.join(dir, folder)) })))
}

/**
 * 백업 시점의 파일로 사이트를 되돌린다.
 * 되돌리기 직전 모습도 새 백업으로 남겨, 되돌린 것을 다시 되돌릴 수 있다.
 */
export async function restoreApplyBackup(stamp: string): Promise<{ restored: number; backup: string }> {
  if (!isStamp(stamp)) throw new Error('잘못된 백업 이름입니다.')
  const dir = path.join(APPLY_BACKUP_DIR, stamp)
  if (!existsSync(dir)) throw new Error('백업을 찾을 수 없습니다.')

  const newStamp = new Date().toISOString().replace(/[:.]/g, '-')
  const newBackup = path.join(APPLY_BACKUP_DIR, newStamp)
  let restored = 0

  for (const folder of FOLDERS) {
    const names = await listSources(path.join(dir, folder))
    if (names.length === 0) continue
    await mkdir(path.join(newBackup, folder), { recursive: true })
    for (const name of names) {
      const target = path.join(LIVE[folder], name)
      if (existsSync(target)) await copyFile(target, path.join(newBackup, folder, name))
      await copyFile(path.join(dir, folder, name), target)
      restored += 1
    }
  }
  // 그때 덮어썼던 이미지·영상도 되돌린다.
  restored += await overlayMedia(dir, newBackup)
  return { restored, backup: newStamp }
}

/* ------------------------------------------------------------------
 * 템플릿 정보 — 보관된 파일을 읽어 스스로 알아낼 수 있는 것들
 * ------------------------------------------------------------------ */

/** 이름과 설명 한 줄 */
export interface FileInfo {
  name: string
  file: string
  description: string
}

/**
 * 파일 맨 위 주석에서 설명 한 줄을 뽑는다.
 * 우리 소스는 파일마다 `/** … *\/` 로 무엇을 하는 파일인지 적어 두므로 그 첫 문장을 쓴다.
 */
function describe(text: string): string {
  // 파일 안에는 도우미 함수 주석도 있으므로, 기본 내보내기 바로 앞의 주석을 쓴다.
  // (그 앞에 없으면 파일 맨 위 주석으로 물러선다)
  const head = text.split(/export default/)[0]
  const blocks = [...head.matchAll(/\/\*\*([\s\S]*?)\*\//g)]
  const block = blocks[blocks.length - 1] ?? text.match(/\/\*\*([\s\S]*?)\*\//)
  if (!block) return ''
  const line = block[1]
    .split('\n')
    .map((l) => l.replace(/^\s*\*ㅤ?/, '').trim())
    .filter(Boolean)[0]
  if (!line) return ''
  // 첫 문장까지만 — 마침표가 없으면 통째로 쓴다.
  const stop = line.search(/[.。]\s|[.。]$/)
  return (stop > 0 ? line.slice(0, stop + 1) : line).trim()
}

/** 폴더 하나의 파일들을 이름·설명과 함께 돌려준다. */
async function describeFolder(id: number, folder: Folder): Promise<FileInfo[]> {
  const dir = path.join(templateDir(id), folder)
  const names = await listSources(dir)
  return Promise.all(
    names.map(async (name) => ({
      name: name.replace(/\.(tsx|ts|css)$/, ''),
      file: `${folder}/${name}`,
      description: describe(await readFile(path.join(dir, name), 'utf8')),
    })),
  )
}

export async function describeFiles(id: number): Promise<{ pages: FileInfo[]; layouts: FileInfo[]; components: FileInfo[] }> {
  const [pages, layouts, components] = await Promise.all([
    describeFolder(id, 'pages'),
    describeFolder(id, 'layouts'),
    describeFolder(id, 'components'),
  ])
  return { pages, layouts, components }
}

export interface AssetInfo {
  name: string
  type: string
  path: string
  from: string
}

/**
 * 바깥에서 가져다 쓰는 자원(글꼴·스타일·스크립트)을 모은다.
 * 템플릿이 담은 파일과, 모든 템플릿이 함께 쓰는 시작 파일(main.tsx·index.css)을 훑는다.
 */
export async function collectAssets(id: number): Promise<AssetInfo[]> {
  const found: AssetInfo[] = []
  const seen = new Set<string>()

  const add = (name: string, type: string, url: string, from: string) => {
    if (seen.has(url)) return
    seen.add(url)
    found.push({ name, type, path: url, from })
  }

  const scan = (text: string, from: string) => {
    // 패키지·파일에서 불러오는 스타일 (예: pretendard-gov/…/pretendardvariable-gov-dynamic-subset.css)
    for (const m of text.matchAll(/import\s+'([^']+\.css)'/g)) {
      const url = m[1]
      // 패키지에서 오면 패키지 이름, 우리 파일이면 파일 이름을 쓴다.
      const name = url.startsWith('.') ? (url.split('/').pop() ?? url) : url.split('/')[0]
      add(name, /pretendard|font/i.test(url) ? 'webfont' : 'style', url, from)
    }
    // 바깥 주소로 불러오는 것
    for (const m of text.matchAll(/https?:\/\/[^'"`\s)]+\.(css|js)/g)) {
      const url = m[0]
      const name = url.includes('pretendard') ? 'pretendard-gov' : new URL(url).hostname
      add(name, url.endsWith('.css') ? (/pretendard|font/i.test(url) ? 'webfont' : 'style') : 'script', url, from)
    }
  }

  for (const folder of FOLDERS) {
    const dir = path.join(templateDir(id), folder)
    for (const name of await listSources(dir)) {
      scan(await readFile(path.join(dir, name), 'utf8'), `${folder}/${name}`)
    }
  }
  // 시작 파일 — 템플릿 밖이지만 화면이 함께 얹혀 도는 자리다.
  for (const entry of ['main.tsx', 'index.css']) {
    const file = path.join(WEB_SRC, entry)
    if (existsSync(file)) scan(await readFile(file, 'utf8'), `src/${entry}`)
  }
  return found
}

export interface LanguageInfo {
  code: string
  label: string
  keys: number
}

const LANGUAGE_LABEL: Record<string, string> = {
  ko: '한국어',
  en: 'English',
  ja: '日本語',
  zh: '中文',
}

/** 쓸 수 있는 언어 — 언어팩 파일에서 읽는다. */
export async function listLanguages(): Promise<LanguageInfo[]> {
  const dir = path.join(WEB_SRC, 'locales')
  if (!existsSync(dir)) return []
  const names = (await readdir(dir)).filter((n) => n.endsWith('.json')).sort()

  /** 중첩된 번역문까지 센다. */
  const count = (obj: unknown): number => {
    if (typeof obj !== 'object' || obj === null) return 1
    return Object.values(obj as Record<string, unknown>).reduce<number>((sum, v) => sum + count(v), 0)
  }

  return Promise.all(
    names.map(async (name) => {
      const code = name.replace(/\.json$/, '')
      let keys = 0
      try {
        keys = count(JSON.parse(await readFile(path.join(dir, name), 'utf8')))
      } catch {
        keys = 0
      }
      return { code, label: LANGUAGE_LABEL[code] ?? code, keys }
    }),
  )
}
