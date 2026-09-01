import type {
  Contact,
  ContactStatus,
  DashboardStats,
  Paginated,
  Post,
  PostInput,
  PostListItem,
} from '@wnc/shared'
import {
  createDemoCategories,
  createDemoContacts,
  createDemoPosts,
  createDemoProducts,
  DEMO_CREDENTIALS,
  DEMO_USER,
  type DemoCategory,
  type DemoProduct,
} from './demoData'

/**
 * 백엔드가 없는 환경(GitHub Pages)에서 API 를 브라우저 안에서 흉내 낸다.
 * 데이터는 localStorage 에 저장되므로 새로고침해도 유지되지만, 기기 간에는 공유되지 않는다.
 */

const STORAGE_KEY = 'wnc_demo_db'
const TREND_DAYS = 14

interface DemoDb {
  posts: Post[]
  contacts: Contact[]
  categories: DemoCategory[]
  products: DemoProduct[]
  nextPostId: number
  nextContactId: number
  nextCategoryId: number
  nextProductId: number
}

function seed(): DemoDb {
  const posts = createDemoPosts()
  const contacts = createDemoContacts()
  const { categories, leaves } = createDemoCategories()
  const products = createDemoProducts(leaves)
  return {
    posts,
    contacts,
    categories,
    products,
    nextPostId: posts.length + 1,
    nextContactId: contacts.length + 1,
    nextCategoryId: Math.max(...categories.map((c) => c.id)) + 1,
    nextProductId: products.length + 1,
  }
}

function load(): DemoDb {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as DemoDb
      // 이전 버전 저장본(제품 데이터 없음)은 버리고 새로 시드한다.
      if (Array.isArray(parsed.products) && Array.isArray(parsed.categories)) return parsed
    }
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


  // --- 카테고리 ---
  if (rawPath === '/categories' && method === 'GET') {
    const nodes = db.categories
      .slice()
      .sort((a, b) => a.depth - b.depth || a.sortOrder - b.sortOrder || a.id - b.id)
      .map((c) => ({
        ...c,
        productCount: db.products.filter((p) => p.categoryId === c.id).length,
        children: [] as any[],
      }))
    const byId = new Map(nodes.map((n) => [n.id, n]))
    const roots: typeof nodes = []
    for (const n of nodes) {
      const parent = n.parentId === null ? null : byId.get(n.parentId)
      if (parent) parent.children.push(n)
      else roots.push(n)
    }
    return roots
  }

  if (rawPath === '/categories' && method === 'POST') {
    const parentId = body?.parentId ?? null
    const parent = parentId === null ? null : db.categories.find((c) => c.id === parentId)
    if (parentId !== null && !parent) throw new DemoError('상위 카테고리를 찾을 수 없습니다.', 400)
    if (parent && parent.depth >= 3) throw new DemoError('카테고리는 3차까지만 만들 수 있습니다.', 400)

    const cat: DemoCategory = {
      id: db.nextCategoryId++,
      name: body.name,
      slug: `${body.name}`.toLowerCase().replace(/[^a-z0-9가-힣]+/g, '-') || `cat-${Date.now()}`,
      depth: parent ? parent.depth + 1 : 1,
      sortOrder: body.sortOrder ?? 0,
      parentId,
    }
    db.categories.push(cat)
    save(db)
    return { ...cat, productCount: 0 }
  }

  const catMatch = rawPath.match(/^\/categories\/(\d+)$/)
  if (catMatch) {
    const id = Number(catMatch[1])
    const idx = db.categories.findIndex((c) => c.id === id)
    if (idx === -1) throw new DemoError('카테고리를 찾을 수 없습니다.', 404)

    if (method === 'PUT') {
      const parentId = body?.parentId ?? null
      if (parentId === id) throw new DemoError('자기 자신을 상위 카테고리로 지정할 수 없습니다.', 400)

      // 자손을 부모로 지정하는 순환을 막는다.
      let cursor = parentId === null ? null : db.categories.find((c) => c.id === parentId)
      while (cursor?.parentId) {
        if (cursor.parentId === id) throw new DemoError('하위 카테고리를 상위로 지정할 수 없습니다.', 400)
        cursor = db.categories.find((c) => c.id === cursor!.parentId)
      }
      const parent = parentId === null ? null : db.categories.find((c) => c.id === parentId)
      if (parent && parent.depth >= 3) throw new DemoError('카테고리는 3차까지만 만들 수 있습니다.', 400)

      const depth = parent ? parent.depth + 1 : 1
      const hasChild = db.categories.some((c) => c.parentId === id)
      if (hasChild && depth + 1 > 3) {
        throw new DemoError('하위 카테고리가 있어 3차를 넘게 되므로 이동할 수 없습니다.', 400)
      }

      db.categories[idx] = { ...db.categories[idx], name: body.name, depth, parentId, sortOrder: body.sortOrder ?? db.categories[idx].sortOrder }

      // 자손 depth 재계산
      const reindex = (pid: number, pdepth: number) => {
        for (const c of db.categories) {
          if (c.parentId === pid) {
            c.depth = pdepth + 1
            reindex(c.id, c.depth)
          }
        }
      }
      reindex(id, depth)
      save(db)
      return db.categories[idx]
    }

    if (method === 'DELETE') {
      if (db.categories.some((c) => c.parentId === id)) {
        throw new DemoError('하위 카테고리가 있어 삭제할 수 없습니다. 먼저 하위를 삭제하세요.', 400)
      }
      const count = db.products.filter((p) => p.categoryId === id).length
      if (count > 0) throw new DemoError(`이 카테고리에 제품 ${count}개가 있어 삭제할 수 없습니다.`, 400)
      db.categories.splice(idx, 1)
      save(db)
      return undefined
    }
  }

  // --- 제품 ---
  if (rawPath === '/products' && method === 'GET') {
    const includeDrafts = params.get('includeDrafts') === '1'
    const category = Number(params.get('category')) || null
    const q = params.get('q')?.toLowerCase()
    const sort = params.get('sort') ?? 'latest'

    // 선택한 카테고리와 모든 하위를 포함한다.
    let categoryIds: number[] | null = null
    if (category) {
      categoryIds = []
      const stack = [category]
      while (stack.length) {
        const cur = stack.pop()!
        categoryIds.push(cur)
        for (const c of db.categories) if (c.parentId === cur) stack.push(c.id)
      }
    }

    let items = db.products.filter((p) => includeDrafts || p.published)
    if (categoryIds) items = items.filter((p) => categoryIds!.includes(p.categoryId))
    if (q) {
      items = items.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.model ?? '').toLowerCase().includes(q) ||
          (p.summary ?? '').toLowerCase().includes(q),
      )
    }

    if (sort === 'name') items.sort((a, b) => a.name.localeCompare(b.name, 'ko'))
    else if (sort === 'views') items.sort((a, b) => b.views - a.views)
    else items.sort((a, b) => a.sortOrder - b.sortOrder || b.createdAt.localeCompare(a.createdAt))

    const withCat = items.map((p) => ({
      ...p,
      categoryName: db.categories.find((c) => c.id === p.categoryId)?.name ?? '',
    }))
    return paginate(withCat, num('page', 1), num('pageSize', 12))
  }

  if (rawPath === '/products' && method === 'POST') {
    const product: DemoProduct = {
      id: db.nextProductId++,
      name: body.name,
      model: body.model ?? null,
      summary: body.summary ?? null,
      price: body.price ?? null,
      thumbnail: body.thumbnail ?? null,
      content: body.content ?? '',
      specs: body.specs ?? [],
      categoryId: body.categoryId,
      published: body.published,
      featured: body.featured,
      views: 0,
      sortOrder: body.sortOrder ?? 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    db.products.unshift(product)
    save(db)
    return { ...product, categoryName: db.categories.find((c) => c.id === product.categoryId)?.name ?? '' }
  }

  const prodMatch = rawPath.match(/^\/products\/(\d+)$/)
  if (prodMatch) {
    const id = Number(prodMatch[1])
    const idx = db.products.findIndex((p) => p.id === id)
    if (idx === -1) throw new DemoError('제품을 찾을 수 없습니다.', 404)

    if (method === 'GET') {
      const p = db.products[idx]
      if (p.published) {
        p.views += 1
        save(db)
      }
      // 대분류 → 소분류 경로
      const path: { id: number; name: string; slug: string }[] = []
      let cur = db.categories.find((c) => c.id === p.categoryId)
      while (cur) {
        path.unshift({ id: cur.id, name: cur.name, slug: cur.slug })
        cur = cur.parentId ? db.categories.find((c) => c.id === cur!.parentId) : undefined
      }
      return {
        ...p,
        categoryName: db.categories.find((c) => c.id === p.categoryId)?.name ?? '',
        categoryPath: path,
      }
    }

    if (method === 'PUT') {
      db.products[idx] = { ...db.products[idx], ...body, updatedAt: new Date().toISOString() }
      save(db)
      return { ...db.products[idx], categoryName: db.categories.find((c) => c.id === db.products[idx].categoryId)?.name ?? '' }
    }

    if (method === 'DELETE') {
      db.products.splice(idx, 1)
      save(db)
      return undefined
    }
  }

  // --- 업로드 (데모: 파일을 base64 로 그대로 돌려준다) ---
  if (rawPath === '/uploads' && method === 'POST') {
    return { url: body?.dataUrl ?? '' }
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
      totalProducts: db.products.length,
      publishedProducts: db.products.filter((p) => p.published).length,
      totalCategories: db.categories.length,
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
