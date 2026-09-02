import { handleDemoRequest } from './demoApi'

const TOKEN_KEY = 'wnc_admin_token'

/**
 * 데모 모드 — 백엔드 없이 브라우저 안에서만 동작한다.
 * GitHub Pages 빌드 시 VITE_DEMO=true 로 활성화된다.
 */
export const IS_DEMO = import.meta.env.VITE_DEMO === 'true'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    /** 서버가 함께 보낸 응답 본문 — 오류 상세(예: 문법 검사 결과)를 읽을 때 쓴다. */
    public data?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  /** 토큰을 함께 보낼지 여부 (관리자 API 는 true) */
  auth?: boolean
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = false } = options

  if (IS_DEMO) {
    // 네트워크 지연을 살짝 흉내 내 로딩 상태가 자연스럽게 보이도록 한다.
    await new Promise((r) => setTimeout(r, 150))
    try {
      return handleDemoRequest(path, method, body) as T
    } catch (e) {
      const err = e as { message: string; status?: number }
      if (err.status === 401 && auth) clearToken()
      throw new ApiError(err.message, err.status ?? 500)
    }
  }

  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (auth) {
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  // 토큰이 만료되면 저장된 토큰을 지워 로그인 화면으로 유도한다.
  if (res.status === 401 && auth) {
    clearToken()
  }

  if (res.status === 204) return undefined as T

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new ApiError((data as { message?: string }).message ?? '요청에 실패했습니다.', res.status, data)
  }
  return data as T
}

/** 쿼리스트링 생성 — undefined/빈 값은 제외한다. */
export function qs(params: Record<string, string | number | boolean | undefined>): string {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === '') continue
    sp.set(k, String(v))
  }
  const s = sp.toString()
  return s ? `?${s}` : ''
}
