import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { asyncHandler } from '../lib/handler.js'
import { requireAuth } from '../lib/auth.js'

export const popupsRouter = Router()

const popupInputSchema = z
  .object({
    name: z.string().trim().min(1, '팝업 이름을 입력하세요.').max(60),
    placement: z.enum(['main', 'path']).default('main'),
    placementPath: z.string().max(500).nullable().optional(),
    windowType: z.enum(['window', 'fixed', 'draggable']).default('fixed'),
    scrollbar: z.enum(['auto', 'none', 'always']).default('none'),
    content: z.string().default(''),
    image: z.string().max(2000).nullable().optional(),
    linkUrl: z.string().max(500).nullable().optional(),
    linkNewTab: z.boolean().default(false),
    startAt: z.string().min(1, '시작일을 선택하세요.'),
    endAt: z.string().min(1, '종료일을 선택하세요.'),
    enabled: z.boolean().default(true),
    positionTop: z.number().int().min(0).max(3000).default(120),
    positionLeft: z.number().int().min(0).max(3000).default(120),
    width: z.number().int().min(100, '가로는 100 이상이어야 합니다.').max(2000).default(400),
    height: z.number().int().min(100, '세로는 100 이상이어야 합니다.').max(2000).default(500),
    hidePeriod: z.enum(['day', 'never', 'session']).default('day'),
    sortOrder: z.number().int().optional(),
  })
  // '특정페이지'를 골랐으면 어느 주소인지 반드시 있어야 한다.
  .refine((v) => v.placement !== 'path' || Boolean(v.placementPath?.trim()), {
    message: '특정페이지를 고르면 노출할 페이지 주소를 입력해야 합니다.',
    path: ['placementPath'],
  })
  // 기간이 뒤집히면 어떤 계산도 맞지 않으므로 저장 전에 막는다.
  .refine((v) => new Date(v.startAt) <= new Date(v.endAt), {
    message: '종료일은 시작일보다 뒤여야 합니다.',
    path: ['endAt'],
  })

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  sort: z.enum(['latest', 'oldest', 'startAt', 'name']).default('latest'),
  q: z.string().trim().min(1).optional(),
  /** 진행 상태 필터 — 쉼표로 여러 개를 넘긴다 (waiting,ongoing …). 비우면 전체. */
  status: z.string().trim().optional(),
  /** 게시기간이 이 구간과 겹치는 팝업만 본다. */
  from: z.string().trim().optional(),
  to: z.string().trim().optional(),
})

type PopupRow = Record<string, any>

/** 사용여부와 게시기간으로 지금 상태를 계산한다. */
function statusOf(p: PopupRow, now: Date): 'waiting' | 'ongoing' | 'ended' | 'stopped' {
  if (!p.enabled) return 'stopped'
  if (now < p.startAt) return 'waiting'
  if (now > p.endAt) return 'ended'
  return 'ongoing'
}

function toListItem(p: PopupRow, now: Date) {
  return {
    id: p.id,
    name: p.name,
    placement: p.placement,
    placementPath: p.placementPath,
    windowType: p.windowType,
    image: p.image,
    linkUrl: p.linkUrl,
    linkNewTab: p.linkNewTab,
    startAt: p.startAt.toISOString(),
    endAt: p.endAt.toISOString(),
    enabled: p.enabled,
    status: statusOf(p, now),
    sortOrder: p.sortOrder,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }
}

function toDetail(p: PopupRow, now: Date) {
  return {
    ...toListItem(p, now),
    content: p.content,
    scrollbar: p.scrollbar,
    positionTop: p.positionTop,
    positionLeft: p.positionLeft,
    width: p.width,
    height: p.height,
    hidePeriod: p.hidePeriod,
  }
}

/** 입력값을 DB 저장 형태로 바꾼다. 날짜는 문자열로 들어오므로 Date 로 옮긴다. */
function toWriteData(data: z.infer<typeof popupInputSchema>) {
  return {
    name: data.name,
    placement: data.placement,
    placementPath: data.placement === 'path' ? (data.placementPath?.trim() || null) : null,
    windowType: data.windowType,
    scrollbar: data.scrollbar,
    content: data.content,
    image: data.image || null,
    linkUrl: data.linkUrl || null,
    linkNewTab: data.linkNewTab,
    startAt: new Date(data.startAt),
    endAt: new Date(data.endAt),
    enabled: data.enabled,
    positionTop: data.positionTop,
    positionLeft: data.positionLeft,
    width: data.width,
    height: data.height,
    hidePeriod: data.hidePeriod,
  }
}

/** 지금 홈페이지에 띄울 팝업 — 사용중이고 게시기간 안인 것만 준다. */
popupsRouter.get(
  '/active',
  asyncHandler(async (_req, res) => {
    const now = new Date()
    const items = await prisma.popup.findMany({
      where: { enabled: true, startAt: { lte: now }, endAt: { gte: now } },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    })
    res.json(items.map((p) => toDetail(p, now)))
  }),
)

/** 관리자 목록 — 검색·상태·기간으로 걸러 페이지 단위로 준다. */
popupsRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { page, pageSize, sort, q, status, from, to } = listQuerySchema.parse(req.query)
    const now = new Date()

    const where: Record<string, any> = {}
    if (q) where.name = { contains: q }
    // 게시기간이 검색 구간과 조금이라도 겹치면 결과에 넣는다.
    if (from) where.endAt = { gte: new Date(from) }
    if (to) where.startAt = { lte: new Date(`${to.slice(0, 10)}T23:59:59`) }

    const orderBy =
      sort === 'oldest'
        ? [{ createdAt: 'asc' as const }]
        : sort === 'startAt'
          ? [{ startAt: 'desc' as const }]
          : sort === 'name'
            ? [{ name: 'asc' as const }]
            : [{ createdAt: 'desc' as const }]

    // 상태는 저장된 값이 아니라 지금 시각으로 계산하는 값이라 DB 로는 거를 수 없다.
    // 조건에 맞는 행을 모두 읽은 뒤 메모리에서 걸러 페이지를 나눈다.
    const wanted = status
      ? status.split(',').map((s) => s.trim()).filter(Boolean)
      : []

    const rows = await prisma.popup.findMany({ where, orderBy })
    const filtered =
      wanted.length > 0 ? rows.filter((p) => wanted.includes(statusOf(p, now))) : rows

    const total = filtered.length
    res.json({
      items: filtered.slice((page - 1) * pageSize, page * pageSize).map((p) => toListItem(p, now)),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    })
  }),
)

popupsRouter.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) return res.status(400).json({ message: '잘못된 요청입니다.' })

    const popup = await prisma.popup.findUnique({ where: { id } })
    if (!popup) return res.status(404).json({ message: '팝업을 찾을 수 없습니다.' })
    res.json(toDetail(popup, new Date()))
  }),
)

popupsRouter.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = popupInputSchema.parse(req.body)
    const popup = await prisma.popup.create({
      data: { ...toWriteData(data), sortOrder: data.sortOrder ?? 0 },
    })
    res.status(201).json(toDetail(popup, new Date()))
  }),
)

popupsRouter.put(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) return res.status(400).json({ message: '잘못된 요청입니다.' })

    const data = popupInputSchema.parse(req.body)
    const existing = await prisma.popup.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ message: '팝업을 찾을 수 없습니다.' })

    const popup = await prisma.popup.update({
      where: { id },
      data: { ...toWriteData(data), sortOrder: data.sortOrder ?? existing.sortOrder },
    })
    res.json(toDetail(popup, new Date()))
  }),
)

/** 목록에서 사용여부만 바로 바꾼다. */
popupsRouter.patch(
  '/:id/enabled',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) return res.status(400).json({ message: '잘못된 요청입니다.' })

    const { enabled } = z.object({ enabled: z.boolean() }).parse(req.body)
    const existing = await prisma.popup.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ message: '팝업을 찾을 수 없습니다.' })

    const popup = await prisma.popup.update({ where: { id }, data: { enabled } })
    res.json(toListItem(popup, new Date()))
  }),
)

/** 선택한 여러 개를 한 번에 지운다. */
popupsRouter.post(
  '/bulk-delete',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { ids } = z
      .object({ ids: z.array(z.number().int()).min(1, '팝업을 선택하세요.') })
      .parse(req.body)

    const result = await prisma.popup.deleteMany({ where: { id: { in: ids } } })
    res.json({ deleted: result.count })
  }),
)

popupsRouter.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) return res.status(400).json({ message: '잘못된 요청입니다.' })

    const existing = await prisma.popup.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ message: '팝업을 찾을 수 없습니다.' })

    await prisma.popup.delete({ where: { id } })
    res.status(204).end()
  }),
)
