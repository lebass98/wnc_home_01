import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import type { Popup } from '@wnc/shared'
import { api } from '../lib/api'
import { setPopupCount, usePopupOpenSeq } from '../lib/popupLayer'
import RichText from './RichText'

/**
 * 닫은 팝업을 기억하는 저장소 키 — 팝업 id 별로 '다시 보여줄 시각'을 담는다.
 * '다시 열지 않음'은 아주 먼 미래 시각으로 저장한다.
 */
const STORAGE_KEY = 'wnc_popup_hidden'

/** '이 브라우저 닫을 때까지'는 탭을 닫으면 지워지는 sessionStorage 에 담는다. */
const SESSION_KEY = 'wnc_popup_hidden_session'

/** 팝업 사이 간격(px) */
const GAP = 20
/** 좁은 화면에서 카드 사이 간격(px) */
const GAP_MOBILE = 12
/** 카드가 닫히는 데 걸리는 시간(ms) */
const CLOSE_MS = 320
/** 한 화면에 나란히 보여 주는 장수 — 이보다 많으면 옆으로 넘겨 본다. */
const PER_VIEW = 2

/** 좌우 이동 버튼 — 흰 동그라미 안에 화살표 */
function ArrowButton({ direction, onClick }: { direction: 'prev' | 'next'; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={direction === 'prev' ? '이전 팝업 보기' : '다음 팝업 보기'}
      className="pointer-events-auto grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/95 text-slate-900 shadow-[0_8px_24px_rgba(0,0,0,0.3)] transition hover:bg-white sm:h-12 sm:w-12"
    >
      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d={direction === 'prev' ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'} />
      </svg>
    </button>
  )
}

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

/** 표시기간 설정에 맞춘 '그만보기' 버튼 문구 */
function hideLabelOf(popup: Popup): string {
  if (popup.hidePeriod === 'never') return '다시 열지 않기'
  if (popup.hidePeriod === 'session') return '그만 보기'
  return '오늘 그만보기'
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

/**
 * 팝업 한 장 — 위에 내용(이미지·본문), 아래에 자기만의 버튼 두 개를 단다.
 * 크기는 관리자가 정한 가로·세로를 그대로 쓰고, 화면이 좁으면 scale 만큼 통째로 줄인다.
 */
function PopupLayer({
  popup,
  scale,
  onHide,
  onClose,
}: {
  popup: Popup
  scale: number
  onHide: () => void
  onClose: () => void
}) {
  return (
    <div
      style={{ width: popup.width * scale }}
      className="pointer-events-auto overflow-hidden rounded-md bg-white shadow-[0_18px_50px_rgba(0,0,0,0.35)]"
    >
      <div style={{ height: popup.height * scale }} className="overflow-hidden">
        <MaybeLink popup={popup}>
          <div
            style={{
              width: popup.width,
              height: popup.height,
              transform: scale === 1 ? undefined : `scale(${scale})`,
              transformOrigin: 'top left',
              overflowY: overflowOf(popup.scrollbar),
            }}
          >
            {popup.image && <img src={popup.image} alt="" className="w-full" />}
            {popup.content?.trim() && (
              <div className="px-6 py-6">
                <RichText html={popup.content} />
              </div>
            )}
          </div>
        </MaybeLink>
      </div>

      {/* 카드 발치 버튼 — 반반 나눠 그만보기·창닫기 */}
      <div className="flex divide-x divide-slate-200 border-t border-slate-200 bg-white text-sm text-slate-600">
        <button type="button" onClick={onHide} className="h-12 min-w-0 flex-1 truncate px-2 transition hover:bg-slate-50">
          {hideLabelOf(popup)}
        </button>
        <button type="button" onClick={onClose} className="h-12 min-w-0 flex-1 truncate px-2 transition hover:bg-slate-50">
          창닫기
        </button>
      </div>
    </div>
  )
}

/**
 * 홈페이지에 팝업을 띄운다.
 * 게시기간 안이고 사용 중인 팝업만 서버가 내려주며,
 * 팝업위치가 맞지 않거나 방문자가 닫은 것은 여기서 걸러진다.
 *
 * 화면을 덮는 대신 본문 위에 카드로 떠 있는 방식이다(아이파킹 참고).
 * 카드는 상단 가운데에 나란히 놓이고, 안 들어가면 다음 줄로 넘어간다.
 * 카드마다 '오늘 그만보기(표시기간 반영)'와 '창닫기'가 붙고, 묶음 오른쪽 위에 '전체 닫기'가 있다.
 */
export default function SitePopups() {
  const { pathname } = useLocation()
  const [popups, setPopups] = useState<Popup[]>([])
  // 창으로 여는 팝업은 한 번만 열어야 하므로 이미 연 id 를 기억한다.
  const opened = useRef(new Set<number>())
  // '창닫기'로 내린 카드 — 저장하지 않으므로 다음 방문에는 다시 뜬다.
  const [dismissed, setDismissed] = useState<Set<number>>(new Set())
  // 닫히는 동작이 진행 중인 카드 — 폭이 접히며 옆 카드가 왼쪽으로 미끄러져 온다.
  const [closingIds, setClosingIds] = useState<Set<number>>(new Set())
  // '전체 닫기'로 묶음을 통째로 내렸는지
  const [closed, setClosed] = useState(false)
  // 상단 POPUP 버튼으로 다시 열었는지 — 켜지면 닫힘·그만보기 기록을 무시한다.
  const [forced, setForced] = useState(false)
  const openSeq = usePopupOpenSeq()

  useEffect(() => {
    api<Popup[]>('/popups/active')
      .then(setPopups)
      // 팝업은 부가 기능이라 실패해도 사이트 이용에는 지장이 없다.
      .catch(() => setPopups([]))
  }, [])

  // 상단 메뉴에서 열기를 요청하면 닫아 둔 것도 다시 보여 준다.
  useEffect(() => {
    if (openSeq === 0) return
    setClosed(false)
    setDismissed(new Set())
    setClosingIds(new Set())
    setForced(true)
  }, [openSeq])

  // 화면을 옮기면 닫힘 상태를 초기화한다 — 다른 페이지의 팝업은 새로 판단한다.
  useEffect(() => {
    setClosed(false)
    setDismissed(new Set())
    setClosingIds(new Set())
    setForced(false)
  }, [pathname])

  /** 이 화면에서 띄울 팝업인지 — 메인페이지 전용인지, 특정 주소인지 본다. */
  const matchesPath = useCallback(
    (popup: Popup) => {
      if (popup.placement === 'main') return pathname === '/'
      const target = popup.placementPath?.trim()
      return Boolean(target) && pathname.startsWith(target as string)
    },
    [pathname],
  )

  // 상단 메뉴의 POPUP 건수 — 어느 화면에서든 지금 게시 중인 레이어 팝업 전부를 센다.
  useEffect(() => {
    setPopupCount(popups.filter((p) => p.windowType !== 'window').length)
  }, [popups])

  const visible = useMemo(() => {
    if (closed) return []
    // 상단 POPUP 으로 열었으면 노출위치·그만보기 기록과 상관없이 게시 중인 레이어 팝업을 보여 준다.
    if (forced) return popups.filter((p) => p.windowType !== 'window' && !dismissed.has(p.id))
    return popups.filter((p) => matchesPath(p) && !isHidden(p.id) && !dismissed.has(p.id))
  }, [popups, matchesPath, closed, forced, dismissed])

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
          // 새 창은 우리 번들을 못 쓰므로 프리텐다드를 CDN 에서 따로 읽는다.
          `<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">` +
          `<style>body{margin:0;font-family:'Pretendard Variable',Pretendard,system-ui,-apple-system,sans-serif;color:#1e293b}` +
          `.body{padding:16px;line-height:1.6}img{max-width:100%}</style></head>` +
          `<body>${image}<div class="body">${popup.content}</div></body></html>`,
      )
      win.document.close()
    }
  }, [visible])

  // 레이어로 띄울 팝업만 카드로 보여준다.
  const layers = useMemo(() => visible.filter((p) => p.windowType !== 'window'), [visible])
  const count = layers.length

  /** '창닫기' — 접히는 동작을 먼저 보여 주고 이 카드만 내린다. 기록하지 않는다. */
  const dismissOne = (id: number) => {
    if (closingIds.has(id)) return
    setClosingIds((prev) => new Set(prev).add(id))
    setTimeout(() => {
      setDismissed((prev) => new Set(prev).add(id))
      setClosingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }, CLOSE_MS)
  }

  /** '오늘 그만보기' — 표시기간만큼 기억하고 내린다. */
  const hideOne = (popup: Popup) => {
    remember(popup)
    dismissOne(popup.id)
  }

  /** '전체 닫기' — 모두 접힌 뒤 내린다. 기록하지 않으므로 새로 열면 다시 뜬다. */
  const closeAll = useCallback(() => {
    setClosingIds(new Set(layers.map((p) => p.id)))
    setTimeout(() => setClosed(true), CLOSE_MS)
  }, [layers])

  // 암막이 깔린 동안에는 뒤쪽 화면이 스크롤되지 않게 한다.
  useEffect(() => {
    if (count === 0) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [count])

  // 넘겨 보기 — 스크롤 판과 지금 보고 있는 장의 순번
  const trackRef = useRef<HTMLDivElement>(null)
  const [at, setAt] = useState(0)

  /** 스크롤 위치로 지금 몇 번째 장을 보고 있는지 알아낸다. */
  const onTrackScroll = () => {
    const track = trackRef.current
    if (!track) return
    const left = track.scrollLeft
    const cards = [...track.children] as HTMLElement[]
    const idx = cards.findIndex((el) => el.offsetLeft >= left - 4)
    setAt(idx < 0 ? 0 : idx)
  }

  /**
   * 한 장씩 옆으로 — 끝에서 다음을 누르면 처음으로, 처음에서 이전을 누르면 끝으로 돌아온다.
   * 마지막 자리에서는 더 밀 수 없으므로 순번이 아니라 스크롤 끝에 닿았는지로 판단한다.
   */
  const go = (dir: -1 | 1) => {
    const track = trackRef.current
    if (!track) return
    const cards = [...track.children] as HTMLElement[]
    if (cards.length === 0) return

    const atStart = track.scrollLeft <= 4
    const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4
    if (dir === 1 && atEnd) return track.scrollTo({ left: 0, behavior: 'smooth' })
    if (dir === -1 && atStart) return track.scrollTo({ left: track.scrollWidth, behavior: 'smooth' })

    const target = Math.min(cards.length - 1, Math.max(0, at + dir))
    track.scrollTo({ left: cards[target].offsetLeft - track.offsetLeft, behavior: 'smooth' })
  }

  const jumpTo = (i: number) => {
    const track = trackRef.current
    const cards = track ? ([...track.children] as HTMLElement[]) : []
    if (!track || !cards[i]) return
    track.scrollTo({ left: cards[i].offsetLeft - track.offsetLeft, behavior: 'smooth' })
  }

  // 카드 한 장이 화면 폭을 넘으면 비율 그대로 줄일 배율 — 폭 기준으로만 잡는다.
  const [viewWidth, setViewWidth] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1440))
  useEffect(() => {
    const onResize = () => setViewWidth(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  // 좁은 화면은 한 장씩, 넓은 화면은 두 장씩 보여 준다. 그보다 많으면 옆으로 넘긴다.
  const isMobile = viewWidth < 640
  const perView = isMobile ? 1 : PER_VIEW
  const sliding = count > perView
  const mobileMulti = isMobile && sliding
  const desktopSlide = !isMobile && sliding
  /**
   * 카드 한 장이 쓸 수 있는 폭.
   * 좁은 화면에서 여러 장이면 다음 장이 오른쪽에 살짝 보이도록 더 줄이고,
   * 넓은 화면에서 넘겨 볼 때는 두 장과 화살표가 함께 들어가도록 반으로 나눈다.
   */
  const availWidth = mobileMulti
    ? viewWidth - 88
    : desktopSlide
      ? Math.floor((viewWidth - 200 - GAP) / 2)
      : viewWidth - 32
  const scaleOf = (popup: Popup) =>
    popup.width > availWidth ? Math.max(0.35, Number((availWidth / popup.width).toFixed(3))) : 1

  /**
   * 카드 겉 상자 — 닫히는 카드는 줄어들며 사라지고 폭이 접힌다.
   * 접히는 폭만큼 옆 카드가 왼쪽으로 미끄러져 빈 자리를 채운다.
   * 남는 간격 한 칸은 음수 여백으로 같이 접는다.
   */
  const collapseStyle = (popup: Popup, gap: number): CSSProperties => {
    const closing = closingIds.has(popup.id)
    return {
      width: closing ? 0 : popup.width * scaleOf(popup),
      marginRight: closing ? -gap : 0,
      opacity: closing ? 0 : 1,
      transform: closing ? 'scale(0.9)' : 'scale(1)',
      overflow: closing ? 'hidden' : 'visible',
      transition: `width ${CLOSE_MS}ms ease, margin ${CLOSE_MS}ms ease, opacity ${CLOSE_MS - 80}ms ease, transform ${CLOSE_MS}ms ease`,
    }
  }

  if (count === 0) return null

  /** 가장 넓은 카드 — 넘겨 볼 때 창 폭을 이 크기에 맞춘다. */
  const widestCard = Math.max(...layers.map((p) => p.width * scaleOf(p)))

  // 남은 카드 전부가 닫히는 중이면 암막도 함께 사라진다.
  const dimFading = closingIds.size >= count

  return (
    <>
      {/* 암막 — 팝업이 떠 있는 동안 화면 전체를 어둡게만 한다.
          닫기는 반드시 버튼(창닫기·그만보기·전체 닫기)으로만 한다. */}
      <div
        aria-hidden
        style={{ background: 'rgba(0, 0, 0, 0.5)', opacity: dimFading ? 0 : 1 }}
        className="fixed inset-0 z-[55] transition-opacity duration-300"
      />
      <div role="region" aria-label="팝업 안내" className="pointer-events-none fixed inset-x-0 top-24 z-[60] px-4">
      <div className={`mx-auto max-w-full ${mobileMulti ? 'w-full' : 'w-fit'}`}>
        {/* 전체 닫기 — 묶음 오른쪽 위 */}
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={closeAll}
            className="pointer-events-auto flex items-center gap-2.5 rounded-full bg-white py-1.5 pl-5 pr-1.5 text-sm font-bold text-slate-900 shadow-[0_8px_24px_rgba(0,0,0,0.3)] transition hover:bg-slate-100"
          >
            전체 닫기
            <span className="grid h-8 w-8 place-items-center rounded-full bg-slate-900 text-white">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </span>
          </button>
        </div>

        {sliding ? (
          // 한 화면에 담을 수 있는 장수보다 많다 — 옆으로 밀어 넘겨 본다.
          // 손으로 쓸어 넘길 수도 있고(스크롤 스냅), 좌우 화살표로도 넘어간다.
          <div className="flex items-center justify-center" style={{ gap: 14 }}>
            {desktopSlide && <ArrowButton direction="prev" onClick={() => go(-1)} />}

            <div
              ref={trackRef}
              onScroll={onTrackScroll}
              style={{
                gap: isMobile ? GAP_MOBILE : GAP,
                width: isMobile ? undefined : perView * widestCard + GAP * (perView - 1),
                maxWidth: '100%',
                scrollPaddingLeft: isMobile ? 16 : 0,
              }}
              className={`pointer-events-auto flex snap-x snap-mandatory items-start overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
                isMobile ? '-mx-4 px-4' : ''
              }`}
            >
              {layers.map((popup) => (
                <div key={popup.id} className="flex-none snap-start" style={collapseStyle(popup, isMobile ? GAP_MOBILE : GAP)}>
                  <PopupLayer
                    popup={popup}
                    scale={scaleOf(popup)}
                    onHide={() => hideOne(popup)}
                    onClose={() => dismissOne(popup.id)}
                  />
                </div>
              ))}
            </div>

            {desktopSlide && <ArrowButton direction="next" onClick={() => go(1)} />}
          </div>
        ) : (
          // 한 화면에 다 들어간다 — 가운데 나란히 놓는다.
          <div className="flex flex-wrap items-start justify-center" style={{ gap: GAP }}>
            {layers.map((popup) => (
              <div key={popup.id} style={collapseStyle(popup, GAP)}>
                <PopupLayer
                  popup={popup}
                  scale={scaleOf(popup)}
                  onHide={() => hideOne(popup)}
                  onClose={() => dismissOne(popup.id)}
                />
              </div>
            ))}
          </div>
        )}

        {/* 위치 표시 — 좁은 화면에서는 화살표를 점 옆에 둔다. */}
        {sliding && (
          <div className="mt-4 flex items-center justify-center gap-3">
            {isMobile && <ArrowButton direction="prev" onClick={() => go(-1)} />}
            <div className="flex items-center gap-2">
              {Array.from({ length: Math.max(1, count - perView + 1) }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => jumpTo(i)}
                  aria-label={`${i + 1}번째 자리로 보기`}
                  aria-current={i === at}
                  className={`pointer-events-auto h-2.5 rounded-full transition-all ${
                    i === at ? 'w-6 bg-white' : 'w-2.5 bg-white/50 hover:bg-white/80'
                  }`}
                />
              ))}
            </div>
            {isMobile && <ArrowButton direction="next" onClick={() => go(1)} />}
          </div>
        )}
      </div>
    </div>
    </>
  )
}
