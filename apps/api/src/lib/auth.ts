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

/** ADMIN 역할만 통과시킨다. requireAuth 뒤에 사용한다. */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ message: '관리자 권한이 필요합니다.' })
  }
  next()
}
