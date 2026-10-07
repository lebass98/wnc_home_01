import { Router } from 'express'
import { asyncHandler } from '../lib/handler.js'
import { prisma } from '../lib/prisma.js'
import { loadActiveTemplate } from '../lib/templates.js'

/**
 * 사이트에 지금 적용된 디자인 — 활성 템플릿의 헤더·푸터 키를 내려 준다.
 * 값을 바꾸는 일은 [템플릿 관리](/api/templates)가 맡는다.
 *
 * ?preview=<템플릿 id> 를 주면 그 템플릿을 적용하지 않고 값만 미리 보여 준다
 * ([템플릿 관리]의 '프리뷰' 가 쓴다). 없는 id 거나 지워졌으면 조용히 활성 템플릿으로 돌아간다 —
 * 프리뷰 때문에 실제 홈페이지가 깨지면 안 된다.
 */
export const designRouter = Router()

// 홈페이지가 처음 뜰 때 읽어 가므로 공개로 둔다.
designRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const previewId = Number(req.query.preview)
    if (Number.isInteger(previewId)) {
      const preview = await prisma.siteTemplate.findUnique({ where: { id: previewId } })
      if (preview) return res.json({ header: preview.header, footer: preview.footer, updatedAt: preview.updatedAt.toISOString(), preview: true })
    }
    const active = await loadActiveTemplate()
    res.json({ header: active.header, footer: active.footer, updatedAt: active.updatedAt.toISOString() })
  }),
)
