import { useCallback, useEffect, useState, type ReactNode, type TransitionEvent } from 'react'
import { Link } from 'react-router-dom'

export interface HeroSlide {
  /** 줄바꿈할 위치대로 나눠 넘긴다. */
  title: string[]
  desc: string[]
  /** 배경으로 깔 CSS 그라데이션 */
  gradient: string
}

/** 슬라이드가 옆으로 밀려가는 시간(ms). 참고 사이트처럼 천천히 넘어간다. */
const SPEED = 2000
/** 배경이 슬라이드보다 늦게 따라오는 시간(ms) — 패럴랙스 느낌을 낸다. */
const DRIFT = 3000

/** 01, 02 … 처럼 두 자리로 맞춘다. */
const pad = (n: number) => String(n).padStart(2, '0')

/** 하단 조작 막대의 작은 아이콘 버튼 */
function ControlButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void
  label: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="grid h-6 w-6 place-items-center text-white/80 transition hover:text-white"
    >
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        {children}
      </svg>
    </button>
  )
}

/**
 * 메인 최상단 배너 — 여러 장을 옆으로 밀어 넘기며 자동으로 돌아간다.
 *
 * 마지막 장 다음에는 첫 장이 이어지도록(무한 루프) 현재 장의 양옆에
 * 이전·다음 장을 미리 깔아 두고, 한 칸 밀린 뒤 소리 없이 자리를 바꾼다.
 * 배경은 슬라이드보다 느리게 따라와 깊이감을 준다.
 */
export default function HeroSlider({
  slides,
  interval = 3000,
}: {
  slides: HeroSlide[]
  /** 한 장이 머무는 시간(ms). 넘어가는 시간은 포함하지 않는다. */
  interval?: number
}) {
  const count = slides.length
  const [index, setIndex] = useState(0)
  // -1 이면 다음 장으로, 1 이면 이전 장으로 밀리는 중. 0 이면 멈춰 있다.
  const [offset, setOffset] = useState<-1 | 0 | 1>(0)
  const [playing, setPlaying] = useState(true)
  const moving = offset !== 0

  // 이미 움직이는 중이면 무시한다 — 연타해도 한 장씩만 넘어간다.
  const go = useCallback((dir: -1 | 1) => setOffset((o) => (o !== 0 ? o : dir)), [])

  // 자동 재생 — 한 장이 다 넘어간 뒤 interval 만큼 기다렸다가 다음 장으로 간다.
  useEffect(() => {
    if (!playing || moving || count <= 1) return
    const timer = setTimeout(() => go(-1), interval)
    return () => clearTimeout(timer)
  }, [playing, moving, count, interval, index, go])

  /** 밀림이 끝나면 현재 장을 바꾸고, 전환 없이 제자리로 되돌린다. */
  const onTransitionEnd = (e: TransitionEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget || !moving) return
    setIndex((i) => (i - offset + count) % count)
    setOffset(0)
  }

  // 화면에 깔아 둘 세 칸 — 이전·현재·다음
  const slots = [-1, 0, 1].map((d) => (index + d + count) % count)

  /**
   * 배경의 위치. 옆 칸은 미리 한쪽으로 치우쳐 있다가 들어오면서 제자리로 오고,
   * 나가는 칸은 반대로 조금 밀려 나간다. 그래서 배경이 슬라이드보다 느려 보인다.
   */
  const driftOf = (slot: number): string => {
    if (!moving) return slot === 1 ? '0%' : slot === 0 ? '-30%' : '30%'
    const incoming = offset === -1 ? 2 : 0
    if (slot === incoming) return '0%'
    if (slot === 1) return offset === -1 ? '20%' : '-20%'
    return slot === 0 ? '-30%' : '30%'
  }

  return (
    <section
      className="relative h-[34rem] overflow-hidden sm:h-[42rem]"
      aria-roledescription="carousel"
      aria-label="메인 배너"
    >
      {/* 세 칸을 나란히 두고 한 칸 폭만큼 밀어서 넘긴다. */}
      <div
        className="flex h-full"
        style={{
          transform: `translateX(${-(1 - offset) * 100}%)`,
          transition: moving ? `transform ${SPEED}ms ease` : 'none',
        }}
        onTransitionEnd={onTransitionEnd}
      >
        {slots.map((slideIndex, slot) => {
          const slide = slides[slideIndex]
          const current = slot === 1
          return (
            <div
              key={slot}
              className="relative h-full w-full flex-none overflow-hidden"
              aria-hidden={!current}
            >
              {/* 배경 — 칸보다 넓게 깔아 두어 밀려도 가장자리가 비지 않는다. */}
              <div
                className="absolute inset-y-0 -left-[30%] -right-[30%]"
                style={{
                  background: slide.gradient,
                  transform: `translateX(${driftOf(slot)})`,
                  transition: moving ? `transform ${DRIFT}ms ease` : 'none',
                }}
              />
              {/* 글이 잘 보이도록 어둡게 덮는다. */}
              <div className="absolute inset-0 bg-black/25" aria-hidden />

              <div className="container-wnc relative flex h-full flex-col items-center justify-center text-center">
                <h1 className="text-3xl font-bold leading-[1.4] tracking-tight text-white sm:text-[2.6rem]">
                  {slide.title.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </h1>
                <p className="mt-6 text-sm leading-[2] text-white/85 sm:text-base">
                  {slide.desc.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </p>
                <Link
                  to="/about"
                  tabIndex={current ? 0 : -1}
                  className="mt-10 inline-flex bg-mint-400 px-8 py-3 text-sm font-semibold text-white transition hover:bg-mint-500"
                >
                  자세히보기
                </Link>
              </div>
            </div>
          )
        })}
      </div>

      {/* 왼쪽 아래 조작 막대 — 현재 장 번호와 이전·재생/정지·다음 */}
      {count > 1 && (
        <div className="absolute bottom-0 left-0 z-10 flex items-center gap-4 rounded-tr-2xl bg-[rgba(3,11,20,0.7)] px-4 py-2 sm:gap-5 sm:px-6 sm:py-3">
          <div className="flex items-center text-sm font-bold text-white sm:text-2xl" aria-live="polite">
            {pad(index + 1)}
            <span className="flex items-center text-[#a3a3a5]">
              <i className="mx-2 inline-block h-3 w-px bg-[#a3a3a5] sm:mx-3 sm:h-4" aria-hidden />
              {pad(count)}
            </span>
          </div>
          <div className="hidden items-center gap-3 sm:flex">
            <ControlButton onClick={() => go(1)} label="이전 배너">
              <path d="M15.5 4 7.5 12l8 8V4z" />
            </ControlButton>
            <ControlButton
              onClick={() => setPlaying((p) => !p)}
              label={playing ? '자동 넘김 정지' : '자동 넘김 재생'}
            >
              {playing ? (
                <>
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </>
              ) : (
                <path d="M7 4v16l13-8z" />
              )}
            </ControlButton>
            <ControlButton onClick={() => go(-1)} label="다음 배너">
              <path d="M8.5 4v16l8-8z" />
            </ControlButton>
          </div>
        </div>
      )}
    </section>
  )
}
