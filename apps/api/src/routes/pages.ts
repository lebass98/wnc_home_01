import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { asyncHandler } from '../lib/handler.js'
import { optionalAuth, requireAuth } from '../lib/auth.js'

export const pagesRouter = Router()

/** 페이지 하나가 보관하는 최대 버전 수. 넘으면 가장 오래된 것부터 지운다. */
const MAX_VERSIONS = 50

/** 언어별 값 — { ko, en, ja }. 제목은 짧게, 본문은 넉넉히 받는다. */
const localizedTitleSchema = z.record(z.enum(['ko', 'en', 'ja']), z.string().max(200)).optional()
const localizedContentSchema = z.record(z.enum(['ko', 'en', 'ja']), z.string().max(200_000)).optional()

/** 첨부파일 — 업로드 API 가 준 주소만 담는다. */
const attachmentSchema = z.object({
  name: z.string().trim().min(1).max(200),
  url: z.string().trim().min(1).max(500),
  size: z.number().int().min(0),
})

const pageInputSchema = z.object({
  slug: z.string().max(80).optional(),
  title: z.string().min(1, '제목을 입력하세요.').max(200),
  titleI18n: localizedTitleSchema,
  description: z.string().max(300).nullable().optional(),
  content: z.string().default(''),
  contentI18n: localizedContentSchema,
  attachments: z.array(attachmentSchema).max(5, '첨부파일은 5개까지 올릴 수 있습니다.').optional(),
  published: z.boolean(),
  showInNav: z.boolean(),
  sortOrder: z.number().int().optional(),
  metaTitle: z.string().max(120).nullable().optional(),
  metaDescription: z.string().max(400).nullable().optional(),
  metaKeywords: z.string().max(300).nullable().optional(),
  ogImage: z.string().max(500).nullable().optional(),
})

function parseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

/** 빈 문자열은 '설정 안 함'으로 본다. */
const orNull = (v: string | null | undefined) => (v?.trim() ? v.trim() : null)

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['all', 'published', 'draft']).default('all'),
  sort: z.enum(['latest', 'oldest', 'updated', 'title']).default('latest'),
  field: z.enum(['all', 'title', 'slug']).default('all'),
  q: z.string().trim().min(1).optional(),
})

const bulkSchema = z.object({
  ids: z.array(z.number().int()).min(1, '페이지를 선택하세요.'),
  published: z.boolean(),
})

/** 한글 제목도 주소에 쓸 수 있는 형태로 바꾼다. */
function toSlug(title: string): string {
  const base = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/^-|-$/g, '')
  return base || `page-${Date.now().toString(36)}`
}

/** 이미 쓰이는 slug 면 -2, -3 … 을 붙여 유일하게 만든다. */
async function uniqueSlug(desired: string, excludeId?: number): Promise<string> {
  let slug = desired
  for (let i = 2; ; i++) {
    const found = await prisma.page.findUnique({ where: { slug } })
    if (!found || found.id === excludeId) return slug
    slug = `${desired}-${i}`
  }
}

type PageRow = Record<string, any>

function toListItem(p: PageRow) {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    description: p.description,
    published: p.published,
    showInNav: p.showInNav,
    sortOrder: p.sortOrder,
    views: p.views,
    version: p.version,
    publishedAt: p.publishedAt ? p.publishedAt.toISOString() : null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }
}

function toDetail(p: PageRow) {
  return {
    ...toListItem(p),
    content: p.content,
    titleI18n: parseJson<Record<string, string>>(p.titleI18n ?? '{}', {}),
    contentI18n: parseJson<Record<string, string>>(p.contentI18n ?? '{}', {}),
    attachments: parseJson<unknown[]>(p.attachments ?? '[]', []),
    metaTitle: p.metaTitle ?? null,
    metaDescription: p.metaDescription ?? null,
    metaKeywords: p.metaKeywords ?? null,
    ogImage: p.ogImage ?? null,
  }
}

function toVersionItem(v: PageRow, currentVersion: number) {
  return {
    id: v.id,
    version: v.version,
    title: v.title,
    published: v.published,
    note: v.note,
    authorName: v.authorName,
    createdAt: v.createdAt.toISOString(),
    current: v.version === currentVersion,
  }
}

/** 현재 내용을 그대로 스냅샷으로 남긴다. 저장·복원 직후에 호출한다. */
async function snapshot(
  page: PageRow,
  note: string,
  author: { id: number; name: string },
): Promise<void> {
  await prisma.pageVersion.create({
    data: {
      pageId: page.id,
      version: page.version,
      title: page.title,
      description: page.description,
      content: page.content,
      published: page.published,
      showInNav: page.showInNav,
      note,
      authorId: author.id,
      authorName: author.name,
    },
  })

  // 보관 한도를 넘은 오래된 버전을 정리한다.
  const old = await prisma.pageVersion.findMany({
    where: { pageId: page.id },
    orderBy: { version: 'desc' },
    skip: MAX_VERSIONS,
    select: { id: true },
  })
  if (old.length > 0) {
    await prisma.pageVersion.deleteMany({ where: { id: { in: old.map((v) => v.id) } } })
  }
}

/** 토큰에 담긴 작성자 정보를 가져온다. 이름이 없으면 이메일로 대신한다. */
async function currentAuthor(userId: number, email: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } })
  return { id: userId, name: user?.name ?? email }
}

/**
 * 목록 조회. 공개 사이트는 발행된 페이지만 보이고,
 * 인증된 관리자는 includeDrafts=1 로 미발행 페이지까지 볼 수 있다.
 */
pagesRouter.get(
  '/',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { page, pageSize, status, sort, field, q } = listQuerySchema.parse(req.query)
    const includeDrafts = req.query.includeDrafts === '1' && Boolean(req.user)

    const search = q
      ? field === 'title'
        ? { title: { contains: q } }
        : field === 'slug'
          ? { slug: { contains: q } }
          : { OR: [{ title: { contains: q } }, { slug: { contains: q } }] }
      : {}

    const where = {
      ...(includeDrafts
        ? status === 'published'
          ? { published: true }
          : status === 'draft'
            ? { published: false }
            : {}
        : { published: true }),
      ...search,
    }

    const orderBy =
      sort === 'oldest'
        ? [{ createdAt: 'asc' as const }]
        : sort === 'updated'
          ? [{ updatedAt: 'desc' as const }]
          : sort === 'title'
            ? [{ title: 'asc' as const }]
            : [{ createdAt: 'desc' as const }]

    const [items, total] = await Promise.all([
      prisma.page.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.page.count({ where }),
    ])

    res.json({
      items: items.map(toListItem),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    })
  }),
)

/** 슬러그 중복 확인 — 수정 화면의 [중복 확인] 버튼이 쓴다. */
pagesRouter.get(
  '/slug-check',
  requireAuth,
  asyncHandler(async (req, res) => {
    const slug = String(req.query.slug ?? '').trim()
    const excludeId = Number(req.query.excludeId ?? 0) || 0
    if (!slug) return res.json({ ok: false, message: '슬러그를 입력하세요.' })
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return res.json({ ok: false, message: '영문 소문자, 숫자, 하이픈(-)만 사용할 수 있습니다.' })
    }
    const found = await prisma.page.findUnique({ where: { slug } })
    if (found && found.id !== excludeId) {
      return res.json({ ok: false, message: '이미 사용 중인 슬러그입니다. 다른 값을 입력하세요.' })
    }
    res.json({ ok: true, message: '사용 가능한 슬러그입니다.' })
  }),
)

/** 상단 메뉴용 — 발행 + 메뉴노출 페이지만 정렬 순서대로 준다. */
pagesRouter.get(
  '/nav',
  asyncHandler(async (_req, res) => {
    const items = await prisma.page.findMany({
      where: { published: true, showInNav: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    })
    res.json(items.map(toListItem))
  }),
)

/** slug 로 조회 — 공개 사이트가 쓴다. */
pagesRouter.get(
  '/slug/:slug',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const page = await prisma.page.findUnique({ where: { slug: req.params.slug } })
    if (!page) return res.status(404).json({ message: '페이지를 찾을 수 없습니다.' })
    if (!page.published && !req.user) {
      return res.status(404).json({ message: '페이지를 찾을 수 없습니다.' })
    }

    if (page.published) {
      await prisma.page.update({ where: { id: page.id }, data: { views: { increment: 1 } } })
      page.views += 1
    }
    res.json(toDetail(page))
  }),
)

/** 여러 페이지의 발행 상태를 한 번에 바꾼다. */
pagesRouter.patch(
  '/bulk',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { ids, published } = bulkSchema.parse(req.body)
    const result = await prisma.page.updateMany({
      where: { id: { in: ids } },
      data: { published, ...(published ? { publishedAt: new Date() } : {}) },
    })
    res.json({ count: result.count })
  }),
)

pagesRouter.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) return res.status(400).json({ message: '잘못된 요청입니다.' })

    const page = await prisma.page.findUnique({ where: { id } })
    if (!page) return res.status(404).json({ message: '페이지를 찾을 수 없습니다.' })
    res.json(toDetail(page))
  }),
)

pagesRouter.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = pageInputSchema.parse(req.body)
    const slug = await uniqueSlug(data.slug?.trim() ? toSlug(data.slug) : toSlug(data.title))
    const author = await currentAuthor(req.user!.sub, req.user!.email)

    const page = await prisma.page.create({
      data: {
        slug,
        title: data.titleI18n?.ko?.trim() || data.title,
        titleI18n: JSON.stringify(data.titleI18n ?? {}),
        description: data.description ?? null,
        content: data.contentI18n?.ko ?? data.content,
        contentI18n: JSON.stringify(data.contentI18n ?? {}),
        attachments: JSON.stringify(data.attachments ?? []),
        published: data.published,
        publishedAt: data.published ? new Date() : null,
        showInNav: data.showInNav,
        sortOrder: data.sortOrder ?? 0,
        version: 1,
        metaTitle: orNull(data.metaTitle),
        metaDescription: orNull(data.metaDescription),
        metaKeywords: orNull(data.metaKeywords),
        ogImage: orNull(data.ogImage),
      },
    })
    await snapshot(page, '최초 생성', author)

    res.status(201).json(toDetail(page))
  }),
)

pagesRouter.put(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) return res.status(400).json({ message: '잘못된 요청입니다.' })

    const data = pageInputSchema.parse(req.body)
    const existing = await prisma.page.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ message: '페이지를 찾을 수 없습니다.' })

    const slug = await uniqueSlug(data.slug?.trim() ? toSlug(data.slug) : toSlug(data.title), id)
    const author = await currentAuthor(req.user!.sub, req.user!.email)

    // 다국어 값 — ko 가 있으면 기본 컬럼(제목·본문)도 그 값으로 맞춘다.
    const title = data.titleI18n?.ko?.trim() || data.title
    const content = data.contentI18n?.ko ?? data.content
    const titleI18n = JSON.stringify(data.titleI18n ?? {})
    const contentI18n = JSON.stringify(data.contentI18n ?? {})
    const attachments = JSON.stringify(data.attachments ?? [])

    // 어떤 항목이 바뀌었는지 모아 둔다. 하나도 없으면 새 버전을 만들지 않는다.
    const changes: string[] = []
    if (existing.title !== title || (existing.titleI18n ?? '{}') !== titleI18n) changes.push('제목')
    if (existing.slug !== slug) changes.push('슬러그')
    if ((existing.description ?? null) !== (data.description ?? null)) changes.push('설명')
    if (existing.content !== content || (existing.contentI18n ?? '{}') !== contentI18n) changes.push('본문')
    if ((existing.attachments ?? '[]') !== attachments) changes.push('첨부파일')
    if (existing.published !== data.published) changes.push('발행 상태')
    if (existing.showInNav !== data.showInNav) changes.push('메뉴 노출')
    const seo = {
      metaTitle: orNull(data.metaTitle),
      metaDescription: orNull(data.metaDescription),
      metaKeywords: orNull(data.metaKeywords),
      ogImage: orNull(data.ogImage),
    }
    if (
      (existing.metaTitle ?? null) !== seo.metaTitle ||
      (existing.metaDescription ?? null) !== seo.metaDescription ||
      (existing.metaKeywords ?? null) !== seo.metaKeywords ||
      (existing.ogImage ?? null) !== seo.ogImage
    ) {
      changes.push('검색 노출')
    }
    const changed = changes.length > 0

    const page = await prisma.page.update({
      where: { id },
      data: {
        slug,
        title,
        titleI18n,
        description: data.description ?? null,
        content,
        contentI18n,
        attachments,
        published: data.published,
        publishedAt: data.published ? (existing.publishedAt ?? new Date()) : null,
        showInNav: data.showInNav,
        sortOrder: data.sortOrder ?? existing.sortOrder,
        ...seo,
        ...(changed ? { version: existing.version + 1 } : {}),
      },
    })
    if (changed) await snapshot(page, `${changes.join(', ')} 변경`, author)

    res.json(toDetail(page))
  }),
)

pagesRouter.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) return res.status(400).json({ message: '잘못된 요청입니다.' })

    const existing = await prisma.page.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ message: '페이지를 찾을 수 없습니다.' })

    await prisma.page.delete({ where: { id } })
    res.status(204).end()
  }),
)

/* ----------------------------- 버전 관리 ----------------------------- */

/** 버전 목록 — 최신 버전이 위로 온다. */
pagesRouter.get(
  '/:id/versions',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) return res.status(400).json({ message: '잘못된 요청입니다.' })

    const page = await prisma.page.findUnique({ where: { id } })
    if (!page) return res.status(404).json({ message: '페이지를 찾을 수 없습니다.' })

    const versions = await prisma.pageVersion.findMany({
      where: { pageId: id },
      orderBy: { version: 'desc' },
    })
    res.json(versions.map((v) => toVersionItem(v, page.version)))
  }),
)

/** 버전 상세 — 되돌리기 전에 내용을 미리 본다. */
pagesRouter.get(
  '/:id/versions/:version',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id)
    const version = Number(req.params.version)
    if (!Number.isInteger(id) || !Number.isInteger(version)) {
      return res.status(400).json({ message: '잘못된 요청입니다.' })
    }

    const page = await prisma.page.findUnique({ where: { id } })
    if (!page) return res.status(404).json({ message: '페이지를 찾을 수 없습니다.' })

    const v = await prisma.pageVersion.findUnique({ where: { pageId_version: { pageId: id, version } } })
    if (!v) return res.status(404).json({ message: '해당 버전을 찾을 수 없습니다.' })

    res.json({
      ...toVersionItem(v, page.version),
      description: v.description,
      content: v.content,
      showInNav: v.showInNav,
    })
  }),
)

/**
 * 지정한 버전의 내용으로 되돌린다.
 * 이전 내용을 지우지 않고 새 버전으로 쌓아 올려, 복원 자체도 되돌릴 수 있게 한다.
 */
pagesRouter.post(
  '/:id/versions/:version/restore',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id)
    const version = Number(req.params.version)
    if (!Number.isInteger(id) || !Number.isInteger(version)) {
      return res.status(400).json({ message: '잘못된 요청입니다.' })
    }

    const existing = await prisma.page.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ message: '페이지를 찾을 수 없습니다.' })

    const target = await prisma.pageVersion.findUnique({
      where: { pageId_version: { pageId: id, version } },
    })
    if (!target) return res.status(404).json({ message: '해당 버전을 찾을 수 없습니다.' })
    if (target.version === existing.version) {
      return res.status(400).json({ message: '이미 현재 내용과 같은 버전입니다.' })
    }

    const author = await currentAuthor(req.user!.sub, req.user!.email)
    const page = await prisma.page.update({
      where: { id },
      data: {
        title: target.title,
        description: target.description,
        content: target.content,
        published: target.published,
        publishedAt: target.published ? (existing.publishedAt ?? new Date()) : null,
        showInNav: target.showInNav,
        version: existing.version + 1,
      },
    })
    await snapshot(page, `v${target.version} 복원`, author)

    res.json(toDetail(page))
  }),
)
