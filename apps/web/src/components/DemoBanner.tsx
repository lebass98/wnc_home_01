import { useEffect, useState } from 'react'
import { IS_DEMO } from '../lib/api'
import { resetDemoData } from '../lib/demoApi'

/**
 * 데모 모드임을 알리는 상단 배너 — 실제 백엔드 연결 시에는 렌더링되지 않는다.
 * 어드민 사이드바 등 position:fixed 요소가 배너 아래로 내려가도록
 * 배너 높이를 --demo-banner-h CSS 변수로 노출한다.
 */
export default function DemoBanner() {
  const [open, setOpen] = useState(true)

  useEffect(() => {
    if (!IS_DEMO) return
    const root = document.documentElement
    // 배너를 닫으면 높이를 0 으로 되돌려 레이아웃이 원래대로 돌아오게 한다.
    root.style.setProperty('--demo-banner-h', open ? '2.5rem' : '0px')
    return () => {
      root.style.removeProperty('--demo-banner-h')
    }
  }, [open])

  if (!IS_DEMO || !open) return null

  function handleReset() {
    if (!confirm('데모 데이터를 초기 상태로 되돌릴까요?')) return
    resetDemoData()
    location.reload()
  }

  return (
    <div className="relative z-[60] flex h-10 items-center justify-center gap-2 bg-amber-500 px-10 text-center text-xs text-amber-950 sm:text-sm">
      <span className="truncate">
        <span className="font-semibold">데모 모드</span>
        <span className="mx-2 hidden sm:inline">·</span>
        <span className="hidden sm:inline">
          백엔드 없이 브라우저에서 동작하며, 변경사항은 이 브라우저에만 저장됩니다.
        </span>
      </span>
      <button
        type="button"
        onClick={handleReset}
        className="shrink-0 font-semibold underline underline-offset-2 hover:text-amber-900"
      >
        초기화
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 hover:bg-amber-600/30"
        aria-label="배너 닫기"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
