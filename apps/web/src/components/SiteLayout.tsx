import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import type { PageListItem } from '@wnc/shared'
import { api } from '../lib/api'

const NAV = [
  { to: '/about', label: '회사소개' },
  { to: '/services', label: '사업분야' },
  { to: '/products', label: '제품소개' },
  { to: '/board', label: '소식' },
  { to: '/contact', label: '문의하기' },
]

export default function SiteLayout() {
  const [open, setOpen] = useState(false)
  const [navPages, setNavPages] = useState<PageListItem[]>([])
  const { pathname } = useLocation()

  // 관리자가 '상단 메뉴에 표시'로 발행한 페이지를 메뉴 뒤에 덧붙인다.
  useEffect(() => {
    api<PageListItem[]>('/pages/nav')
      .then(setNavPages)
      .catch(() => setNavPages([]))
  }, [])

  const menu = [...NAV, ...navPages.map((p) => ({ to: `/page/${p.slug}`, label: p.title }))]

  // 페이지 이동 시 모바일 메뉴를 닫고 상단으로 스크롤한다.
  useEffect(() => {
    setOpen(false)
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="flex min-h-screen flex-col">
      <header style={{ top: 'var(--demo-banner-h)' }} className="sticky z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="container-wnc flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-sm font-bold text-white">
              W
            </span>
            <span className="text-lg font-bold tracking-tight text-slate-900">
              워드앤코드
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {menu.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `rounded-lg px-4 py-2 text-sm font-medium transition ${
                    isActive ? 'text-brand-700' : 'text-slate-600 hover:text-slate-900'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
            <Link to="/contact" className="btn-primary ml-2">
              상담 신청
            </Link>
          </nav>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
            aria-label="메뉴 열기"
            aria-expanded={open}
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d={open ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'}
              />
            </svg>
          </button>
        </div>

        {open && (
          <nav className="border-t border-slate-200 bg-white md:hidden">
            <div className="container-wnc flex flex-col py-2">
              {menu.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `rounded-lg px-3 py-3 text-sm font-medium ${
                      isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-700 hover:bg-slate-50'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </nav>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="container-wnc grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-sm font-bold text-white">
                W
              </span>
              <span className="text-lg font-bold text-slate-900">워드앤코드</span>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-600">
              워드앤코드는 웹·모바일 서비스 개발과 디지털 전환을 돕는 IT 솔루션 기업입니다.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900">바로가기</h3>
            <ul className="mt-4 space-y-2.5">
              {menu.map((item) => (
                <li key={item.to}>
                  <Link to={item.to} className="text-sm text-slate-600 hover:text-brand-700">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900">연락처</h3>
            <ul className="mt-4 space-y-2.5 text-sm text-slate-600">
              <li>서울특별시 강남구 테헤란로 123</li>
              <li>02-1234-5678</li>
              <li>contact@wnc.co.kr</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-200">
          <div className="container-wnc flex flex-col items-center justify-between gap-3 py-5 sm:flex-row">
            <p className="text-xs text-slate-500">
              © {new Date().getFullYear()} Word &amp; Code. All rights reserved.
            </p>
            <Link to="/admin" className="text-xs text-slate-400 hover:text-slate-600">
              관리자
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
