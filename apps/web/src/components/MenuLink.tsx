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
