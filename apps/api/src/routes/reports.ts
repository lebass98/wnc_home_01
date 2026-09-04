import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { asyncHandler } from '../lib/handler.js'
import { requireAuth } from '../lib/auth.js'
import { loadBoardSetting } from '../lib/boardSetting.js'

/**
 * 게시글 신고 — 방문자가 접수하고 관리자가 [게시판 신고현황]에서 처리한다.
 *
 * 접수는 로그인 없이 하므로, 같은 곳(IP)에서 같은 글을 거듭 신고하지 못하게 막는다.
 * 신고가 환경설정에 정한 수만큼 쌓이면 그 글을 목록에서 가린다(관리자가 처리하면 다시 보인다).
 */
export const reportsRouter = Router()

/** 접수한 사람을 구분할 값 — 프록시를 거치면 X-Forwarded-For 의 맨 앞이 실제 주소다. */
function clientIp(req: { headers: Record<string, unknown>; ip?: string }): string {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.trim()) return forwarded.split(',')[0].trim()
  return req.ip ?? ''
}

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['all', 'NEW', 'DONE', 'REJECTED']).default('all'),
  q: z.string().trim().min(1).optional(),
})

type ReportRow = Record<string, any>

function toItem(r: ReportRow) {
  return {
    id: r.id,
    postId: r.postId,
    postTitle: r.post?.title ?? null,
    boardSlug: r.post?.category ?? null,
    reason: r.reason,
    detail: r.detail,
    status: r.status,
    memo: r.memo,
    postReportCount: r.post?.reportCount ?? 0,
    postHidden: r.post?.hiddenByReport ?? false,
    createdAt: r.createdAt.toISOString(),
  }
}

/** 접수 — 홈페이지 글 상세의 [신고] 가 부른다. */
reportsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const setting = await loadBoardSetting()
    if (!setting.reportEnabled) {
      return res.status(400).json({ message: '지금은 신고를 받고 있지 않습니다.' })
    }

    const { postId, reason, detail } = z
      .object({
        postId: z.number().int(),
        reason: z.string().trim().min(1, '신고 사유를 골라 주세요.').max(50),
        detail: z.string().trim().max(500).default(''),
      })
      .parse(req.body)

    const post = await prisma.post.findUnique({ where: { id: postId } })
    if (!post || !post.published) return res.status(404).json({ message: '글을 찾을 수 없습니다.' })

    // 환경설정에 적어 둔 사유만 받는다.
    const reasons = String(setting.reportReasons)
      .split('\n')
      .map((x: string) => x.trim())
      .filter(Boolean)
    if (!reasons.includes(reason)) return res.status(400).json({ message: '고를 수 없는 신고 사유입니다.' })

    // 같은 곳에서 같은 글을 거듭 신고하지 못하게 막는다.
    const ip = clientIp(req)
    if (ip) {
      const already = await prisma.postReport.findFirst({ where: { postId, ip } })
      if (already) return res.status(409).json({ message: '이미 신고한 글입니다. 확인 후 처리해 드리겠습니다.' })
    }

    await prisma.postReport.create({ data: { postId, reason, detail, ip } })

    // 신고 수를 올리고, 정한 수를 넘으면 목록에서 가린다.
    const count = await prisma.postReport.count({ where: { postId } })
    const hide = setting.reportHideAt > 0 && count >= setting.reportHideAt
    await prisma.post.update({
      where: { id: postId },
      data: { reportCount: count, ...(hide ? { hiddenByReport: true } : {}) },
    })

    res.status(201).json({ ok: true, message: '신고를 접수했습니다. 확인 후 조치하겠습니다.' })
  }),
)

/** 관리자 목록 — 상태로 거르고 글 제목·사유로 찾는다. */
reportsRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { page, pageSize, status, q } = listQuerySchema.parse(req.query)
    const where = {
      ...(status === 'all' ? {} : { status }),
      ...(q ? { OR: [{ reason: { contains: q } }, { detail: { contains: q } }, { post: { title: { contains: q } } }] } : {}),
    }

    const [items, total] = await Promise.all([
      prisma.postReport.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { post: { select: { title: true, category: true, reportCount: true, hiddenByReport: true } } },
      }),
      prisma.postReport.count({ where }),
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

/** 처리 — 상태와 메모를 바꾼다. 처리·반려하면 그 글의 가림을 푼다. */
reportsRouter.patch(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) return res.status(400).json({ message: '잘못된 요청입니다.' })

    const { status, memo } = z
      .object({ status: z.enum(['NEW', 'DONE', 'REJECTED']).optional(), memo: z.string().max(500).optional() })
      .parse(req.body)

    const found = await prisma.postReport.findUnique({ where: { id } })
    if (!found) return res.status(404).json({ message: '신고를 찾을 수 없습니다.' })

    const updated = await prisma.postReport.update({
      where: { id },
      data: { ...(status ? { status } : {}), ...(memo === undefined ? {} : { memo }) },
      include: { post: { select: { title: true, category: true, reportCount: true, hiddenByReport: true } } },
    })

    // 관리자가 손을 봤으면 자동으로 가려 둔 글을 다시 보이게 한다.
    if (status && status !== 'NEW') {
      const remaining = await prisma.postReport.count({ where: { postId: found.postId, status: 'NEW' } })
      if (remaining === 0) await prisma.post.update({ where: { id: found.postId }, data: { hiddenByReport: false } })
    }
    res.json(toItem(updated))
  }),
)

reportsRouter.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id)
    const found = await prisma.postReport.findUnique({ where: { id } })
    if (!found) return res.status(404).json({ message: '신고를 찾을 수 없습니다.' })

    await prisma.postReport.delete({ where: { id } })
    const count = await prisma.postReport.count({ where: { postId: found.postId } })
    await prisma.post.update({ where: { id: found.postId }, data: { reportCount: count } })
    res.json({ ok: true })
  }),
)
