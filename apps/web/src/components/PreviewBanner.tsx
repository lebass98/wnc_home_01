import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { exitPreview, getPreview, previewQuery } from '../lib/preview'

/**
 * 템플릿 프리뷰 안내 띠.
 *
 * 프리뷰 주소를 한 번 열면 같은 탭에서는 주소에 표시가 없어도 프리뷰가 이어진다(preview.ts).
 * 표시가 없으면 실제로 그 템플릿이 적용된 줄 알게 되므로 — 실제로 '기본 템플릿이 켜져 있는데
 * 인테리어가 뜬다'는 혼란이 있었다 — 프리뷰 중에는 늘 이 띠를 띄우고 끝내는 단추를 둔다.
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

  const finish = () => {
    exitPreview()
    // 주소에 남은 프리뷰 쿼리도 걷어 내고 실제 적용된 디자인으로 다시 그린다.
    const url = new URL(window.location.href)
    url.searchParams.delete('previewTemplate')
    url.searchParams.delete('previewName')
    window.location.replace(url.toString())
  }

  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-4 z-[1000] mx-auto flex max-w-xl flex-wrap items-center justify-center gap-x-4 gap-y-2 rounded-2xl bg-slate-900/95 px-5 py-3 text-sm text-white shadow-2xl backdrop-blur sm:rounded-full"
    >
      <span>
        <b className="font-semibold text-amber-300">미리보기 중</b> · {preview.name || `템플릿 ${preview.id}`}
        <span className="ml-1 text-white/70">— 실제 사이트에는 적용되지 않았습니다</span>
      </span>
      <button type="button" onClick={finish} className="rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-slate-900 transition hover:bg-slate-200">
        미리보기 끝내기
      </button>
    </div>
  )
}
