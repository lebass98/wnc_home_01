import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import ThemeToggle from './ThemeToggle'
import { useEnableDarkMode } from '../lib/theme'

const NAV = [
  {
    to: '/admin',
    label: '대시보드',
    end: true,
    icon: 'M3 12l9-9 9 9M5 10v10h14V10',
  },
  {
    to: '/admin/posts',
    label: '게시판 관리',
    end: false,
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  },
  {
    to: '/admin/products',
    label: '제품 관리',
    end: false,
    icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  },
  {
    to: '/admin/categories',
    label: '제품 카테고리',
    end: false,
    icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z',
  },
  {
    to: '/admin/pages',
    label: '페이지 관리',
    end: false,
    icon: 'M9 12h6m-6 4h4M8 4h8a2 2 0 012 2v12a2 2 0 01-2 2H8a2 2 0 01-2-2V6a2 2 0 012-2zm1 4h6',
  },
  {
    to: '/admin/contacts',
    label: '문의 관리',
    end: false,
    icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  },
]

export default function AdminLayout() {
  useEnableDarkMode()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => setSidebarOpen(false), [pathname])

  function handleLogout() {
    logout()
    navigate('/admin/login', { replace: true })
  }

  const sidebar = (
    <div className="flex h-full flex-col border-r border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      <div className="flex h-16 items-center border-b border-slate-200 px-6 dark:border-slate-700">
        <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          워드앤코드 관리자
        </span>
      </div>

      <nav className="flex-1 space-y-0.5 px-4 py-5">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-3 text-[0.95rem] font-semibold transition ${
                isActive
                  ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
              }`
            }
          >
            <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
            </svg>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-200 px-4 py-3 dark:border-slate-700">
        <Link
          to="/"
          className="flex items-center gap-3 rounded-lg px-3 py-3 text-[0.95rem] font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        >
          <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
          홈페이지 보기
        </Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* 데스크톱 고정 사이드바 */}
      <aside
        className="fixed bottom-0 left-0 hidden w-64 lg:block"
        style={{ top: 'var(--demo-banner-h)' }}
      >{sidebar}</aside>

      {/* 모바일 오버레이 사이드바 */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" style={{ top: 'var(--demo-banner-h)' }}>
          <div
            className="absolute inset-0 bg-slate-900/50"
            onClick={() => setSidebarOpen(false)}
            aria-hidden
          />
          <aside className="absolute inset-y-0 left-0 w-64">{sidebar}</aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header
          style={{ top: 'var(--demo-banner-h)' }}
          className="sticky z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 dark:border-slate-700 dark:bg-slate-800 sm:px-6">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 lg:hidden"
            aria-label="메뉴 열기"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="ml-auto flex items-center gap-3">
            <ThemeToggle />
            <div className="text-right">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{user?.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {user?.role === 'ADMIN' ? '최고관리자' : '편집자'}
              </p>
            </div>
            <button type="button" onClick={handleLogout} className="btn-secondary">
              로그아웃
            </button>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
