import { Link, useLocation } from 'react-router-dom'
import MenuLink from '../components/MenuLink'
import { findGroup } from '../lib/menus'
import { useHideOnScroll } from '../lib/useHideOnScroll'
import type { SiteHeaderProps } from './index'

const asset = (path: string) => `${import.meta.env.BASE_URL.replace(/\/$/, '')}${path}`

/**
 * 치과 로고 — 시안의 로고 그림(1983×793)에서 글자 부분만 148×36 칸으로 잘라 보여 준다.
 * [환경설정]에서 타이틀 이미지를 올렸으면 그 그림을 대신 건다.
 */
export function DentalLogo({ logo, logoImage, className = '' }: { logo: string; logoImage?: string | null; className?: string }) {
  if (logoImage) return <img src={logoImage} alt={logo} className={`h-9 w-auto max-w-[13rem] object-contain ${className}`} />
  return (
    <span className={`relative block h-9 w-[148px] overflow-hidden ${className}`}>
      <img src={asset('/images/dental/logo.png')} alt={logo} className="absolute left-[-16px] top-[-17px] h-[69px] w-[173px] max-w-none object-cover" />
    </span>
  )
}

/**
 * 치과 헤더 — 반투명 흰 바탕에 블러를 깐 한 줄. 로고·1차 메뉴, 오른쪽 끝에 [상담예약하기]와 사이트맵 단추.
 * 메뉴에 올리면 2차 메뉴가 작은 카드로 내려온다.
 * 아래로 스크롤하면 위로 사라지고, 위로 스크롤하면 다시 내려온다.
 */
export default function DentalHeader({ menu, logo, logoImage, onOpenMobile, onOpenSitemap }: SiteHeaderProps) {
  const { pathname } = useLocation()
  const activeGroupId = findGroup(menu, pathname)?.id
  const [hidden, setHidden] = useHideOnScroll(pathname)

  return (
    <header
      // 키보드로 메뉴에 들어오면 감춰져 있어도 다시 보인다.
      onFocusCapture={() => setHidden(false)}
      style={{
        top: 'var(--demo-banner-h)',
        transform: hidden ? 'translateY(calc(-100% - var(--demo-banner-h)))' : 'translateY(0)',
      }}
      className={`sticky z-40 bg-white/75 backdrop-blur-md transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
        hidden ? 'pointer-events-none' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-6 px-5 py-4 sm:px-10 xl:px-[160px] xl:py-6">
        <div className="flex flex-1 items-center justify-between gap-10 xl:max-w-[1274px]">
          <Link to="/" aria-label={logo} className="shrink-0">
            <DentalLogo logo={logo} logoImage={logoImage} />
          </Link>

          <nav aria-label="주 메뉴" className="hidden items-center gnb:flex">
            {menu.map((item) => (
              <div key={item.id} className="group relative">
                <MenuLink
                  item={item}
                  active={item.id === activeGroupId}
                  className={({ isActive }) =>
                    `flex h-10 items-center whitespace-nowrap px-[30px] text-[20px] font-semibold leading-normal tracking-[-0.5px] transition ${
                      isActive ? 'text-[#1e3342]' : 'text-[#111] group-hover:text-[#1e3342]'
                    }`
                  }
                >
                  {item.label}
                </MenuLink>
                {item.children.length > 0 && (
                  <ul className="invisible absolute left-1/2 top-full z-10 min-w-[11rem] -translate-x-1/2 rounded-xl border border-[#eee] bg-white py-3 opacity-0 shadow-lg transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                    {item.children.map((child) => (
                      <li key={child.id}>
                        <MenuLink item={child} className="block whitespace-nowrap px-5 py-2 text-base text-[#545456] transition hover:text-[#111]">
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

        <div className="flex shrink-0 items-center gap-4">
          <Link
            to="/contact"
            className="hidden h-10 items-center rounded-full bg-[#1e3342] px-4 text-base font-bold leading-[1.6] tracking-[-0.4px] text-white transition hover:bg-[#2c4a5f] sm:flex"
          >
            상담예약하기
          </Link>
          <button type="button" onClick={onOpenSitemap} aria-label="사이트맵 열기" className="hidden h-10 w-10 place-items-center gnb:grid">
            <img src={asset('/images/dental/svg/menu.svg')} alt="" width={32} height={32} />
          </button>
          <button type="button" onClick={onOpenMobile} aria-label="메뉴 열기" className="grid h-10 w-10 place-items-center gnb:hidden">
            <img src={asset('/images/dental/svg/menu.svg')} alt="" width={32} height={32} />
          </button>
        </div>
      </div>
    </header>
  )
}
