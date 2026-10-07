import { Router } from 'express'
import { z } from 'zod'
import { componentSettingsSchema, defaultComponentResponse, type ComponentKey } from '@wnc/shared'
import { prisma } from '../lib/prisma.js'
import { requireAuth, requireAdmin } from '../lib/auth.js'
import { asyncHandler } from '../lib/handler.js'
import { readTemplateComponents } from '../lib/templateFiles.js'

export const componentsRouter = Router()
const keySchema = componentSettingsSchema.keyof()
const conflict = () => Object.assign(new Error('다른 화면에서 설정이 변경되었습니다. 최신 설정을 다시 불러온 뒤 저장해 주세요.'), { status: 409 })

/**
 * ?preview=<템플릿 id> 를 주면 그 템플릿이 마지막으로 담아 둔 컴포넌트 설정(히어로 사진·로고 등)을
 * 적용하지 않고 보여 준다 — design.ts 의 /design 과 짝을 이룬다. 파일이 없거나 값이 깨졌으면
 * 그 항목만 기본값으로 둔다(프리뷰가 홈페이지를 깨뜨리면 안 된다).
 */
componentsRouter.get('/', asyncHandler(async (req, res) => {
  const previewId = Number(req.query.preview)
  if (Number.isInteger(previewId) && (await prisma.siteTemplate.findFirst({ where: { id: previewId, active: false } }))) {
    const result = defaultComponentResponse()
    const raw = (await readTemplateComponents(previewId)) as Record<string, unknown> | null
    if (raw) {
      for (const key of keySchema.options) {
        const parsed = componentSettingsSchema.shape[key].safeParse(raw[key])
        if (parsed.success) Object.assign(result.settings, { [key]: parsed.data })
      }
    }
    return res.json(result)
  }

  const result = defaultComponentResponse()
  for (const row of await prisma.componentSetting.findMany()) {
    const key = keySchema.safeParse(row.key)
    if (!key.success) continue
    const parsed = componentSettingsSchema.shape[key.data].safeParse(JSON.parse(row.value))
    if (parsed.success) Object.assign(result.settings, { [key.data]: parsed.data })
    result.revisions[key.data] = row.revision
  }
  res.json(result)
}))

componentsRouter.put('/:key', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const key: ComponentKey = keySchema.parse(req.params.key)
  const { revision, value } = z.object({ revision: z.number().int().nonnegative(), value: componentSettingsSchema.shape[key] }).parse(req.body)
  const data = JSON.stringify(value)
  if (revision === 0) {
    try {
      await prisma.componentSetting.create({ data: { key, value: data } })
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') throw conflict()
      throw error
    }
  } else {
    const saved = await prisma.componentSetting.updateMany({ where: { key, revision }, data: { value: data, revision: { increment: 1 } } })
    if (!saved.count) throw conflict()
  }
  res.json({ key, value, revision: revision + 1 })
}))
