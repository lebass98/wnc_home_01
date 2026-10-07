import { useEffect, useState } from 'react'
import { exitPreview } from '../lib/preview'

/** 이 배너의 높이 — 헤더들이 읽는 --demo-banner-h 에 그대로 맞춘다. */
const HEIGHT = '2.75rem'

/**
 * 화면 맨 위에 뜨는 프리뷰 안내 — 템플릿을 적용하지 않고 미리 보는 중임을 알리고,
 * [템플릿 관리]로 바로 돌아갈 수 있게 한다. 기존 헤더들은 --demo-banner-h 만큼 아래로
 * 내려가도록 이미 짜여 있어(인터이어·베이직 헤더 공통), 이 변수만 채워 주면 겹치지 않는다.
 *
 * 주소에 적힌 id 가 서버에도 진짜 있는지 따로 한 번 더 확인한다 — 지워졌거나 바뀐
 * id 로 만들어진(예: 관리자 화면을 오래 열어 둔 사이에 목록이 바뀐) 프리뷰 링크는
 * 서버가 조용히 활성 템플릿으로 돌아가므로, 배너만 보고는 "인테리어 프리뷰 중"인데
 * 실제로는 활성 템플릿이 보이는 모순이 생길 수 있다. 이걸 사람이 알아챌 수 있게 알려 준다.
 */
export default function TemplatePreviewBanner({ id, name }: { id: number; name: string }) {
  // undefined = 확인 중, true = 그 템플릿이 맞게 보이는 중, false = 없는 id 라 활성 템플릿으로 조용히 대체됨
  const [valid, setValid] = useState<boolean | undefined>(undefined)

  useEffect(() => {
    document.documentElement.style.setProperty('--demo-banner-h', HEIGHT)
    return () => {
      document.documentElement.style.setProperty('--demo-banner-h', '0px')
    }
  }, [])

  useEffect(() => {
    let alive = true
    fetch(`/api/design?preview=${id}`)
      .then((r) => r.json())
      .then((d: { preview?: boolean }) => {
        if (alive) setValid(d.preview === true)
      })
      .catch(() => {
        if (alive) setValid(undefined)
      })
    return () => {
      alive = false
    }
  }, [id])

  if (valid === false) {
    return (
      <div
        style={{ height: HEIGHT }}
        className="fixed inset-x-0 top-0 z-[90] flex items-center justify-center gap-3 bg-red-600 px-4 text-sm font-semibold text-white shadow"
      >
        <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.3 3.9L2.7 17.1a1.5 1.5 0 001.3 2.25h16a1.5 1.5 0 001.3-2.25L13.7 3.9a1.5 1.5 0 00-2.6 0z" />
        </svg>
        <span className="truncate">
          {name ? `'${name}' ` : ''}템플릿을 찾을 수 없어 지금 활성 템플릿이 그대로 보이는 중입니다 — 지금 보이는 모습은 프리뷰가 아닙니다.
          [템플릿 관리] 목록을 새로고침한 뒤 프리뷰를 다시 눌러 주세요.
        </span>
        <a
          href={`${import.meta.env.BASE_URL}admin/templates`}
          onClick={exitPreview}
          className="shrink-0 rounded-md border border-white/40 bg-white/10 px-2.5 py-1 text-xs transition hover:bg-white/20"
        >
          템플릿 관리로
        </a>
      </div>
    )
  }

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
