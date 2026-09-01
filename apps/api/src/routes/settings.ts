import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { asyncHandler } from '../lib/handler.js'
import { requireAuth } from '../lib/auth.js'

export const settingsRouter = Router()

/** 빈 문자열은 null 로 지우고, 아예 보내지 않은 항목은 그대로 둔다. */
const optionalText = (max: number) =>
  z
    .string()
    .max(max)
    .nullable()
    .optional()
    .transform((v) => (v === undefined ? undefined : v?.trim() ? v.trim() : null))

const settingInputSchema = z.object({
  siteName: z.string().trim().min(1, '사이트 이름을 입력하세요.').max(100),
  siteUrl: z.string().trim().url('사이트 URL 은 http:// 또는 https:// 로 시작하는 주소여야 합니다.').max(200),
  description: z.string().max(500).nullable().optional(),
  adminEmail: z.string().trim().email('관리자 이메일 형식이 올바르지 않습니다.').max(200),
  titleImage: z.string().max(500).nullable().optional(),
})

type SettingRow = Record<string, any>

const seoInputSchema = z.object({
  metaTitle: optionalText(120),
  metaDescription: optionalText(400),
  metaKeywords: optionalText(300),
  ogEnabled: z.boolean().optional(),
  ogTitle: optionalText(120),
  ogDescription: optionalText(400),
  ogImage: optionalText(500),
  ogImageAlt: optionalText(200),
  ogSiteName: optionalText(100),
  ogType: z
    .enum(['website', 'article'], {
      errorMap: () => ({ message: 'og:type 은 website 또는 article 만 쓸 수 있습니다.' }),
    })
    .optional(),
  ogLocale: z.string().trim().max(20).optional(),
  allowIndexing: z.boolean(),
  googleVerification: optionalText(200),
  naverVerification: optionalText(200),
  gaId: optionalText(50),
})

function toResponse(row: SettingRow) {
  return {
    siteName: row.siteName,
    siteUrl: row.siteUrl,
    description: row.description,
    adminEmail: row.adminEmail,
    titleImage: row.titleImage,
    metaTitle: row.metaTitle,
    metaDescription: row.metaDescription,
    metaKeywords: row.metaKeywords,
    ogEnabled: row.ogEnabled,
    ogTitle: row.ogTitle,
    ogDescription: row.ogDescription,
    ogImage: row.ogImage,
    ogImageAlt: row.ogImageAlt,
    ogSiteName: row.ogSiteName,
    ogType: row.ogType,
    ogLocale: row.ogLocale,
    allowIndexing: row.allowIndexing,
    googleVerification: row.googleVerification,
    naverVerification: row.naverVerification,
    gaId: row.gaId,
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

/** SEO 탭은 따로 저장한다 — 일반 탭 값을 건드리지 않는다. */
settingsRouter.put(
  '/seo',
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = seoInputSchema.parse(req.body)
    const existing = await loadSetting()

    const updated = await prisma.siteSetting.update({ where: { id: existing.id }, data })
    res.json(toResponse(updated))
  }),
)
