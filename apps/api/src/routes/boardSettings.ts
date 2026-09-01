import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { asyncHandler } from '../lib/handler.js'
import { requireAuth } from '../lib/auth.js'

export const boardSettingsRouter = Router()

/**
 * 공개 사이트가 페이지를 열 때마다 읽는 값이라 메모리에 들고 있는다.
 * 저장하거나 '캐시 초기화' 를 누르면 비운다.
 */
let cached: Record<string, any> | null = null

const seoInputSchema = z.object({
  seoListTitle: z.string().max(200),
  seoListDescription: z.string().max(400),
  seoBoardTitle: z.string().max(200),
  seoBoardDescription: z.string().max(400),
  seoPostTitle: z.string().max(200),
  seoPostDescription: z.string().max(400),
  seoServeList: z.boolean(),
  seoServeBoard: z.boolean(),
  seoServePost: z.boolean(),
})

function toResponse(row: Record<string, any>) {
  return {
    seoListTitle: row.seoListTitle,
    seoListDescription: row.seoListDescription,
    seoBoardTitle: row.seoBoardTitle,
    seoBoardDescription: row.seoBoardDescription,
    seoPostTitle: row.seoPostTitle,
    seoPostDescription: row.seoPostDescription,
    seoServeList: row.seoServeList,
    seoServeBoard: row.seoServeBoard,
    seoServePost: row.seoServePost,
    seoCacheResetAt: row.seoCacheResetAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

/** 설정 행이 없으면 기본값으로 만들어 돌려준다. */
async function loadSetting() {
  if (cached) return cached
  const found = await prisma.boardSetting.findFirst({ orderBy: { id: 'asc' } })
  cached = found ?? (await prisma.boardSetting.create({ data: {} }))
  return cached
}

boardSettingsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json(toResponse(await loadSetting()))
  }),
)

boardSettingsRouter.put(
  '/seo',
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = seoInputSchema.parse(req.body)
    const existing = await loadSetting()

    // 저장하면 캐시도 함께 비운다.
    const updated = await prisma.boardSetting.update({
      where: { id: existing.id },
      data: { ...data, seoCacheResetAt: new Date() },
    })
    cached = updated
    res.json(toResponse(updated))
  }),
)

/** SEO 캐시를 손으로 비운다. */
boardSettingsRouter.post(
  '/seo/cache-reset',
  requireAuth,
  asyncHandler(async (_req, res) => {
    const existing = await loadSetting()
    cached = null

    const updated = await prisma.boardSetting.update({
      where: { id: existing.id },
      data: { seoCacheResetAt: new Date() },
    })
    cached = updated
    res.json(toResponse(updated))
  }),
)
