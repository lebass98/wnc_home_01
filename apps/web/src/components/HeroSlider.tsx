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
      className="grid h-6 w-6 place-items-center text-white/85 transition hover:text-white"
    >
      <svg
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
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

  /** 점을 눌러 이동 — 바로 옆 장이면 밀어서, 멀면 바로 바꾼다. */
  const jump = (target: number) => {
    if (moving || target === index) return
    const diff = (target - index + count) % count
    if (diff === 1) go(-1)
    else if (diff === count - 1) go(1)
    else setIndex(target)
  }

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

      {/* 아래 가운데 조작 알약 — 점(현재 장)과 이전·정지/재생·다음 */}
      {count > 1 && (
        <div
          className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-5 rounded-full bg-black/40 px-6 py-2.5 backdrop-blur-sm sm:bottom-8"
          aria-label={`${index + 1} / ${count}`}
        >
          <div className="flex items-center gap-4">
            {slides.map((s, i) => (
              <button
                key={s.title.join()}
                type="button"
                onClick={() => jump(i)}
                aria-label={`${i + 1}번째 배너 보기`}
                aria-current={i === index}
                className={`h-2 w-2 rounded-full transition ${
                  i === index ? 'bg-white' : 'bg-white/45 hover:bg-white/80'
                }`}
              />
            ))}
          </div>
          <div className="ml-1 flex items-center gap-2.5">
            <ControlButton onClick={() => go(1)} label="이전 배너">
              <path d="M15 5l-7 7 7 7" />
            </ControlButton>
            <ControlButton
              onClick={() => setPlaying((p) => !p)}
              label={playing ? '자동 넘김 정지' : '자동 넘김 재생'}
            >
              {playing ? (
                <path d="M9 5v14M15 5v14" />
              ) : (
                <path d="M8 5v14l11-7z" fill="currentColor" />
              )}
            </ControlButton>
            <ControlButton onClick={() => go(-1)} label="다음 배너">
              <path d="M9 5l7 7-7 7" />
            </ControlButton>
          </div>
        </div>
      )}
    </section>
  )
}
