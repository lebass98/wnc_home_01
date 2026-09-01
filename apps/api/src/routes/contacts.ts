import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { asyncHandler } from '../lib/handler.js'
import { requireAuth } from '../lib/auth.js'

export const contactsRouter = Router()

const STATUSES = ['NEW', 'IN_PROGRESS', 'DONE'] as const

const contactInputSchema = z.object({
  name: z.string().min(1, '이름을 입력하세요.').max(50),
  email: z.string().email('이메일 형식이 올바르지 않습니다.'),
  phone: z.string().max(30).optional(),
  company: z.string().max(100).optional(),
  message: z.string().min(1, '문의 내용을 입력하세요.').max(5000),
})

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  status: z.enum(STATUSES).optional(),
  q: z.string().trim().min(1).optional(),
})

const updateSchema = z.object({
  status: z.enum(STATUSES).optional(),
  memo: z.string().max(2000).nullable().optional(),
})

function serialize(c: Record<string, any>) {
  return {
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    company: c.company,
    message: c.message,
    status: c.status,
    memo: c.memo,
    createdAt: c.createdAt.toISOString(),
  }
}

/** 공개 문의 접수 — 회사소개 페이지의 Contact 폼에서 호출한다. */
contactsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = contactInputSchema.parse(req.body)
    const contact = await prisma.contact.create({ data })
    res.status(201).json({ id: contact.id, message: '문의가 정상적으로 접수되었습니다.' })
  }),
)

contactsRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { page, pageSize, status, q } = listQuerySchema.parse(req.query)
    const where = {
      ...(status ? { status } : {}),
      ...(q
        ? { OR: [{ name: { contains: q } }, { email: { contains: q } }, { company: { contains: q } }] }
        : {}),
    }

    const [items, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.contact.count({ where }),
    ])

    res.json({
      items: items.map(serialize),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    })
  }),
)

contactsRouter.patch(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) return res.status(400).json({ message: '잘못된 요청입니다.' })

    const data = updateSchema.parse(req.body)
    const existing = await prisma.contact.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ message: '문의를 찾을 수 없습니다.' })

    const contact = await prisma.contact.update({ where: { id }, data })
    res.json(serialize(contact))
  }),
)

contactsRouter.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) return res.status(400).json({ message: '잘못된 요청입니다.' })

    const existing = await prisma.contact.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ message: '문의를 찾을 수 없습니다.' })

    await prisma.contact.delete({ where: { id } })
    res.status(204).end()
  }),
)
