import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { findGroup, pathOf, pickMenu, useSiteMenu } from '../lib/menus'

/**
 * 서브 화면 상단의 길 안내 — 홈 · 묶음 · 현재 화면을 한 줄 막대로 잇는다.
 * (참고: 아이파킹 서브 상단 위치 표시 https://www.iparking.co.kr/kr/company/summary.php)
 *
 * 아이파킹과 같은 모양으로 맞춘다.
 *  - 히어로 아래쪽 가운데에 놓는 높이 48px 막대. 테두리는 1px 그러데이션, 뒤가 비쳐 보이도록 흐림 처리
 *  - 집 아이콘(48px) 다음에 묶음·현재 화면 칸이 각각 240px, 칸 사이는 세로 실선
 *  - 칸을 누르면 아래로 펼쳐지는 풀다운. 여닫을 때 살짝 미끄러지며 스며든다(0.2초)
 *  - 펼친 판은 뒤가 비쳐 보이는 투명한 흐림(blur) 판이다
 *  - 좁은 화면에서는 막대가 화면 폭을 꽉 채우고 두 칸이 절반씩 나눠 갖는다
 */

/** 풀다운 안의 한 줄 */
export interface CrumbItem {
  label: string
  to: string
}

export interface Crumb {
  label: string
  /** 칸 자체를 눌렀을 때 갈 곳 — 풀다운이 없을 때만 쓴다. */
  to?: string
  /** 눌러서 고를 수 있는 같은 자리의 화면들 */
  items?: CrumbItem[]
  /** 집 아이콘으로 보여 줄지 (맨 앞 칸) */
  home?: boolean
}

/**
 * 사이트맵을 읽어 '홈 · 묶음 · 현재 화면' 세 칸을 만든다.
 * 묶음 칸에는 다른 묶음들을, 현재 화면 칸에는 같은 묶음의 화면들을 담아 눌러서 옮겨 갈 수 있게 한다.
 * 사이트맵에서 지금 경로가 속한 묶음을 못 찾으면 빈 배열을 돌려준다 (길 안내를 그리지 않는다).
 */
export function useCrumbs(title: string): Crumb[] {
  const { pathname } = useLocation()
  const sitemap = pickMenu(useSiteMenu(), 'sitemap')
  const group = findGroup(sitemap, pathname)
  if (!group) return []

  /** 묶음을 눌렀을 때 갈 곳 — 자기 주소가 없으면 첫 하위 화면으로 보낸다. */
  const groupHref = (g: (typeof sitemap)[number]) => g.url || g.children[0]?.url || '/'

  const siblings = group.children.filter((c) => c.url)
  // 마지막 칸은 지금 보고 있는 화면 — 사이트맵에 같은 주소가 있으면 그 이름을 쓴다.
  // (묶음 이름과 화면 제목이 같을 때 두 칸이 겹쳐 보이지 않게 한다.)
  const here = siblings.find((c) => pathOf(c.url) === pathname)

  return [
    { label: '홈', to: '/', home: true },
    {
      label: group.label,
      items: sitemap.filter((g) => g.children.length > 0 || g.url).map((g) => ({ label: g.label, to: groupHref(g) })),
    },
    {
      label: here?.label ?? title,
      items: siblings.map((c) => ({ label: c.label, to: c.url })),
    },
  ]
}

function Caret({ open }: { open: boolean }) {
  return (
    <svg
      className={`absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white transition-transform ${
        open ? 'rotate-180' : ''
      }`}
      fill="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path d="M7 10l5 5 5-5z" />
    </svg>
  )
}

/** 한 칸 — 집을 뺀 나머지는 모두 이 폭·글자 모양을 쓴다. */
const CELL = 'relative h-12 w-full px-4 text-left transition-colors duration-200 hover:bg-white/10'
const LABEL = 'block w-full truncate text-sm font-bold tracking-tight text-white'

export default function PageBreadcrumb({ crumbs }: { crumbs: Crumb[] }) {
  const [open, setOpen] = useState(-1)
  const ref = useRef<HTMLElement>(null)
  const navigate = useNavigate()
  const { pathname } = useLocation()

  // 바깥을 누르거나 ESC 를 누르면 닫는다.
  useEffect(() => {
    if (open < 0) return
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(-1)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(-1)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <nav ref={ref} aria-label="현재 위치" className="flex w-full justify-center">
      {/* 바깥 한 겹은 1px 그러데이션 테두리 역할만 한다 */}
      <div className="w-full max-w-full rounded-lg bg-gradient-to-br from-white/25 via-white/[0.03] to-white/25 p-px sm:w-auto">
        <div className="flex h-12 rounded-[7px] bg-white/[0.06] backdrop-blur-md">
          {crumbs.map((crumb, i) => {
            const isOpen = open === i

            // 집 — 아이콘만
            if (crumb.home) {
              return (
                <Link
                  key="home"
                  to={crumb.to ?? '/'}
                  aria-label={crumb.label}
                  className="mx-2 flex h-12 w-12 shrink-0 items-center justify-center text-white/90 transition hover:text-white"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 11l9-8 9 8M5.5 9.5V20h13V9.5M10 20v-6h4v6" />
                  </svg>
                </Link>
              )
            }

            // 칸 하나 — 왼쪽에 세로 실선을 둔다
            const cell =
              'relative min-w-0 flex-1 before:absolute before:left-0 before:top-1/2 before:h-6 before:w-px before:-translate-y-1/2 before:bg-white/25 sm:w-60 sm:flex-none'

            // 고를 것이 없으면 글자만
            if (!crumb.items || crumb.items.length === 0) {
              return (
                <div key={`${crumb.label}-${i}`} className={cell}>
                  <span className={`${CELL} flex items-center`}>
                    <span className={LABEL}>{crumb.label}</span>
                  </span>
                </div>
              )
            }

            return (
              <div key={`${crumb.label}-${i}`} className={cell}>
                <button type="button" onClick={() => setOpen(isOpen ? -1 : i)} aria-expanded={isOpen} className={CELL}>
                  <span className={`${LABEL} pr-6 leading-[3rem]`}>{crumb.label}</span>
                  <Caret open={isOpen} />
                </button>

                {/* 펼친 판 — 뒤가 비쳐 보이도록 투명한 판에 흐림(blur) 을 준다.
                    여닫는 모션을 주려고 늘 그려 두고, 닫힌 동안에는 투명하게 눌러 둔다. */}
                <ul
                  aria-hidden={!isOpen}
                  className={`absolute inset-x-0 top-full z-30 max-h-80 origin-top overflow-y-auto rounded-b-lg border-x border-b border-white/25 bg-white/25 pb-2 shadow-[0_18px_40px_rgba(0,0,0,0.22)] backdrop-blur-xl transition duration-200 ease-out motion-reduce:transition-none ${
                    isOpen
                      ? 'translate-y-0 scale-y-100 opacity-100'
                      : 'pointer-events-none -translate-y-1 scale-y-95 opacity-0'
                  }`}
                >
                  {crumb.items.map((item) => {
                    // 지금 보고 있는 화면(또는 묶음)에 표시를 남긴다
                    const current = pathOf(item.to) === pathname || item.label === crumb.label
                    return (
                      <li key={`${item.to}-${item.label}`}>
                        <button
                          type="button"
                          tabIndex={isOpen ? undefined : -1}
                          onClick={() => {
                            setOpen(-1)
                            navigate(item.to)
                          }}
                          aria-current={current ? 'page' : undefined}
                          className={`block w-full px-4 py-2.5 text-left text-sm leading-[1.5] transition ${
                            current
                              ? 'font-semibold text-slate-900 [text-shadow:0_1px_2px_rgba(255,255,255,0.6)]'
                              : 'font-medium text-slate-800 hover:bg-white/30 hover:text-slate-900'
                          }`}
                        >
                          {item.label}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
