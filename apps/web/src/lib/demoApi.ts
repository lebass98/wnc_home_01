import type {
  Contact,
  ContactStatus,
  DashboardStats,
  Paginated,
  Post,
  PostInput,
  PostListItem,
} from '@wnc/shared'
import { createDemoContacts, createDemoPosts, DEMO_CREDENTIALS, DEMO_USER } from './demoData'

/**
 * 백엔드가 없는 환경(GitHub Pages)에서 API 를 브라우저 안에서 흉내 낸다.
 * 데이터는 localStorage 에 저장되므로 새로고침해도 유지되지만, 기기 간에는 공유되지 않는다.
 */

const STORAGE_KEY = 'wnc_demo_db'
const TREND_DAYS = 14

interface DemoDb {
  posts: Post[]
  contacts: Contact[]
  nextPostId: number
  nextContactId: number
}

function seed(): DemoDb {
  const posts = createDemoPosts()
  const contacts = createDemoContacts()
  return {
    posts,
    contacts,
    nextPostId: posts.length + 1,
    nextContactId: contacts.length + 1,
  }
}

function load(): DemoDb {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as DemoDb
  } catch {
    // 저장소를 못 읽는 환경(프라이빗 모드 등)에서는 매번 초기 데이터로 동작한다.
  }
  const fresh = seed()
  save(fresh)
  return fresh
}

function save(db: DemoDb) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
  } catch {
    // 저장 실패는 무시한다 — 메모리 상태로만 동작한다.
  }
}

function toListItem(p: Post): PostListItem {
  const { id, category, title, published, views, authorName, createdAt } = p
  return { id, category, title, published, views, authorName, createdAt }
}

function paginate<T>(items: T[], page: number, pageSize: number): Paginated<T> {
  const total = items.length
  return {
    items: items.slice((page - 1) * pageSize, page * pageSize),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  }
}

function dateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

class DemoError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message)
  }
}

/** 실제 API 와 동일한 경로/메서드를 받아 동일한 형태의 응답을 돌려준다. */
export function handleDemoRequest(
  path: string,
  method: string,
  body: any,
): unknown {
  const [rawPath, search = ''] = path.split('?')
  const params = new URLSearchParams(search)
  const db = load()

  const num = (key: string, fallback: number) => {
    const v = Number(params.get(key))
    return Number.isFinite(v) && v > 0 ? v : fallback
  }

  // --- 인증 ---
  if (rawPath === '/auth/login' && method === 'POST') {
    if (body?.email === DEMO_CREDENTIALS.email && body?.password === DEMO_CREDENTIALS.password) {
      return { token: 'demo-token', user: DEMO_USER }
    }
    throw new DemoError('이메일 또는 비밀번호가 올바르지 않습니다.', 401)
  }

  if (rawPath === '/auth/me' && method === 'GET') {
    return DEMO_USER
  }

  // --- 게시글 ---
  if (rawPath === '/posts' && method === 'GET') {
    const includeDrafts = params.get('includeDrafts') === '1'
    const category = params.get('category')
    const q = params.get('q')?.toLowerCase()

    let items = db.posts.filter((p) => includeDrafts || p.published)
    if (category) items = items.filter((p) => p.category === category)
    if (q) {
      items = items.filter(
        (p) => p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q),
      )
    }
    items.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return paginate(items.map(toListItem), num('page', 1), num('pageSize', 10))
  }

  if (rawPath === '/posts' && method === 'POST') {
    const input = body as PostInput
    const post: Post = {
      id: db.nextPostId++,
      ...input,
      views: 0,
      authorId: DEMO_USER.id,
      authorName: DEMO_USER.name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    db.posts.unshift(post)
    save(db)
    return post
  }

  const postMatch = rawPath.match(/^\/posts\/(\d+)$/)
  if (postMatch) {
    const id = Number(postMatch[1])
    const index = db.posts.findIndex((p) => p.id === id)
    if (index === -1) throw new DemoError('게시글을 찾을 수 없습니다.', 404)

    if (method === 'GET') {
      const post = db.posts[index]
      if (post.published) {
        post.views += 1
        save(db)
      }
      return post
    }
    if (method === 'PUT') {
      db.posts[index] = { ...db.posts[index], ...(body as PostInput), updatedAt: new Date().toISOString() }
      save(db)
      return db.posts[index]
    }
    if (method === 'DELETE') {
      db.posts.splice(index, 1)
      save(db)
      return undefined
    }
  }

  // --- 문의 ---
  if (rawPath === '/contacts' && method === 'POST') {
    const contact: Contact = {
      id: db.nextContactId++,
      name: body.name,
      email: body.email,
      phone: body.phone || null,
      company: body.company || null,
      message: body.message,
      status: 'NEW',
      memo: null,
      createdAt: new Date().toISOString(),
    }
    db.contacts.unshift(contact)
    save(db)
    return { id: contact.id, message: '문의가 정상적으로 접수되었습니다.' }
  }

  if (rawPath === '/contacts' && method === 'GET') {
    const status = params.get('status')
    const q = params.get('q')?.toLowerCase()

    let items = [...db.contacts]
    if (status) items = items.filter((c) => c.status === status)
    if (q) {
      items = items.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          (c.company ?? '').toLowerCase().includes(q),
      )
    }
    items.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return paginate(items, num('page', 1), num('pageSize', 10))
  }

  const contactMatch = rawPath.match(/^\/contacts\/(\d+)$/)
  if (contactMatch) {
    const id = Number(contactMatch[1])
    const index = db.contacts.findIndex((c) => c.id === id)
    if (index === -1) throw new DemoError('문의를 찾을 수 없습니다.', 404)

    if (method === 'PATCH') {
      const patch = body as { status?: ContactStatus; memo?: string | null }
      db.contacts[index] = { ...db.contacts[index], ...patch }
      save(db)
      return db.contacts[index]
    }
    if (method === 'DELETE') {
      db.contacts.splice(index, 1)
      save(db)
      return undefined
    }
  }

  // --- 대시보드 ---
  if (rawPath === '/dashboard/stats' && method === 'GET') {
    const since = new Date()
    since.setHours(0, 0, 0, 0)
    since.setDate(since.getDate() - (TREND_DAYS - 1))

    const buckets = new Map<string, { date: string; posts: number; contacts: number }>()
    for (let i = 0; i < TREND_DAYS; i++) {
      const d = new Date(since)
      d.setDate(since.getDate() + i)
      buckets.set(dateKey(d), { date: dateKey(d), posts: 0, contacts: 0 })
    }
    for (const p of db.posts) {
      const b = buckets.get(dateKey(new Date(p.createdAt)))
      if (b) b.posts += 1
    }
    for (const c of db.contacts) {
      const b = buckets.get(dateKey(new Date(c.createdAt)))
      if (b) b.contacts += 1
    }

    const sorted = [...db.posts].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    const stats: DashboardStats = {
      totalPosts: db.posts.length,
      publishedPosts: db.posts.filter((p) => p.published).length,
      totalContacts: db.contacts.length,
      newContacts: db.contacts.filter((c) => c.status === 'NEW').length,
      totalViews: db.posts.reduce((sum, p) => sum + p.views, 0),
      trend: [...buckets.values()],
      recentPosts: sorted.slice(0, 5).map(toListItem),
      recentContacts: [...db.contacts]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 5),
    }
    return stats
  }

  throw new DemoError('요청한 경로를 찾을 수 없습니다.', 404)
}

/** 데모 데이터를 초기 상태로 되돌린다. */
export function resetDemoData() {
  save(seed())
}
