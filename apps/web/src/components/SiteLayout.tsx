import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import type { PageListItem } from '@wnc/shared'
import { api } from '../lib/api'
import { useSiteSeo } from '../lib/seo'
import SitePopups from './SitePopups'
import SiteUtilMenu from './SiteUtilMenu'
import SitemapDrawer from './SitemapDrawer'

const NAV = [
  { to: '/about', label: '회사소개' },
  { to: '/services', label: '사업분야' },
  { to: '/products', label: '제품소개' },
  { to: '/board', label: '소식' },
  { to: '/contact', label: '문의하기' },
]

export default function SiteLayout() {
  useSiteSeo()
  const [open, setOpen] = useState(false)
  const [sitemapOpen, setSitemapOpen] = useState(false)
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
    setSitemapOpen(false)
    window.scrollTo(0, 0)
  }, [pathname])

  // 상단이 어두운 화면(메인 히어로·서브 페이지 배너)에서는
  // 헤더를 그 위에 투명하게 얹고, 내리면 흰 배경으로 바꾼다.
  // 아래 목록에 없는 화면은 처음부터 흰 헤더를 쓴다.
  const DARK_TOP = ['/', '/about', '/services', '/products', '/board', '/contact']
  const overHero =
    DARK_TOP.includes(pathname) ||
    pathname.startsWith('/page/') ||
    pathname.startsWith('/board/') ||
    pathname.startsWith('/contact/')
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    if (!overHero) return
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [overHero])

  // 투명 상태에서는 글자를 흰색으로 뒤집는다. (모바일 메뉴가 열리면 흰 배경이므로 제외)
  const transparent = overHero && !scrolled && !open

  return (
    <div className="flex min-h-screen flex-col">
      <SitePopups />
      <SitemapDrawer open={sitemapOpen} onClose={() => setSitemapOpen(false)} />
      <header
        style={{ top: 'var(--demo-banner-h)' }}
        className={`z-40 transition-colors ${
          transparent
            ? // 히어로 위에 겹쳐 얹는다 — 자리를 차지하지 않도록 fixed 로 띄운다.
              'fixed inset-x-0 border-b border-transparent bg-transparent'
            : 'sticky border-b border-slate-200 bg-white/90 backdrop-blur'
        }`}
      >
        <div className="container-wnc flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span
              className={`text-lg font-bold tracking-[0.2em] ${
                transparent ? 'text-white' : 'text-slate-900'
              }`}
            >
              WORDNCODE
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {menu.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `rounded-lg px-4 py-2 text-sm font-medium transition ${
                    transparent
                      ? isActive
                        ? 'text-white'
                        : 'text-white/80 hover:text-white'
                      : isActive
                        ? 'text-brand-700'
                        : 'text-slate-600 hover:text-slate-900'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
            <Link
              to="/contact"
              className={`btn ml-2 ${
                transparent
                  ? 'bg-mint-400 text-white hover:bg-mint-500'
                  : 'btn-primary'
              }`}
            >
              상담 신청
            </Link>
            {/* 언어 선택 · 팝업 다시 열기 */}
            <div
              className={`ml-5 border-l pl-5 ${transparent ? 'border-white/30' : 'border-slate-200'}`}
            >
              <SiteUtilMenu transparent={transparent} />
            </div>
            {/* 맨 오른쪽 — 사이트맵 */}
            <button
              type="button"
              onClick={() => setSitemapOpen(true)}
              aria-label="사이트맵 열기"
              aria-expanded={sitemapOpen}
              title="사이트맵"
              className={`ml-5 grid h-9 w-9 place-items-center rounded-lg transition ${
                transparent ? 'text-white hover:bg-white/15' : 'text-slate-900 hover:bg-slate-100'
              }`}
            >
              <svg className="h-6 w-6" viewBox="0 0 24 21" fill="currentColor" aria-hidden>
                <rect x="0" y="0" width="24" height="3" rx="1.5" />
                <rect x="0" y="9" width="24" height="3" rx="1.5" />
                <rect x="0" y="18" width="24" height="3" rx="1.5" />
              </svg>
            </button>
          </nav>

          {/* 모바일 — 햄버거 왼쪽에 언어·팝업을 둔다. */}
          <div className="flex items-center gap-3 md:hidden">
            <SiteUtilMenu transparent={transparent} />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className={`rounded-lg p-2 md:hidden ${
              transparent ? 'text-white hover:bg-white/15' : 'text-slate-600 hover:bg-slate-100'
            }`}
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
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  setSitemapOpen(true)
                }}
                className="rounded-lg px-3 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                사이트맵
              </button>
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
            <span className="text-lg font-bold tracking-[0.2em] text-slate-900">WORDNCODE</span>
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
