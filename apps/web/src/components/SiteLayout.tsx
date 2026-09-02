import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import type { CategoryNode, PageListItem } from '@wnc/shared'
import { api } from '../lib/api'
import { useBoards } from '../lib/boards'
import { useSiteSeo } from '../lib/seo'
import SitePopups from './SitePopups'
import SiteUtilMenu from './SiteUtilMenu'
import SitemapDrawer from './SitemapDrawer'

interface SubItem {
  to: string
  label: string
}

interface NavItem {
  to: string
  label: string
  /** 상단 메뉴에 올리면 아래로 펼쳐지는 2차 메뉴 */
  children: SubItem[]
}

/** 고정 메뉴 — 제품·소식의 2차 메뉴는 서버에서 받은 분류·게시판으로 채운다. */
const NAV: NavItem[] = [
  {
    to: '/about',
    label: '회사소개',
    children: [
      { to: '/about', label: '회사 소개' },
      { to: '/about', label: '개발 철학' },
      { to: '/services', label: '사업분야' },
    ],
  },
  {
    to: '/services',
    label: '사업분야',
    children: [
      { to: '/services', label: '사업 인프라' },
      { to: '/services', label: '사업영역' },
      { to: '/services', label: '서비스영역' },
    ],
  },
  { to: '/products', label: '제품소개', children: [{ to: '/products', label: '전체 제품' }] },
  { to: '/board', label: '소식', children: [{ to: '/board', label: '전체 소식' }] },
  {
    to: '/contact',
    label: '문의하기',
    children: [
      { to: '/contact', label: '문의하기' },
      { to: '/contact/faq', label: '자주 묻는 질문' },
    ],
  },
]

export default function SiteLayout() {
  useSiteSeo()
  const [open, setOpen] = useState(false)
  const [sitemapOpen, setSitemapOpen] = useState(false)
  const [navPages, setNavPages] = useState<PageListItem[]>([])
  const [categories, setCategories] = useState<CategoryNode[]>([])
  // 상단 메뉴에 올리면 2차 메뉴 판이 펼쳐진다.
  const [megaOpen, setMegaOpen] = useState(false)
  const boards = useBoards()
  const { pathname } = useLocation()

  // 관리자가 '상단 메뉴에 표시'로 발행한 페이지를 메뉴 뒤에 덧붙인다.
  useEffect(() => {
    api<PageListItem[]>('/pages/nav')
      .then(setNavPages)
      .catch(() => setNavPages([]))
    api<CategoryNode[]>('/categories')
      .then(setCategories)
      .catch(() => setCategories([]))
  }, [])

  // 제품소개 아래에는 대분류, 소식 아래에는 게시판을 2차 메뉴로 붙인다.
  const menu: NavItem[] = [
    ...NAV.map((item) => {
      if (item.to === '/products') {
        return {
          ...item,
          children: [
            ...item.children,
            ...categories.map((c) => ({ to: `/products?category=${c.id}`, label: c.name })),
          ],
        }
      }
      if (item.to === '/board') {
        return {
          ...item,
          children: [...item.children, ...boards.map((b) => ({ to: `/board?category=${b.slug}`, label: b.name }))],
        }
      }
      return item
    }),
    ...navPages.map((p) => ({ to: `/page/${p.slug}`, label: p.title, children: [] as SubItem[] })),
  ]
  // 2차 메뉴 판의 높이(rem) — 가장 긴 열에 맞춘다. 참고 템플릿처럼 열마다 높이가 늘어나며 아래가 드러난다.
  const megaRows = Math.max(1, ...menu.map((m) => m.children.length))
  const megaHeight = megaRows * 2.1 + 3
  /** 헤더 높이(rem) — 1차 메뉴 한 줄 */
  const HEADER_H = 4.5

  // 페이지 이동 시 모바일 메뉴를 닫고 상단으로 스크롤한다.
  useEffect(() => {
    setOpen(false)
    setSitemapOpen(false)
    setMegaOpen(false)
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
        onMouseLeave={() => setMegaOpen(false)}
        className={`z-40 transition-colors duration-300 ${
          transparent
            ? // 히어로 위에 겹쳐 얹는다 — 자리를 차지하지 않도록 fixed 로 띄운다.
              `fixed inset-x-0 border-b border-transparent ${megaOpen ? 'bg-black/70 backdrop-blur-sm' : 'bg-transparent'}`
            : 'sticky border-b border-slate-200 bg-white/90 backdrop-blur'
        }`}
      >
        {/* 2차 메뉴 배경 판 — 상단 메뉴에 올리면 0.2초 동안 아래로 늘어난다. (참고 템플릿의 hover dim) */}
        <div
          aria-hidden={!megaOpen}
          style={{ height: megaOpen ? `${megaHeight}rem` : 0 }}
          className={`absolute inset-x-0 top-full hidden overflow-hidden transition-[height] duration-200 ease-in-out md:block ${
            transparent ? 'bg-black/70 backdrop-blur-sm' : 'border-b border-slate-200 bg-white/95 shadow-lg backdrop-blur'
          }`}
        />

        <div className="flex h-[4.5rem] w-full items-center justify-between px-5 sm:px-8 lg:px-14">
          <Link to="/" className="flex items-center gap-2">
            <span
              className={`text-xl font-bold tracking-[0.25em] ${
                transparent ? 'text-white' : 'text-slate-900'
              }`}
            >
              WORDNCODE
            </span>
          </Link>

          {/*
            1차 메뉴 — 참고 템플릿처럼 각 열(li)의 높이가 헤더 높이에서 판 높이만큼 늘어나며
            아래에 있던 2차 메뉴가 드러난다. 열은 넘치는 부분을 잘라 두어 닫혀 있을 땐 보이지 않는다.
          */}
          <nav className="hidden h-full items-start gap-0 self-start md:flex lg:gap-1" onMouseEnter={() => setMegaOpen(true)}>
            {menu.map((item) => (
              <div
                key={item.to}
                style={{ height: `${megaOpen ? HEADER_H + megaHeight : HEADER_H}rem` }}
                className="group relative overflow-hidden transition-[height] duration-200 ease-in-out"
              >
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    `relative flex h-[4.5rem] items-center px-3.5 text-[1.05rem] font-semibold tracking-tight transition ${
                      transparent
                        ? isActive
                          ? 'text-white'
                          : 'text-white/80 group-hover:text-white'
                        : isActive
                          ? 'text-brand-700'
                          : 'text-slate-600 group-hover:text-slate-900'
                    }`
                  }
                >
                  {item.label}
                  {/* 올린 메뉴 아래 밑줄 */}
                  <span
                    aria-hidden
                    className={`absolute inset-x-3.5 bottom-3 h-px origin-left scale-x-0 transition-transform duration-200 ease-in-out group-hover:scale-x-100 ${
                      transparent ? 'bg-white' : 'bg-slate-900'
                    }`}
                  />
                </NavLink>

                {/* 2차 메뉴 — 열이 늘어나면서 위에서부터 드러난다. */}
                {item.children.length > 0 && (
                  <ul className="flex w-40 flex-col gap-2.5 px-3.5 pt-5">
                    {item.children.map((child) => (
                      <li key={child.label}>
                        <Link
                          to={child.to}
                          tabIndex={megaOpen ? 0 : -1}
                          className={`block text-[0.95rem] transition ${
                            transparent
                              ? 'text-white/65 hover:text-white'
                              : 'text-slate-500 hover:text-slate-900'
                          }`}
                        >
                          {child.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
            {/* 언어 선택 · 팝업 다시 열기 */}
            <div
              className={`ml-5 self-center border-l pl-5 ${transparent ? 'border-white/30' : 'border-slate-200'}`}
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
              className={`ml-5 grid h-9 w-9 self-center place-items-center rounded-lg transition ${
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
