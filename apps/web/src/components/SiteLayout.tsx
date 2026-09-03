import { useEffect, useState, type ReactNode } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import type { SiteSetting } from '@wnc/shared'
import { DEFAULT_COMPANY } from '@wnc/shared'
import { isExternalUrl, pickMenu, useSiteMenu, type SiteMenuLink } from '../lib/menus'
import { useSiteSeo, useSiteSetting } from '../lib/seo'
import SitePopups from './SitePopups'
import SiteUtilMenu from './SiteUtilMenu'
import SitemapDrawer from './SitemapDrawer'
import MobileNavDrawer from './MobileNavDrawer'

/**
 * 푸터 SNS 아이콘 — 주소는 환경설정 > 회사 정보에서 읽고, 비어 있으면 아이콘을 보이지 않는다.
 * key 는 설정의 필드 이름이다.
 */
const SOCIAL: { key: keyof Pick<SiteSetting, 'snsFacebook' | 'snsYoutube' | 'snsBlog' | 'snsInstagram'>; name: string; icon: string }[] = [
  {
    key: 'snsFacebook',
    name: '페이스북',
    icon: 'M13.5 22v-8h2.7l.4-3.2h-3.1V8.8c0-.9.3-1.6 1.6-1.6h1.7V4.4c-.3 0-1.3-.1-2.5-.1-2.5 0-4.1 1.5-4.1 4.2v2.3H7.4V14h2.8v8h3.3z',
  },
  {
    key: 'snsYoutube',
    name: '유튜브',
    icon: 'M21.6 7.2c-.2-.9-.9-1.6-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4c-.9.2-1.6.9-1.8 1.8C2 8.8 2 12 2 12s0 3.2.4 4.8c.2.9.9 1.6 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4c.9-.2 1.6-.9 1.8-1.8.4-1.6.4-4.8.4-4.8s0-3.2-.4-4.8zM10 15V9l5.2 3L10 15z',
  },
  {
    key: 'snsBlog',
    name: '블로그',
    icon: 'M4 5h16a2 2 0 012 2v9a2 2 0 01-2 2h-7l-4 3v-3H4a2 2 0 01-2-2V7a2 2 0 012-2zm3.2 4.2v5.6h2.3c1.3 0 2.1-.6 2.1-1.6 0-.7-.4-1.2-1-1.4.4-.2.7-.7.7-1.2 0-.9-.7-1.4-1.9-1.4H7.2zm1.3 1h.8c.5 0 .8.2.8.6s-.3.6-.8.6h-.8v-1.2zm0 2.2h1c.6 0 .9.2.9.7 0 .4-.3.7-.9.7h-1v-1.4zm5.3-3.2v5.6h1.3V9.2h-1.3z',
  },
  {
    key: 'snsInstagram',
    name: '인스타그램',
    icon: 'M12 7.3a4.7 4.7 0 100 9.4 4.7 4.7 0 000-9.4zm0 7.7a3 3 0 110-6 3 3 0 010 6zm5.9-7.9a1.1 1.1 0 11-2.2 0 1.1 1.1 0 012.2 0zM12 2.2c-2.7 0-3 0-4.1.1-1.1.1-1.8.2-2.4.5-.7.3-1.2.6-1.8 1.2-.6.6-.9 1.1-1.2 1.8-.3.6-.4 1.3-.5 2.4C2 9.2 2 9.5 2 12s0 3 .1 4.1c.1 1.1.2 1.8.5 2.4.3.7.6 1.2 1.2 1.8.6.6 1.1.9 1.8 1.2.6.3 1.3.4 2.4.5 1.1.1 1.4.1 4.1.1s3 0 4.1-.1c1.1-.1 1.8-.2 2.4-.5.7-.3 1.2-.6 1.8-1.2.6-.6.9-1.1 1.2-1.8.3-.6.4-1.3.5-2.4.1-1.1.1-1.4.1-4.1s0-3-.1-4.1c-.1-1.1-.2-1.8-.5-2.4-.3-.7-.6-1.2-1.2-1.8-.6-.6-1.1-.9-1.8-1.2-.6-.3-1.3-.4-2.4-.5-1.1-.1-1.4-.1-4.1-.1zm0 1.8c2.6 0 2.9 0 4 .1 1 0 1.5.2 1.9.3.5.2.8.4 1.1.7.3.3.6.7.7 1.1.1.4.3.9.3 1.9.1 1.1.1 1.4.1 4s0 2.9-.1 4c0 1-.2 1.5-.3 1.9-.2.5-.4.8-.7 1.1-.3.3-.7.6-1.1.7-.4.1-.9.3-1.9.3-1.1.1-1.4.1-4 .1s-2.9 0-4-.1c-1 0-1.5-.2-1.9-.3-.5-.2-.8-.4-1.1-.7-.3-.3-.6-.7-.7-1.1-.1-.4-.3-.9-.3-1.9C4 14.9 4 14.6 4 12s0-2.9.1-4c0-1 .2-1.5.3-1.9.2-.5.4-.8.7-1.1.3-.3.7-.6 1.1-.7.4-.1.9-.3 1.9-.3 1.1-.1 1.4-.1 4-.1z',
  },
]

/** 메뉴 링크 — 외부 주소는 <a> 로, 사이트 안 경로는 라우터 링크로 연다. 주소가 없으면 글자만 보인다. */
function MenuLink({
  item,
  className,
  tabIndex,
  children,
}: {
  item: SiteMenuLink
  className: string | ((state: { isActive: boolean }) => string)
  tabIndex?: number
  children: ReactNode
}) {
  const cls = typeof className === 'function' ? className({ isActive: false }) : className
  if (!item.url) return <span className={cls}>{children}</span>
  if (isExternalUrl(item.url)) {
    return (
      <a
        href={item.url}
        target={item.newTab ? '_blank' : undefined}
        rel={item.newTab ? 'noopener noreferrer' : undefined}
        className={cls}
        tabIndex={tabIndex}
      >
        {children}
      </a>
    )
  }
  return (
    <NavLink to={item.url} target={item.newTab ? '_blank' : undefined} className={className} tabIndex={tabIndex}>
      {children}
    </NavLink>
  )
}

export default function SiteLayout() {
  useSiteSeo()
  // 푸터 회사 정보 — 설정을 받기 전에는 기본값으로 그린다.
  const company = useSiteSetting() ?? DEFAULT_COMPANY
  const social = SOCIAL.map((x) => ({ ...x, href: company[x.key] })).filter((x) => x.href)
  const [open, setOpen] = useState(false)
  const [sitemapOpen, setSitemapOpen] = useState(false)
  // 상단 메뉴에 올리면 2차 메뉴 판이 펼쳐진다.
  const [megaOpen, setMegaOpen] = useState(false)
  const { pathname } = useLocation()

  // 메뉴는 관리자 [메뉴 관리]에서 정한다. 상단·푸터는 각각의 노출 스위치로 거른다.
  const siteMenu = useSiteMenu()
  const menu = pickMenu(siteMenu, 'gnb')
  const footerMenu = pickMenu(siteMenu, 'footer')
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
  const DARK_TOP = ['/', '/about', '/services', '/products', '/board', '/contact', '/terms', '/privacy']
  const overHero =
    DARK_TOP.includes(pathname) ||
    pathname.startsWith('/page/') ||
    pathname.startsWith('/about/') ||
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

  // 투명 상태에서는 글자를 흰색으로 뒤집는다.
  // 모바일 메뉴는 화면 전체를 덮는 별도 판이라 헤더 색은 건드리지 않는다.
  const transparent = overHero && !scrolled

  return (
    <div className="flex min-h-screen flex-col">
      <SitePopups />
      <SitemapDrawer open={sitemapOpen} onClose={() => setSitemapOpen(false)} />
      <MobileNavDrawer
        open={open}
        menu={menu}
        logo={company.companyNameEn || company.companyName}
        onClose={() => setOpen(false)}
        onOpenSitemap={() => setSitemapOpen(true)}
      />
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
          className={`absolute inset-x-0 top-full hidden overflow-hidden transition-[height] duration-200 ease-in-out gnb:block ${
            transparent ? 'bg-black/70 backdrop-blur-sm' : 'border-b border-slate-200 bg-white/95 shadow-lg backdrop-blur'
          }`}
        />

        <div className="flex h-[4.5rem] w-full items-center justify-between px-3 sm:px-4 lg:px-7">
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
          <nav className="hidden h-full items-start gap-0 self-start gnb:flex" onMouseEnter={() => setMegaOpen(true)}>
            {menu.map((item) => (
              <div
                key={item.id}
                style={{ height: `${megaOpen ? HEADER_H + megaHeight : HEADER_H}rem` }}
                className="group relative overflow-hidden transition-[height] duration-200 ease-in-out"
              >
                <MenuLink
                  item={item}
                  className={({ isActive }) =>
                    `relative flex h-[4.5rem] items-center whitespace-nowrap px-[31px] text-[1.05rem] font-semibold tracking-tight transition ${
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
                    className={`absolute inset-x-[31px] bottom-3 h-px origin-left scale-x-0 transition-transform duration-200 ease-in-out group-hover:scale-x-100 ${
                      transparent ? 'bg-white' : 'bg-slate-900'
                    }`}
                  />
                </MenuLink>

                {/* 2차 메뉴 — 열이 늘어나면서 위에서부터 드러난다. */}
                {item.children.length > 0 && (
                  <ul className="absolute left-0 top-[4.5rem] flex w-48 flex-col gap-2.5 whitespace-nowrap px-[31px] pt-5">
                    {item.children.map((child) => (
                      <li key={child.id}>
                        <MenuLink
                          item={child}
                          tabIndex={megaOpen ? 0 : -1}
                          className={`block text-[0.95rem] transition ${
                            transparent
                              ? 'text-white/65 hover:text-white'
                              : 'text-slate-500 hover:text-slate-900'
                          }`}
                        >
                          {child.label}
                        </MenuLink>
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

          {/* 모바일 — 햄버거만 둔다. 언어 선택과 팝업 열기는 메뉴 안에 있다. */}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={`-mr-1 rounded-lg p-2 gnb:hidden ${
              transparent ? 'text-white hover:bg-white/15' : 'text-slate-600 hover:bg-slate-100'
            }`}
            aria-label="메뉴 열기"
            aria-expanded={open}
          >
            <svg className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      {/* 푸터 — 참고 디자인(THEME015)처럼 베이지 바탕 가운데 정렬. 로고 → 메뉴 다섯 열 → SNS → 약관 → 회사 정보 → 맨 위로 */}
      <footer className="bg-[#b8aa96] text-white">
        <div className="container-wnc py-16 text-center sm:py-20">
          <Link to="/" className="inline-block text-xl font-bold tracking-[0.35em]">
            {company.companyNameEn || company.companyName}
          </Link>

          {/* 메뉴 — 1차 메뉴 아래 2차 메뉴를 세로로. 열 사이에 옅은 세로선 */}
          <div className="mx-auto mt-14 grid max-w-6xl grid-cols-2 gap-y-10 text-left sm:grid-cols-3 lg:grid-cols-5 lg:divide-x lg:divide-white/30">
            {footerMenu.map((item) => (
              <div key={item.id} className="px-4 lg:px-8">
                <MenuLink item={item} className="text-base font-bold transition hover:text-white/80">
                  {item.label}
                </MenuLink>
                {item.children.length > 0 && (
                  <ul className="mt-4 space-y-2">
                    {item.children.map((child) => (
                      <li key={child.id}>
                        <MenuLink item={child} className="text-sm text-white/70 transition hover:text-white">
                          {child.label}
                        </MenuLink>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>

          {/* SNS — 주소가 있는 것만 보인다 */}
          {social.length > 0 && (
            <ul className="mt-14 flex justify-center gap-4">
              {social.map((x) => (
                <li key={x.name}>
                  <a
                    href={x.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={x.name}
                    title={x.name}
                    className="grid h-10 w-10 place-items-center rounded-full text-white transition hover:bg-white/15"
                  >
                    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                      <path d={x.icon} />
                    </svg>
                  </a>
                </li>
              ))}
            </ul>
          )}

          {/* 약관·방침·사이트맵 */}
          <nav className="mt-10 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm" aria-label="약관 및 정책">
            <Link to="/terms" className="transition hover:text-white/80">
              홈페이지 이용약관
            </Link>
            <span className="h-3 w-px bg-white/40" aria-hidden />
            <Link to="/privacy" className="font-semibold transition hover:text-white/80">
              개인정보처리방침
            </Link>
            <span className="h-3 w-px bg-white/40" aria-hidden />
            <button type="button" onClick={() => setSitemapOpen(true)} className="transition hover:text-white/80">
              사이트맵
            </button>
            <span className="h-3 w-px bg-white/40" aria-hidden />
            <Link to="/admin" className="transition hover:text-white/80">
              관리자
            </Link>
          </nav>

          {/* 회사 정보 */}
          <p className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-sm text-white/90">
            {company.address && (
              <span>
                {company.zipCode && `[${company.zipCode}] `}
                {company.address}
              </span>
            )}
            {company.tel && <span className="tabular-nums">T. {company.tel}</span>}
            {company.fax && <span className="tabular-nums">F. {company.fax}</span>}
            {company.email && (
              <a href={`mailto:${company.email}`} className="transition hover:text-white">
                M. {company.email}
              </a>
            )}
          </p>
          {(company.ceo || company.bizNo) && (
            <p className="mt-2 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-sm text-white/80">
              {company.ceo && <span>대표 {company.ceo}</span>}
              {company.bizNo && <span className="tabular-nums">사업자등록번호 {company.bizNo}</span>}
            </p>
          )}
          <p className="mt-3 text-xs tracking-wide text-white/60">
            {company.since && `${company.since}-`}
            {new Date().getFullYear()} {company.copyright}
          </p>

          {/* 맨 위로 */}
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            aria-label="맨 위로"
            className="mt-10 inline-grid h-10 w-10 place-items-center text-white/80 transition hover:text-white"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
            </svg>
          </button>
        </div>
      </footer>
    </div>
  )
}
