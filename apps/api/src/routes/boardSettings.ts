import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { asyncHandler } from '../lib/handler.js'
import { requireAuth, requireAdmin } from '../lib/auth.js'
import { loadBoardSetting, setBoardSettingCache } from '../lib/boardSetting.js'

export const boardSettingsRouter = Router()

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
    listCount: row.listCount,
    newDays: row.newDays,
    showAuthor: row.showAuthor,
    showSearch: row.showSearch,
    reportEnabled: row.reportEnabled,
    reportReasons: row.reportReasons,
    reportHideAt: row.reportHideAt,
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

boardSettingsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json(toResponse(await loadBoardSetting()))
  }),
)

/** 기본설정 — 홈페이지 게시판 목록이 어떻게 보일지 */
boardSettingsRouter.put(
  '/basic',
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = z
      .object({
        listCount: z.number().int().min(5, '한 쪽에 5개 이상은 보여야 합니다.').max(100, '한 쪽에 100개까지 보여줄 수 있습니다.'),
        newDays: z.number().int().min(0).max(30, "'NEW' 는 30일까지 붙일 수 있습니다."),
        showAuthor: z.boolean(),
        showSearch: z.boolean(),
      })
      .parse(req.body)

    const existing = await loadBoardSetting()
    const updated = await prisma.boardSetting.update({ where: { id: existing.id }, data })
    setBoardSettingCache(updated)
    res.json(toResponse(updated))
  }),
)

/** 게시판 설정 — 신고 접수 */
boardSettingsRouter.put(
  '/report',
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = z
      .object({
        reportEnabled: z.boolean(),
        reportReasons: z
          .string()
          .max(500)
          .transform((v) => v.split('\n').map((x) => x.trim()).filter(Boolean).join('\n'))
          .refine((v) => v.length > 0, '신고 사유를 한 줄에 하나씩 적어 주세요.'),
        reportHideAt: z.number().int().min(0).max(100),
      })
      .parse(req.body)

    const existing = await loadBoardSetting()
    const updated = await prisma.boardSetting.update({ where: { id: existing.id }, data })
    setBoardSettingCache(updated)
    res.json(toResponse(updated))
  }),
)

boardSettingsRouter.put(
  '/seo',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const data = seoInputSchema.parse(req.body)
    const existing = await loadBoardSetting()

    // 저장하면 캐시도 함께 비운다.
    const updated = await prisma.boardSetting.update({
      where: { id: existing.id },
      data: { ...data, seoCacheResetAt: new Date() },
    })
    setBoardSettingCache(updated)
    res.json(toResponse(updated))
  }),
)

/** SEO 캐시를 손으로 비운다. */
boardSettingsRouter.post(
  '/seo/cache-reset',
  requireAuth,
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const existing = await loadBoardSetting()
    setBoardSettingCache(null)

    const updated = await prisma.boardSetting.update({
      where: { id: existing.id },
      data: { seoCacheResetAt: new Date() },
    })
    setBoardSettingCache(updated)
    res.json(toResponse(updated))
  }),
)
