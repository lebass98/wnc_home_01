import { Link, useLocation } from 'react-router-dom'
import PageHero from '../components/PageHero'
import { isExternalUrl, pickMenu, useSiteMenu, type SiteMenuLink } from '../lib/menus'
import type { SubLayoutProps } from './index'
import BasicSubLayout from './BasicSubLayout'

/**
 * 좌측 메뉴 서브 — 히어로 아래를 2단으로 나눠
 * 왼쪽에 현재 화면이 속한 메뉴 묶음을 세우고 본문을 오른쪽에 둔다.
 * 좁은 화면에서는 왼쪽 메뉴가 히어로 아래 가로 칩으로 바뀐다.
 */

/** 주소의 경로 부분만 — ?category=1 같은 꼬리는 떼고 비교한다. */
const pathOf = (url: string) => url.split(/[?#]/)[0]

/**
 * 지금 경로가 속한 1차 메뉴 묶음을 찾는다.
 * 자기 주소나 하위 주소가 현재 경로와 가장 길게 겹치는 묶음을 고른다.
 */
export function findGroup(menu: SiteMenuLink[], pathname: string): SiteMenuLink | null {
  let best: SiteMenuLink | null = null
  let bestLen = 0
  for (const group of menu) {
    for (const url of [group.url, ...group.children.map((c) => c.url)]) {
      const p = pathOf(url)
      if (!p || isExternalUrl(url)) continue
      if (pathname === p || pathname.startsWith(`${p}/`)) {
        if (p.length > bestLen) {
          best = group
          bestLen = p.length
        }
      }
    }
  }
  return best
}

/** 메뉴 항목이 지금 경로를 가리키는지 */
const isActive = (url: string, pathname: string) => pathOf(url) === pathname

/** 왼쪽 세로 메뉴 — 넓은 화면에서 본문 옆에 선다. */
function SideMenu({ group, pathname }: { group: SiteMenuLink; pathname: string }) {
  return (
    <nav aria-label={`${group.label} 하위 메뉴`}>
      <p className="border-b-2 border-slate-900 pb-4 text-lg font-bold text-slate-900">
        {group.label}
      </p>
      <ul className="divide-y divide-slate-100">
        {group.children.map((item) => {
          const active = isActive(item.url, pathname)
          return (
            <li key={item.id}>
              <Link
                to={item.url}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center justify-between px-1 py-3.5 text-[0.95rem] transition ${
                  active ? 'font-semibold text-mint-500' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
                {active && <span className="h-1.5 w-1.5 rounded-full bg-mint-400" aria-hidden />}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

/** 가로 칩 메뉴 — 좁은 화면에서 히어로 바로 아래에 붙는다. */
function ChipMenu({ group, pathname }: { group: SiteMenuLink; pathname: string }) {
  return (
    <nav aria-label={`${group.label} 하위 메뉴`} className="border-b border-slate-200 bg-white">
      <div className="container-wnc flex gap-1 overflow-x-auto py-2.5">
        {group.children.map((item) => {
          const active = isActive(item.url, pathname)
          return (
            <Link
              key={item.id}
              to={item.url}
              aria-current={active ? 'page' : undefined}
              className={`shrink-0 rounded-full px-4 py-2 text-sm transition ${
                active ? 'bg-slate-900 font-semibold text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export default function LeftMenuSubLayout(props: SubLayoutProps) {
  const { title, description, children } = props
  const { pathname } = useLocation()
  const siteMenu = useSiteMenu()

  // 좌측 메뉴에는 사이트맵 노출 기준을 쓴다 — GNB 에 없는 묶음(이용안내 등)도 세울 수 있다.
  const group = findGroup(pickMenu(siteMenu, 'sitemap'), pathname)

  // 세울 메뉴 묶음이 없으면 기본 서브로 그린다.
  if (!group || group.children.length === 0) return <BasicSubLayout {...props} />

  return (
    <>
      <PageHero title={title} description={description} />
      <div className="gnb:hidden">
        <ChipMenu group={group} pathname={pathname} />
      </div>

      <div className="container-wnc py-14 sm:py-16">
        <div className="grid gap-12 gnb:grid-cols-[15rem_minmax(0,1fr)]">
          <aside className="hidden gnb:block">
            <div className="sticky top-24">
              <SideMenu group={group} pathname={pathname} />
            </div>
          </aside>

          {/* 본문 — 페이지들이 쓰는 container-wnc 는 칼럼 안에서 폭 제한·여백을 풀어 그대로 놓는다. */}
          <div className="min-w-0 [&_.container-wnc]:max-w-none [&_.container-wnc]:px-0">{children}</div>
        </div>
      </div>
    </>
  )
}
