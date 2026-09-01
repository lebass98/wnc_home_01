import type { NextFunction, Request, RequestHandler, Response } from 'express'
import { ZodError } from 'zod'

/** async 라우트 핸들러의 rejection 을 express 에러 미들웨어로 넘긴다. */
export function asyncHandler(fn: RequestHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      message: '입력값이 올바르지 않습니다.',
      issues: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    })
  }
  // status 를 가진 에러는 의도적으로 던진 것이므로 그대로 전달한다.
  const known = err as { status?: number; message?: string }
  if (typeof known?.status === 'number' && known.status >= 400 && known.status < 500) {
    return res.status(known.status).json({ message: known.message ?? '요청을 처리할 수 없습니다.' })
  }

  console.error(err)
  res.status(500).json({ message: '서버 오류가 발생했습니다.' })
}
