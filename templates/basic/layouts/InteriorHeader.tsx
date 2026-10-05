import { Link, useLocation } from 'react-router-dom'
import MenuLink from '../components/MenuLink'
import { findGroup } from '../lib/menus'
import type { SiteHeaderProps } from './index'

/**
 * 인테리어 헤더 — 화면 상단 가운데에 떠 있는 유리 알약(pill).
 * 왼쪽 햄버거(사이트맵), 가운데 1차 메뉴, 오른쪽 [바로 문의하기] 단추.
 * 배경이 밝든 어둡든 통하도록 반투명 흰 바탕에 블러를 깐다.
 */
export default function InteriorHeader({ menu, onOpenMobile, onOpenSitemap }: SiteHeaderProps) {
  const { pathname } = useLocation()
  const activeGroupId = findGroup(menu, pathname)?.id

  return (
    <header style={{ top: 'calc(var(--demo-banner-h) + 24px)' }} className="fixed inset-x-0 z-40 flex justify-center px-4">
      <div
        className="flex items-center gap-4 rounded-full bg-white/40 py-2 pl-6 pr-2 shadow-[0_8px_30px_rgba(36,29,18,0.12)] backdrop-blur-md sm:gap-6 sm:pl-10"
      >
        {/* 햄버거 — 데스크톱은 사이트맵, 모바일은 메뉴 드로어 */}
        <button
          type="button"
          onClick={onOpenSitemap}
          aria-label="사이트맵 열기"
          className="hidden h-[15px] w-10 flex-col justify-between gnb:flex"
        >
          <span className="h-0.5 w-10 bg-[#676057]" />
          <span className="h-0.5 w-10 bg-[#676057]" />
          <span className="h-0.5 w-10 bg-[#676057]" />
        </button>
        <button
          type="button"
          onClick={onOpenMobile}
          aria-label="메뉴 열기"
          className="flex h-[15px] w-8 flex-col justify-between gnb:hidden"
        >
          <span className="h-0.5 w-8 bg-[#676057]" />
          <span className="h-0.5 w-8 bg-[#676057]" />
          <span className="h-0.5 w-8 bg-[#676057]" />
        </button>

        {/* 1차 메뉴 — 좁은 화면에서는 드로어가 대신한다 */}
        <nav aria-label="주 메뉴" className="hidden items-center gap-7 gnb:flex">
          {menu.map((item) => (
            <MenuLink
              key={item.id}
              item={item}
              className={`text-[15px] font-semibold tracking-tight transition hover:opacity-70 ${
                activeGroupId === item.id ? 'text-[#241d12]' : 'text-[#676057]'
              }`}
            >
              {item.label}
            </MenuLink>
          ))}
        </nav>

        <Link
          to="/contact"
          className="flex items-center gap-3 rounded-full bg-[#676057] py-2.5 pl-7 pr-6 text-sm font-semibold text-white transition hover:bg-[#54493d]"
        >
          바로 문의하기
          <span className="h-[5px] w-[5px] rounded-full bg-white" aria-hidden />
        </Link>
      </div>
    </header>
  )
}
