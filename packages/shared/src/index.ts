// 프론트엔드와 백엔드가 공유하는 타입 정의

export type Role = 'ADMIN' | 'EDITOR'

export interface AdminUser {
  id: number
  email: string
  name: string
  role: Role
  createdAt: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  token: string
  user: AdminUser
}

/** 글이 속한 게시판의 slug. 게시판은 관리자가 추가·삭제할 수 있다. */
export type BoardCategory = string

/** 기본 게시판 이름 — 게시판 목록을 아직 못 받았을 때 임시로 쓴다. */
export const BOARD_CATEGORY_LABEL: Record<string, string> = {
  notice: '공지사항',
  news: '뉴스',
  press: '보도자료',
}

/** 게시판 목록 표시 방식 */
export type BoardType = 'basic' | 'gallery' | 'card'

export const BOARD_TYPE_LABEL: Record<BoardType, string> = {
  basic: '기본형',
  gallery: '갤러리형',
  card: '카드형',
}

export const BOARD_TYPE_DESCRIPTION: Record<BoardType, string> = {
  basic: '제목 중심의 목록입니다. 공지사항처럼 글이 많은 게시판에 적합합니다.',
  gallery: '썸네일을 격자로 보여줍니다. 사진 위주의 게시판에 적합합니다.',
  card: '이미지와 요약을 카드로 보여줍니다. 뉴스나 소식에 적합합니다.',
}

/** 관리자에서 입력받는 언어 */
export const BOARD_LOCALES = ['ko', 'en', 'ja'] as const
export type BoardLocale = (typeof BOARD_LOCALES)[number]

export const BOARD_LOCALE_LABEL: Record<BoardLocale, string> = {
  ko: '한국어',
  en: 'English',
  ja: '日本語',
}

/** 언어별 텍스트. 기본 언어(ko)는 항상 채워져 있어야 한다. */
export type LocalizedText = Partial<Record<BoardLocale, string>>

/** 비밀글 모드 */
export type SecretMode = 'off' | 'optional' | 'always'

export const SECRET_MODE_LABEL: Record<SecretMode, string> = {
  off: '사용 안 함',
  optional: '작성자 선택',
  always: '항상 비밀글',
}

export interface Board {
  id: number
  name: string
  /** 글의 category 값 */
  slug: string
  /** 목록 표시 방식 */
  type: BoardType
  description: string | null
  /** 언어별 게시판명 */
  nameI18n: LocalizedText
  /** 언어별 설명 */
  descriptionI18n: LocalizedText
  /** 관리자 사이드바에 바로가기를 노출할지 */
  showInAdminMenu: boolean
  /** 글 분류 목록 */
  categories: string[]
  secretMode: SecretMode
  showViews: boolean
  useReport: boolean
  /** 끄면 홈페이지에서 감춘다 */
  published: boolean
  sortOrder: number
  postCount: number
  createdAt: string
  updatedAt: string
}

export interface BoardInput {
  name: string
  slug?: string
  type: BoardType
  description?: string | null
  nameI18n?: LocalizedText
  descriptionI18n?: LocalizedText
  showInAdminMenu?: boolean
  categories?: string[]
  secretMode?: SecretMode
  showViews?: boolean
  useReport?: boolean
  published: boolean
  sortOrder?: number
}

export interface Post {
  id: number
  category: BoardCategory
  title: string
  content: string
  published: boolean
  views: number
  authorId: number
  authorName: string
  createdAt: string
  updatedAt: string
}

export interface PostListItem {
  id: number
  category: BoardCategory
  title: string
  /** 본문 앞부분 — 카드형 목록의 요약에 쓴다. */
  excerpt: string
  published: boolean
  views: number
  authorName: string
  createdAt: string
}

export interface PostInput {
  category: BoardCategory
  title: string
  content: string
  published: boolean
}

export type ContactStatus = 'NEW' | 'IN_PROGRESS' | 'DONE'

export const CONTACT_STATUS_LABEL: Record<ContactStatus, string> = {
  NEW: '신규',
  IN_PROGRESS: '처리중',
  DONE: '완료',
}

export interface Contact {
  id: number
  name: string
  email: string
  phone: string | null
  company: string | null
  message: string
  status: ContactStatus
  memo: string | null
  createdAt: string
}

export interface ContactInput {
  name: string
  email: string
  phone?: string
  company?: string
  message: string
}

/** 목록 API 공통 응답 */
export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface DashboardStats {
  totalPosts: number
  publishedPosts: number
  totalContacts: number
  newContacts: number
  totalViews: number
  totalProducts: number
  publishedProducts: number
  totalCategories: number
  /** 최근 14일 일별 추이 */
  trend: { date: string; posts: number; contacts: number }[]
  recentPosts: PostListItem[]
  recentContacts: Contact[]
}

export interface ApiError {
  message: string
}

/* ------------------------------------------------------------------ *
 *  제품 카테고리 / 제품
 * ------------------------------------------------------------------ */

/** 카테고리 최대 깊이 — 대분류(1) / 중분류(2) / 소분류(3) */
export const MAX_CATEGORY_DEPTH = 3

export const CATEGORY_DEPTH_LABEL: Record<number, string> = {
  1: '대분류',
  2: '중분류',
  3: '소분류',
}

export interface Category {
  id: number
  name: string
  slug: string
  depth: number
  sortOrder: number
  parentId: number | null
  /** 해당 카테고리에 직접 속한 제품 수 */
  productCount: number
}

/** 자식을 품은 트리 형태 — 사이드 메뉴/셀렉트 박스에 사용한다. */
export interface CategoryNode extends Category {
  children: CategoryNode[]
}

export interface CategoryInput {
  name: string
  slug?: string
  parentId?: number | null
  sortOrder?: number
}

/** 제품 사양 테이블의 한 행 */
export interface ProductSpec {
  label: string
  value: string
}

export interface ProductListItem {
  id: number
  name: string
  model: string | null
  summary: string | null
  price: number | null
  thumbnail: string | null
  published: boolean
  featured: boolean
  views: number
  categoryId: number
  categoryName: string
  createdAt: string
}

export interface Product extends ProductListItem {
  /** TipTap 이 생성한 상세 본문 HTML */
  content: string
  specs: ProductSpec[]
  sortOrder: number
  /** 대분류 → 소분류 순의 카테고리 경로 (빵부스러기용) */
  categoryPath: { id: number; name: string; slug: string }[]
  updatedAt: string
}

export interface ProductInput {
  name: string
  model?: string | null
  summary?: string | null
  price?: number | null
  thumbnail?: string | null
  content: string
  specs: ProductSpec[]
  categoryId: number
  published: boolean
  featured: boolean
  sortOrder?: number
}

export type ProductSort = 'latest' | 'name' | 'views'

/* ------------------------------------------------------------------ *
 *  페이지 / 페이지 버전
 * ------------------------------------------------------------------ */

/** 목록에서 고를 수 있는 발행 상태 필터 */
export type PageStatusFilter = 'all' | 'published' | 'draft'

/** 목록 정렬 기준 */
export type PageSort = 'latest' | 'oldest' | 'updated' | 'title'

export const PAGE_SORT_LABEL: Record<PageSort, string> = {
  latest: '최근 생성순',
  oldest: '오래된 생성순',
  updated: '최근 수정순',
  title: '제목순',
}

/** 검색어를 어느 항목에 적용할지 */
export type PageSearchField = 'all' | 'title' | 'slug'

export interface PageListItem {
  id: number
  slug: string
  title: string
  description: string | null
  published: boolean
  /** 상단 메뉴 노출 여부 */
  showInNav: boolean
  sortOrder: number
  views: number
  /** 현재 내용의 버전 번호 */
  version: number
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface Page extends PageListItem {
  /** TipTap 이 생성한 본문 HTML */
  content: string
}

export interface PageInput {
  slug?: string
  title: string
  description?: string | null
  content: string
  published: boolean
  showInNav: boolean
  sortOrder?: number
}

/** 버전 목록 항목 — 본문은 담지 않는다. */
export interface PageVersionItem {
  id: number
  version: number
  title: string
  published: boolean
  /** 이 버전이 만들어진 이유 (최초 작성 / 수정 / n번 버전 복원) */
  note: string | null
  authorName: string
  createdAt: string
  /** 페이지의 현재 내용과 같은 버전인지 */
  current: boolean
}

/** 버전 상세 — 되돌리기 전에 내용을 확인할 때 쓴다. */
export interface PageVersionDetail extends PageVersionItem {
  description: string | null
  content: string
  showInNav: boolean
}

/* ------------------------------------------------------------------ *
 *  환경설정
 * ------------------------------------------------------------------ */

export interface SiteSetting {
  siteName: string
  siteUrl: string
  description: string | null
  adminEmail: string
  /** 헤더에 표시될 로고 이미지 */
  titleImage: string | null

  /* SEO */
  metaTitle: string | null
  /** 모든 페이지 제목 뒤에 붙는 문구 */
  titleSuffix: string | null
  metaDescription: string | null
  /** 쉼표로 구분한 키워드 */
  metaKeywords: string | null
  /** SNS 공유 태그 출력 여부 */
  ogEnabled: boolean
  ogTitle: string | null
  ogDescription: string | null
  ogImage: string | null
  ogImageAlt: string | null
  ogSiteName: string | null
  ogType: string
  ogLocale: string
  /** 끄면 검색엔진 수집을 막는다 (noindex) */
  allowIndexing: boolean
  googleVerification: string | null
  naverVerification: string | null
  /** Google Analytics 측정 ID */
  gaId: string | null
  /** generator 메타 태그 출력 여부 */
  generatorEnabled: boolean
  /** 비우면 DEFAULT_GENERATOR 를 쓴다 */
  generatorContent: string | null

  updatedAt: string
}

export interface SiteSettingInput {
  siteName: string
  siteUrl: string
  description?: string | null
  adminEmail: string
  titleImage?: string | null
}

/** og:type 선택지 */
export const OG_TYPES = ['website', 'article'] as const
export type OgType = (typeof OG_TYPES)[number]

/** generator 메타 태그 기본값 — 내용을 비웠을 때 쓴다. */
export const DEFAULT_GENERATOR = 'WNC CMS 0.1.0'

export interface SeoSettingInput {
  metaTitle?: string | null
  titleSuffix?: string | null
  metaDescription?: string | null
  metaKeywords?: string | null
  ogEnabled?: boolean
  ogTitle?: string | null
  ogDescription?: string | null
  ogImage?: string | null
  ogImageAlt?: string | null
  ogSiteName?: string | null
  ogType?: string
  ogLocale?: string
  allowIndexing: boolean
  googleVerification?: string | null
  naverVerification?: string | null
  gaId?: string | null
  generatorEnabled?: boolean
  generatorContent?: string | null
}

/* ------------------------------------------------------------------ *
 *  게시판 환경설정
 * ------------------------------------------------------------------ */

/** 메타 템플릿에서 쓸 수 있는 변수 — 페이지 유형별로 다르다. */
export const BOARD_SEO_VARIABLES = {
  list: ['{site_name}'],
  board: ['{site_name}', '{board_name}', '{board_description}'],
  post: ['{site_name}', '{board_name}', '{post_title}'],
} as const

export interface BoardSetting {
  seoListTitle: string
  seoListDescription: string
  seoBoardTitle: string
  seoBoardDescription: string
  seoPostTitle: string
  seoPostDescription: string
  seoServeList: boolean
  seoServeBoard: boolean
  seoServePost: boolean
  seoCacheResetAt: string
  updatedAt: string
}

export interface BoardSeoInput {
  seoListTitle: string
  seoListDescription: string
  seoBoardTitle: string
  seoBoardDescription: string
  seoPostTitle: string
  seoPostDescription: string
  seoServeList: boolean
  seoServeBoard: boolean
  seoServePost: boolean
}

/** 템플릿의 {변수} 를 실제 값으로 바꾼다. 값이 없는 변수는 지운다. */
export function fillTemplate(template: string, vars: Record<string, string | undefined>): string {
  return template
    .replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/* ------------------------------------------------------------------ *
 *  팝업
 * ------------------------------------------------------------------ */

/** 팝업을 띄울 위치 */
export const POPUP_PLACEMENTS = ['main', 'path'] as const
export type PopupPlacement = (typeof POPUP_PLACEMENTS)[number]

export const POPUP_PLACEMENT_LABEL: Record<PopupPlacement, string> = {
  main: '메인페이지',
  path: '특정페이지',
}

/** 팝업창 형태 */
export const POPUP_WINDOW_TYPES = ['window', 'fixed', 'draggable'] as const
export type PopupWindowType = (typeof POPUP_WINDOW_TYPES)[number]

export const POPUP_WINDOW_LABEL: Record<PopupWindowType, string> = {
  window: '일반 윈도우 팝업창',
  fixed: '고정 레이어 팝업',
  draggable: '이동 가능한 레이어 팝업',
}

/** 팝업창 스크롤바 */
export const POPUP_SCROLLBARS = ['auto', 'none', 'always'] as const
export type PopupScrollbar = (typeof POPUP_SCROLLBARS)[number]

export const POPUP_SCROLLBAR_LABEL: Record<PopupScrollbar, string> = {
  auto: '자동',
  none: '없음',
  always: '있음',
}

/** 팝업창 표시기간 — 방문자가 '다시 보지 않기'를 골랐을 때 얼마나 감출지 */
export const POPUP_HIDE_PERIODS = ['day', 'never', 'session'] as const
export type PopupHidePeriod = (typeof POPUP_HIDE_PERIODS)[number]

export const POPUP_HIDE_PERIOD_LABEL: Record<PopupHidePeriod, string> = {
  day: '하루동안 열지 않음',
  never: '다시 열지 않음',
  session: '이 브라우저 닫을 때까지 다시 안보임',
}

/**
 * 게시기간과 사용여부로 계산되는 진행 상태.
 * - waiting  게시 시작 전
 * - ongoing  게시 중
 * - ended    게시 종료
 * - stopped  사용 안 함(관리자가 끔)
 */
export const POPUP_STATUSES = ['waiting', 'ongoing', 'ended', 'stopped'] as const
export type PopupStatus = (typeof POPUP_STATUSES)[number]

export const POPUP_STATUS_LABEL: Record<PopupStatus, string> = {
  waiting: '진행대기',
  ongoing: '진행중',
  ended: '종료',
  stopped: '중지',
}

export interface PopupListItem {
  id: number
  name: string
  placement: PopupPlacement
  placementPath: string | null
  windowType: PopupWindowType
  image: string | null
  linkUrl: string | null
  linkNewTab: boolean
  startAt: string
  endAt: string
  enabled: boolean
  status: PopupStatus
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface Popup extends PopupListItem {
  content: string
  scrollbar: PopupScrollbar
  positionTop: number
  positionLeft: number
  width: number
  height: number
  hidePeriod: PopupHidePeriod
}

export interface PopupInput {
  name: string
  placement: PopupPlacement
  placementPath?: string | null
  windowType: PopupWindowType
  scrollbar: PopupScrollbar
  content: string
  image?: string | null
  linkUrl?: string | null
  linkNewTab: boolean
  startAt: string
  endAt: string
  enabled: boolean
  positionTop: number
  positionLeft: number
  width: number
  height: number
  hidePeriod: PopupHidePeriod
  sortOrder?: number
}

/** 목록 검색 조건 */
export type PopupSort = 'latest' | 'oldest' | 'startAt' | 'name'

export const POPUP_SORT_LABEL: Record<PopupSort, string> = {
  latest: '최근 등록순',
  oldest: '오래된순',
  startAt: '시작일순',
  name: '이름순',
}

/* --------------------------- 자주 묻는 질문 --------------------------- */

export interface Faq {
  id: number
  /** 분류 — 비어 있을 수 있다 */
  category: string
  question: string
  /** 평문 답변. 줄바꿈만 유지해 보여 준다. */
  answer: string
  published: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface FaqInput {
  category?: string
  question: string
  answer: string
  published: boolean
  sortOrder?: number
}
