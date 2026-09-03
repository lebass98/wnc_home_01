import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { asyncHandler } from '../lib/handler.js'
import { requireAuth } from '../lib/auth.js'

/**
 * 사이트 전역 디자인 — 헤더·푸터처럼 사이트 전체에 하나만 적용되는 틀의 선택값.
 * 어떤 키가 유효한지는 web 의 등록부(apps/web/src/layouts)가 가지므로
 * 서버는 키 형식만 확인한다. 모르는 키는 화면 쪽에서 기본형으로 대체된다.
 */
export const designRouter = Router()

/** 레이아웃 키 — 영문·숫자·하이픈. 등록부의 key 형식과 같다. */
const layoutKey = z.string().trim().min(1).max(40).regex(/^[a-z0-9-]+$/i, '레이아웃 키는 영문·숫자·하이픈만 쓸 수 있습니다.')

const designInputSchema = z.object({
  header: layoutKey.optional(),
  footer: layoutKey.optional(),
})

function toResponse(row: { header: string; footer: string; updatedAt: Date }) {
  return { header: row.header, footer: row.footer, updatedAt: row.updatedAt.toISOString() }
}

/** 디자인 행이 없으면 기본값으로 만들어 돌려준다. */
async function loadDesign() {
  const found = await prisma.siteDesign.findFirst({ orderBy: { id: 'asc' } })
  if (found) return found
  return prisma.siteDesign.create({ data: {} })
}

// 홈페이지가 처음 뜰 때 읽어 가므로 공개로 둔다.
designRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json(toResponse(await loadDesign()))
  }),
)

designRouter.put(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = designInputSchema.parse(req.body)
    const existing = await loadDesign()
    const updated = await prisma.siteDesign.update({ where: { id: existing.id }, data })
    res.json(toResponse(updated))
  }),
)
