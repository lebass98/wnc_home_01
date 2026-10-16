import { useEffect, useRef, useState } from 'react'
import type { MainVisualVideo as MainVisualVideoValue } from '@wnc/shared'
import { componentImageUrl } from '../lib/componentSettings'

/**
 * 메인 비주얼 — 배경 영상 방식.
 *
 * 관리자 [디자인 → 메인 비주얼]에서 '영상'을 고르면 각 템플릿의 메인이 슬라이드 대신 이것을 그린다.
 * 어느 템플릿에서나 쓰도록 크기·모서리는 className 으로 받고, 영상·암막·문구·조작 단추만 맡는다.
 *
 * - 브라우저는 소리 있는 자동 재생을 막으므로 늘 소리 없이 시작한다. 소리 단추는 관리자가 켰을 때만 보인다.
 * - 5초 넘게 움직이는 화면이라 멈춤 단추를 둔다. 움직임 줄이기 설정이면 처음부터 멈춰 두고 대표 이미지를 보여 준다.
 */
export default function MainVisualVideo({ video, className = '' }: { video: MainVisualVideoValue; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(true)
  const [muted, setMuted] = useState(true)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      element.pause()
      return
    }
    // 저절로 재생되지 않는 브라우저(저전력 모드 등)도 있어 한 번 더 청한다. 막히면 멈춤 상태로 둔다.
    element.play().catch(() => setPlaying(false))
  }, [video.src])

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

  return (
    <section className={`relative overflow-hidden bg-slate-950 ${className}`} aria-label="메인 비주얼">
      <video
        ref={ref}
        key={video.src}
        src={componentImageUrl(video.src)}
        poster={video.poster ? componentImageUrl(video.poster) : undefined}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        className="absolute inset-0 h-full w-full object-cover"
        aria-hidden
      />
      {/* 글이 잘 보이도록 영상 위에 까는 암막 */}
      <div className="pointer-events-none absolute inset-0 bg-black" style={{ opacity: video.overlayOpacity / 100 }} aria-hidden />

      {(video.title || video.description) && (
        <div className="container-wnc relative flex h-full flex-col items-center justify-center text-center text-white">
          {video.title && (
            <h1 className="whitespace-pre-line text-3xl font-bold leading-[1.4] tracking-tight drop-shadow-md sm:text-[2.6rem]">{video.title}</h1>
          )}
          {video.description && (
            <p className="mt-6 whitespace-pre-line text-sm leading-[2] text-white/90 drop-shadow-sm sm:text-base">{video.description}</p>
          )}
        </div>
      )}

      <div className="absolute bottom-6 right-6 z-10 flex items-center gap-2 sm:bottom-8 sm:right-8">
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
      </div>
    </section>
  )
}
