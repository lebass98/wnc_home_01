import { api } from './api'

/**
 * 리디렉션 규칙 — 홈페이지는 화면 하나짜리 앱이라 넘기는 일을 브라우저가 한다.
 * 켜진 규칙을 한 번 받아 두고 화면끼리 나눠 쓴다. 관리자에서 고치면 캐시를 버린다.
 */

export interface ActiveRedirect {
  fromPath: string
  toUrl: string
  code: number
}

const CHANGE_KEY = 'wnc_redirects_changed'
let rulesPromise: Promise<ActiveRedirect[]> | null = null

export function loadRedirects(): Promise<ActiveRedirect[]> {
  // 실패하면 넘기지 않고 지나간다 — 다음 화면에서 다시 받아 본다.
  rulesPromise ??= api<ActiveRedirect[]>('/redirects/active').catch(() => {
    rulesPromise = null
    return []
  })
  return rulesPromise
}

/** 관리자에서 규칙을 고친 뒤 — 이 탭과 열려 있는 홈페이지 탭이 새로 받게 한다. */
export function invalidateRedirects() {
  rulesPromise = null
  try {
    localStorage.setItem(CHANGE_KEY, String(Date.now()))
  } catch {
    // 저장소를 못 써도 이 탭은 새로 받는다.
  }
}
window.addEventListener('storage', (e) => {
  if (e.key === CHANGE_KEY) rulesPromise = null
})

/** 경로를 같은 모양으로 — 서버의 normalizePath 와 같다. 한글 주소도 비교되게 풀어 쓴다. */
export function normalizeRedirectPath(raw: string): string {
  let p = raw.trim().split(/[?#]/)[0]
  try {
    p = decodeURIComponent(p)
  } catch {
    // 잘못 인코딩된 주소는 그대로 비교한다.
  }
  p = `/${p}`.replace(/\/{2,}/g, '/')
  return p.length > 1 ? p.replace(/\/+$/, '') : p
}

/**
 * 이 경로를 어디로 넘길지 — 규칙이 이어지면(A→B→C) 끝까지 따라간다. 돌고 도는 규칙은 5번에서 멈춘다.
 * 넘길 곳이 없으면 null. 처음 걸린 규칙(이용 횟수를 셀 규칙)도 함께 돌려준다.
 */
export function resolveRedirect(pathname: string, rules: ActiveRedirect[]): { to: string; first: ActiveRedirect } | null {
  const byPath = new Map(rules.map((r) => [normalizeRedirectPath(r.fromPath), r]))
  const first = byPath.get(normalizeRedirectPath(pathname))
  if (!first) return null
  let to = first.toUrl
  for (let hop = 0; hop < 5 && to.startsWith('/'); hop++) {
    const next = byPath.get(normalizeRedirectPath(to))
    if (!next) break
    to = next.toUrl
  }
  return { to, first }
}

/** 이용 횟수를 센다 — 실패해도 넘기는 일에는 지장이 없다. */
export function reportRedirectHit(fromPath: string) {
  api('/redirects/hit', { method: 'POST', body: { fromPath } }).catch(() => {})
}
