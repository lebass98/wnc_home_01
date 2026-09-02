import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { asyncHandler } from '../lib/handler.js'
import { requireAuth } from '../lib/auth.js'

export const boardsRouter = Router()

const localizedSchema = z.record(z.enum(['ko', 'en', 'ja']), z.string().max(300)).optional()

const boardInputSchema = z.object({
  name: z.string().trim().min(1, '게시판 이름을 입력하세요.').max(60),
  // 슬러그는 URL 과 테이블명에 쓰이므로 영문·숫자·하이픈만 허용한다.
  slug: z
    .string()
    .trim()
    .max(40)
    .regex(/^[a-z0-9-]*$/i, '슬러그는 영문, 숫자, 하이픈만 쓸 수 있습니다.')
    .optional(),
  type: z.enum(['basic', 'gallery', 'card']).default('basic'),
  description: z.string().max(300).nullable().optional(),
  nameI18n: localizedSchema,
  descriptionI18n: localizedSchema,
  showInAdminMenu: z.boolean().optional(),
  categories: z.array(z.string().trim().min(1).max(40)).max(50).optional(),
  secretMode: z.enum(['off', 'optional', 'always']).optional(),
  showViews: z.boolean().optional(),
  useReport: z.boolean().optional(),
  published: z.boolean(),
  sortOrder: z.number().int().optional(),
})

/** 슬러그는 URL·테이블명에 쓰이므로 영문·숫자·하이픈만 남긴다. */
function toSlug(source: string): string {
  const base = source
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  // 한글 이름만 입력하면 남는 글자가 없으므로 임의 값을 만든다.
  return base || `board-${Date.now().toString(36)}`
}

/** JSON 문자열로 저장된 값을 안전하게 되돌린다. */
function parseJson<T>(raw: string, fallback: T): T {
  try {
    const parsed = JSON.parse(raw)
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

async function uniqueSlug(desired: string, excludeId?: number): Promise<string> {
  let slug = desired
  for (let i = 2; ; i++) {
    const found = await prisma.board.findUnique({ where: { slug } })
    if (!found || found.id === excludeId) return slug
    slug = `${desired}-${i}`
  }
}

async function toItem(board: Record<string, any>) {
  return {
    id: board.id,
    name: board.name,
    slug: board.slug,
    type: board.type,
    description: board.description,
    nameI18n: parseJson<Record<string, string>>(board.nameI18n, {}),
    descriptionI18n: parseJson<Record<string, string>>(board.descriptionI18n, {}),
    showInAdminMenu: board.showInAdminMenu,
    categories: parseJson<string[]>(board.categories, []),
    secretMode: board.secretMode,
    showViews: board.showViews,
    useReport: board.useReport,
    published: board.published,
    sortOrder: board.sortOrder,
    postCount: await prisma.post.count({ where: { category: board.slug } }),
    createdAt: board.createdAt.toISOString(),
    updatedAt: board.updatedAt.toISOString(),
  }
}

/** 목록. 공개 사이트는 노출 중인 게시판만 받고, 관리자는 includeHidden=1 로 전부 본다. */
boardsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const includeHidden = req.query.includeHidden === '1' && Boolean(req.headers.authorization)
    const boards = await prisma.board.findMany({
      where: includeHidden ? {} : { published: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    })
    res.json(await Promise.all(boards.map(toItem)))
  }),
)

/** 입력값을 DB 저장 형태로 바꾼다. i18n·분류는 JSON 문자열로 담는다. */
function toWriteData(data: z.infer<typeof boardInputSchema>, slug: string) {
  return {
    // 목록·검색에서 쓰는 대표 이름은 한국어 값을 우선한다.
    name: data.nameI18n?.ko?.trim() || data.name,
    type: data.type,
    slug,
    description: data.descriptionI18n?.ko?.trim() || data.description || null,
    nameI18n: JSON.stringify(data.nameI18n ?? {}),
    descriptionI18n: JSON.stringify(data.descriptionI18n ?? {}),
    showInAdminMenu: data.showInAdminMenu ?? false,
    categories: JSON.stringify(data.categories ?? []),
    secretMode: data.secretMode ?? 'off',
    showViews: data.showViews ?? true,
    useReport: data.useReport ?? false,
    published: data.published,
  }
}

/** 게시판 하나를 가져온다 — 설정 화면에서 쓴다. */
boardsRouter.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) return res.status(400).json({ message: '잘못된 요청입니다.' })

    const board = await prisma.board.findUnique({ where: { id } })
    if (!board) return res.status(404).json({ message: '게시판을 찾을 수 없습니다.' })
    res.json(await toItem(board))
  }),
)

boardsRouter.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = boardInputSchema.parse(req.body)
    const slug = await uniqueSlug(toSlug(data.slug?.trim() ? data.slug : data.name))

    const board = await prisma.board.create({
      data: { ...toWriteData(data, slug), sortOrder: data.sortOrder ?? 0 },
    })
    res.status(201).json(await toItem(board))
  }),
)

boardsRouter.put(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) return res.status(400).json({ message: '잘못된 요청입니다.' })

    const data = boardInputSchema.parse(req.body)
    const existing = await prisma.board.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ message: '게시판을 찾을 수 없습니다.' })

    const slug = await uniqueSlug(toSlug(data.slug?.trim() ? data.slug : data.name), id)

    // slug 가 바뀌면 이 게시판에 속한 글의 category 도 함께 옮긴다.
    const board = await prisma.$transaction(async (tx) => {
      if (slug !== existing.slug) {
        await tx.post.updateMany({ where: { category: existing.slug }, data: { category: slug } })
      }
      return tx.board.update({
        where: { id },
        data: { ...toWriteData(data, slug), sortOrder: data.sortOrder ?? existing.sortOrder },
      })
    })
    res.json(await toItem(board))
  }),
)

boardsRouter.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) return res.status(400).json({ message: '잘못된 요청입니다.' })

    const existing = await prisma.board.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ message: '게시판을 찾을 수 없습니다.' })

    const count = await prisma.post.count({ where: { category: existing.slug } })
    if (count > 0) {
      return res
        .status(400)
        .json({ message: `이 게시판에 글이 ${count}개 있어 삭제할 수 없습니다. 글을 먼저 옮기거나 지우세요.` })
    }

    await prisma.board.delete({ where: { id } })
    res.status(204).end()
  }),
)
