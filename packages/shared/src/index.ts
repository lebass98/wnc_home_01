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
  /** 대표 이미지 — 카드형·갤러리형 목록의 그림. 없으면 기본 배경을 대신 쓴다. */
  thumbnail: string | null
  /** 글 분류 — 게시판에 정해 둔 분류 중 하나. 안 쓰면 null. */
  subCategory: string | null
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
  /** 대표 이미지 — 카드형·갤러리형 목록의 그림. 없으면 기본 배경을 대신 쓴다. */
  thumbnail: string | null
  /** 글 분류 — 게시판에 정해 둔 분류 중 하나. 안 쓰면 null. */
  subCategory: string | null
  published: boolean
  views: number
  authorName: string
  createdAt: string
}

export interface PostInput {
  category: BoardCategory
  title: string
  content: string
  thumbnail: string | null
  subCategory: string | null
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

/** 페이지 첨부파일 — 업로드 API(/uploads/file)가 준 값 그대로 담는다. */
export interface PageAttachment {
  name: string
  url: string
  size: number
}

export interface Page extends PageListItem {
  /** TipTap 이 생성한 본문 HTML */
  content: string
  /** 언어별 제목 — 비어 있는 언어는 기본(한국어) 제목을 쓴다 */
  titleI18n: LocalizedText
  /** 언어별 본문 */
  contentI18n: LocalizedText
  /** 첨부파일 — 최대 5개 */
  attachments: PageAttachment[]
  /** 검색 결과 제목 — 비우면 페이지 제목 */
  metaTitle: string | null
  /** 검색 결과 설명 — 비우면 한 줄 설명, 그것도 없으면 사이트 기본값 */
  metaDescription: string | null
  /** 쉼표로 구분한 검색 키워드 */
  metaKeywords: string | null
  /** SNS 공유 이미지 — 비우면 사이트 기본값 */
  ogImage: string | null
}

export interface PageInput {
  slug?: string
  title: string
  titleI18n?: LocalizedText
  description?: string | null
  content: string
  contentI18n?: LocalizedText
  attachments?: PageAttachment[]
  published: boolean
  showInNav: boolean
  sortOrder?: number
  metaTitle?: string | null
  metaDescription?: string | null
  metaKeywords?: string | null
  ogImage?: string | null
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

  /* 회사 정보 — 푸터 · 문의하기 · 찾아오시는 길이 읽는다 */
  companyName: string
  /** 푸터 로고와 저작권 문구에 쓰는 영문 이름 */
  companyNameEn: string
  ceo: string
  /** 사업자등록번호 */
  bizNo: string
  zipCode: string
  address: string
  tel: string
  fax: string
  email: string
  /** 업무시간 — 줄바꿈으로 여러 줄 */
  hours: string
  /** 설립연도 — 저작권 문구의 시작 연도 */
  since: string
  /** 저작권 문구 — 앞에 '설립연도-올해' 가 자동으로 붙는다 */
  copyright: string
  /** 찾아오시는 길 지도 검색어 */
  mapQuery: string
  /** 찾아오시는 길 본사 안내 문구 */
  directionsGuide: string
  /** SNS 주소 — 비우면 푸터 아이콘을 감춘다 */
  snsFacebook: string
  snsYoutube: string
  snsBlog: string
  snsInstagram: string
  /** 지점 목록 */
  branches: Branch[]

  updatedAt: string
}

/** 찾아오시는 길에 보이는 지점 한 곳 */
export interface Branch {
  name: string
  phone: string
  email: string
  address: string
}

/** 환경설정 > 회사 정보 저장 입력 */
export interface CompanySettingInput {
  companyName: string
  companyNameEn: string
  ceo: string
  bizNo: string
  zipCode: string
  address: string
  tel: string
  fax: string
  email: string
  hours: string
  since: string
  copyright: string
  mapQuery: string
  directionsGuide: string
  snsFacebook: string
  snsYoutube: string
  snsBlog: string
  snsInstagram: string
  branches: Branch[]
}

/**
 * 회사 정보 기본값 — 설정을 아직 받지 못한 동안 푸터 등이 임시로 보여 준다.
 * DB 기본값(prisma/schema.prisma) 과 같은 내용이다.
 */
export const DEFAULT_COMPANY: CompanySettingInput = {
  companyName: '워드앤코드',
  companyNameEn: 'WORDNCODE',
  ceo: '',
  bizNo: '',
  zipCode: '08510',
  address: '서울 금천구 벚꽃로 298(가산동 50-3) 대륭포스트타워6차 2층 227호',
  tel: '02-2261-5555',
  fax: '02-863-5554',
  email: 'help@wordncode.com',
  hours: '평일 09:00 - 18:00\n점심 12:00 - 13:00 · 주말·공휴일 휴무',
  since: '2003',
  copyright: 'ⓒ BY WORDNCODE. ALL RIGHTS RESERVED.',
  mapQuery: '서울 금천구 벚꽃로 298',
  directionsGuide:
    '1호선·7호선 가산디지털단지역 5번 출구에서 도보 7분 거리입니다. 건물 지하 주차장을 이용하실 수 있으며, 방문 전 연락 주시면 주차권을 준비해 드립니다.',
  snsFacebook: '',
  snsYoutube: '',
  snsBlog: '',
  snsInstagram: 'https://www.instagram.com/wordncode__/',
  branches: [],
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
  // --- 기본설정: 홈페이지 게시판 목록 노출 ---
  listCount: number
  newDays: number
  showAuthor: boolean
  showSearch: boolean
  // --- 게시판 설정: 신고 접수 ---
  reportEnabled: boolean
  /** 줄바꿈으로 구분한 신고 사유 */
  reportReasons: string
  reportHideAt: number
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

/** 게시판 환경설정 > 기본설정 저장 입력 */
export interface BoardBasicInput {
  listCount: number
  newDays: number
  showAuthor: boolean
  showSearch: boolean
}

/** 게시판 환경설정 > 게시판 설정(신고) 저장 입력 */
export interface BoardReportInput {
  reportEnabled: boolean
  reportReasons: string
  reportHideAt: number
}

/** 신고 상태 */
export const REPORT_STATUSES = ['NEW', 'DONE', 'REJECTED'] as const
export type ReportStatus = (typeof REPORT_STATUSES)[number]
export const REPORT_STATUS_LABEL: Record<ReportStatus, string> = {
  NEW: '접수',
  DONE: '처리완료',
  REJECTED: '반려',
}

/** 관리자 [게시판 신고현황] 한 줄 */
export interface PostReportItem {
  id: number
  postId: number
  /** 신고당한 글 — 지워졌으면 null */
  postTitle: string | null
  boardSlug: string | null
  reason: string
  detail: string
  status: ReportStatus
  memo: string
  /** 이 글에 쌓인 신고 수 */
  postReportCount: number
  postHidden: boolean
  createdAt: string
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

/** 자주 묻는 질문 분류 — 관리자가 등록하고, 질문 작성 시 선택한다. */
export interface FaqCategory {
  id: number
  name: string
  sortOrder: number
  /** 이 분류를 쓰는 질문 수 */
  faqCount: number
  createdAt: string
  updatedAt: string
}

export interface FaqCategoryInput {
  name: string
  sortOrder?: number
}

/* --------------------------- 개인정보처리방침 개정 이력 --------------------------- */

export interface PrivacyRevisionListItem {
  id: number
  title: string
  /** 시행일 (ISO) */
  effectiveAt: string
  summary: string
  createdAt: string
  updatedAt: string
}

export interface PrivacyRevision extends PrivacyRevisionListItem {
  /** 당시 방침 본문 (평문) */
  content: string
}

export interface PrivacyRevisionInput {
  title: string
  effectiveAt: string
  summary?: string
  content: string
}

/* --------------------------- 사이트 페이지(실제 화면) --------------------------- */

/** 코드로 만들어진 실제 화면 — 관리자 페이지 관리에서 코드를 보고 고칠 수 있다. */
export interface SitePageDef {
  /** 파일·API 에서 쓰는 식별자 */
  key: string
  label: string
  /** 홈페이지 주소 (:id 같은 자리표시자 포함) */
  path: string
  /** apps/web/src/pages/site 아래 파일 이름 */
  file: string
  /** 화면 설명 */
  description: string
  /** page(기본) | layout — 레이아웃 파일은 주소가 없고 미리보기를 열 수 없다. */
  kind?: 'page' | 'layout'
}

export const SITE_PAGES: SitePageDef[] = [
  { key: 'home', label: '메인', path: '/', file: 'HomePage.tsx', description: '메인 비주얼과 소개 구역' },
  { key: 'about', label: '회사소개', path: '/about', file: 'AboutPage.tsx', description: '회사 소개 · 개발 철학' },
  { key: 'services', label: '사업분야', path: '/services', file: 'ServicesPage.tsx', description: '사업 인프라 카드' },
  { key: 'directions', label: '찾아오시는 길', path: '/about/directions', file: 'DirectionsPage.tsx', description: '지도 · 본사 · 지점' },
  { key: 'products', label: '제품소개', path: '/products', file: 'ProductsPage.tsx', description: '대분류 탭과 제품 목록' },
  { key: 'productDetail', label: '제품 상세', path: '/products/:id', file: 'ProductDetailPage.tsx', description: '제품 한 건의 상세' },
  { key: 'board', label: '소식', path: '/board', file: 'BoardPage.tsx', description: '게시판 탭과 유형별 목록' },
  { key: 'postDetail', label: '소식 상세', path: '/board/:id', file: 'PostDetailPage.tsx', description: '글 한 건의 상세' },
  { key: 'contact', label: '문의하기', path: '/contact', file: 'ContactPage.tsx', description: '문의 절차 · 연락처 · 양식' },
  { key: 'faq', label: '자주 묻는 질문', path: '/contact/faq', file: 'FaqPage.tsx', description: '분류 탭과 아코디언' },
  { key: 'custom', label: '관리자 페이지 틀', path: '/page/:slug', file: 'CustomPage.tsx', description: '페이지 관리에서 만든 페이지를 보여 주는 틀' },
  { key: 'layoutBasic', label: '레이아웃: 기본 서브', path: '', file: '../../layouts/BasicSubLayout.tsx', description: '전체 폭 본문 서브 틀', kind: 'layout' },
  { key: 'layoutLeft', label: '레이아웃: 좌측 메뉴 서브', path: '', file: '../../layouts/LeftMenuSubLayout.tsx', description: '좌측 메뉴 + 본문 서브 틀', kind: 'layout' },
  { key: 'layoutPolicy', label: '레이아웃: 약관형 서브', path: '', file: '../../layouts/PolicySubLayout.tsx', description: '약관 문서용 서브 틀 (안내 상자·조문 목차)', kind: 'layout' },
  { key: 'layoutHeaderBasic', label: '레이아웃: 기본 헤더', path: '', file: '../../layouts/BasicHeader.tsx', description: '로고 왼쪽 · 펼침 2차 메뉴 헤더', kind: 'layout' },
  { key: 'layoutHeaderCenter', label: '레이아웃: 센터 헤더', path: '', file: '../../layouts/CenterHeader.tsx', description: '로고 가운데 · 드롭다운 메뉴 헤더', kind: 'layout' },
  { key: 'layoutFooterBasic', label: '레이아웃: 기본 푸터', path: '', file: '../../layouts/BasicFooter.tsx', description: '베이지 바탕 가운데 정렬 푸터', kind: 'layout' },
  { key: 'layoutFooterSimple', label: '레이아웃: 심플 푸터', path: '', file: '../../layouts/SimpleFooter.tsx', description: '어두운 바탕 한 단 푸터', kind: 'layout' },
]

/** 목록 항목 — 파일 상태를 함께 준다. */
export interface SitePageInfo extends SitePageDef {
  /** 파일이 실제로 있는지 (데모 모드에서는 false) */
  available: boolean
  size: number
  lines: number
  /** 파일 수정 시각 (ISO). 없으면 null */
  updatedAt: string | null
  /** 저장해 둔 백업 수 */
  backups: number
}

/** 코드 편집 구조 트리의 항목 — 화면·레이아웃·부품이 같은 모양이다. */
export interface SiteTreeItem {
  key: string
  label: string
  /** 홈페이지 주소 — 부품·레이아웃은 빈 문자열 */
  path: string
  /** 보여 주는 소스 경로 (src/... 부터) */
  file: string
  kind: 'page' | 'layout' | 'component'
  available: boolean
  lines: number
  /** 이 화면이 가져다 쓰는 부품 이름들 */
  components: string[]
  children: SiteTreeItem[]
}

/** 구조 트리 한 묶음 */
export interface SiteTreeGroup {
  group: string
  items: SiteTreeItem[]
}

export interface SitePageSource extends SitePageDef {
  content: string
  updatedAt: string | null
}

/** 코드 문법 검사 결과 */
export interface SitePageCheck {
  ok: boolean
  message: string
  /** 문제가 있는 줄 번호 (1부터). 알 수 없으면 null */
  line: number | null
  column: number | null
  /** 그 줄의 내용 */
  excerpt: string | null
}

export interface SitePageBackup {
  /** 파일 이름 (시각 기반) */
  name: string
  createdAt: string
  size: number
}

/* ------------------------------------------------------------------ *
 *  홈페이지 메뉴 — GNB · 푸터 · 사이트맵 공용
 * ------------------------------------------------------------------ */

/** 2차 메뉴를 서버 데이터로 자동으로 채우는 방식 */
export const MENU_AUTO_CHILDREN = ['none', 'categories', 'boards'] as const
export type MenuAutoChildren = (typeof MENU_AUTO_CHILDREN)[number]

export const MENU_AUTO_CHILDREN_LABEL: Record<MenuAutoChildren, string> = {
  none: '직접 등록한 2차 메뉴만',
  categories: '제품 대분류를 2차 메뉴로 자동 추가',
  boards: '게시판을 2차 메뉴로 자동 추가',
}

export interface MenuItem {
  id: number
  parentId: number | null
  label: string
  /** 사이트 안 경로(/about) 또는 외부 주소(https://…). 비어 있으면 글자만 보인다. */
  url: string
  newTab: boolean
  autoChildren: MenuAutoChildren
  /** 끄면 어디에도 보이지 않는다. */
  published: boolean
  showInGnb: boolean
  showInFooter: boolean
  showInSitemap: boolean
  sortOrder: number
  children: MenuItem[]
  createdAt: string
  updatedAt: string
}

export interface MenuItemInput {
  parentId?: number | null
  label: string
  url: string
  newTab: boolean
  autoChildren: MenuAutoChildren
  published: boolean
  showInGnb: boolean
  showInFooter: boolean
  showInSitemap: boolean
}

/** 노출 스위치만 바꿀 때 */
export type MenuFlagsInput = Partial<Pick<MenuItemInput, 'published' | 'showInGnb' | 'showInFooter' | 'showInSitemap'>>

/** 순서 바꾸기 — 같은 부모 아래의 id 를 원하는 순서대로 보낸다. */
export interface MenuReorderInput {
  parentId: number | null
  ids: number[]
}

/* ------------------------------------------------------------------ *
 *  페이지 레이아웃
 * ------------------------------------------------------------------ */

/**
 * 서브 화면의 틀. 레이아웃 하나가 파일 하나이며
 * 목록·이름은 apps/web/src/layouts 등록부가 갖는다. 값은 등록부의 key 다.
 */
export type PageLayoutType = string

/** 경로 → 레이아웃 매핑. 없는 경로는 basic 으로 본다. */
export type SitePageLayoutMap = Record<string, PageLayoutType>

/**
 * 사이트 전역 디자인 — 헤더·푸터처럼 사이트 전체에 하나만 적용되는 틀의 선택값.
 * 값은 apps/web/src/layouts 등록부(HEADERS·FOOTERS)의 key 다.
 */
export interface SiteDesign {
  header: string
  footer: string
  updatedAt?: string
}

/** 디자인 저장값이 없을 때의 기본 — 모두 기본형을 쓴다. */
export const DEFAULT_SITE_DESIGN: SiteDesign = { header: 'basic', footer: 'basic' }

/**
 * 디자인 템플릿 — 헤더·푸터·화면별 서브 레이아웃 선택을 한 벌로 묶은 것.
 * 활성(active) 템플릿 한 벌이 사이트에 적용된다.
 */
export interface SiteTemplateInfo {
  id: number
  name: string
  description: string
  author: string
  version: string
  /** 기본 제공 템플릿 — 지울 수 없다. */
  builtin: boolean
  active: boolean
  header: string
  footer: string
  pageLayouts: SitePageLayoutMap
  /** 이 템플릿이 보관한 파일 수 (화면·레이아웃·부품) */
  files?: number
  createdAt: string
  updatedAt: string
}

/** 내보내기/가져오기에 쓰는 템플릿 파일(JSON) 형식 */
export interface SiteTemplateFile {
  type: 'wnc-template'
  name: string
  description?: string
  version?: string
  header?: string
  footer?: string
  pageLayouts?: SitePageLayoutMap
}

export * from './policyContent'
