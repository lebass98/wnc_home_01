import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import { DEMO_CREDENTIALS } from '../../lib/demoData'
import { useEnableDarkMode } from '../../lib/theme'
import LanguageSwitcher from '../../components/LanguageSwitcher'
import { ErrorMessage } from '../../components/ui'

export default function LoginPage() {
  useEnableDarkMode()
  const { t } = useTranslation()
  const { user, loading, login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // 이미 로그인된 상태로 접근하면 대시보드로 보낸다.
  if (!loading && user) return <Navigate to="/admin" replace />

  /** 데모 계정을 입력란에 채워 넣는다. 로그인은 사용자가 직접 누르도록 둔다. */
  function fillDemoAccount() {
    setEmail(DEMO_CREDENTIALS.email)
    setPassword(DEMO_CREDENTIALS.password)
    setError('')
  }

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
    <div className="relative flex min-h-screen items-center justify-center bg-slate-900 px-5">
      <div className="absolute right-4 top-4">
        <LanguageSwitcher />
      </div>
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-brand-600 text-lg font-bold text-white">
            W
          </span>
          <h1 className="mt-5 text-xl font-bold text-white">{t('login.title')}</h1>
          <p className="mt-1.5 text-sm text-slate-400">{t('login.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl bg-white p-8 shadow-xl">
          {error && <ErrorMessage message={error} />}

          <div>
            <label htmlFor="email" className="label">
              {t('login.email')}
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
              {t('login.password')}
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
            {submitting ? t('login.submitting') : t('login.submit')}
          </button>

          {/* 데모 계정 안내 — 버튼 한 번으로 입력란을 채운다. */}
          <div className="rounded-xl border border-brand-200 bg-brand-50 p-4">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t('login.demoAccount')}</p>
            <dl className="mt-2.5 space-y-1 text-sm text-brand-700">
              <div className="flex gap-2">
                <dt className="text-slate-600 dark:text-slate-400">{t('login.demoId')}:</dt>
                <dd className="font-medium">{DEMO_CREDENTIALS.email}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-slate-600 dark:text-slate-400">{t('login.demoPassword')}:</dt>
                <dd className="font-medium">{DEMO_CREDENTIALS.password}</dd>
              </div>
            </dl>
            <button
              type="button"
              onClick={fillDemoAccount}
              className="mt-3 w-full rounded-lg bg-brand-100 py-2.5 text-sm font-semibold text-brand-800 transition hover:bg-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1"
            >
              {t('login.autofill')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
