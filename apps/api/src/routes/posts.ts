import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { asyncHandler } from '../lib/handler.js'
import { optionalAuth, requireAuth } from '../lib/auth.js'

export const postsRouter = Router()

const postInputSchema = z.object({
  /** 게시판 slug — 저장 전에 실제로 있는 게시판인지 확인한다. */
  category: z.string().trim().min(1, '게시판을 선택하세요.').max(40),
  title: z.string().min(1, '제목을 입력하세요.').max(200),
  content: z.string().min(1, '내용을 입력하세요.'),
  /** 대표 이미지 — 업로드 경로 또는 외부 URL. 비우면 null 로 저장한다. */
  thumbnail: z
    .string()
    .trim()
    .max(2000, '이미지 주소가 너무 깁니다.')
    .nullish()
    .transform((v) => v || null),
  /** 글 분류 — 게시판에 정해 둔 분류 중 하나. 저장 전에 실제로 있는 분류인지 확인한다. */
  subCategory: z
    .string()
    .trim()
    .max(40, '분류 이름이 너무 깁니다.')
    .nullish()
    .transform((v) => v || null),
  published: z.boolean(),
})

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  category: z.string().trim().min(1).max(40).optional(),
  /** 게시판 안의 글 분류로 거른다. */
  subCategory: z.string().trim().min(1).max(40).optional(),
  q: z.string().trim().min(1).optional(),
})

/**
 * 없는 게시판으로 글을 저장하지 못하게 막고,
 * 글 분류도 그 게시판에 정해 둔 것 중 하나인지 확인한다.
 */
async function assertBoardExists(slug: string, subCategory?: string | null) {
  const board = await prisma.board.findUnique({ where: { slug } })
  if (!board) throw Object.assign(new Error('없는 게시판입니다.'), { status: 400 })

  if (!subCategory) return
  let list: string[] = []
  try {
    list = JSON.parse(board.categories) as string[]
  } catch {
    list = []
  }
  if (!list.includes(subCategory)) {
    throw Object.assign(
      new Error(`'${subCategory}' 는 이 게시판의 분류가 아닙니다. [게시판 관리]에서 분류를 먼저 추가하세요.`),
      { status: 400 },
    )
  }
}

type PostWithAuthor = { author: { name: string } } & Record<string, any>

/** 본문 앞부분을 한 줄로 줄인다 — 카드형 목록의 요약. 본문이 HTML 이면 태그를 걷어낸다. */
function excerptOf(content: string, max = 120): string {
  const text = content
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > max ? `${text.slice(0, max)}…` : text
}

function toListItem(post: PostWithAuthor) {
  return {
    id: post.id,
    category: post.category,
    title: post.title,
    excerpt: excerptOf(post.content),
    thumbnail: post.thumbnail ?? null,
    subCategory: post.subCategory ?? null,
    published: post.published,
    views: post.views,
    authorName: post.author.name,
    createdAt: post.createdAt.toISOString(),
  }
}

function toDetail(post: PostWithAuthor) {
  return { ...toListItem(post), content: post.content, authorId: post.authorId, updatedAt: post.updatedAt.toISOString() }
}

/**
 * 목록 조회. 공개 사이트는 published=true 만 보이고,
 * 인증된 관리자는 includeDrafts=1 로 비공개 글까지 볼 수 있다.
 */
postsRouter.get(
  '/',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { page, pageSize, category, subCategory, q } = listQuerySchema.parse(req.query)
    const includeDrafts = req.query.includeDrafts === '1' && Boolean(req.user)

    const where = {
      ...(includeDrafts ? {} : { published: true }),
      ...(category ? { category } : {}),
      ...(subCategory ? { subCategory } : {}),
      ...(q ? { OR: [{ title: { contains: q } }, { content: { contains: q } }] } : {}),
    }

    const [items, total] = await Promise.all([
      prisma.post.findMany({
        where,
        include: { author: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.post.count({ where }),
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

postsRouter.get(
  '/:id',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) return res.status(400).json({ message: '잘못된 요청입니다.' })

    const post = await prisma.post.findUnique({
      where: { id },
      include: { author: { select: { name: true } } },
    })
    if (!post) return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' })
    if (!post.published && !req.user) {
      return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' })
    }

    // 공개 조회일 때만 조회수를 올린다.
    if (post.published) {
      await prisma.post.update({ where: { id }, data: { views: { increment: 1 } } })
      post.views += 1
    }

    res.json(toDetail(post))
  }),
)

postsRouter.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = postInputSchema.parse(req.body)
    await assertBoardExists(data.category, data.subCategory)

    const post = await prisma.post.create({
      data: { ...data, authorId: req.user!.sub },
      include: { author: { select: { name: true } } },
    })
    res.status(201).json(toDetail(post))
  }),
)

postsRouter.put(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) return res.status(400).json({ message: '잘못된 요청입니다.' })

    const data = postInputSchema.parse(req.body)
    await assertBoardExists(data.category, data.subCategory)

    const existing = await prisma.post.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' })

    const post = await prisma.post.update({
      where: { id },
      data,
      include: { author: { select: { name: true } } },
    })
    res.json(toDetail(post))
  }),
)

postsRouter.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) return res.status(400).json({ message: '잘못된 요청입니다.' })

    const existing = await prisma.post.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' })

    await prisma.post.delete({ where: { id } })
    res.status(204).end()
  }),
)
