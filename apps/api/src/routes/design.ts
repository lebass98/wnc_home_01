import { Router } from 'express'
import { asyncHandler } from '../lib/handler.js'
import { loadActiveTemplate } from '../lib/templates.js'

/**
 * 사이트에 지금 적용된 디자인 — 활성 템플릿의 헤더·푸터 키를 내려 준다.
 * 값을 바꾸는 일은 [템플릿 관리](/api/templates)가 맡는다.
 */
export const designRouter = Router()

// 홈페이지가 처음 뜰 때 읽어 가므로 공개로 둔다.
designRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const active = await loadActiveTemplate()
    res.json({ header: active.header, footer: active.footer, updatedAt: active.updatedAt.toISOString() })
  }),
)
