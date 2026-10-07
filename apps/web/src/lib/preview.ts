/**
 * 템플릿 프리뷰 — [템플릿 관리]에서 템플릿을 켜지 않고도 홈페이지 모습을 미리 본다.
 *
 * 주소에 ?previewTemplate=<id>&previewName=<이름> 을 달아 열면, 그 값을 세션에 옮겨 담고
 * 주소는 깨끗하게 되돌린다 — 그래야 메뉴를 눌러 다른 화면으로 가도(주소가 바뀌어도)
 * 같은 탭에서는 프리뷰가 계속 이어진다. 메뉴·글 같은 콘텐츠는 그대로 지금 사이트의 값을 쓰고,
 * 헤더·푸터·화면별 레이아웃·메인 비주얼 같은 디자인만 그 템플릿의 것으로 보인다.
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
  url.searchParams.delete('previewTemplate')
  url.searchParams.delete('previewName')
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
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
