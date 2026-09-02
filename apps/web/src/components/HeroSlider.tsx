import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

export interface HeroSlide {
  /** 줄바꿈할 위치대로 나눠 넘긴다. */
  title: string[]
  desc: string[]
  /** 배경으로 깔 CSS 그라데이션 */
  gradient: string
}

/** 좌우 이동 버튼 */
function NavButton({
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
      className={`absolute top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-slate-700 transition hover:bg-white sm:grid ${className}`}
    >
      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d={direction === 'prev' ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'}
        />
      </svg>
    </button>
  )
}

/** 메인 최상단 배너 — 여러 장을 자동으로 넘긴다. */
export default function HeroSlider({
  slides,
  interval = 6000,
}: {
  slides: HeroSlide[]
  /** 자동 전환 간격(ms) */
  interval?: number
}) {
  const [index, setIndex] = useState(0)
  // 마우스를 올리면 자동 전환을 멈춰 읽는 것을 방해하지 않는다.
  const [paused, setPaused] = useState(false)

  const go = useCallback(
    (next: number) => setIndex((next + slides.length) % slides.length),
    [slides.length],
  )

  useEffect(() => {
    if (paused || slides.length <= 1) return
    const timer = setInterval(() => setIndex((i) => (i + 1) % slides.length), interval)
    return () => clearInterval(timer)
  }, [paused, slides.length, interval])

  const slide = slides[index]

  return (
    <section
      className="relative h-[34rem] overflow-hidden sm:h-[42rem]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="메인 배너"
    >
      {/* 배경 — 슬라이드가 바뀌면 부드럽게 겹쳐 넘어간다. */}
      {slides.map((s, i) => (
        <div
          key={s.title.join()}
          aria-hidden={i !== index}
          className={`absolute inset-0 transition-opacity duration-700 ${
            i === index ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ background: s.gradient }}
        />
      ))}

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
          className="mt-10 inline-flex bg-mint-400 px-8 py-3 text-sm font-semibold text-white transition hover:bg-mint-500"
        >
          자세히보기
        </Link>

        {/* 현재 위치 표시 */}
        {slides.length > 1 && (
          <div className="mt-12 flex gap-2.5">
            {slides.map((s, i) => (
              <button
                key={s.title.join()}
                type="button"
                onClick={() => go(i)}
                aria-label={`${i + 1}번째 배너 보기`}
                aria-current={i === index}
                className={`h-2 w-2 rounded-full transition ${
                  i === index ? 'bg-white' : 'bg-white/40 hover:bg-white/70'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {slides.length > 1 && (
        <>
          <NavButton
            direction="prev"
            label="이전 배너"
            onClick={() => go(index - 1)}
            className="left-5 lg:left-10"
          />
          <NavButton
            direction="next"
            label="다음 배너"
            onClick={() => go(index + 1)}
            className="right-5 lg:right-10"
          />
        </>
      )}
    </section>
  )
}
