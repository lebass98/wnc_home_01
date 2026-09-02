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

/* --------------------------- 분류 --------------------------- */

const categoryInputSchema = z.object({
  name: z.string().trim().min(1, '분류 이름을 입력하세요.').max(30),
  sortOrder: z.number().int().min(0).max(9999).optional(),
})

/** 분류마다 쓰이는 질문 수를 함께 센다. */
async function listCategories() {
  const [categories, counts] = await Promise.all([
    prisma.faqCategory.findMany({ orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] }),
    prisma.faq.groupBy({ by: ['category'], _count: { _all: true } }),
  ])
  const countOf = new Map(counts.map((c) => [c.category, c._count._all]))
  return categories.map((c) => ({
    id: c.id,
    name: c.name,
    sortOrder: c.sortOrder,
    faqCount: countOf.get(c.name) ?? 0,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }))
}

/** 분류 목록 — 홈페이지 탭 순서에도 쓰므로 인증 없이 준다. */
faqsRouter.get(
  '/categories',
  asyncHandler(async (_req, res) => {
    res.json(await listCategories())
  }),
)

faqsRouter.post(
  '/categories',
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = categoryInputSchema.parse(req.body)
    const dup = await prisma.faqCategory.findUnique({ where: { name: data.name } })
    if (dup) return res.status(409).json({ message: `'${data.name}' 분류가 이미 있습니다. 다른 이름을 쓰세요.` })

    const last = await prisma.faqCategory.findFirst({ orderBy: { sortOrder: 'desc' } })
    await prisma.faqCategory.create({
      data: { name: data.name, sortOrder: data.sortOrder ?? (last ? last.sortOrder + 1 : 0) },
    })
    res.status(201).json(await listCategories())
  }),
)

/** 이름을 바꾸면 그 분류를 쓰던 질문들도 함께 바뀐다. */
faqsRouter.put(
  '/categories/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) return res.status(400).json({ message: '잘못된 요청입니다.' })

    const data = categoryInputSchema.parse(req.body)
    const existing = await prisma.faqCategory.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ message: '분류를 찾을 수 없습니다.' })

    if (data.name !== existing.name) {
      const dup = await prisma.faqCategory.findUnique({ where: { name: data.name } })
      if (dup) return res.status(409).json({ message: `'${data.name}' 분류가 이미 있습니다. 다른 이름을 쓰세요.` })
    }

    await prisma.$transaction([
      prisma.faqCategory.update({
        where: { id },
        data: { name: data.name, sortOrder: data.sortOrder ?? existing.sortOrder },
      }),
      prisma.faq.updateMany({ where: { category: existing.name }, data: { category: data.name } }),
    ])
    res.json(await listCategories())
  }),
)

/** 분류를 지우면 그 분류를 쓰던 질문은 '분류 없음'이 된다. */
faqsRouter.delete(
  '/categories/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) return res.status(400).json({ message: '잘못된 요청입니다.' })

    const existing = await prisma.faqCategory.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ message: '분류를 찾을 수 없습니다.' })

    await prisma.$transaction([
      prisma.faq.updateMany({ where: { category: existing.name }, data: { category: '' } }),
      prisma.faqCategory.delete({ where: { id } }),
    ])
    res.json(await listCategories())
  }),
)

/* --------------------------- 질문 --------------------------- */

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
