import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { MainVisualCaption, MainVisualVideo as MainVisualVideoValue } from '@wnc/shared'
import { componentImageUrl } from '../lib/componentSettings'

/** 문구가 사라지기 시작해 다음 문구로 바뀌기까지의 시간(ms) — index.css 의 mv-leave 와 맞춘다. */
const LEAVE = 800

/**
 * 메인 비주얼 — 배경 영상 방식.
 *
 * 관리자 [템플릿 관리 → 메인 비주얼]에서 '영상'을 고르면 각 템플릿의 메인이 슬라이드 대신 이것을 그린다.
 * 어느 템플릿에서나 쓰도록 크기·모서리는 className 으로 받고, 영상·암막·문구·조작 단추만 맡는다.
 *
 * - 브라우저는 소리 있는 자동 재생을 막으므로 늘 소리 없이 시작한다. 소리 단추는 관리자가 켰을 때만 보인다.
 * - 5초 넘게 움직이는 화면이라 멈춤 단추를 둔다. 움직임 줄이기 설정이면 처음부터 멈춰 두고 대표 이미지를 보여 준다.
 * - 문구가 여러 장이면 왼쪽·오른쪽 자리를 오가며 차례로 나타난다. 영상을 멈추면 문구도 그 자리에서 멈춘다.
 */
export default function MainVisualVideo({
  video,
  className = '',
  align = 'center',
  pinned,
}: {
  video: MainVisualVideoValue
  className?: string
  align?: 'left' | 'center'
  /** 이 번호의 문구에 멈춰 둔다 — 관리자 미리보기에서 고치는 문구만 보여 줄 때 쓴다. */
  pinned?: number
}) {
  const ref = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(true)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const mediaPosition = align === 'left' ? 'object-[25%_center] sm:object-center' : 'object-center'

  // 문구가 없으면 예전처럼 제목·설명 한 장을 쓴다. 자리는 템플릿이 정한 정렬을 따른다.
  const captions: MainVisualCaption[] = video.captions?.length
    ? video.captions
    : video.title || video.description
      ? [{ eyebrow: '', title: video.title, description: video.description, align }]
      : []
  const count = captions.length
  const interval = Math.max(video.captionInterval ?? 6000, 3000)
  const [rotating, setRotating] = useState(0)
  const [leaving, setLeaving] = useState(false)
  const index = pinned ?? rotating
  const current = captions[Math.min(index, count - 1)]

  useEffect(() => {
    const element = ref.current
    if (!element) return
    let active = true
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPlaying(false)
    setMuted(true)
    setReady(false)
    setFailed(false)
    const stopForReducedMotion = () => {
      if (motion.matches) {
        element.pause()
        setPlaying(false)
      }
    }
    // autoPlay 속성 대신 환경 설정을 확인한 뒤 시작한다. 저전력 모드에서는 포스터를 유지한다.
    if (!motion.matches) element.play().catch(() => { if (active) setPlaying(false) })
    motion.addEventListener('change', stopForReducedMotion)
    return () => {
      active = false
      motion.removeEventListener('change', stopForReducedMotion)
      element.pause()
    }
  }, [video.src])

  // 문구 목록이 바뀌면(관리자에서 저장) 첫 장부터 다시 보여 준다.
  const captionsKey = JSON.stringify(captions)
  useEffect(() => {
    setRotating(0)
    setLeaving(false)
  }, [captionsKey])

  // 영상이 도는 동안만 넘긴다 — 머무는 시간이 끝나기 조금 전에 사라지기 시작해 다음 장으로 바꾼다.
  useEffect(() => {
    if (!playing || count < 2 || pinned !== undefined) return
    const leave = window.setTimeout(() => setLeaving(true), interval - LEAVE)
    const next = window.setTimeout(() => {
      setRotating((i) => (i + 1) % count)
      setLeaving(false)
    }, interval)
    return () => {
      window.clearTimeout(leave)
      window.clearTimeout(next)
    }
  }, [playing, count, interval, index, pinned])

  const togglePlay = () => {
    const element = ref.current
    if (!element) return
    if (element.paused) element.play().catch(() => setPlaying(false))
    else element.pause()
  }
  const toggleSound = () => {
    const element = ref.current
    if (!element) return
    element.muted = !element.muted
    setMuted(element.muted)
  }
  const jump = (target: number) => {
    if (target === index) return
    setLeaving(false)
    setRotating(target)
  }

  const side = current?.align ?? 'center'

  return (
    <section className={`relative overflow-hidden bg-slate-950 ${className}`} aria-label="메인 비주얼">
      {video.poster && (
        <img src={componentImageUrl(video.poster)} alt="" className={`absolute inset-0 h-full w-full object-cover ${mediaPosition}`} fetchPriority="high" />
      )}
      <video
        ref={ref}
        key={video.src}
        src={componentImageUrl(video.src)}
        poster={video.poster ? componentImageUrl(video.poster) : undefined}
        muted
        loop
        playsInline
        preload="metadata"
        onPlaying={() => { setPlaying(true); setReady(true) }}
        onPause={() => setPlaying(false)}
        onError={() => { setPlaying(false); setFailed(true) }}
        className={`absolute inset-0 h-full w-full object-cover ${mediaPosition} ${ready && !failed ? 'opacity-100' : 'opacity-0'}`}
        aria-hidden
      />
      {/* 글이 잘 보이도록 영상 위에 까는 암막 */}
      <div className="pointer-events-none absolute inset-0 bg-black" style={{ opacity: video.overlayOpacity / 100 }} aria-hidden />
      {/* 문구가 놓인 쪽에만 은은하게 어둠을 더한다 — 자리가 바뀌면 천천히 옮겨 간다.
          좁은 화면에서는 문구가 늘 왼쪽이라 어둠도 왼쪽에 둔다. */}
      {count > 0 && (
        <>
          <div className={`pointer-events-none absolute inset-0 bg-gradient-to-r from-slate-950/75 via-slate-950/25 to-transparent transition-opacity duration-[1600ms] ${side === 'left' ? 'opacity-100' : 'opacity-100 sm:opacity-0'}`} aria-hidden />
          <div className={`pointer-events-none absolute inset-0 bg-gradient-to-l from-slate-950/75 via-slate-950/25 to-transparent transition-opacity duration-[1600ms] ${side === 'right' ? 'opacity-0 sm:opacity-100' : 'opacity-0'}`} aria-hidden />
          <div className={`pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(2,6,23,0.55),transparent_65%)] transition-opacity duration-[1600ms] ${side === 'center' ? 'opacity-0 sm:opacity-100' : 'opacity-0'}`} aria-hidden />
        </>
      )}

      {current && (
        <div className="container-wnc relative flex h-full flex-col justify-center text-white">
          <Caption key={`${index}-${captionsKey}`} caption={current} leaving={leaving} />
        </div>
      )}

      {/* 진행 표시 — 문구가 여러 장일 때 지금 몇 번째인지와 남은 시간을 가는 막대로 보여 준다. */}
      {count > 1 && (
        <div className="container-wnc pointer-events-none absolute inset-x-0 bottom-8 z-10 sm:bottom-10">
          <div className="pointer-events-auto flex items-center gap-4 text-white">
            <span className="w-7 font-mono text-xs tabular-nums tracking-[0.2em] text-white/90">{String(index + 1).padStart(2, '0')}</span>
            <div className="flex items-center gap-2">
              {captions.map((item, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => jump(i)}
                  aria-label={`${i + 1}번째 문구 보기: ${item.title.split('\n')[0]}`}
                  aria-current={i === index}
                  className="group relative h-6 w-10 sm:w-14"
                >
                  <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/25 transition group-hover:bg-white/50" />
                  {i === index && (
                    <span
                      key={`${index}-${captionsKey}`}
                      className={`absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white ${playing && pinned === undefined ? 'mv-progress' : ''}`}
                      style={{ animationDuration: `${interval}ms` }}
                    />
                  )}
                </button>
              ))}
            </div>
            <span className="w-7 font-mono text-xs tabular-nums tracking-[0.2em] text-white/45">{String(count).padStart(2, '0')}</span>
          </div>
        </div>
      )}

      {!failed && <div className="absolute bottom-6 right-6 z-10 flex items-center gap-2 sm:bottom-8 sm:right-8">
        {video.showSoundToggle && (
          <button
            type="button"
            onClick={toggleSound}
            aria-label={muted ? '영상 소리 켜기' : '영상 소리 끄기'}
            className="grid h-10 w-10 place-items-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/60"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M11 5L6 9H2v6h4l5 4V5z" />
              {muted ? <path d="M23 9l-6 6M17 9l6 6" /> : <path d="M15.5 8.5a5 5 0 010 7M19 5a10 10 0 010 14" />}
            </svg>
          </button>
        )}
        <button
          type="button"
          onClick={togglePlay}
          aria-label={playing ? '영상 일시정지' : '영상 재생'}
          className="grid h-10 w-10 place-items-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/60"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            {playing ? <path d="M9 5v14M15 5v14" /> : <path d="M8 5v14l11-7z" fill="currentColor" />}
          </svg>
        </button>
      </div>}
    </section>
  )
}

/**
 * 문구 한 장 — 소제목 선 → 제목 줄들 → 설명 순으로 시차를 두고 나타난다.
 * 좁은 화면에서는 자리와 상관없이 왼쪽에 맞춘다(오른쪽 정렬 긴 글은 모바일에서 읽기 어렵다).
 */
function Caption({ caption, leaving }: { caption: MainVisualCaption; leaving: boolean }) {
  const lines = caption.title.split('\n')
  const place = {
    left: 'items-start text-left',
    center: 'items-start text-left sm:items-center sm:text-center',
    right: 'items-start text-left sm:items-end sm:text-right',
  }[caption.align]
  // 들어오는 방향과 소제목 선이 그어지는 방향 — 오른쪽 문구는 오른쪽에서 왼쪽으로.
  const motion = {
    '--mv-x-sm': caption.align === 'right' ? '28px' : caption.align === 'left' ? '-28px' : '0px',
    '--mv-origin': caption.align === 'right' ? 'right' : caption.align === 'center' ? 'center' : 'left',
  } as CSSProperties
  const delay = (ms: number): CSSProperties => ({ animationDelay: `${ms}ms` })
  const titleEnd = 350 + lines.length * 140

  return (
    <div className={`mv-caption flex w-full flex-col ${place} ${leaving ? 'mv-leaving' : ''}`} style={motion}>
      {caption.eyebrow && (
        <p className={`mb-6 flex items-center gap-4 text-[11px] font-medium uppercase tracking-[0.35em] text-white/80 sm:text-xs ${caption.align === 'right' ? 'sm:flex-row-reverse' : ''}`}>
          <span className="mv-rule block h-px w-10 bg-white/70 sm:w-14" aria-hidden />
          <span className="mv-soft" style={delay(150)}>{caption.eyebrow}</span>
        </p>
      )}
      <h1 className="max-w-[16ch] break-keep text-[2.6rem] font-semibold leading-[1.18] tracking-[-0.03em] drop-shadow-[0_2px_24px_rgba(0,0,0,0.35)] sm:text-6xl lg:text-7xl">
        {lines.map((line, i) => (
          <span key={i} className="mv-line">
            <span style={delay(350 + i * 140)}>{line}</span>
          </span>
        ))}
      </h1>
      {caption.description && (
        <p className="mv-soft mt-7 max-w-md whitespace-pre-line break-keep text-base leading-[1.8] text-white/80 sm:text-lg" style={delay(titleEnd + 150)}>
          {caption.description}
        </p>
      )}
    </div>
  )
}
