import { useEffect } from 'react'
import { exitPreview } from '../lib/preview'

/** 이 배너의 높이 — 헤더들이 읽는 --demo-banner-h 에 그대로 맞춘다. */
const HEIGHT = '2.75rem'

/**
 * 화면 맨 위에 뜨는 프리뷰 안내 — 템플릿을 적용하지 않고 미리 보는 중임을 알리고,
 * [템플릿 관리]로 바로 돌아갈 수 있게 한다. 기존 헤더들은 --demo-banner-h 만큼 아래로
 * 내려가도록 이미 짜여 있어(인터이어·베이직 헤더 공통), 이 변수만 채워 주면 겹치지 않는다.
 */
export default function TemplatePreviewBanner({ name }: { name: string }) {
  useEffect(() => {
    document.documentElement.style.setProperty('--demo-banner-h', HEIGHT)
    return () => {
      document.documentElement.style.setProperty('--demo-banner-h', '0px')
    }
  }, [])

  return (
    <div
      style={{ height: HEIGHT }}
      className="fixed inset-x-0 top-0 z-[90] flex items-center justify-center gap-3 bg-amber-500 px-4 text-sm font-semibold text-amber-950 shadow"
    >
      <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.3 3.9L2.7 17.1a1.5 1.5 0 001.3 2.25h16a1.5 1.5 0 001.3-2.25L13.7 3.9a1.5 1.5 0 00-2.6 0z" />
      </svg>
      <span className="truncate">
        {name ? `'${name}' ` : ''}템플릿 프리뷰 중 — 실제로 적용되지 않았습니다. 메뉴·글은 지금 사이트 그대로입니다.
      </span>
      <a
        href={`${import.meta.env.BASE_URL}admin/templates`}
        onClick={exitPreview}
        className="shrink-0 rounded-md border border-amber-950/30 bg-amber-950/10 px-2.5 py-1 text-xs transition hover:bg-amber-950/20"
      >
        프리뷰 끝내기
      </a>
    </div>
  )
}
