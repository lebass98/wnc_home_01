import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import type { Popup } from '@wnc/shared'
import { api } from '../lib/api'
import RichText from './RichText'

/**
 * 닫은 팝업을 기억하는 저장소 키 — 팝업 id 별로 '다시 보여줄 시각'을 담는다.
 * '다시 열지 않음'은 아주 먼 미래 시각으로 저장한다.
 */
const STORAGE_KEY = 'wnc_popup_hidden'

/** '이 브라우저 닫을 때까지'는 탭을 닫으면 지워지는 sessionStorage 에 담는다. */
const SESSION_KEY = 'wnc_popup_hidden_session'

/** 한 화면에 나란히 보여줄 최대 개수. 이보다 많으면 슬라이드로 넘긴다. */
const PER_PAGE = 2

type HiddenMap = Record<string, number>

function readMap(store: Storage, key: string): HiddenMap {
  try {
    const raw = store.getItem(key)
    return raw ? (JSON.parse(raw) as HiddenMap) : {}
  } catch {
    // 저장소를 못 읽는 환경(프라이빗 모드 등)에서는 매번 팝업을 보여준다.
    return {}
  }
}

function writeMap(store: Storage, key: string, map: HiddenMap) {
  try {
    store.setItem(key, JSON.stringify(map))
  } catch {
    // 저장 실패는 무시한다 — 이번 방문에서만 닫힌다.
  }
}

/** 이 팝업을 지금 감춰야 하는지 판단한다. 기한이 지난 기록은 무시한다. */
function isHidden(id: number): boolean {
  const now = Date.now()
  const key = String(id)
  const local = readMap(localStorage, STORAGE_KEY)[key]
  if (typeof local === 'number' && now < local) return true
  return Boolean(readMap(sessionStorage, SESSION_KEY)[key])
}

/** 관리자가 고른 표시기간만큼 이 팝업을 감춘다. */
function remember(popup: Popup) {
  const key = String(popup.id)
  if (popup.hidePeriod === 'session') {
    const map = readMap(sessionStorage, SESSION_KEY)
    map[key] = 1
    writeMap(sessionStorage, SESSION_KEY, map)
    return
  }
  const until =
    popup.hidePeriod === 'never'
      ? // 사실상 다시 열지 않는다는 뜻으로 100년 뒤를 넣는다.
        Date.now() + 100 * 365 * 24 * 60 * 60 * 1000
      : (() => {
          const d = new Date()
          d.setHours(23, 59, 59, 999)
          return d.getTime()
        })()
  const map = readMap(localStorage, STORAGE_KEY)
  map[key] = until
  writeMap(localStorage, STORAGE_KEY, map)
}

/** 링크가 있으면 감싸고, 없으면 그대로 둔다. */
function MaybeLink({ popup, children }: { popup: Popup; children: ReactNode }) {
  const href = popup.linkUrl?.trim()
  if (!href) return <>{children}</>

  // 사이트 안쪽 주소는 새로고침 없이 이동한다.
  if (href.startsWith('/') && !popup.linkNewTab) {
    return (
      <Link to={href} className="block">
        {children}
      </Link>
    )
  }
  return (
    <a
      href={href}
      target={popup.linkNewTab ? '_blank' : undefined}
      rel={popup.linkNewTab ? 'noopener noreferrer' : undefined}
      className="block"
    >
      {children}
    </a>
  )
}

/** 스크롤바 설정을 실제 CSS 값으로 옮긴다. */
function overflowOf(scrollbar: Popup['scrollbar']): 'auto' | 'hidden' | 'scroll' {
  if (scrollbar === 'none') return 'hidden'
  if (scrollbar === 'always') return 'scroll'
  return 'auto'
}

/** 좌우 이동 버튼 */
function ArrowButton({
  onClick,
  label,
  direction,
  className,
}: {
  onClick: () => void
  label: string
  direction: 'prev' | 'next'
  className: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`absolute top-1/2 z-10 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full border border-white/50 text-white transition hover:bg-white/15 ${className}`}
    >
      <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d={direction === 'prev' ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'}
        />
      </svg>
    </button>
  )
}

/** 팝업 한 장 — 이미지와 본문을 담는다. */
function PopupCard({ popup }: { popup: Popup }) {
  return (
    <div
      style={{ width: popup.width, maxWidth: '100%' }}
      className="overflow-hidden bg-white shadow-2xl"
    >
      <MaybeLink popup={popup}>
        <div style={{ maxHeight: popup.height, overflowY: overflowOf(popup.scrollbar) }}>
          {popup.image && <img src={popup.image} alt="" className="w-full" />}
          {popup.content?.trim() && (
            <div className="px-6 py-6">
              <RichText html={popup.content} />
            </div>
          )}
        </div>
      </MaybeLink>
    </div>
  )
}

/**
 * 홈페이지에 팝업을 띄운다.
 * 게시기간 안이고 사용 중인 팝업만 서버가 내려주며,
 * 팝업위치가 맞지 않거나 방문자가 닫은 것은 여기서 걸러진다.
 *
 * 두 장까지는 한 화면에 나란히 놓고, 세 장부터는 좌우로 넘겨 본다.
 */
export default function SitePopups() {
  const { pathname } = useLocation()
  const [popups, setPopups] = useState<Popup[]>([])
  const [page, setPage] = useState(0)
  // 창으로 여는 팝업은 한 번만 열어야 하므로 이미 연 id 를 기억한다.
  const opened = useRef(new Set<number>())

  useEffect(() => {
    api<Popup[]>('/popups/active')
      .then(setPopups)
      // 팝업은 부가 기능이라 실패해도 사이트 이용에는 지장이 없다.
      .catch(() => setPopups([]))
  }, [])

  /** 이 화면에서 띄울 팝업인지 — 메인페이지 전용인지, 특정 주소인지 본다. */
  const matchesPath = useCallback(
    (popup: Popup) => {
      if (popup.placement === 'main') return pathname === '/'
      const target = popup.placementPath?.trim()
      return Boolean(target) && pathname.startsWith(target as string)
    },
    [pathname],
  )

  const visible = useMemo(
    () => popups.filter((p) => matchesPath(p) && !isHidden(p.id)),
    [popups, matchesPath],
  )

  // 일반 윈도우 팝업은 브라우저 창으로 연다. 팝업 차단에 막히면 조용히 넘어간다.
  useEffect(() => {
    for (const popup of visible) {
      if (popup.windowType !== 'window' || opened.current.has(popup.id)) continue
      opened.current.add(popup.id)

      const win = window.open(
        '',
        `wnc_popup_${popup.id}`,
        `width=${popup.width},height=${popup.height},top=${popup.positionTop},left=${popup.positionLeft},scrollbars=${popup.scrollbar === 'none' ? 'no' : 'yes'}`,
      )
      if (!win) continue

      const image = popup.image ? `<img src="${popup.image}" alt="" style="width:100%">` : ''
      win.document.write(
        `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>${popup.name}</title>` +
          `<style>body{margin:0;font-family:system-ui,-apple-system,'Malgun Gothic',sans-serif;color:#1e293b}` +
          `.body{padding:16px;line-height:1.6}img{max-width:100%}</style></head>` +
          `<body>${image}<div class="body">${popup.content}</div></body></html>`,
      )
      win.document.close()
    }
  }, [visible])

  // 레이어로 띄울 팝업만 겹쳐서 보여준다.
  const layers = visible.filter((p) => p.windowType !== 'window')
  const pages = Math.max(1, Math.ceil(layers.length / PER_PAGE))
  // 화살표는 세 장 이상일 때만 쓴다. (두 장이면 한 화면에 다 들어간다)
  const sliding = layers.length > PER_PAGE

  // 팝업이 줄어 현재 쪽이 사라지면 첫 쪽으로 되돌린다.
  useEffect(() => {
    if (page > pages - 1) setPage(0)
  }, [page, pages])

  const go = (next: number) => setPage((next + pages) % pages)

  /** 전부 닫는다. remember 를 켜면 표시기간만큼 다시 뜨지 않는다. */
  const closeAll = useCallback(
    (keep: boolean) => {
      if (keep) for (const p of layers) remember(p)
      setPopups((prev) => prev.filter((p) => !layers.some((l) => l.id === p.id)))
    },
    [layers],
  )

  // ESC 로 닫는다.
  useEffect(() => {
    if (layers.length === 0) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAll(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [layers.length, closeAll])

  // 팝업이 떠 있는 동안에는 뒤쪽 화면이 스크롤되지 않게 한다.
  useEffect(() => {
    if (layers.length === 0) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [layers.length])

  if (layers.length === 0) return null

  const shown = sliding ? layers.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE) : layers

  // 표시기간은 팝업마다 다를 수 있어, 여러 개면 가장 짧은 쪽에 맞춰 안내한다.
  const hideLabel = layers.every((p) => p.hidePeriod === 'session')
    ? '이 브라우저를 닫을 때까지 열지 않기'
    : layers.every((p) => p.hidePeriod === 'never')
      ? '다시 열지 않기'
      : '오늘 하루 열지 않기'

  return (
    <div
      role="dialog"
      aria-modal
      aria-label="팝업 안내"
      className="fixed inset-0 z-[70] overflow-y-auto bg-slate-950/90"
    >
      <div className="flex min-h-full flex-col items-center justify-center px-4 py-10 sm:px-16">
        {/* 팝업 — 두 장까지는 나란히, 세 장부터는 넘겨서 본다. */}
        <div className="relative w-full">
          <div className="flex flex-wrap items-start justify-center gap-6">
            {shown.map((popup) => (
              <PopupCard key={popup.id} popup={popup} />
            ))}
          </div>

          {/* 좁은 화면에서는 팝업이 세로로 쌓여 가운데가 비지 않으므로 아래쪽 줄로 옮긴다. */}
          {sliding && (
            <div className="hidden sm:block">
              <ArrowButton
                direction="prev"
                label="이전 팝업"
                onClick={() => go(page - 1)}
                className="-left-4"
              />
              <ArrowButton
                direction="next"
                label="다음 팝업"
                onClick={() => go(page + 1)}
                className="-right-4"
              />
            </div>
          )}
        </div>

        {/* 현재 쪽 표시 — 좁은 화면에서는 좌우 버튼을 양옆에 함께 둔다. */}
        {sliding && (
          <div className="mt-6 flex items-center gap-4 sm:gap-2.5">
            <button
              type="button"
              onClick={() => go(page - 1)}
              aria-label="이전 팝업"
              className="grid h-9 w-9 place-items-center rounded-full border border-white/50 text-white transition hover:bg-white/15 sm:hidden"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex gap-2.5">
              {Array.from({ length: pages }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPage(i)}
                  aria-label={`${i + 1}번째 팝업 보기`}
                  aria-current={i === page}
                  className={`h-2.5 w-2.5 rounded-full transition ${
                    i === page ? 'bg-mint-400' : 'bg-white/40 hover:bg-white/70'
                  }`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => go(page + 1)}
              aria-label="다음 팝업"
              className="grid h-9 w-9 place-items-center rounded-full border border-white/50 text-white transition hover:bg-white/15 sm:hidden"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}

        {/* 건수 · 닫기 */}
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <span className="mr-2 rounded bg-black/70 px-4 py-2.5 text-sm text-white">
            팝업건수 : 총 <span className="font-bold text-mint-400">{layers.length}</span>건
          </span>

          <button
            type="button"
            onClick={() => closeAll(false)}
            className="inline-flex items-center gap-2 rounded bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            닫기
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => closeAll(true)}
            className="inline-flex items-center gap-2 rounded bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600"
          >
            {hideLabel}
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
