import type { NextFunction, Request, Response } from 'express'
import { describeActivity, summarizeActivityBody } from '@wnc/shared'
import { prisma } from './prisma.js'

/**
 * 관리자 활동 로그.
 *
 * 화면마다 기록 코드를 넣지 않고, /api 아래의 모든 변경 요청(POST·PUT·PATCH·DELETE)을
 * 응답이 끝난 시점에 한 곳에서 잡아 남긴다. 그래야 새 기능이 생겨도 빠지지 않는다.
 * 실패한 요청(4xx·5xx)은 남기지 않되, 권한 없는 요청(403)은 보안 이벤트로 남긴다.
 * 로그인·실패·잠금은 auth 라우트가 직접 부른다.
 */

interface ActivityInput {
  type: 'ADMIN' | 'SYSTEM'
  action: string
  description: string
  target?: string | null
  targetId?: string | null
  actor?: { id: number; name?: string | null; email?: string | null } | null
  ip?: string | null
  detail?: Record<string, unknown> | null
}

/** 로그 한 줄을 남긴다. 기록이 실패해도 본 요청에는 영향을 주지 않는다. */
export function recordActivity(input: ActivityInput) {
  prisma.activityLog
    .create({
      data: {
        type: input.type,
        action: input.action,
        description: input.description,
        target: input.target ?? null,
        targetId: input.targetId ?? null,
        actorId: input.actor?.id ?? null,
        actorName: input.actor?.name ?? null,
        actorEmail: input.actor?.email ?? null,
        ip: input.ip ?? null,
        detail: input.detail ? JSON.stringify(input.detail) : null,
      },
    })
    .catch((e) => console.error('활동 로그 기록 실패:', e))
}

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

/** 요청을 보낸 곳 — 프록시 뒤라면 X-Forwarded-For 의 첫 값 */
export function clientIp(req: Request): string {
  const fwd = req.headers['x-forwarded-for']
  const first = Array.isArray(fwd) ? fwd[0] : fwd?.split(',')[0]
  const ip = (first ?? req.ip ?? '').trim().replace(/^::ffff:/, '')
  // 같은 컴퓨터에서 온 IPv6 루프백은 읽기 쉽게 127.0.0.1 로 적는다.
  return ip === '::1' ? '127.0.0.1' : ip
}

/** 모든 변경 요청을 응답이 끝난 뒤 기록하는 미들웨어. 라우터보다 앞에 건다. */
export function activityLogger(req: Request, res: Response, next: NextFunction) {
  if (!MUTATING.has(req.method)) return next()
  // 로그인은 auth 라우트가 성공·실패를 구분해 직접 남긴다.
  if (req.path.startsWith('/auth/')) return next()

  const ip = clientIp(req)
  res.on('finish', () => {
    const user = req.user
    const described = describeActivity(req.method, req.originalUrl.replace(/^\/api/, ''), req.body)
    if (!described) return
    const detail = {
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      body: summarizeActivityBody(req.body),
    }

    // 권한이 없어 막힌 요청 — 누가 무엇을 하려 했는지 보안 이벤트로 남긴다.
    if (res.statusCode === 403 && user) {
      recordActivity({
        type: 'SYSTEM',
        action: '권한 없음',
        description: `권한 없는 요청 차단 — ${described.description}`,
        target: described.target,
        targetId: described.targetId,
        actor: { id: user.sub, email: user.email },
        ip,
        detail,
      })
      return
    }
    if (res.statusCode >= 400) return

    if (user) {
      // 토큰에는 이름이 없으므로 기록 직전에 한 번 찾아 붙인다 (없어도 기록은 남긴다).
      prisma.user
        .findUnique({ where: { id: user.sub }, select: { name: true } })
        .catch(() => null)
        .then((u) =>
          recordActivity({
            type: 'ADMIN',
            action: described.action,
            description: described.description,
            target: described.target,
            targetId: described.targetId,
            actor: { id: user.sub, email: user.email, name: u?.name ?? null },
            ip,
            detail,
          }),
        )
      return
    }
    // 로그인 없이 들어오는 변경은 방문자 문의뿐이다 — 시스템 이벤트로 남긴다.
    if (req.path === '/contacts') {
      const b = (req.body ?? {}) as Record<string, unknown>
      recordActivity({
        type: 'SYSTEM',
        action: '문의 접수',
        description: `방문자 문의 접수 — ${String(b.name ?? '').slice(0, 30)}`,
        target: '문의',
        ip,
        detail,
      })
    }
  })
  next()
}
