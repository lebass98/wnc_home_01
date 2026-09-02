import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { asyncHandler } from '../lib/handler.js'
import { requireAuth } from '../lib/auth.js'

export const faqsRouter = Router()

const faqInputSchema = z.object({
  category: z.string().trim().max(30).optional().default(''),
  question: z.string().trim().min(1, '질문을 입력하세요.').max(200),
  answer: z.string().trim().min(1, '답변을 입력하세요.').max(5000),
  published: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(9999).optional(),
})

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().min(1).optional(),
})

type FaqRow = Record<string, any>

function toItem(f: FaqRow) {
  return {
    id: f.id,
    category: f.category,
    question: f.question,
    answer: f.answer,
    published: f.published,
    sortOrder: f.sortOrder,
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
  }
}

/** 홈페이지용 — 공개된 질문을 순서대로 전부 준다. */
faqsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const items = await prisma.faq.findMany({
      where: { published: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    })
    res.json(items.map(toItem))
  }),
)

/** 관리자 목록 — 검색어로 걸러 페이지 단위로 준다. 비공개도 포함한다. */
faqsRouter.get(
  '/admin',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { page, pageSize, q } = listQuerySchema.parse(req.query)
    const where = q
      ? { OR: [{ question: { contains: q } }, { answer: { contains: q } }, { category: { contains: q } }] }
      : {}

    const [items, total] = await Promise.all([
      prisma.faq.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.faq.count({ where }),
    ])

    res.json({
      items: items.map(toItem),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    })
  }),
)

faqsRouter.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) return res.status(400).json({ message: '잘못된 요청입니다.' })

    const faq = await prisma.faq.findUnique({ where: { id } })
    if (!faq) return res.status(404).json({ message: '질문을 찾을 수 없습니다.' })
    res.json(toItem(faq))
  }),
)

faqsRouter.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = faqInputSchema.parse(req.body)
    // 순서를 비워 두면 맨 뒤에 붙인다.
    const last = await prisma.faq.findFirst({ orderBy: { sortOrder: 'desc' } })
    const faq = await prisma.faq.create({
      data: { ...data, sortOrder: data.sortOrder ?? (last ? last.sortOrder + 1 : 0) },
    })
    res.status(201).json(toItem(faq))
  }),
)

faqsRouter.put(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) return res.status(400).json({ message: '잘못된 요청입니다.' })

    const data = faqInputSchema.parse(req.body)
    const existing = await prisma.faq.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ message: '질문을 찾을 수 없습니다.' })

    const faq = await prisma.faq.update({
      where: { id },
      data: { ...data, sortOrder: data.sortOrder ?? existing.sortOrder },
    })
    res.json(toItem(faq))
  }),
)

/** 목록에서 공개 여부만 바로 바꾼다. */
faqsRouter.patch(
  '/:id/published',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) return res.status(400).json({ message: '잘못된 요청입니다.' })

    const { published } = z.object({ published: z.boolean() }).parse(req.body)
    const existing = await prisma.faq.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ message: '질문을 찾을 수 없습니다.' })

    const faq = await prisma.faq.update({ where: { id }, data: { published } })
    res.json(toItem(faq))
  }),
)

/** 선택한 여러 개를 한 번에 지운다. */
faqsRouter.post(
  '/bulk-delete',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { ids } = z
      .object({ ids: z.array(z.number().int()).min(1, '질문을 선택하세요.') })
      .parse(req.body)

    const result = await prisma.faq.deleteMany({ where: { id: { in: ids } } })
    res.json({ deleted: result.count })
  }),
)

faqsRouter.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) return res.status(400).json({ message: '잘못된 요청입니다.' })

    const existing = await prisma.faq.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ message: '질문을 찾을 수 없습니다.' })

    await prisma.faq.delete({ where: { id } })
    res.status(204).end()
  }),
)
