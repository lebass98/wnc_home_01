import path from 'node:path'
import { existsSync } from 'node:fs'
import { readdir, readFile, rm, stat } from 'node:fs/promises'
import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { asyncHandler } from '../lib/handler.js'
import { requireAuth } from '../lib/auth.js'
import { UPLOAD_DIR } from './uploads.js'
import { TEMPLATES_DIR } from '../lib/templateFiles.js'
import { imageSize } from '../lib/imageSize.js'

/**
 * 미디어 라이브러리 — 관리자가 올린 파일(uploads 폴더 맨 위)을 한곳에서 본다.
 * 대체 텍스트·제목을 적고, 어디에 쓰였는지 보여 주며, 아무 데도 안 쓰인 파일을 정리한다.
 * 대체 텍스트는 홈페이지 본문 그림에 alt 가 비어 있을 때 채워 넣는다(/api/media/alts).
 */
export const mediaRouter = Router()

const NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/
const KIND: [RegExp, string][] = [
  [/\.(png|jpe?g|gif|webp|avif|svg)$/i, 'image'],
  [/\.(mp4|webm|mov|m4v)$/i, 'video'],
  [/\.pdf$/i, 'pdf'],
  [/\.zip$/i, 'zip'],
]
const kindOf = (name: string) => KIND.find(([re]) => re.test(name))?.[1] ?? 'file'

export interface MediaUsage {
  kind: string
  label: string
  link: string
}

/** 글에서 /uploads/<파일> 을 모두 찾는다. */
function refsIn(text: string): Set<string> {
  const out = new Set<string>()
  for (const m of text.matchAll(/\/uploads\/([A-Za-z0-9][A-Za-z0-9._-]*)/g)) out.add(m[1])
  return out
}

/**
 * 파일 이름 → 쓰인 곳. DB 의 콘텐츠 표를 통째로 훑는다(관리 화면에서 고칠 수 있는 곳으로 링크).
 * 휴지통에 든 글·템플릿 폴더가 쓰는 파일도 '쓰임'으로 센다 — 되살리거나 템플릿을 켰을 때 그림이 깨지지 않게.
 */
async function collectUsages(): Promise<Map<string, MediaUsage[]>> {
  const map = new Map<string, MediaUsage[]>()
  const add = (row: unknown, usage: MediaUsage) => {
    for (const name of refsIn(JSON.stringify(row))) {
      const list = map.get(name) ?? []
      if (!list.some((u) => u.link === usage.link && u.label === usage.label)) list.push(usage)
      map.set(name, list)
    }
  }
  const [posts, pages, products, popups, faqs, boards, categories, privacy, settings, boardSettings, components, trash, menus] =
    await Promise.all([
      prisma.post.findMany(),
      prisma.page.findMany(),
      prisma.product.findMany(),
      prisma.popup.findMany(),
      prisma.faq.findMany(),
      prisma.board.findMany(),
      prisma.category.findMany(),
      prisma.privacyRevision.findMany(),
      prisma.siteSetting.findMany(),
      prisma.boardSetting.findMany(),
      prisma.componentSetting.findMany(),
      prisma.trashItem.findMany(),
      prisma.menuItem.findMany(),
    ])
  for (const r of posts) add(r, { kind: '게시글', label: r.title, link: `/admin/posts/${r.id}` })
  for (const r of pages) add(r, { kind: '페이지', label: r.title, link: `/admin/pages/${r.id}` })
  for (const r of products) add(r, { kind: '제품', label: r.name, link: `/admin/products/${r.id}` })
  for (const r of popups) add(r, { kind: '팝업', label: r.name, link: `/admin/popups/${r.id}` })
  for (const r of faqs) add(r, { kind: 'FAQ', label: r.question, link: `/admin/faqs/${r.id}` })
  for (const r of boards) add(r, { kind: '게시판', label: r.name, link: `/admin/boards/${r.id}` })
  for (const r of categories) add(r, { kind: '제품 카테고리', label: r.name, link: '/admin/categories' })
  for (const r of privacy) add(r, { kind: '개인정보 이력', label: r.title, link: `/admin/privacy-revisions/${r.id}` })
  for (const r of settings) add(r, { kind: '환경설정', label: '사이트 설정', link: '/admin/settings' })
  for (const r of boardSettings) add(r, { kind: '게시판 설정', label: '게시판 환경설정', link: '/admin/posts/settings' })
  for (const r of components) add(r, { kind: '컴포넌트', label: r.key, link: '/admin/components' })
  for (const r of menus) add(r, { kind: '메뉴', label: r.label, link: '/admin/menus' })
  for (const r of trash) add(r, { kind: '휴지통', label: r.title, link: '/admin/trash' })

  // 템플릿 폴더 — 메뉴·페이지·설정이 가리키는 업로드 파일
  if (existsSync(TEMPLATES_DIR)) {
    for (const slug of await readdir(TEMPLATES_DIR)) {
      for (const file of ['data.json', 'components.json']) {
        const p = path.join(TEMPLATES_DIR, slug, file)
        if (existsSync(p)) add(await readFile(p, 'utf8'), { kind: '템플릿', label: slug, link: '/admin/templates' })
      }
    }
  }
  return map
}

/** uploads 폴더 맨 위의 파일들 — 하위 폴더(템플릿 백업 등)와 숨김 파일은 뺀다. */
async function listUploadFiles() {
  const entries = await readdir(UPLOAD_DIR, { withFileTypes: true })
  return entries.filter((e) => e.isFile() && NAME.test(e.name)).map((e) => e.name)
}

function fileOf(name: string): string | null {
  if (!NAME.test(name) || name.includes('..')) return null
  const file = path.join(UPLOAD_DIR, name)
  return existsSync(file) ? file : null
}

mediaRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (_req, res) => {
    const [names, usages, assets, folders] = await Promise.all([
      listUploadFiles(),
      collectUsages(),
      prisma.mediaAsset.findMany(),
      prisma.mediaFolder.findMany(),
    ])
    const info = new Map(assets.map((a) => [a.path, a]))
    const folderName = new Map(folders.map((f) => [f.id, f.name]))
    const items = await Promise.all(
      names.map(async (name) => {
        const file = path.join(UPLOAD_DIR, name)
        const st = await stat(file)
        const url = `/uploads/${name}`
        const a = info.get(url)
        const kind = kindOf(name)
        // 그림은 가로·세로를 함께 알려 준다 — 목록에서 크기를 보고 고를 수 있게.
        const dim = kind === 'image' ? await imageSize(file, st.mtimeMs) : null
        return {
          name,
          url,
          kind,
          size: st.size,
          createdAt: st.mtime.toISOString(),
          alt: a?.alt ?? '',
          title: a?.title ?? '',
          originalName: a?.originalName ?? '',
          ...(dim ? { width: dim.width, height: dim.height } : {}),
          // 폴더가 지워졌으면 '미분류' 로 본다.
          folderId: a?.folderId != null && folderName.has(a.folderId) ? a.folderId : null,
          folderName: (a?.folderId != null && folderName.get(a.folderId)) || '',
          usages: usages.get(name) ?? [],
        }
      }),
    )
    items.sort((x, y) => y.createdAt.localeCompare(x.createdAt))
    res.json(items)
  }),
)

/** 홈페이지용 — 대체 텍스트가 적힌 파일만 { 경로: 대체 텍스트 } */
mediaRouter.get(
  '/alts',
  asyncHandler(async (_req, res) => {
    const rows = await prisma.mediaAsset.findMany({ where: { NOT: { alt: '' } }, select: { path: true, alt: true } })
    res.json(Object.fromEntries(rows.map((r) => [r.path, r.alt])))
  }),
)

/* ------------------------------------------------------------------
 * 분류 폴더 — 디스크 폴더가 아니라 이름표다. 파일은 uploads/ 맨 위에 그대로 두므로
 * 폴더를 만들고 옮겨도 공개 주소(/uploads/<파일>)는 바뀌지 않는다(본문에 박힌 주소가 안 깨진다).
 * ------------------------------------------------------------------ */

const folderName = z
  .string()
  .trim()
  .min(1, '폴더 이름을 입력하세요.')
  .max(50, '폴더 이름은 50자까지 쓸 수 있습니다.')
  .refine((v) => !v.includes('/'), '폴더 이름에 / 는 쓸 수 없습니다.')

/**
 * 폴더 목록 — 트리 순서(상위 바로 아래에 그 하위가 오도록)로 늘어놓고,
 * 깊이·이름 경로·파일 수(바로 담긴 것 / 하위까지 합친 것)를 함께 보낸다.
 * 화면은 이 순서를 그대로 그리면 되므로 트리를 다시 짤 필요가 없다.
 */
mediaRouter.get(
  '/folders',
  requireAuth,
  asyncHandler(async (_req, res) => {
    const [folders, assets, names] = await Promise.all([
      prisma.mediaFolder.findMany({ orderBy: { name: 'asc' } }),
      prisma.mediaAsset.findMany({ where: { NOT: { folderId: null } } }),
      listUploadFiles(),
    ])
    const alive = new Set(names.map((n) => `/uploads/${n}`))
    const count = new Map<number, number>()
    for (const a of assets) {
      if (a.folderId == null || !alive.has(a.path)) continue
      count.set(a.folderId, (count.get(a.folderId) ?? 0) + 1)
    }

    const childrenOf = (parentId: number | null) => folders.filter((f) => f.parentId === parentId)
    const out: {
      id: number
      name: string
      parentId: number | null
      count: number
      totalCount: number
      path: string
      depth: number
    }[] = []

    /** 하위까지 합친 파일 수 — 트리를 따라 내려가며 더한다. */
    const walkTree = (parentId: number | null, depth: number, prefix: string): number => {
      let sum = 0
      for (const f of childrenOf(parentId)) {
        const own = count.get(f.id) ?? 0
        const path = prefix ? `${prefix} / ${f.name}` : f.name
        const row = { id: f.id, name: f.name, parentId: f.parentId, count: own, totalCount: own, path, depth }
        out.push(row)
        const sub = walkTree(f.id, depth + 1, path)
        row.totalCount = own + sub
        sum += row.totalCount
      }
      return sum
    }
    walkTree(null, 0, '')
    res.json(out)
  }),
)

mediaRouter.post(
  '/folders',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { name, parentId } = z
      .object({ name: folderName, parentId: z.number().int().nullable().default(null) })
      .parse(req.body)
    if (parentId !== null && !(await prisma.mediaFolder.findUnique({ where: { id: parentId } })))
      return res.status(404).json({ message: '상위 폴더를 찾을 수 없습니다. 목록을 새로 불러 주세요.' })
    if (await prisma.mediaFolder.findFirst({ where: { parentId, name } }))
      return res.status(409).json({ message: `같은 자리에 '${name}' 폴더가 이미 있습니다. 다른 이름을 쓰세요.` })
    const row = await prisma.mediaFolder.create({ data: { name, parentId } })
    res.status(201).json({ id: row.id, name: row.name, parentId: row.parentId })
  }),
)

mediaRouter.put(
  '/folders/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id)
    const { name } = z.object({ name: folderName }).parse(req.body)
    const found = await prisma.mediaFolder.findUnique({ where: { id } })
    if (!found) return res.status(404).json({ message: '폴더를 찾을 수 없습니다.' })
    const taken = await prisma.mediaFolder.findFirst({ where: { parentId: found.parentId, name } })
    if (taken && taken.id !== id) return res.status(409).json({ message: `같은 자리에 '${name}' 폴더가 이미 있습니다. 다른 이름을 쓰세요.` })
    const row = await prisma.mediaFolder.update({ where: { id }, data: { name } })
    res.json({ id: row.id, name: row.name })
  }),
)

/** 폴더 삭제 — 하위 폴더까지 함께 지운다. 담긴 파일은 지우지 않고 '미분류' 로 돌려보낸다. */
mediaRouter.delete(
  '/folders/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id)
    if (!(await prisma.mediaFolder.findUnique({ where: { id } })))
      return res.status(404).json({ message: '폴더를 찾을 수 없습니다.' })

    const all = await prisma.mediaFolder.findMany()
    // 지울 폴더와 그 아래 모든 폴더를 모은다.
    const ids = [id]
    for (let i = 0; i < ids.length; i++) {
      for (const f of all) if (f.parentId === ids[i]) ids.push(f.id)
    }
    const moved = await prisma.mediaAsset.updateMany({ where: { folderId: { in: ids } }, data: { folderId: null } })
    await prisma.mediaFolder.deleteMany({ where: { id: { in: ids } } })
    res.json({ ok: true, moved: moved.count, folders: ids.length })
  }),
)

/** 고른 파일을 폴더로 옮긴다(folderId = null 이면 미분류로). 파일 자체는 움직이지 않는다. */
mediaRouter.put(
  '/move',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { names, folderId } = z
      .object({ names: z.array(z.string()).min(1, '옮길 파일을 고르세요.').max(500), folderId: z.number().int().nullable() })
      .parse(req.body)
    if (folderId !== null && !(await prisma.mediaFolder.findUnique({ where: { id: folderId } })))
      return res.status(404).json({ message: '폴더를 찾을 수 없습니다. 목록을 새로 불러 주세요.' })

    let moved = 0
    for (const name of names) {
      if (!fileOf(name)) continue
      const path = `/uploads/${name}`
      await prisma.mediaAsset.upsert({ where: { path }, create: { path, folderId }, update: { folderId } })
      moved += 1
    }
    res.json({ ok: true, moved })
  }),
)

mediaRouter.put(
  '/:name',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!fileOf(req.params.name)) return res.status(404).json({ message: '파일을 찾을 수 없습니다.' })
    const { alt, title } = z
      .object({ alt: z.string().trim().max(300).default(''), title: z.string().trim().max(200).default('') })
      .parse(req.body)
    const p = `/uploads/${req.params.name}`
    const row = await prisma.mediaAsset.upsert({ where: { path: p }, create: { path: p, alt, title }, update: { alt, title } })
    res.json({ alt: row.alt, title: row.title })
  }),
)

/**
 * 파일 삭제 — 쓰이는 곳이 있으면 막는다(force=1 이면 알고도 지운다).
 * 지운 파일은 되돌릴 수 없다.
 */
mediaRouter.delete(
  '/:name',
  requireAuth,
  asyncHandler(async (req, res) => {
    const file = fileOf(req.params.name)
    if (!file) return res.status(404).json({ message: '파일을 찾을 수 없습니다.' })
    const used = (await collectUsages()).get(req.params.name) ?? []
    if (used.length > 0 && req.query.force !== '1') {
      return res.status(409).json({
        message: `이 파일은 ${used.length}곳에서 쓰이고 있습니다 (${used
          .slice(0, 3)
          .map((u) => `${u.kind} '${u.label}'`)
          .join(', ')}${used.length > 3 ? ' 등' : ''}). 지우면 그곳의 그림이 깨집니다.`,
        usages: used,
      })
    }
    await rm(file, { force: true })
    await prisma.mediaAsset.deleteMany({ where: { path: `/uploads/${req.params.name}` } })
    res.status(204).end()
  }),
)
