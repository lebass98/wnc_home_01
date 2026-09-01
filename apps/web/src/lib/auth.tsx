import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { AdminUser, LoginResponse } from '@wnc/shared'
import { api, clearToken, getToken, setToken } from './api'

interface AuthContextValue {
  user: AdminUser | null
  /** 최초 토큰 검증이 끝나기 전까지 true — 라우트 깜빡임 방지용 */
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)

  // 새로고침 시 저장된 토큰이 아직 유효한지 서버에 확인한다.
  useEffect(() => {
    if (!getToken()) {
      setLoading(false)
      return
    }
    api<AdminUser>('/auth/me', { auth: true })
      .then(setUser)
      .catch(() => clearToken())
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const res = await api<LoginResponse>('/auth/login', {
      method: 'POST',
      body: { email, password },
    })
    setToken(res.token)
    setUser(res.user)
  }, [])

  const logout = useCallback(() => {
    clearToken()
    setUser(null)
  }, [])

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth 는 AuthProvider 안에서만 사용할 수 있습니다.')
  return ctx
}
