/**
 * 로그인 시도 제한 — 비밀번호를 계속 바꿔 가며 찔러 보는 것을 막는다.
 *
 * 서버 메모리에만 둔다. 서버를 다시 켜면 기록이 사라지지만,
 * 짧은 시간에 몰아치는 시도를 막는 데는 충분하고 별도 저장소가 필요 없다.
 * (여러 대로 늘릴 때는 Redis 같은 공용 저장소로 옮겨야 한다.)
 */

/** 실패를 세는 시간 창 */
const WINDOW_MS = 10 * 60 * 1000
/** 같은 계정에 대해 이 횟수를 넘겨 실패하면 잠근다. */
const MAX_PER_ACCOUNT = 5
/** 한 곳(IP)에서 계정을 바꿔 가며 시도하는 것도 막는다. */
const MAX_PER_IP = 20
/** 잠기는 시간 */
const LOCK_MS = 10 * 60 * 1000

interface Counter {
  /** 실패 횟수 */
  count: number
  /** 시간 창이 끝나는 시각 */
  resetAt: number
  /** 잠금이 풀리는 시각 (잠기지 않았으면 0) */
  lockedUntil: number
}

const counters = new Map<string, Counter>()

/** 오래된 기록은 쌓아 두지 않는다. */
function sweep(now: number) {
  if (counters.size < 500) return
  for (const [key, c] of counters) {
    if (c.resetAt < now && c.lockedUntil < now) counters.delete(key)
  }
}

function bump(key: string, max: number, now: number): number {
  const c = counters.get(key)
  if (!c || c.resetAt < now) {
    counters.set(key, { count: 1, resetAt: now + WINDOW_MS, lockedUntil: 0 })
    return 0
  }
  c.count += 1
  if (c.count >= max) {
    c.lockedUntil = now + LOCK_MS
    c.resetAt = c.lockedUntil
    return c.lockedUntil
  }
  return 0
}

const keyOf = (ip: string, email: string) => `${ip}|${email.trim().toLowerCase()}`

/**
 * 지금 로그인을 시도해도 되는지 본다.
 * 잠겨 있으면 남은 시간(분)을 돌려주고, 괜찮으면 null 을 돌려준다.
 */
export function loginLockedMinutes(ip: string, email: string): number | null {
  const now = Date.now()
  sweep(now)
  const until = Math.max(
    counters.get(keyOf(ip, email))?.lockedUntil ?? 0,
    counters.get(ip)?.lockedUntil ?? 0,
  )
  if (until <= now) return null
  return Math.max(1, Math.ceil((until - now) / 60000))
}

/** 로그인에 실패했을 때 — 횟수를 올리고, 한도를 넘으면 잠근다. */
export function noteLoginFailure(ip: string, email: string) {
  const now = Date.now()
  bump(keyOf(ip, email), MAX_PER_ACCOUNT, now)
  bump(ip, MAX_PER_IP, now)
}

/** 로그인에 성공했을 때 — 그 계정의 실패 기록을 지운다. */
export function clearLoginFailures(ip: string, email: string) {
  counters.delete(keyOf(ip, email))
}
