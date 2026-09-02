import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { asyncHandler } from '../lib/handler.js'
import { requireAuth } from '../lib/auth.js'

export const privacyRevisionsRouter = Router()

const inputSchema = z.object({
  title: z.string().trim().min(1, '제목을 입력하세요.').max(100),
  effectiveAt: z.string().min(1, '시행일을 선택하세요.'),
  summary: z.string().trim().max(300).optional().default(''),
  content: z.string().trim().min(1, '당시 방침 본문을 입력하세요.').max(50000),
})

type Row = Record<string, any>

function toListItem(r: Row) {
  return {
    id: r.id,
    title: r.title,
    effectiveAt: r.effectiveAt.toISOString(),
    summary: r.summary,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }
}

function toDetail(r: Row) {
  return { ...toListItem(r), content: r.content }
}

/** 홈페이지 개정이력 표 — 최신 시행일이 위로 오도록 준다. 본문은 뺀다. */
privacyRevisionsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const items = await prisma.privacyRevision.findMany({ orderBy: [{ effectiveAt: 'desc' }, { id: 'desc' }] })
    res.json(items.map(toListItem))
  }),
)

/** 자세히보기 — 당시 본문까지 준다. 홈페이지에서도 열어야 하므로 인증 없이 준다. */
privacyRevisionsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) return res.status(400).json({ message: '잘못된 요청입니다.' })

    const rev = await prisma.privacyRevision.findUnique({ where: { id } })
    if (!rev) return res.status(404).json({ message: '개정 이력을 찾을 수 없습니다.' })
    res.json(toDetail(rev))
  }),
)

privacyRevisionsRouter.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = inputSchema.parse(req.body)
    const rev = await prisma.privacyRevision.create({
      data: { ...data, effectiveAt: new Date(data.effectiveAt) },
    })
    res.status(201).json(toDetail(rev))
  }),
)

privacyRevisionsRouter.put(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) return res.status(400).json({ message: '잘못된 요청입니다.' })

    const data = inputSchema.parse(req.body)
    const existing = await prisma.privacyRevision.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ message: '개정 이력을 찾을 수 없습니다.' })

    const rev = await prisma.privacyRevision.update({
      where: { id },
      data: { ...data, effectiveAt: new Date(data.effectiveAt) },
    })
    res.json(toDetail(rev))
  }),
)

privacyRevisionsRouter.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) return res.status(400).json({ message: '잘못된 요청입니다.' })

    const existing = await prisma.privacyRevision.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ message: '개정 이력을 찾을 수 없습니다.' })

    await prisma.privacyRevision.delete({ where: { id } })
    res.status(204).end()
  }),
)
