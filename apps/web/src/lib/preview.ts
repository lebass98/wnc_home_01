/**
 * 템플릿 프리뷰 — [템플릿 관리]에서 템플릿을 켜지 않고도 홈페이지 모습을 미리 본다.
 *
 * 주소에 ?previewTemplate=<id>&previewName=<이름> 을 달아 연다.
 *
 * - [템플릿 관리]의 미리보기는 늘 '미리보기 창'(window.name 이 PREVIEW_WINDOW 로 시작)으로 연다.
 *   이 창에서는 값을 세션에 담아 두어, 메뉴를 눌러 주소가 바뀌어도 프리뷰가 이어지고 창을 닫으면 끝난다.
 * - 그 밖의 탭(주소를 복사해 붙여 넣은 경우 등)에서는 지금 화면을 띄운 동안만 프리뷰다.
 *   세션에 남기지 않으므로 새로고침하거나 주소를 다시 열면 실제 적용된 디자인으로 돌아간다.
 *   예전에는 어느 탭이든 세션에 남겨, 프리뷰를 한 번 연 탭이 표시 없이 계속 다른 템플릿을 보여 줬다.
 *
 * 메뉴·글 같은 콘텐츠는 현재 사이트의 값을 유지하고, 화면 소스·헤더·푸터·
 * 레이아웃·컴포넌트 설정·미디어는 실제 적용할 템플릿의 보관본으로 표시한다.
 */

const KEY = 'wnc_preview_template'
/** 미리보기 창 이름의 앞부분 — 뒤에 템플릿 id 를 붙여 템플릿마다 창 하나를 쓴다. */
export const PREVIEW_WINDOW = 'wnc-template-preview'

/** 템플릿 미리보기를 열 창 이름 — <a target> 에 넣는다. 같은 템플릿을 다시 누르면 같은 창을 쓴다. */
export const previewWindowName = (id: number) => `${PREVIEW_WINDOW}-${id}`

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

const isPreviewWindow = typeof window !== 'undefined' && window.name.startsWith(PREVIEW_WINDOW)
/** 미리보기 창이 아닌 탭의 프리뷰 — 이 화면을 띄운 동안만 메모리에 둔다. */
let pagePreview: PreviewState | null = null

// 모듈을 처음 불러올 때(=화면이 뜰 때) 한 번만 주소를 본다.
if (typeof window !== 'undefined') {
  const fromUrl = readFromUrl()
  if (isPreviewWindow) {
    if (fromUrl) sessionStorage.setItem(KEY, JSON.stringify(fromUrl))
  } else {
    pagePreview = fromUrl
    // 예전 방식으로 일반 탭에 남아 있던 프리뷰 기록은 지운다.
    sessionStorage.removeItem(KEY)
  }
}

/** 지금 보는 창이 [템플릿 관리]에서 연 미리보기 창인지 */
export function inPreviewWindow(): boolean {
  return isPreviewWindow
}

export function getPreview(): PreviewState | null {
  if (typeof window === 'undefined') return null
  if (!isPreviewWindow) return pagePreview
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
  pagePreview = null
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
