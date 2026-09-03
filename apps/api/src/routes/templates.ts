import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { asyncHandler } from '../lib/handler.js'
import { requireAuth } from '../lib/auth.js'
import { ensureBuiltin, loadActiveTemplate, parseLayouts, toTemplateResponse } from '../lib/templates.js'

/**
 * 템플릿 관리 — 헤더·푸터·화면별 레이아웃 선택을 한 벌(템플릿)로 묶어
 * 목록에서 활성화·복제·수정·가져오기·내보내기 한다. 활성 템플릿은 항상 정확히 하나다.
 */
export const templatesRouter = Router()

/** 레이아웃 키 — 영문·숫자·하이픈. 어떤 키가 유효한지는 web 등록부(src/layouts)가 가진다. */
const layoutKey = z.string().trim().min(1).max(40).regex(/^[a-z0-9-]+$/i, '레이아웃 키는 영문·숫자·하이픈만 쓸 수 있습니다.')

/** 경로별 서브 레이아웃 매핑 */
const pageLayoutsSchema = z.record(
  z.string().regex(/^\//, '경로는 / 로 시작해야 합니다.').max(200),
  layoutKey,
)

const nameSchema = z.string().trim().min(1, '템플릿 이름을 입력하세요.').max(100)
const descriptionSchema = z.string().trim().max(300)
const versionSchema = z.string().trim().max(30)

/** 요청한 관리자 이름 — 계정 이메일의 @ 앞부분을 쓴다. */
function authorOf(email?: string): string {
  return email ? email.split('@')[0] : ''
}

async function findTemplate(id: string) {
  const num = Number(id)
  if (!Number.isInteger(num)) return null
  return prisma.siteTemplate.findUnique({ where: { id: num } })
}

async function listAll() {
  await ensureBuiltin()
  const rows = await prisma.siteTemplate.findMany({ orderBy: [{ active: 'desc' }, { updatedAt: 'desc' }] })
  return rows.map(toTemplateResponse)
}

templatesRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (_req, res) => {
    res.json(await listAll())
  }),
)

/** 새 템플릿 — 지금 활성 템플릿을 복제해 시작한다. */
templatesRouter.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { name, description } = z.object({ name: nameSchema, description: descriptionSchema.optional() }).parse(req.body)
    const base = await loadActiveTemplate()
    const created = await prisma.siteTemplate.create({
      data: {
        name,
        description: description ?? `${base.name} 템플릿을 복제해 만든 템플릿`,
        author: authorOf(req.user?.email),
        version: '1.0.0',
        header: base.header,
        footer: base.footer,
        pageLayouts: base.pageLayouts,
      },
    })
    res.status(201).json(toTemplateResponse(created))
  }),
)

/** 템플릿 파일(JSON) 가져오기 */
templatesRouter.post(
  '/import',
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = z
      .object({
        type: z.literal('wnc-template', { errorMap: () => ({ message: '워드앤코드 템플릿 파일이 아닙니다. 내보내기로 받은 JSON 파일을 올려 주세요.' }) }),
        name: nameSchema,
        description: descriptionSchema.optional(),
        version: versionSchema.optional(),
        header: layoutKey.optional(),
        footer: layoutKey.optional(),
        pageLayouts: pageLayoutsSchema.optional(),
      })
      .parse(req.body)

    const created = await prisma.siteTemplate.create({
      data: {
        name: data.name,
        description: data.description ?? '',
        author: authorOf(req.user?.email),
        version: data.version || '1.0.0',
        header: data.header ?? 'basic',
        footer: data.footer ?? 'basic',
        pageLayouts: JSON.stringify(data.pageLayouts ?? {}),
      },
    })
    res.status(201).json(toTemplateResponse(created))
  }),
)

/** 이름·설명·버전과 구성(헤더·푸터·화면별 레이아웃)을 고친다. */
templatesRouter.put(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const row = await findTemplate(req.params.id)
    if (!row) return res.status(404).json({ message: '템플릿을 찾을 수 없습니다.' })

    const data = z
      .object({
        name: nameSchema.optional(),
        description: descriptionSchema.optional(),
        version: versionSchema.optional(),
        header: layoutKey.optional(),
        footer: layoutKey.optional(),
        pageLayouts: pageLayoutsSchema.optional(),
      })
      .parse(req.body)

    const updated = await prisma.siteTemplate.update({
      where: { id: row.id },
      data: {
        ...data,
        pageLayouts: data.pageLayouts === undefined ? undefined : JSON.stringify(data.pageLayouts),
      },
    })
    res.json(toTemplateResponse(updated))
  }),
)

/** 활성화 — 이 한 벌만 켜고 나머지는 끈다. 사이트에 바로 적용된다. */
templatesRouter.post(
  '/:id/activate',
  requireAuth,
  asyncHandler(async (req, res) => {
    const row = await findTemplate(req.params.id)
    if (!row) return res.status(404).json({ message: '템플릿을 찾을 수 없습니다.' })

    await prisma.$transaction([
      prisma.siteTemplate.updateMany({ where: { active: true }, data: { active: false } }),
      prisma.siteTemplate.update({ where: { id: row.id }, data: { active: true } }),
    ])
    res.json(await listAll())
  }),
)

/** 복제 */
templatesRouter.post(
  '/:id/duplicate',
  requireAuth,
  asyncHandler(async (req, res) => {
    const row = await findTemplate(req.params.id)
    if (!row) return res.status(404).json({ message: '템플릿을 찾을 수 없습니다.' })

    const created = await prisma.siteTemplate.create({
      data: {
        name: `${row.name} 복사본`,
        description: row.description,
        author: authorOf(req.user?.email),
        version: row.version,
        header: row.header,
        footer: row.footer,
        pageLayouts: row.pageLayouts,
      },
    })
    res.status(201).json(toTemplateResponse(created))
  }),
)

/** 내보내기 — 가져오기로 다시 들일 수 있는 JSON */
templatesRouter.get(
  '/:id/export',
  requireAuth,
  asyncHandler(async (req, res) => {
    const row = await findTemplate(req.params.id)
    if (!row) return res.status(404).json({ message: '템플릿을 찾을 수 없습니다.' })
    res.json({
      type: 'wnc-template',
      name: row.name,
      description: row.description,
      version: row.version,
      header: row.header,
      footer: row.footer,
      pageLayouts: parseLayouts(row.pageLayouts),
    })
  }),
)

templatesRouter.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const row = await findTemplate(req.params.id)
    if (!row) return res.status(404).json({ message: '템플릿을 찾을 수 없습니다.' })
    if (row.builtin) return res.status(400).json({ message: '기본 제공 템플릿은 삭제할 수 없습니다.' })
    if (row.active) return res.status(400).json({ message: '사용 중인 템플릿은 삭제할 수 없습니다. 다른 템플릿을 먼저 활성화하세요.' })

    await prisma.siteTemplate.delete({ where: { id: row.id } })
    res.json({ ok: true })
  }),
)
