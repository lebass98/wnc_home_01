import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { env } from './env.js'

export interface AuthPayload {
  sub: number
  email: string
  role: 'ADMIN' | 'EDITOR'
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthPayload
    }
  }
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: '7d' })
}

/** Authorization: Bearer <token> 을 검증해 req.user 를 채운다. */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ message: '인증이 필요합니다.' })
  }
  try {
    req.user = jwt.verify(header.slice(7), env.jwtSecret) as unknown as AuthPayload
    next()
  } catch {
    res.status(401).json({ message: '토큰이 유효하지 않거나 만료되었습니다.' })
  }
}

/**
 * 토큰이 있으면 검증해 req.user 를 채우고, 없거나 잘못됐으면 그냥 통과시킨다.
 * 공개 목록·상세에서 '로그인한 관리자면 비공개 것도 보여 준다' 를 판단할 때 쓴다.
 * (헤더가 붙어 있는지만 보면 아무 문자열로도 비공개 자료가 새어 나가므로 반드시 검증한다.)
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (header?.startsWith('Bearer ')) {
    try {
      req.user = jwt.verify(header.slice(7), env.jwtSecret) as unknown as AuthPayload
    } catch {
      // 잘못된 토큰은 없는 것으로 본다 — 공개 자료는 그대로 보여 준다.
    }
  }
  next()
}

/** ADMIN 역할만 통과시킨다. requireAuth 뒤에 사용한다. */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ message: '관리자 권한이 필요합니다.' })
  }
  next()
}
