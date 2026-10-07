/**
 * 템플릿 프리뷰 — [템플릿 관리]에서 템플릿을 켜지 않고도 홈페이지 모습을 미리 본다.
 *
 * 주소에 ?previewTemplate=<id>&previewName=<이름> 을 달아 열면 그 값을 세션에 옮겨 담는다.
 * 주소창의 이 쿼리는 지우지 않는다 — 지금 보고 있는 게 프리뷰라는 걸 주소만 보고도 바로
 * 알 수 있어야 하기 때문이다. 메뉴를 눌러 다른 화면으로 가면(주소가 바뀌면) 쿼리는 자연히
 * 사라지지만, 세션에 옮겨 둔 값이 있어 같은 탭에서는 프리뷰가 계속 이어진다.
 * 메뉴·글 같은 콘텐츠는 현재 사이트의 값을 유지하고, 화면 소스·헤더·푸터·
 * 레이아웃·컴포넌트 설정·미디어는 실제 적용할 템플릿의 보관본으로 표시한다.
 */

const KEY = 'wnc_preview_template'

interface PreviewState {
  id: number
  name: string
}

function readFromUrl(): PreviewState | null {
  if (typeof window === 'undefined') return null
  const url = new URL(window.location.href)
  const id = Number(url.searchParams.get('previewTemplate'))
  if (!Number.isInteger(id) || id <= 0) return null
  const name = url.searchParams.get('previewName') ?? ''
  return { id, name }
}

// 모듈을 처음 불러올 때(=화면이 뜰 때) 한 번만 주소를 본다.
if (typeof window !== 'undefined') {
  const fromUrl = readFromUrl()
  if (fromUrl) sessionStorage.setItem(KEY, JSON.stringify(fromUrl))
}

export function getPreview(): PreviewState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as PreviewState) : null
  } catch {
    return null
  }
}

/** 프리뷰를 끝낸다 — 다음 새로고침부터 실제 적용된 디자인으로 돌아간다. */
export function exitPreview() {
  sessionStorage.removeItem(KEY)
}

/** /design·/components·/site-pages/layouts 에 붙이는 조회 문자열 — 프리뷰 중이 아니면 빈 문자열. */
export function previewQuery(): string {
  const preview = getPreview()
  return preview ? `?preview=${preview.id}` : ''
}

/** 프리뷰의 정적 파일도 실제 적용되는 템플릿 보관본을 사용한다. */
export function previewAssetBase(): string {
  const preview = getPreview()
  return preview && import.meta.env.VITE_DEMO !== 'true'
    ? `/api/templates/${preview.id}/assets/public/`
    : import.meta.env.BASE_URL
}
