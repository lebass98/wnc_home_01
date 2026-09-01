import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { asyncHandler } from '../lib/handler.js'
import { requireAuth } from '../lib/auth.js'

export const settingsRouter = Router()

const settingInputSchema = z.object({
  siteName: z.string().trim().min(1, '사이트 이름을 입력하세요.').max(100),
  siteUrl: z.string().trim().url('사이트 URL 은 http:// 또는 https:// 로 시작하는 주소여야 합니다.').max(200),
  description: z.string().max(500).nullable().optional(),
  adminEmail: z.string().trim().email('관리자 이메일 형식이 올바르지 않습니다.').max(200),
  titleImage: z.string().max(500).nullable().optional(),
})

type SettingRow = Record<string, any>

function toResponse(row: SettingRow) {
  return {
    siteName: row.siteName,
    siteUrl: row.siteUrl,
    description: row.description,
    adminEmail: row.adminEmail,
    titleImage: row.titleImage,
    updatedAt: row.updatedAt.toISOString(),
  }
}

/** 설정 행이 없으면 기본값으로 만들어 돌려준다. */
async function loadSetting() {
  const found = await prisma.siteSetting.findFirst({ orderBy: { id: 'asc' } })
  if (found) return found
  return prisma.siteSetting.create({
    data: { siteName: '워드앤코드', siteUrl: 'https://wnc.co.kr', adminEmail: 'admin@wnc.co.kr' },
  })
}

settingsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json(toResponse(await loadSetting()))
  }),
)

settingsRouter.put(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = settingInputSchema.parse(req.body)
    const existing = await loadSetting()

    const updated = await prisma.siteSetting.update({
      where: { id: existing.id },
      data: {
        siteName: data.siteName,
        siteUrl: data.siteUrl,
        description: data.description ?? null,
        adminEmail: data.adminEmail,
        titleImage: data.titleImage ?? null,
      },
    })
    res.json(toResponse(updated))
  }),
)
