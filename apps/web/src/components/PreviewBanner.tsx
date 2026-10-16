import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { exitPreview, getPreview, inPreviewWindow, previewQuery } from '../lib/preview'

/**
 * 템플릿 프리뷰 표시 — 화면 아래 가운데의 작은 알약.
 *
 * 프리뷰 화면은 실제 적용 화면과 똑같이 생겨, 표시가 없으면 그 템플릿이 켜진 줄 알게 된다
 * (실제로 '기본 템플릿이 켜져 있는데 인테리어가 뜬다'는 혼란이 있었다). 그래서 프리뷰 중에는
 * 늘 이 표시를 띄운다. 끝내는 방법은 창을 닫는 것이라 따로 단추를 두지 않는다(lib/preview.ts).
 * 프리뷰하던 템플릿이 그사이 켜졌거나 지워졌으면 프리뷰를 조용히 끝낸다.
 */
export default function PreviewBanner() {
  const [preview, setPreview] = useState(getPreview)

  useEffect(() => {
    if (!preview) return
    let alive = true
    api<{ preview?: boolean }>(`/design${previewQuery()}`)
      .then((design) => {
        if (alive && !design.preview) {
          exitPreview()
          setPreview(null)
        }
      })
      .catch(() => {})
    return () => { alive = false }
  }, [preview])

  if (!preview) return null

  return (
    <div
      role="status"
      className="pointer-events-none fixed bottom-4 left-1/2 z-[1000] -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-900/90 px-4 py-2 text-xs text-white shadow-lg backdrop-blur"
    >
      <b className="font-semibold text-amber-300">미리보기</b> · {preview.name || `템플릿 ${preview.id}`}
      <span className="ml-1.5 text-white/60">{inPreviewWindow() ? '창을 닫으면 끝납니다' : '새로고침하면 실제 화면으로 돌아갑니다'}</span>
    </div>
  )
}
