import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { asyncHandler } from '../lib/handler.js'
import { requireAdmin, requireAuth } from '../lib/auth.js'
import { purgeExpiredTrash, restoreTrash, TRASH_KEEP_DAYS } from '../lib/trash.js'

/**
 * 휴지통 — 삭제한 글·페이지를 보고, 되살리거나 영구 삭제한다.
 * 담긴 지 30일이 지나면 자동으로 비워진다.
 */
export const trashRouter = Router()

const DAY = 24 * 60 * 60 * 1000

trashRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    await purgeExpiredTrash()
    const { type } = z.object({ type: z.enum(['post', 'page']).optional() }).parse(req.query)
    const items = await prisma.trashItem.findMany({
      where: type ? { type } : {},
      orderBy: { deletedAt: 'desc' },
      select: { id: true, type: true, originalId: true, title: true, summary: true, deletedBy: true, deletedAt: true },
    })
    res.json({
      keepDays: TRASH_KEEP_DAYS,
      items: items.map((i) => ({
        ...i,
        deletedAt: i.deletedAt.toISOString(),
        // 자동으로 비워지는 날
        expiresAt: new Date(i.deletedAt.getTime() + TRASH_KEEP_DAYS * DAY).toISOString(),
      })),
    })
  }),
)

trashRouter.post(
  '/:id/restore',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) return res.status(400).json({ message: '잘못된 요청입니다.' })
    res.json(await restoreTrash(id, req.user!.sub))
  }),
)

/** 영구 삭제 — 되돌릴 수 없다. */
trashRouter.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) return res.status(400).json({ message: '잘못된 요청입니다.' })
    const { count } = await prisma.trashItem.deleteMany({ where: { id } })
    if (!count) return res.status(404).json({ message: '휴지통에서 항목을 찾을 수 없습니다.' })
    res.status(204).end()
  }),
)

/** 휴지통 비우기 — 최고관리자만 */
trashRouter.delete(
  '/',
  requireAuth,
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const { count } = await prisma.trashItem.deleteMany({})
    res.json({ count })
  }),
)
