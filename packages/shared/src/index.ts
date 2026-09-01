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
  /** 최근 14일 일별 추이 */
  trend: { date: string; posts: number; contacts: number }[]
  recentPosts: PostListItem[]
  recentContacts: Contact[]
}

export interface ApiError {
  message: string
}
