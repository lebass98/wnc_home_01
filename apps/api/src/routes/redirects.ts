import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { asyncHandler } from '../lib/handler.js'
import { requireAdmin, requireAuth } from '../lib/auth.js'

/**
 * 리디렉션 — 옛 주소로 들어온 방문자를 새 주소로 넘긴다.
 * 홈페이지는 화면 하나짜리 앱(SPA)이라 넘기는 일은 브라우저가 하고, 서버는 규칙 목록과 이용 횟수를 맡는다.
 */
export const redirectsRouter = Router()

/** 경로를 같은 모양으로 맞춘다 — 앞 / 하나, 쿼리·# 제거, 겹친 / 하나로, 끝 / 제거 */
export function normalizePath(raw: string): string {
  let p = raw.trim().split(/[?#]/)[0]
  try {
    if (/^https?:\/\//i.test(p)) p = new URL(p).pathname
  } catch {
    // 주소가 아니면 그대로 경로로 본다.
  }
  p = `/${p}`.replace(/\/{2,}/g, '/')
  return p.length > 1 ? p.replace(/\/+$/, '') : p
}

/** 넘기면 안 되는 경로 — 홈·관리자·API·업로드 파일 */
const RESERVED = /^\/(admin|api|uploads)(\/|$)/i

const inputSchema = z
  .object({
    fromPath: z
      .string()
      .trim()
      .min(1, '옛 주소를 입력하세요.')
      .max(300)
      .transform(normalizePath)
      .refine((p) => p !== '/', '홈(/)은 넘길 수 없습니다.')
      .refine((p) => !RESERVED.test(p), '관리자(/admin)·API(/api)·업로드(/uploads) 주소는 넘길 수 없습니다.'),
    toUrl: z
      .string()
      .trim()
      .min(1, '새 주소를 입력하세요.')
      .max(1000)
      .refine((v) => v.startsWith('/') || /^https?:\/\//i.test(v), '새 주소는 /로 시작하는 사이트 주소나 https:// 주소여야 합니다.'),
    code: z.union([z.literal(301), z.literal(302)]).default(301),
    enabled: z.boolean().default(true),
    note: z.string().trim().max(200).default(''),
  })
  .refine((v) => !v.toUrl.startsWith('/') || normalizePath(v.toUrl) !== v.fromPath, {
    message: '옛 주소와 새 주소가 같습니다.',
    path: ['toUrl'],
  })

const toItem = (r: Awaited<ReturnType<typeof prisma.redirect.findFirstOrThrow>>) => ({
  ...r,
  lastHitAt: r.lastHitAt ? r.lastHitAt.toISOString() : null,
  createdAt: r.createdAt.toISOString(),
  updatedAt: r.updatedAt.toISOString(),
})

/** 홈페이지용 — 켜진 규칙만 가볍게 */
redirectsRouter.get(
  '/active',
  asyncHandler(async (_req, res) => {
    const rows = await prisma.redirect.findMany({ where: { enabled: true }, select: { fromPath: true, toUrl: true, code: true } })
    res.json(rows)
  }),
)

/** 홈페이지가 넘길 때 알린다 — 이용 횟수를 센다. */
redirectsRouter.post(
  '/hit',
  asyncHandler(async (req, res) => {
    const { fromPath } = z.object({ fromPath: z.string().max(300) }).parse(req.body)
    await prisma.redirect.updateMany({
      where: { fromPath: normalizePath(fromPath), enabled: true },
      data: { hits: { increment: 1 }, lastHitAt: new Date() },
    })
    res.status(204).end()
  }),
)

redirectsRouter.get(
  '/',
  requireAuth,
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const rows = await prisma.redirect.findMany({ orderBy: { createdAt: 'desc' } })
    res.json(rows.map(toItem))
  }),
)

async function assertFree(fromPath: string, excludeId?: number) {
  const found = await prisma.redirect.findUnique({ where: { fromPath } })
  if (found && found.id !== excludeId) {
    throw Object.assign(new Error(`'${fromPath}' 은 이미 다른 규칙이 넘기고 있습니다. 그 규칙을 고쳐 주세요.`), { status: 409 })
  }
}

redirectsRouter.post(
  '/',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const data = inputSchema.parse(req.body)
    await assertFree(data.fromPath)
    res.status(201).json(toItem(await prisma.redirect.create({ data })))
  }),
)

redirectsRouter.put(
  '/:id',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) return res.status(400).json({ message: '잘못된 요청입니다.' })
    const data = inputSchema.parse(req.body)
    await assertFree(data.fromPath, id)
    const found = await prisma.redirect.findUnique({ where: { id } })
    if (!found) return res.status(404).json({ message: '리디렉션을 찾을 수 없습니다.' })
    res.json(toItem(await prisma.redirect.update({ where: { id }, data })))
  }),
)

redirectsRouter.delete(
  '/:id',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id)
    const { count } = await prisma.redirect.deleteMany({ where: { id } })
    if (!count) return res.status(404).json({ message: '리디렉션을 찾을 수 없습니다.' })
    res.status(204).end()
  }),
)
