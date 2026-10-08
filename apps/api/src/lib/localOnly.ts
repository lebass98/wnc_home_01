import type { RequestHandler } from 'express'
import { env } from './env.js'

/**
 * 로컬 전용 기능 막기 — 배포 서버(Vercel)는 파일을 계속 저장할 수 없어,
 * 사이트 소스·templates 폴더를 바꾸는 기능은 로컬 개발 서버에서만 돈다.
 * allow 에 맞는 요청(DB 만 다루는 것)은 그대로 통과시킨다.
 */
export function localOnly(feature: string, allow: (method: string, path: string) => boolean = () => false): RequestHandler {
  return (req, res, next) => {
    if (!env.serverless || allow(req.method, req.path)) return next()
    res.status(400).json({
      message: `배포 서버에서는 할 수 없는 작업입니다 (${feature}). 로컬 개발 서버(http://localhost:5173/admin)에서 작업한 뒤 커밋·푸시하면 배포에 반영됩니다.`,
    })
  }
}
