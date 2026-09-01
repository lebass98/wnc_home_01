import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { asyncHandler } from '../lib/handler.js'
import { requireAuth } from '../lib/auth.js'

export const postsRouter = Router()

const CATEGORIES = ['NOTICE', 'NEWS', 'PRESS'] as const

const postInputSchema = z.object({
  category: z.enum(CATEGORIES),
  title: z.string().min(1, '제목을 입력하세요.').max(200),
  content: z.string().min(1, '내용을 입력하세요.'),
  published: z.boolean(),
})

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  category: z.enum(CATEGORIES).optional(),
  q: z.string().trim().min(1).optional(),
})

type PostWithAuthor = { author: { name: string } } & Record<string, any>

function toListItem(post: PostWithAuthor) {
  return {
    id: post.id,
    category: post.category,
    title: post.title,
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
  asyncHandler(async (req, res) => {
    const { page, pageSize, category, q } = listQuerySchema.parse(req.query)
    const includeDrafts = req.query.includeDrafts === '1' && Boolean(req.headers.authorization)

    const where = {
      ...(includeDrafts ? {} : { published: true }),
      ...(category ? { category } : {}),
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
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) return res.status(400).json({ message: '잘못된 요청입니다.' })

    const post = await prisma.post.findUnique({
      where: { id },
      include: { author: { select: { name: true } } },
    })
    if (!post) return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' })
    if (!post.published && !req.headers.authorization) {
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
