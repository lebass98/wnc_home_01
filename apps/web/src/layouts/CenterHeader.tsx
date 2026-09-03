import { Link } from 'react-router-dom'
import MenuLink from '../components/MenuLink'
import SiteUtilMenu from '../components/SiteUtilMenu'
import type { SiteHeaderProps } from './index'

/**
 * 센터 헤더 — 위 줄 가운데에 로고, 아래 줄 가운데에 1차 메뉴 두 줄 구성.
 * 2차 메뉴는 각 항목 아래 드롭다운 카드로 열린다. 좁은 화면은 기본 헤더처럼 한 줄 + 햄버거다.
 */
/** 로고 — 타이틀 이미지를 올렸으면 그림을, 없으면 글자를 건다. */
function Logo({ logo, logoImage, className }: { logo: string; logoImage?: string | null; className: string }) {
  if (logoImage) return <img src={logoImage} alt={logo} className="h-8 w-auto max-w-[13rem] object-contain" />
  return <span className={className}>{logo}</span>
}

export default function CenterHeader({ menu, logo, logoImage, transparent, onOpenMobile, onOpenSitemap }: SiteHeaderProps) {
  return (
    <header
      style={{ top: 'var(--demo-banner-h)' }}
      className={`z-40 transition-colors duration-300 ${
        transparent
          ? 'fixed inset-x-0 bg-transparent'
          : 'sticky border-b border-slate-200 bg-white/90 backdrop-blur'
      }`}
    >
      {/* 넓은 화면 — 로고 줄 */}
      <div className="hidden gnb:block">
        <div className="relative flex h-[4.5rem] items-center justify-center px-7">
          <Link to="/" aria-label={logo}>
            <Logo
              logo={logo}
              logoImage={logoImage}
              className={`text-2xl font-bold tracking-[0.3em] ${transparent ? 'text-white' : 'text-slate-900'}`}
            />
          </Link>
          {/* 오른쪽 — 언어 선택 · 팝업 다시 열기 · 사이트맵 */}
          <div className="absolute right-7 flex items-center gap-4">
            <SiteUtilMenu transparent={transparent} />
            <button
              type="button"
              onClick={onOpenSitemap}
              aria-label="사이트맵 열기"
              title="사이트맵"
              className={`grid h-9 w-9 place-items-center rounded-lg transition ${
                transparent ? 'text-white hover:bg-white/15' : 'text-slate-900 hover:bg-slate-100'
              }`}
            >
              <svg className="h-6 w-6" viewBox="0 0 24 21" fill="currentColor" aria-hidden>
                <rect x="0" y="0" width="24" height="3" rx="1.5" />
                <rect x="0" y="9" width="24" height="3" rx="1.5" />
                <rect x="0" y="18" width="24" height="3" rx="1.5" />
              </svg>
            </button>
          </div>
        </div>

        {/* 메뉴 줄 — 가운데 정렬, 항목 아래 드롭다운 */}
        <nav
          className={`flex justify-center border-t ${transparent ? 'border-white/20' : 'border-slate-100'}`}
          aria-label="주 메뉴"
        >
          {menu.map((item) => (
            <div key={item.id} className="group relative">
              <MenuLink
                item={item}
                className={({ isActive }) =>
                  `relative flex h-14 items-center whitespace-nowrap px-8 text-[1.02rem] font-semibold tracking-tight transition ${
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
                  className={`absolute inset-x-8 bottom-3 h-px origin-center scale-x-0 transition-transform duration-200 ease-in-out group-hover:scale-x-100 ${
                    transparent ? 'bg-white' : 'bg-slate-900'
                  }`}
                />
              </MenuLink>

              {/* 2차 메뉴 — 항목 아래 드롭다운 카드 */}
              {item.children.length > 0 && (
                <ul
                  className={`pointer-events-none invisible absolute left-1/2 top-full z-10 min-w-[11rem] -translate-x-1/2 translate-y-2 whitespace-nowrap rounded-xl border p-2 opacity-0 shadow-lg transition duration-200 group-hover:pointer-events-auto group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 ${
                    transparent
                      ? 'border-white/10 bg-slate-900/90 backdrop-blur-sm'
                      : 'border-slate-100 bg-white'
                  }`}
                >
                  {item.children.map((child) => (
                    <li key={child.id}>
                      <MenuLink
                        item={child}
                        className={`block rounded-lg px-4 py-2 text-center text-[0.95rem] transition ${
                          transparent
                            ? 'text-white/75 hover:bg-white/10 hover:text-white'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
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
        </nav>
      </div>

      {/* 좁은 화면 — 로고 왼쪽 + 햄버거 한 줄 */}
      <div className="flex h-[4.5rem] items-center justify-between px-3 sm:px-4 gnb:hidden">
        <Link to="/" aria-label={logo}>
          <Logo
            logo={logo}
            logoImage={logoImage}
            className={`text-xl font-bold tracking-[0.25em] ${transparent ? 'text-white' : 'text-slate-900'}`}
          />
        </Link>
        <button
          type="button"
          onClick={onOpenMobile}
          className={`-mr-1 rounded-lg p-2 ${
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
