import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
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

/** 팝업 하나 — 형태에 따라 고정되거나 끌어 옮길 수 있다. */
function PopupWindow({ popup, onClose }: { popup: Popup; onClose: (remember: boolean) => void }) {
  const draggable = popup.windowType === 'draggable'
  const [pos, setPos] = useState({ top: popup.positionTop, left: popup.positionLeft })
  // 끌기 시작할 때의 마우스 위치와 팝업 위치를 기억해 둔다.
  const drag = useRef<{ x: number; y: number; top: number; left: number } | null>(null)

  const onPointerMove = useCallback((e: PointerEvent) => {
    if (!drag.current) return
    setPos({
      top: Math.max(0, drag.current.top + (e.clientY - drag.current.y)),
      left: Math.max(0, drag.current.left + (e.clientX - drag.current.x)),
    })
  }, [])

  const onPointerUp = useCallback(() => {
    drag.current = null
  }, [])

  useEffect(() => {
    if (!draggable) return
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [draggable, onPointerMove, onPointerUp])

  return (
    <div
      role="dialog"
      aria-label={popup.name}
      style={{
        top: pos.top,
        left: pos.left,
        width: popup.width,
        maxWidth: 'calc(100vw - 2rem)',
      }}
      className="fixed z-50 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
    >
      {/* 이동 가능한 팝업은 위쪽 손잡이를 끌어서 옮긴다. */}
      {draggable && (
        <div
          onPointerDown={(e) => {
            drag.current = { x: e.clientX, y: e.clientY, top: pos.top, left: pos.left }
          }}
          className="flex cursor-move items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-medium text-slate-500"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 12h16M4 16h16" />
          </svg>
          끌어서 옮기기
        </div>
      )}

      <MaybeLink popup={popup}>
        <div style={{ maxHeight: popup.height, overflowY: overflowOf(popup.scrollbar) }}>
          {popup.image && <img src={popup.image} alt="" className="w-full" />}
          {popup.content?.trim() && (
            <div className="px-5 py-4">
              <RichText html={popup.content} />
            </div>
          )}
        </div>
      </MaybeLink>

      <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-2.5 text-sm">
        <label className="flex cursor-pointer items-center gap-2 text-slate-600">
          <input
            type="checkbox"
            onChange={(e) => {
              if (e.target.checked) onClose(true)
            }}
            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          />
          {popup.hidePeriod === 'day'
            ? '하루동안 열지 않기'
            : popup.hidePeriod === 'never'
              ? '다시 열지 않기'
              : '이 브라우저를 닫을 때까지 안 보기'}
        </label>
        <button
          type="button"
          onClick={() => onClose(false)}
          className="font-medium text-slate-600 hover:text-slate-900"
        >
          닫기
        </button>
      </div>
    </div>
  )
}

/**
 * 홈페이지에 팝업을 띄운다.
 * 게시기간 안이고 사용 중인 팝업만 서버가 내려주며,
 * 팝업위치가 맞지 않거나 방문자가 닫은 것은 여기서 걸러진다.
 */
export default function SitePopups() {
  const { pathname } = useLocation()
  const [popups, setPopups] = useState<Popup[]>([])
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

  const visible = popups.filter((p) => matchesPath(p) && !isHidden(p.id))

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

  function close(popup: Popup, keep: boolean) {
    if (keep) remember(popup)
    setPopups((prev) => prev.filter((p) => p.id !== popup.id))
  }

  const layers = visible.filter((p) => p.windowType !== 'window')
  if (layers.length === 0) return null

  return (
    <>
      {layers.map((popup) => (
        <PopupWindow key={popup.id} popup={popup} onClose={(keep) => close(popup, keep)} />
      ))}
    </>
  )
}
