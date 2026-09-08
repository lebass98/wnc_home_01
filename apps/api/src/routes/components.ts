import { Router } from 'express'
import { z } from 'zod'
import { componentSettingsSchema, defaultComponentResponse, type ComponentKey } from '@wnc/shared'
import { prisma } from '../lib/prisma.js'
import { requireAuth, requireAdmin } from '../lib/auth.js'
import { asyncHandler } from '../lib/handler.js'

export const componentsRouter = Router()
const keySchema = componentSettingsSchema.keyof()
const conflict = () => Object.assign(new Error('다른 화면에서 설정이 변경되었습니다. 최신 설정을 다시 불러온 뒤 저장해 주세요.'), { status: 409 })

componentsRouter.get('/', asyncHandler(async (_req, res) => {
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
