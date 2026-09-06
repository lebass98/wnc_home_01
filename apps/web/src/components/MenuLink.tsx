import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { isExternalUrl, type SiteMenuLink } from '../lib/menus'

/**
 * 메뉴 링크 — 외부 주소는 <a> 로, 사이트 안 경로는 라우터 링크로 연다. 주소가 없으면 글자만 보인다.
 * 헤더·푸터 레이아웃(src/layouts)이 함께 쓴다.
 */
export default function MenuLink({
  item,
  className,
  tabIndex,
  active,
  children,
}: {
  item: SiteMenuLink
  className: string | ((state: { isActive: boolean }) => string)
  tabIndex?: number
  /**
   * 활성 여부를 직접 정한다. 1차 메뉴는 '지금 화면이 속한 묶음' 단위로 켜야 하는데
   * (예: /service 는 사업분야 묶음), NavLink 는 주소 접두어로만 판단하므로 헤더가 계산해 넘긴다.
   */
  active?: boolean
  children: ReactNode
}) {
  const cls = typeof className === 'function' ? className({ isActive: active ?? false }) : className
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
  if (active !== undefined) {
    return (
      <NavLink
        to={item.url}
        target={item.newTab ? '_blank' : undefined}
        className={cls}
        tabIndex={tabIndex}
        aria-current={active ? 'page' : undefined}
      >
        {children}
      </NavLink>
    )
  }
  return (
    <NavLink to={item.url} target={item.newTab ? '_blank' : undefined} className={className} tabIndex={tabIndex}>
      {children}
    </NavLink>
  )
}
