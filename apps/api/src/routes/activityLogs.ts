import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { asyncHandler } from '../lib/handler.js'
import { requireAdmin, requireAuth } from '../lib/auth.js'

/** 관리자 활동 로그 조회·삭제 — 최고관리자만 본다. */
export const activityLogsRouter = Router()

const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  type: z.enum(['ADMIN', 'SYSTEM']).optional(),
  q: z.string().trim().min(1).optional(),
  actorId: z.coerce.number().int().positive().optional(),
  /** ISO 날짜·시각 */
  from: z.string().trim().min(1).optional(),
  to: z.string().trim().min(1).optional(),
  sort: z.enum(['desc', 'asc']).default('desc'),
})

function parseDate(v?: string): Date | undefined {
  if (!v) return undefined
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? undefined : d
}

activityLogsRouter.get(
  '/',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { page, pageSize, type, q, actorId, from, to, sort } = listSchema.parse(req.query)
    const gte = parseDate(from)
    const lte = parseDate(to)
    const where = {
      ...(type ? { type } : {}),
      ...(actorId ? { actorId } : {}),
      ...(gte || lte ? { createdAt: { ...(gte ? { gte } : {}), ...(lte ? { lte } : {}) } } : {}),
      ...(q
        ? {
            OR: [
              { description: { contains: q } },
              { action: { contains: q } },
              { target: { contains: q } },
              { actorName: { contains: q } },
              { actorEmail: { contains: q } },
              { ip: { contains: q } },
            ],
          }
        : {}),
    }
    const [rows, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        orderBy: { id: sort },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.activityLog.count({ where }),
    ])
    res.json({
      items: rows.map((r) => ({
        ...r,
        detail: r.detail ? (JSON.parse(r.detail) as Record<string, unknown>) : null,
        createdAt: r.createdAt.toISOString(),
      })),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    })
  }),
)

/** 행위자 목록 — 필터의 선택지. 로그가 있는 사람만 나온다. */
activityLogsRouter.get(
  '/actors',
  requireAuth,
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const groups = await prisma.activityLog.groupBy({
      by: ['actorId', 'actorName', 'actorEmail'],
      where: { actorId: { not: null } },
      _count: { _all: true },
    })
    // 같은 사람이 이름을 바꿨으면 여러 줄로 나오므로 id 로 합친다.
    const byId = new Map<number, { actorId: number; actorName: string; actorEmail: string; count: number }>()
    for (const g of groups) {
      if (g.actorId === null) continue
      const cur = byId.get(g.actorId)
      if (cur) cur.count += g._count._all
      else byId.set(g.actorId, { actorId: g.actorId, actorName: g.actorName ?? '', actorEmail: g.actorEmail ?? '', count: g._count._all })
    }
    res.json([...byId.values()].sort((a, b) => b.count - a.count))
  }),
)

/** 고른 로그를 지운다. 이 삭제 자체도 활동 로그로 남는다. */
activityLogsRouter.delete(
  '/',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { ids } = z.object({ ids: z.array(z.number().int().positive()).min(1).max(500) }).parse(req.body)
    const result = await prisma.activityLog.deleteMany({ where: { id: { in: ids } } })
    res.json({ deleted: result.count })
  }),
)
