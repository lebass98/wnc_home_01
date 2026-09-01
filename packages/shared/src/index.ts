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

/** 게시판 종류 */
export type BoardCategory = 'NOTICE' | 'NEWS' | 'PRESS'

export const BOARD_CATEGORY_LABEL: Record<BoardCategory, string> = {
  NOTICE: '공지사항',
  NEWS: '뉴스',
  PRESS: '보도자료',
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
