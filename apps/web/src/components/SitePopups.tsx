import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type TransitionEvent,
} from 'react'
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
/** 한 칸 넘어가는 데 걸리는 시간(ms) */
const SPEED = 600

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

/** 화면 폭에 따라 한 화면에 몇 장을 나란히 둘지 정한다. 좁은 화면은 한 장씩. */
function usePerView(): number {
  const [perView, setPerView] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(min-width: 640px)').matches ? 2 : 1,
  )
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)')
    const update = () => setPerView(mq.matches ? 2 : 1)
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  return perView
}

/** 좌우 이동 버튼 — 흰 테두리 원 안에 화살표 */
function ArrowButton({
  onClick,
  label,
  direction,
}: {
  onClick: () => void
  label: string
  direction: 'prev' | 'next'
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="pointer-events-auto grid h-10 w-10 place-items-center rounded-full border border-white text-white transition hover:bg-white/15 sm:h-[60px] sm:w-[60px]"
    >
      <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d={direction === 'prev' ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'}
        />
      </svg>
    </button>
  )
}

/** 닫기 계열 버튼 오른쪽에 붙는 X 아이콘 */
function CloseIcon() {
  return (
    <svg
      className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

/**
 * 팝업 한 장 — 이미지와 본문을 담는다.
 * 크기는 관리자가 정한 가로·세로를 그대로 쓴다. 내용이 짧으면 아래가 비고,
 * 길면 스크롤바 설정에 따라 스크롤되거나 잘린다.
 *
 * 화면이 좁아 그대로 담을 수 없으면 scale 만큼 통째로 줄인다.
 * 글자·이미지가 함께 줄어들어 원래 비율 그대로 작아진다.
 */
function PopupCard({ popup, scale = 1 }: { popup: Popup; scale?: number }) {
  return (
    <div
      style={{ width: popup.width * scale, height: popup.height * scale }}
      className="overflow-hidden bg-white shadow-2xl"
    >
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
  )
}

/**
 * 홈페이지에 팝업을 띄운다.
 * 게시기간 안이고 사용 중인 팝업만 서버가 내려주며,
 * 팝업위치가 맞지 않거나 방문자가 닫은 것은 여기서 걸러진다.
 *
 * 두 장까지는 가운데에 나란히 놓고, 세 장부터는 두 장씩 보이며 좌우로 넘긴다.
 * 마지막 장 다음에는 첫 장이 이어진다(무한 루프).
 */
export default function SitePopups() {
  const { pathname } = useLocation()
  const [popups, setPopups] = useState<Popup[]>([])
  const perView = usePerView()
  // 슬라이드의 현재 위치. 화면 왼쪽 첫 칸에 오는 팝업의 순번이다.
  const [index, setIndex] = useState(0)
  // -1 이면 다음으로, 1 이면 이전으로 밀리는 중. 0 이면 멈춰 있다.
  const [offset, setOffset] = useState<-1 | 0 | 1>(0)
  // 창으로 여는 팝업은 한 번만 열어야 하므로 이미 연 id 를 기억한다.
  const opened = useRef(new Set<number>())
  // 방문자가 닫기 버튼으로 레이어를 내렸는지
  const [closed, setClosed] = useState(false)
  // 상단 POPUP 버튼으로 다시 열었는지 — 켜지면 '오늘 하루 열지 않기' 기록을 무시한다.
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
    setForced(true)
  }, [openSeq])

  // 화면을 옮기면 닫힘 상태를 초기화한다 — 다른 페이지의 팝업은 새로 판단한다.
  useEffect(() => {
    setClosed(false)
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
    // 상단 POPUP 으로 열었으면 노출위치·닫힘 기록과 상관없이 게시 중인 레이어 팝업을 전부 보여 준다.
    if (forced) return popups.filter((p) => p.windowType !== 'window')
    return popups.filter((p) => matchesPath(p) && !isHidden(p.id))
  }, [popups, matchesPath, closed, forced])

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

  // 레이어로 띄울 팝업만 겹쳐서 보여준다.
  const layers = useMemo(() => visible.filter((p) => p.windowType !== 'window'), [visible])
  const count = layers.length
  // 한 화면에 다 들어가면 슬라이드가 필요 없다.
  const sliding = count > perView
  const moving = offset !== 0

  // 팝업이 줄어 현재 위치가 범위를 벗어나면 처음으로 되돌린다.
  useEffect(() => {
    if (count > 0 && index >= count) setIndex(0)
  }, [index, count])

  // 이미 움직이는 중이면 무시한다 — 연타해도 한 칸씩만 넘어간다.
  const go = useCallback((dir: -1 | 1) => setOffset((o) => (o !== 0 ? o : dir)), [])

  /** 점을 눌러 이동 — 바로 옆 칸이면 밀어서, 멀면 바로 바꾼다. */
  const jump = (target: number) => {
    if (moving || target === index) return
    const diff = (target - index + count) % count
    if (diff === 1) go(-1)
    else if (diff === count - 1) go(1)
    else setIndex(target)
  }

  /** 밀림이 끝나면 위치를 바꾸고, 전환 없이 제자리로 되돌린다. */
  const onTransitionEnd = (e: TransitionEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget || !moving) return
    setIndex((i) => (i - offset + count) % count)
    setOffset(0)
  }

  /** 전부 닫는다. keep 을 켜면 표시기간만큼 다시 뜨지 않는다. */
  const closeAll = useCallback(
    (keep: boolean) => {
      if (keep) for (const p of layers) remember(p)
      setClosed(true)
    },
    [layers],
  )

  // ESC 로 닫는다.
  useEffect(() => {
    if (count === 0) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAll(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [count, closeAll])

  // 팝업이 떠 있는 동안에는 뒤쪽 화면이 스크롤되지 않게 한다.
  useEffect(() => {
    if (count === 0) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [count])

  // 가장 큰 팝업 기준으로 자리를 잡는다.
  const widest = count > 0 ? Math.max(...layers.map((p) => p.width)) : 0
  const tallest = count > 0 ? Math.max(...layers.map((p) => p.height)) : 0
  /** 한 화면에 실제로 놓는 장수 */
  const cols = Math.min(Math.max(count, 1), perView)

  /**
   * 화면을 넘지 않도록 비율 그대로 줄일 배율.
   * 좌우는 슬라이드 칸의 실제 폭에서, 위아래는 제목·버튼을 뺀 남은 높이에서 구한다.
   */
  const stageRef = useRef<HTMLDivElement>(null)
  const footRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useLayoutEffect(() => {
    if (count === 0) return
    const fit = () => {
      const stage = stageRef.current
      if (!stage || widest === 0 || tallest === 0) return
      const wide = window.innerWidth >= 640
      // 좌우 화살표가 차지하는 자리 (px-12 / sm:px-[70px])
      const arrows = sliding ? (wide ? 70 : 48) * 2 : 0
      const availWidth = stage.clientWidth - arrows
      const needWidth = cols * widest + (cols - 1) * GAP

      // 아래 버튼과 위아래 여백(py-10)을 뺀 나머지가 팝업이 쓸 수 있는 높이다.
      const footHeight = footRef.current?.offsetHeight ?? 0
      const footMargin = wide ? 80 : 32
      const dots = sliding ? 42 : 0
      const availHeight = window.innerHeight - footHeight - footMargin - dots - 80

      const next = Math.min(1, availWidth / needWidth, availHeight / tallest)
      // 너무 작아지면 읽을 수 없으므로 여기서 멈추고, 넘치는 만큼은 덮개가 스크롤된다.
      setScale(Number.isFinite(next) && next > 0 ? Math.max(0.35, Math.min(1, Number(next.toFixed(3)))) : 1)
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [count, cols, perView, sliding, widest, tallest])

  if (count === 0) return null

  // 표시기간은 팝업마다 다를 수 있어, 여러 개면 가장 짧은 쪽에 맞춰 안내한다.
  // 좁은 화면에서는 버튼이 한 줄에 들어가도록 짧은 문구를 쓴다.
  const [hideLabel, hideLabelShort] = layers.every((p) => p.hidePeriod === 'session')
    ? ['이 브라우저를 닫을 때까지 열지 않기', '브라우저 닫을 때까지']
    : layers.every((p) => p.hidePeriod === 'never')
      ? ['다시 열지 않기', '다시 안 보기']
      : ['오늘 하루 열지 않기', '오늘 안 보기']

  // 슬라이드 폭 — 줄어든 크기 기준으로 perView 장이 딱 들어가게 잡는다.
  const viewportWidth = perView * widest * scale + (perView - 1) * GAP

  // 보이는 칸의 양옆에 한 칸씩 더 깔아 두어 밀려 들어올 장을 미리 준비한다.
  const slots = Array.from({ length: perView + 2 }, (_, k) => layers[(index - 1 + k + count) % count])

  return (
    <div
      role="dialog"
      aria-modal
      aria-label="팝업 안내"
      className="fixed inset-0 z-[70] overflow-y-auto bg-black/85"
    >
      <div className="flex min-h-full flex-col items-center justify-center px-5 py-10 sm:px-10">
        <div ref={stageRef} className="relative w-full max-w-site">
          {sliding ? (
            <>
              <div className="px-12 sm:px-[70px]">
                <div
                  className="mx-auto overflow-hidden"
                  style={{ width: viewportWidth, maxWidth: '100%' }}
                >
                  <div
                    className="flex"
                    style={{
                      gap: GAP,
                      transform: `translateX(calc(${(-(1 - offset) * 100) / perView}% - ${((1 - offset) * GAP) / perView}px))`,
                      transition: moving ? `transform ${SPEED}ms ease` : 'none',
                    }}
                    onTransitionEnd={onTransitionEnd}
                  >
                    {slots.map((popup, slot) => {
                      const shown = slot >= 1 && slot <= perView
                      return (
                        <div
                          key={slot}
                          className="flex flex-none items-start justify-center"
                          style={{ width: `calc(${100 / perView}% - ${((perView - 1) * GAP) / perView}px)` }}
                          aria-hidden={!shown}
                        >
                          <PopupCard popup={popup} scale={scale} />
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* 좌우 이동 — 슬라이드 바깥 양끝에 둔다. */}
              <div className="pointer-events-none absolute inset-y-0 left-0 right-0 flex items-center justify-between">
                <ArrowButton direction="prev" label="이전 슬라이드 보기" onClick={() => go(1)} />
                <ArrowButton direction="next" label="다음 슬라이드 보기" onClick={() => go(-1)} />
              </div>

              {/* 현재 위치 점 */}
              <div className="mt-8 flex justify-center gap-2.5">
                {layers.map((p, i) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => jump(i)}
                    aria-label={`${i + 1}번째 팝업 보기`}
                    aria-current={i === index}
                    className={`h-2.5 w-2.5 rounded-full transition ${
                      i === index ? 'bg-[#ce4b00]' : 'bg-white hover:bg-white/70'
                    }`}
                  />
                ))}
              </div>
            </>
          ) : (
            // 한두 장이면 가운데에 나란히 놓는다.
            <div className="flex flex-wrap items-start justify-center" style={{ gap: GAP }}>
              {layers.map((popup) => (
                <PopupCard key={popup.id} popup={popup} scale={scale} />
              ))}
            </div>
          )}
        </div>

        {/* 건수 · 닫기 */}
        <div
          ref={footRef}
          className="mt-8 flex flex-nowrap items-center justify-center gap-2 sm:mt-20 sm:flex-wrap sm:gap-[30px]"
        >
          {/* 게시 중인 건수 — 숫자만 짧게 보여 준다. */}
          <p
            aria-label={`게시 중인 팝업 ${count}건`}
            className="flex h-9 shrink-0 items-center whitespace-nowrap rounded-lg bg-black px-3 text-xs font-medium text-white sm:h-12 sm:px-7 sm:text-lg"
          >
            총 <span className="px-1 text-[#ffc80b]">{count}</span>건
          </p>

          <button
            type="button"
            onClick={() => closeAll(false)}
            className="flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-[#26a112] px-3 text-xs font-medium text-white transition hover:brightness-110 sm:h-12 sm:gap-3 sm:px-[38px] sm:text-base"
          >
            닫기
            <CloseIcon />
          </button>

          <button
            type="button"
            onClick={() => closeAll(true)}
            className="flex h-9 min-w-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-[#f36f21] px-3 text-xs font-medium text-white transition hover:brightness-110 sm:h-12 sm:min-w-fit sm:gap-3 sm:px-[38px] sm:text-base"
          >
            <span className="truncate sm:hidden">{hideLabelShort}</span>
            <span className="hidden sm:inline">{hideLabel}</span>
            <CloseIcon />
          </button>
        </div>
      </div>
    </div>
  )
}
