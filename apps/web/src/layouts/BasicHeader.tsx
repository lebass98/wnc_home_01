import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import MenuLink from '../components/MenuLink'
import SiteUtilMenu from '../components/SiteUtilMenu'
import type { SiteHeaderProps } from './index'

/**
 * 기본 헤더 — 로고 왼쪽, 1차 메뉴 오른쪽 한 줄.
 * 메뉴에 올리면 각 열이 아래로 늘어나며 2차 메뉴 판이 펼쳐진다. (참고 템플릿의 hover dim)
 */
export default function BasicHeader({ menu, logo, transparent, onOpenMobile, onOpenSitemap }: SiteHeaderProps) {
  // 상단 메뉴에 올리면 2차 메뉴 판이 펼쳐진다.
  const [megaOpen, setMegaOpen] = useState(false)
  const { pathname } = useLocation()

  // 페이지를 이동하면 펼쳐 둔 판을 닫는다.
  useEffect(() => {
    setMegaOpen(false)
  }, [pathname])

  // 2차 메뉴 판의 높이(rem) — 가장 긴 열에 맞춘다. 열마다 높이가 늘어나며 아래가 드러난다.
  const megaRows = Math.max(1, ...menu.map((m) => m.children.length))
  const megaHeight = megaRows * 2.1 + 3
  /** 헤더 높이(rem) — 1차 메뉴 한 줄 */
  const HEADER_H = 4.5

  return (
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
      {/* 2차 메뉴 배경 판 — 상단 메뉴에 올리면 0.2초 동안 아래로 늘어난다. */}
      <div
        aria-hidden={!megaOpen}
        style={{ height: megaOpen ? `${megaHeight}rem` : 0 }}
        className={`absolute inset-x-0 top-full hidden overflow-hidden transition-[height] duration-200 ease-in-out gnb:block ${
          transparent ? 'bg-black/70 backdrop-blur-sm' : 'border-b border-slate-200 bg-white/95 shadow-lg backdrop-blur'
        }`}
      />

      <div className="flex h-[4.5rem] w-full items-center justify-between px-3 sm:px-4 lg:px-7">
        <Link to="/" className="flex items-center gap-2">
          <span className={`text-xl font-bold tracking-[0.25em] ${transparent ? 'text-white' : 'text-slate-900'}`}>
            {logo}
          </span>
        </Link>

        {/*
          1차 메뉴 — 각 열(li)의 높이가 헤더 높이에서 판 높이만큼 늘어나며
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
                          transparent ? 'text-white/65 hover:text-white' : 'text-slate-500 hover:text-slate-900'
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
          <div className={`ml-5 self-center border-l pl-5 ${transparent ? 'border-white/30' : 'border-slate-200'}`}>
            <SiteUtilMenu transparent={transparent} />
          </div>
          {/* 맨 오른쪽 — 사이트맵 */}
          <button
            type="button"
            onClick={onOpenSitemap}
            aria-label="사이트맵 열기"
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
          onClick={onOpenMobile}
          className={`-mr-1 rounded-lg p-2 gnb:hidden ${
            transparent ? 'text-white hover:bg-white/15' : 'text-slate-600 hover:bg-slate-100'
          }`}
          aria-label="메뉴 열기"
        >
          <svg className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
    </header>
  )
}
