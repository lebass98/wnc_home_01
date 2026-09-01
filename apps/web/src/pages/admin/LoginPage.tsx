import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import { ErrorMessage } from '../../components/ui'

export default function LoginPage() {
  const { user, loading, login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // 이미 로그인된 상태로 접근하면 대시보드로 보낸다.
  if (!loading && user) return <Navigate to="/admin" replace />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await login(email, password)
      navigate('/admin', { replace: true })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-5">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-brand-600 text-lg font-bold text-white">
            W
          </span>
          <h1 className="mt-5 text-xl font-bold text-white">워드앤코드 관리자</h1>
          <p className="mt-1.5 text-sm text-slate-400">계정 정보를 입력해 주세요.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl bg-white p-8 shadow-xl">
          {error && <ErrorMessage message={error} />}

          <div>
            <label htmlFor="email" className="label">
              이메일
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="admin@wnc.co.kr"
            />
          </div>

          <div>
            <label htmlFor="password" className="label">
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="••••••••"
            />
          </div>

          <button type="submit" disabled={submitting} className="btn-primary w-full py-3">
            {submitting ? '로그인 중...' : '로그인'}
          </button>

          <p className="rounded-lg bg-slate-50 px-3 py-2.5 text-center text-xs leading-relaxed text-slate-500">
            테스트 계정 — admin@wnc.co.kr / admin1234
          </p>
        </form>
      </div>
    </div>
  )
}
