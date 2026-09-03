import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

/**
 * 서브 화면 상단의 길 안내 — 홈 · 묶음 · 현재 화면을 칸으로 잇는다.
 * 묶음과 현재 화면 칸은 눌러서 같은 자리의 다른 화면으로 바로 옮겨 갈 수 있는 풀다운이다.
 * 펼친 판은 뒤가 비쳐 보이도록 흐림(blur) 처리한다.
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

function Caret({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
    </svg>
  )
}

export default function PageBreadcrumb({ crumbs }: { crumbs: Crumb[] }) {
  const [open, setOpen] = useState(-1)
  const ref = useRef<HTMLElement>(null)
  const navigate = useNavigate()

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
    <nav ref={ref} aria-label="현재 위치" className="flex justify-center">
      <div className="flex max-w-full overflow-visible rounded-lg border border-white/25 bg-white/10 text-sm backdrop-blur-sm">
        {crumbs.map((crumb, i) => {
          const isOpen = open === i
          const cell = `flex h-12 items-center gap-2 px-4 text-white/85 transition hover:text-white sm:px-5 ${
            i > 0 ? 'border-l border-white/20' : ''
          }`

          // 집 — 아이콘만
          if (crumb.home) {
            return (
              <Link key="home" to={crumb.to ?? '/'} aria-label={crumb.label} className={`${cell} px-4`}>
                <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 11l9-8 9 8M5.5 9.5V20h13V9.5M10 20v-6h4v6" />
                </svg>
              </Link>
            )
          }

          // 고를 것이 없으면 글자만
          if (!crumb.items || crumb.items.length === 0) {
            return (
              <span key={`${crumb.label}-${i}`} className={`${cell} font-medium text-white`}>
                <span className="max-w-[9rem] truncate sm:max-w-[13rem]">{crumb.label}</span>
              </span>
            )
          }

          return (
            <div key={`${crumb.label}-${i}`} className="relative">
              <button
                type="button"
                onClick={() => setOpen(isOpen ? -1 : i)}
                aria-expanded={isOpen}
                className={`${cell} w-full justify-between gap-6 font-medium ${isOpen ? 'text-white' : ''}`}
              >
                <span className="max-w-[9rem] truncate sm:max-w-[13rem]">{crumb.label}</span>
                <Caret open={isOpen} />
              </button>

              {/* 펼친 판 — 뒤가 비쳐 보이도록 흐리게 */}
              {isOpen && (
                <ul className="absolute left-0 top-full z-20 max-h-80 w-full min-w-[12rem] overflow-y-auto border border-white/15 bg-slate-900/60 py-1 shadow-[0_18px_40px_rgba(0,0,0,0.35)] backdrop-blur-md">
                  {crumb.items.map((item) => {
                    const current = item.label === crumb.label
                    return (
                      <li key={`${item.to}-${item.label}`}>
                        <button
                          type="button"
                          onClick={() => {
                            setOpen(-1)
                            navigate(item.to)
                          }}
                          aria-current={current ? 'page' : undefined}
                          className={`block w-full px-5 py-2.5 text-left text-sm transition ${
                            current ? 'bg-white/10 font-semibold text-mint-300' : 'text-white/80 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          {item.label}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )
        })}
      </div>
    </nav>
  )
}
