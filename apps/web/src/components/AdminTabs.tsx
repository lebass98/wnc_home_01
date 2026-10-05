import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

/**
 * 관리자 탭 바 — 메뉴로 열어 본 화면을 상단에 탭으로 남겨, 다시 누르면 보던 곳으로 돌아간다.
 *
 * - 메뉴 하나가 탭 하나다. 상세·수정 화면(/admin/posts/12)은 그 메뉴의 탭 안에서 열리고,
 *   탭은 마지막으로 보던 주소(검색 조건·쪽 번호 포함)와 스크롤 위치를 기억한다.
 * - 대시보드 탭은 고정이라 닫히지 않는다. 탭이 너무 많아지면 오래 안 쓴 탭부터 닫는다.
 * - 탭을 바꾸면 그 화면을 새로 불러온다. 화면을 띄워 둔 채 숨기지 않는다 — 오래된 데이터가 보이지 않게.
 * - 열린 탭 목록은 이 브라우저에 사용자별로 남아 새로고침해도 그대로다. (서버에는 저장하지 않는다)
 */

/** 탭이 될 수 있는 메뉴 — AdminLayout 의 사이드바 메뉴에서 만든다. */
export interface TabMenu {
  to: string
  /** 화면에 보일 이름 — 언어팩을 거친 값 */
  label: string
  icon: string
  end: boolean
  /** 이 경로들로 시작하면 이 메뉴가 아니다 (형제 메뉴가 담당하는 화면) */
  notWhen?: string[]
  /** 메뉴 경로 밖이지만 이 메뉴의 탭으로 묶을 경로 (예: 게시판 추가·수정 /admin/boards) */
  also?: string[]
}

interface AdminTab {
  /** 메뉴 경로 — 탭을 가려내는 이름표 */
  key: string
  /** 마지막으로 보던 주소 */
  url: string
  /** 마지막으로 쓴 시각 — 탭이 넘치면 오래된 것부터 닫는다. */
  used: number
}

const HOME = '/admin'
/** 한 번에 열어 둘 수 있는 탭 수 (대시보드 포함) */
const MAX_TABS = 10

const under = (pathname: string, base: string) => pathname === base || pathname.startsWith(`${base}/`)

/** 지금 주소가 어느 메뉴의 화면인지 — 여럿이 맞으면 가장 구체적인(긴) 메뉴를 고른다. */
export function findTabMenu(menus: TabMenu[], pathname: string, search: string): TabMenu | null {
  let best: TabMenu | null = null
  for (const menu of menus) {
    const [path, query] = menu.to.split('?')
    let ok: boolean
    if (query) {
      // 게시판 바로가기 — 같은 글 목록 화면에서 분류까지 같을 때만 그 탭이다.
      const have = new URLSearchParams(search)
      ok = pathname === path && [...new URLSearchParams(query)].every(([k, v]) => have.get(k) === v)
    } else if (menu.notWhen?.some((x) => under(pathname, x))) {
      ok = false
    } else if (menu.end) {
      ok = pathname === path
    } else {
      ok = under(pathname, path) || (menu.also ?? []).some((x) => under(pathname, x))
    }
    if (ok && (!best || menu.to.length > best.to.length)) best = menu
  }
  return best
}

const storageKey = (userId: number) => `wnc_admin_tabs:${userId}`

function readTabs(key: string): AdminTab[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(key) ?? '[]')
    if (!Array.isArray(raw)) return []
    return raw
      .filter((t): t is AdminTab => !!t && typeof t.key === 'string' && typeof t.url === 'string' && t.url.startsWith(HOME))
      .map((t) => ({ key: t.key, url: t.url, used: Number(t.used) || 0 }))
  } catch {
    return []
  }
}

function saveTabs(key: string, tabs: AdminTab[]) {
  try {
    localStorage.setItem(key, JSON.stringify(tabs))
  } catch {
    // 저장소를 못 써도 이번 화면에서는 탭이 동작한다.
  }
}

/** 대시보드 탭은 늘 맨 앞에 있다. */
function withHome(tabs: AdminTab[]): AdminTab[] {
  const home = tabs.find((t) => t.key === HOME) ?? { key: HOME, url: HOME, used: 0 }
  return [home, ...tabs.filter((t) => t.key !== HOME)]
}

/** 탭이 넘치면 대시보드와 지금 탭을 빼고 가장 오래 안 쓴 탭부터 닫는다. */
function trim(tabs: AdminTab[], keep: string): AdminTab[] {
  let next = tabs
  while (next.length > MAX_TABS) {
    const victim = next.filter((t) => t.key !== HOME && t.key !== keep).sort((a, b) => a.used - b.used)[0]
    if (!victim) break
    next = next.filter((t) => t !== victim)
  }
  return next
}

const CLOSE_ICON = 'M6 6l12 12M18 6L6 18'

export default function AdminTabBar({ menus, userId }: { menus: TabMenu[]; userId: number }) {
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const key = storageKey(userId)
  const url = pathname + search

  const [tabs, setTabs] = useState<AdminTab[]>(() => withHome(readTabs(key)))
  const tabsRef = useRef(tabs)
  tabsRef.current = tabs

  const current = findTabMenu(menus, pathname, search)
  const currentKey = current?.to ?? null
  // 메뉴에서 사라진 탭(권한·게시판 바로가기 해제)은 보이지 않는다.
  const visible = tabs.filter((t) => menus.some((m) => m.to === t.key))
  const menuOf = (tab: AdminTab) => menus.find((m) => m.to === tab.key)

  /**
   * 지금 화면을 탭에 올린다.
   * 게시판 바로가기는 게시판 목록을 받아 온 뒤에야 메뉴에 붙어, 같은 주소인데 맞는 탭이 바뀔 수 있다.
   * 그때는 앞서 올린 탭을 원래대로 되돌리고 새 탭으로 옮긴다.
   */
  const lastReg = useRef<{ url: string; key: string; before: AdminTab | null } | null>(null)
  useEffect(() => {
    if (!currentKey) return
    let next = tabsRef.current
    const reg = lastReg.current
    if (reg && reg.url === url && reg.key !== currentKey) {
      const undo = reg.before
      next = undo ? next.map((t) => (t.key === reg.key ? undo : t)) : next.filter((t) => t.key !== reg.key)
    }
    const before = next.find((t) => t.key === currentKey) ?? null
    lastReg.current = { url, key: currentKey, before }
    const now = Date.now()
    next = before
      ? next.map((t) => (t.key === currentKey ? { ...t, url, used: now } : t))
      : [...next, { key: currentKey, url, used: now }]
    setTabs(trim(withHome(next), currentKey))
  }, [url, currentKey])

  useEffect(() => saveTabs(key, tabs), [key, tabs])

  // --- 스크롤 위치 — 탭마다 마지막 위치를 적어 두었다가, 탭을 눌러 돌아오면 되살린다 ---
  const scrolls = useRef<Record<string, number>>({})
  const activeKeyRef = useRef<string | null>(currentKey)
  // 화면이 바뀐 직후 짧아진 높이 때문에 생기는 스크롤은 새 탭 몫으로 적히도록 그리기 전에 바꾼다.
  useLayoutEffect(() => {
    activeKeyRef.current = currentKey
  }, [currentKey])
  useEffect(() => {
    const onScroll = () => {
      if (activeKeyRef.current) scrolls.current[activeKeyRef.current] = window.scrollY
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const restoreRef = useRef<{ key: string; y: number } | null>(null)
  useEffect(() => {
    const want = restoreRef.current
    if (!want || want.key !== currentKey) return
    restoreRef.current = null
    // 화면이 데이터를 받아 다시 그려지는 동안은 높이가 모자라 끝까지 못 내려간다 — 잠시 몇 번 더 맞춰 본다.
    let tries = 0
    const timer = window.setInterval(() => {
      window.scrollTo(0, want.y)
      if (Math.abs(window.scrollY - want.y) < 2 || ++tries > 20) stop()
    }, 50)
    // 그사이 사용자가 직접 스크롤하면 그 뜻을 따른다.
    const stop = () => {
      window.clearInterval(timer)
      window.removeEventListener('wheel', stop)
      window.removeEventListener('touchstart', stop)
      window.removeEventListener('keydown', stop)
    }
    window.addEventListener('wheel', stop, { passive: true })
    window.addEventListener('touchstart', stop, { passive: true })
    window.addEventListener('keydown', stop)
    window.scrollTo(0, want.y)
    return stop
  }, [url, currentKey])

  function go(tab: AdminTab) {
    if (tab.key === currentKey && tab.url === url) return
    restoreRef.current = { key: tab.key, y: scrolls.current[tab.key] ?? 0 }
    navigate(tab.url)
  }

  /**
   * 탭을 닫는다. 대시보드는 닫지 않는다.
   * 지금 보는 탭이 닫히면 `focus` 탭으로, 없으면 오른쪽 → 왼쪽 탭 → 대시보드 순으로 옮겨 간다.
   */
  function close(keys: string[], focus?: string) {
    const closing = new Set(keys.filter((k) => k !== HOME))
    if (closing.size === 0) return
    setTabs(tabs.filter((t) => !closing.has(t.key)))
    if (!currentKey || !closing.has(currentKey)) return
    const idx = visible.findIndex((t) => t.key === currentKey)
    const open = (t: AdminTab) => !closing.has(t.key)
    const target =
      visible.find((t) => t.key === focus && open(t)) ??
      visible.slice(idx + 1).find(open) ??
      visible.slice(0, Math.max(idx, 0)).reverse().find(open) ??
      visible[0]
    if (target) go(target)
  }

  // --- 탭 줄 — 넘치면 가로로 밀어 보고, 지금 탭은 늘 보이게 한다 ---
  const stripRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const strip = stripRef.current
    const el = strip?.querySelector<HTMLElement>('[data-active="true"]')
    if (!strip || !el) return
    if (el.offsetLeft < strip.scrollLeft) strip.scrollLeft = el.offsetLeft - 8
    else if (el.offsetLeft + el.offsetWidth > strip.scrollLeft + strip.clientWidth)
      strip.scrollLeft = el.offsetLeft + el.offsetWidth - strip.clientWidth + 8
  }, [currentKey, visible.length])
  useEffect(() => {
    const strip = stripRef.current
    if (!strip) return
    // 마우스 휠(세로)로도 탭 줄을 가로로 민다 — 넘칠 때만 페이지 스크롤을 막는다.
    const onWheel = (e: WheelEvent) => {
      if (strip.scrollWidth <= strip.clientWidth || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return
      e.preventDefault()
      strip.scrollLeft += e.deltaY
    }
    strip.addEventListener('wheel', onWheel, { passive: false })
    return () => strip.removeEventListener('wheel', onWheel)
  }, [])

  // --- 오른쪽 클릭 메뉴 · 열린 탭 목록 ---
  const [context, setContext] = useState<{ key: string; x: number; y: number } | null>(null)
  const [listOpen, setListOpen] = useState(false)
  const popRef = useRef<HTMLDivElement>(null)
  const listBtnRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!context && !listOpen) return
    const dismiss = () => {
      setContext(null)
      setListOpen(false)
    }
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node
      // 목록 단추는 스스로 열고 닫는다 — 여기서 닫으면 이어지는 클릭이 다시 열어 버린다.
      if (!popRef.current?.contains(target) && !listBtnRef.current?.contains(target)) dismiss()
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && dismiss()
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', dismiss, { passive: true })
    window.addEventListener('resize', dismiss)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', dismiss)
      window.removeEventListener('resize', dismiss)
    }
  }, [context, listOpen])

  function onTabClick(e: ReactMouseEvent, tab: AdminTab) {
    // Ctrl·Cmd·Shift 클릭은 브라우저에 맡긴다 — 새 창으로 열 수 있게.
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    go(tab)
  }

  function onTabAuxClick(e: ReactMouseEvent, tab: AdminTab) {
    // 가운데 단추 클릭은 탭 닫기 — 브라우저 탭과 같은 습관.
    if (e.button !== 1) return
    e.preventDefault()
    close([tab.key])
  }

  const contextIndex = context ? visible.findIndex((t) => t.key === context.key) : -1
  const contextItems = context
    ? [
        { label: '탭 닫기', disabled: context.key === HOME, run: () => close([context.key]) },
        {
          label: '다른 탭 모두 닫기',
          disabled: visible.every((t) => t.key === HOME || t.key === context.key),
          run: () => close(visible.filter((t) => t.key !== context.key).map((t) => t.key), context.key),
        },
        {
          label: '오른쪽 탭 모두 닫기',
          disabled: contextIndex === visible.length - 1,
          run: () => close(visible.slice(contextIndex + 1).map((t) => t.key), context.key),
        },
        {
          label: '모든 탭 닫기',
          disabled: visible.length <= 1,
          run: () => close(visible.map((t) => t.key), HOME),
        },
      ]
    : []

  return (
    <div
      className="sticky z-20 hidden h-11 items-end gap-2 bg-white pl-4 pr-3 dark:bg-slate-800 sm:pl-6 lg:flex"
      style={{ top: 'calc(var(--demo-banner-h) + 4rem)' }}
    >
      {/* 탭 아래 선 — 지금 탭은 본문 바탕색으로 이 선을 덮어 본문과 이어져 보인다. */}
      <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-slate-200 dark:bg-slate-700" />

      <nav
        ref={stripRef}
        aria-label="열어 본 화면"
        className="relative flex h-full min-w-0 flex-1 items-end gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {visible.map((tab) => {
          const menu = menuOf(tab)
          if (!menu) return null
          const active = tab.key === currentKey
          return (
            <div
              key={tab.key}
              data-active={active}
              className={`group flex h-9 max-w-[13rem] shrink-0 items-center rounded-t-lg border border-b-0 text-[13px] transition ${
                active
                  ? 'border-slate-200 bg-slate-50 font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100'
                  : 'border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-700/60 dark:hover:text-slate-100'
              }`}
            >
              <Link
                to={tab.url}
                aria-current={active ? 'page' : undefined}
                title={menu.label}
                onClick={(e) => onTabClick(e, tab)}
                onAuxClick={(e) => onTabAuxClick(e, tab)}
                // 가운데 단추를 누르는 순간 생기는 자동 스크롤을 막는다.
                onMouseDown={(e) => e.button === 1 && e.preventDefault()}
                onContextMenu={(e) => {
                  e.preventDefault()
                  setListOpen(false)
                  setContext({ key: tab.key, x: e.clientX, y: e.clientY })
                }}
                className={`flex h-full min-w-0 items-center gap-2 rounded-t-lg pl-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500 ${
                  tab.key === HOME ? 'pr-3' : 'pr-1.5'
                }`}
              >
                <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d={menu.icon} />
                </svg>
                <span className="truncate">{menu.label}</span>
              </Link>
              {tab.key !== HOME && (
                <button
                  type="button"
                  onClick={() => close([tab.key])}
                  aria-label={`${menu.label} 탭 닫기`}
                  title="탭 닫기"
                  className={`mr-1.5 grid h-5 w-5 shrink-0 place-items-center rounded text-slate-400 transition hover:bg-slate-200 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:hover:bg-slate-600 dark:hover:text-slate-100 ${
                    active ? '' : 'opacity-60 group-hover:opacity-100'
                  }`}
                >
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2.4} viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" d={CLOSE_ICON} />
                  </svg>
                </button>
              )}
            </div>
          )
        })}
      </nav>

      {/* 열린 탭 목록 — 탭이 넘쳐 가려져도 여기서 모두 찾을 수 있다. */}
      <button
        ref={listBtnRef}
        type="button"
        onClick={() => {
          setContext(null)
          setListOpen((v) => !v)
        }}
        aria-label="열린 탭 목록"
        aria-expanded={listOpen}
        title="열린 탭 목록"
        className={`mb-1.5 flex h-8 shrink-0 items-center gap-1 self-end rounded-lg border px-2 text-xs font-medium transition ${
          listOpen
            ? 'border-brand-500 bg-brand-50 text-brand-600 dark:bg-slate-700'
            : 'border-slate-200 text-slate-500 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700'
        }`}
      >
        {visible.length}
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {listOpen && (
        <div
          ref={popRef}
          className="absolute right-3 top-full z-30 mt-1 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-600 dark:bg-slate-800"
        >
          <ul className="max-h-80 overflow-y-auto py-1">
            {visible.map((tab) => {
              const menu = menuOf(tab)
              if (!menu) return null
              const active = tab.key === currentKey
              return (
                <li key={tab.key} className="flex items-center">
                  <button
                    type="button"
                    onClick={() => {
                      setListOpen(false)
                      go(tab)
                    }}
                    className={`flex min-w-0 flex-1 items-center gap-2.5 px-4 py-2.5 text-left text-sm transition hover:bg-slate-50 dark:hover:bg-slate-700 ${
                      active ? 'font-semibold text-brand-600 dark:text-brand-400' : 'text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d={menu.icon} />
                    </svg>
                    <span className="truncate">{menu.label}</span>
                  </button>
                  {tab.key !== HOME && (
                    <button
                      type="button"
                      onClick={() => close([tab.key])}
                      aria-label={`${menu.label} 탭 닫기`}
                      className="mr-2 grid h-6 w-6 shrink-0 place-items-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-100"
                    >
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2.4} viewBox="0 0 24 24" aria-hidden>
                        <path strokeLinecap="round" d={CLOSE_ICON} />
                      </svg>
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
          <button
            type="button"
            disabled={visible.length <= 1}
            onClick={() => {
              setListOpen(false)
              close(visible.map((t) => t.key), HOME)
            }}
            className="w-full border-t border-slate-200 px-4 py-2.5 text-left text-sm text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            모든 탭 닫기 <span className="text-xs text-slate-400">(대시보드는 남음)</span>
          </button>
        </div>
      )}

      {context && (
        <div
          ref={popRef}
          role="menu"
          className="fixed z-50 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-600 dark:bg-slate-800"
          // 화면 오른쪽 끝에서 열어도 메뉴가 잘리지 않게 안쪽으로 당긴다.
          style={{ left: Math.min(context.x, window.innerWidth - 200), top: context.y + 4 }}
        >
          {contextItems.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                setContext(null)
                item.run()
              }}
              className="flex w-full items-center px-4 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent dark:text-slate-200 dark:hover:bg-slate-700 dark:disabled:text-slate-600"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
