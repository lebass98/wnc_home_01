import type {
  Contact,
  ContactStatus,
  DashboardStats,
  PageInput,
  Paginated,
  Post,
  PostInput,
  PostListItem,
} from '@wnc/shared'
import {
  createDemoCategories,
  createDemoContacts,
  createDemoPages,
  createDemoPosts,
  createDemoProducts,
  createDemoSetting,
  createDemoBoardSetting,
  createDemoBoards,
  DEMO_CREDENTIALS,
  DEMO_USER,
  type DemoCategory,
  type DemoPage,
  type DemoPageVersion,
  type DemoProduct,
  type DemoSetting,
  type DemoBoardSetting,
  type DemoBoard,
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
  pages: DemoPage[]
  pageVersions: DemoPageVersion[]
  setting: DemoSetting
  boardSetting: DemoBoardSetting
  boards: DemoBoard[]
  nextBoardId: number
  nextPostId: number
  nextContactId: number
  nextCategoryId: number
  nextProductId: number
  nextPageId: number
  nextPageVersionId: number
}

function seed(): DemoDb {
  const posts = createDemoPosts()
  const contacts = createDemoContacts()
  const { categories, leaves } = createDemoCategories()
  const products = createDemoProducts(leaves)
  const { pages, versions } = createDemoPages()
  return {
    posts,
    contacts,
    categories,
    products,
    pages,
    pageVersions: versions,
    setting: createDemoSetting(),
    boardSetting: createDemoBoardSetting(),
    boards: createDemoBoards(),
    nextBoardId: 4,
    nextPostId: posts.length + 1,
    nextContactId: contacts.length + 1,
    nextCategoryId: Math.max(...categories.map((c) => c.id)) + 1,
    nextProductId: products.length + 1,
    nextPageId: pages.length + 1,
    nextPageVersionId: versions.length + 1,
  }
}

function load(): DemoDb {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as DemoDb
      // 이전 버전 저장본(제품·페이지 데이터 없음)은 버리고 새로 시드한다.
      if (
        Array.isArray(parsed.products) &&
        Array.isArray(parsed.categories) &&
        Array.isArray(parsed.pages) &&
        parsed.setting &&
        parsed.boardSetting &&
        Array.isArray(parsed.boards)
      ) {
        return parsed
      }
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

/** 게시판 slug — 페이지와 같은 규칙으로 만들고 중복을 피한다. */
function demoBoardSlug(db: DemoDb, source: string, excludeId?: number): string {
  const base =
    `${source}`
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9가-힣\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/^-|-$/g, '') || `board-${Date.now().toString(36)}`
  let slug = base
  for (let i = 2; ; i++) {
    const found = db.boards.find((b) => b.slug === slug)
    if (!found || found.id === excludeId) return slug
    slug = `${base}-${i}`
  }
}

/** 데모용 slug 생성 — 실제 API 와 같은 규칙을 쓴다. */
function toPageSlug(title: string): string {
  const base = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/^-|-$/g, '')
  return base || `page-${Date.now().toString(36)}`
}

function uniquePageSlug(db: DemoDb, desired: string, excludeId?: number): string {
  let slug = desired
  for (let i = 2; ; i++) {
    const found = db.pages.find((p) => p.slug === slug)
    if (!found || found.id === excludeId) return slug
    slug = `${desired}-${i}`
  }
}

/** 현재 내용을 버전으로 남긴다. */
function snapshotPage(db: DemoDb, page: DemoPage, note: string) {
  db.pageVersions.push({
    id: db.nextPageVersionId++,
    pageId: page.id,
    version: page.version,
    title: page.title,
    description: page.description,
    content: page.content,
    published: page.published,
    showInNav: page.showInNav,
    note,
    authorName: DEMO_USER.name,
    createdAt: new Date().toISOString(),
  })
}

function toPageVersionItem(v: DemoPageVersion, currentVersion: number) {
  return {
    id: v.id,
    version: v.version,
    title: v.title,
    published: v.published,
    note: v.note,
    authorName: v.authorName,
    createdAt: v.createdAt,
    current: v.version === currentVersion,
  }
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

  // --- 게시판 ---
  if (rawPath === '/boards' && method === 'GET') {
    const includeHidden = params.get('includeHidden') === '1'
    return db.boards
      .filter((b) => includeHidden || b.published)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
      .map((b) => ({ ...b, postCount: db.posts.filter((p) => p.category === b.slug).length }))
  }

  if (rawPath === '/boards' && method === 'POST') {
    const slug = demoBoardSlug(db, body.slug?.trim() ? body.slug : body.name)
    const now = new Date().toISOString()
    const board: DemoBoard = {
      id: db.nextBoardId++,
      name: body.name,
      slug,
      description: body.description || null,
      published: Boolean(body.published),
      sortOrder: body.sortOrder ?? 0,
      createdAt: now,
      updatedAt: now,
    }
    db.boards.push(board)
    save(db)
    return { ...board, postCount: 0 }
  }

  const boardMatch = rawPath.match(/^\/boards\/(\d+)$/)
  if (boardMatch) {
    const id = Number(boardMatch[1])
    const idx = db.boards.findIndex((b) => b.id === id)
    if (idx === -1) throw new DemoError('게시판을 찾을 수 없습니다.', 404)
    const board = db.boards[idx]

    if (method === 'PUT') {
      const slug = demoBoardSlug(db, body.slug?.trim() ? body.slug : body.name, id)
      // slug 가 바뀌면 이 게시판 글의 category 도 함께 옮긴다.
      if (slug !== board.slug) {
        for (const post of db.posts) if (post.category === board.slug) post.category = slug
      }
      db.boards[idx] = {
        ...board,
        name: body.name,
        slug,
        description: body.description || null,
        published: Boolean(body.published),
        sortOrder: body.sortOrder ?? board.sortOrder,
        updatedAt: new Date().toISOString(),
      }
      save(db)
      return { ...db.boards[idx], postCount: db.posts.filter((p) => p.category === slug).length }
    }

    if (method === 'DELETE') {
      const count = db.posts.filter((p) => p.category === board.slug).length
      if (count > 0) {
        throw new DemoError(
          `이 게시판에 글이 ${count}개 있어 삭제할 수 없습니다. 글을 먼저 옮기거나 지우세요.`,
          400,
        )
      }
      db.boards.splice(idx, 1)
      save(db)
      return undefined
    }
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

  // --- 페이지 ---
  if (rawPath === '/pages' && method === 'GET') {
    const includeDrafts = params.get('includeDrafts') === '1'
    const status = params.get('status') ?? 'all'
    const sort = params.get('sort') ?? 'latest'
    const field = params.get('field') ?? 'all'
    const q = params.get('q')?.toLowerCase()

    let items = db.pages.filter((p) => includeDrafts || p.published)
    if (includeDrafts && status === 'published') items = items.filter((p) => p.published)
    if (includeDrafts && status === 'draft') items = items.filter((p) => !p.published)
    if (q) {
      items = items.filter((p) =>
        field === 'title'
          ? p.title.toLowerCase().includes(q)
          : field === 'slug'
            ? p.slug.toLowerCase().includes(q)
            : p.title.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q),
      )
    }

    if (sort === 'oldest') items.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    else if (sort === 'updated') items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    else if (sort === 'title') items.sort((a, b) => a.title.localeCompare(b.title, 'ko'))
    else items.sort((a, b) => b.createdAt.localeCompare(a.createdAt))

    return paginate(items, num('page', 1), num('pageSize', 20))
  }

  if (rawPath === '/pages/nav' && method === 'GET') {
    return db.pages
      .filter((p) => p.published && p.showInNav)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
  }

  const pageSlugMatch = rawPath.match(/^\/pages\/slug\/(.+)$/)
  if (pageSlugMatch && method === 'GET') {
    const slug = decodeURIComponent(pageSlugMatch[1])
    const page = db.pages.find((p) => p.slug === slug)
    if (!page || !page.published) throw new DemoError('페이지를 찾을 수 없습니다.', 404)
    page.views += 1
    save(db)
    return page
  }

  if (rawPath === '/pages/bulk' && method === 'PATCH') {
    const ids: number[] = body?.ids ?? []
    const published: boolean = Boolean(body?.published)
    let count = 0
    for (const page of db.pages) {
      if (!ids.includes(page.id)) continue
      page.published = published
      page.publishedAt = published ? (page.publishedAt ?? new Date().toISOString()) : null
      page.updatedAt = new Date().toISOString()
      count += 1
    }
    save(db)
    return { count }
  }

  if (rawPath === '/pages' && method === 'POST') {
    const input = body as PageInput
    const now = new Date().toISOString()
    const page: DemoPage = {
      id: db.nextPageId++,
      slug: uniquePageSlug(db, toPageSlug(input.slug?.trim() ? input.slug : input.title)),
      title: input.title,
      description: input.description || null,
      content: input.content ?? '',
      published: input.published,
      publishedAt: input.published ? now : null,
      showInNav: input.showInNav,
      sortOrder: input.sortOrder ?? 0,
      views: 0,
      version: 1,
      createdAt: now,
      updatedAt: now,
    }
    db.pages.unshift(page)
    snapshotPage(db, page, '최초 생성')
    save(db)
    return page
  }

  // 버전 복원 — /pages/:id/versions/:version/restore
  const restoreMatch = rawPath.match(/^\/pages\/(\d+)\/versions\/(\d+)\/restore$/)
  if (restoreMatch && method === 'POST') {
    const id = Number(restoreMatch[1])
    const version = Number(restoreMatch[2])
    const page = db.pages.find((p) => p.id === id)
    if (!page) throw new DemoError('페이지를 찾을 수 없습니다.', 404)

    const target = db.pageVersions.find((v) => v.pageId === id && v.version === version)
    if (!target) throw new DemoError('해당 버전을 찾을 수 없습니다.', 404)
    if (target.version === page.version) throw new DemoError('이미 현재 내용과 같은 버전입니다.', 400)

    page.title = target.title
    page.description = target.description
    page.content = target.content
    page.published = target.published
    page.publishedAt = target.published ? (page.publishedAt ?? new Date().toISOString()) : null
    page.showInNav = target.showInNav
    page.version += 1
    page.updatedAt = new Date().toISOString()
    snapshotPage(db, page, `v${target.version} 복원`)
    save(db)
    return page
  }

  // 버전 목록 / 상세
  const versionsMatch = rawPath.match(/^\/pages\/(\d+)\/versions(?:\/(\d+))?$/)
  if (versionsMatch && method === 'GET') {
    const id = Number(versionsMatch[1])
    const page = db.pages.find((p) => p.id === id)
    if (!page) throw new DemoError('페이지를 찾을 수 없습니다.', 404)

    if (versionsMatch[2] === undefined) {
      return db.pageVersions
        .filter((v) => v.pageId === id)
        .sort((a, b) => b.version - a.version)
        .map((v) => toPageVersionItem(v, page.version))
    }

    const v = db.pageVersions.find((x) => x.pageId === id && x.version === Number(versionsMatch[2]))
    if (!v) throw new DemoError('해당 버전을 찾을 수 없습니다.', 404)
    return {
      ...toPageVersionItem(v, page.version),
      description: v.description,
      content: v.content,
      showInNav: v.showInNav,
    }
  }

  const pageMatch = rawPath.match(/^\/pages\/(\d+)$/)
  if (pageMatch) {
    const id = Number(pageMatch[1])
    const idx = db.pages.findIndex((p) => p.id === id)
    if (idx === -1) throw new DemoError('페이지를 찾을 수 없습니다.', 404)
    const page = db.pages[idx]

    if (method === 'GET') return page

    if (method === 'PUT') {
      const input = body as PageInput
      const slug = uniquePageSlug(db, toPageSlug(input.slug?.trim() ? input.slug : input.title), id)
      // 어떤 항목이 바뀌었는지 모아 둔다. 하나도 없으면 새 버전을 만들지 않는다.
      const changes: string[] = []
      if (page.title !== input.title) changes.push('제목')
      if (page.slug !== slug) changes.push('슬러그')
      if ((page.description ?? null) !== (input.description || null)) changes.push('설명')
      if (page.content !== input.content) changes.push('본문')
      if (page.published !== input.published) changes.push('발행 상태')
      if (page.showInNav !== input.showInNav) changes.push('메뉴 노출')
      const changed = changes.length > 0

      page.slug = slug
      page.title = input.title
      page.description = input.description || null
      page.content = input.content ?? ''
      page.published = input.published
      page.publishedAt = input.published ? (page.publishedAt ?? new Date().toISOString()) : null
      page.showInNav = input.showInNav
      page.sortOrder = input.sortOrder ?? page.sortOrder
      page.updatedAt = new Date().toISOString()
      if (changed) {
        page.version += 1
        snapshotPage(db, page, `${changes.join(', ')} 변경`)
      }
      save(db)
      return page
    }

    if (method === 'DELETE') {
      db.pages.splice(idx, 1)
      db.pageVersions = db.pageVersions.filter((v) => v.pageId !== id)
      save(db)
      return undefined
    }
  }

  // --- 환경설정 ---
  if (rawPath === '/settings' && method === 'GET') {
    return db.setting
  }

  if (rawPath === '/settings' && method === 'PUT') {
    db.setting = {
      ...db.setting,
      siteName: body.siteName,
      siteUrl: body.siteUrl,
      description: body.description || null,
      adminEmail: body.adminEmail,
      titleImage: body.titleImage ?? null,
      updatedAt: new Date().toISOString(),
    }
    save(db)
    return db.setting
  }

  if (rawPath === '/settings/seo' && method === 'PUT') {
    db.setting = {
      ...db.setting,
      metaTitle: body.metaTitle || null,
      titleSuffix: body.titleSuffix || null,
      metaDescription: body.metaDescription || null,
      metaKeywords: body.metaKeywords || null,
      ogEnabled: body.ogEnabled ?? db.setting.ogEnabled,
      ogTitle: body.ogTitle || null,
      ogDescription: body.ogDescription || null,
      ogImage: body.ogImage || null,
      ogImageAlt: body.ogImageAlt || null,
      ogSiteName: body.ogSiteName || null,
      ogType: body.ogType || db.setting.ogType,
      ogLocale: body.ogLocale || db.setting.ogLocale,
      allowIndexing: Boolean(body.allowIndexing),
      googleVerification: body.googleVerification || null,
      naverVerification: body.naverVerification || null,
      gaId: body.gaId || null,
      generatorEnabled: body.generatorEnabled ?? db.setting.generatorEnabled,
      generatorContent: body.generatorContent || null,
      updatedAt: new Date().toISOString(),
    }
    save(db)
    return db.setting
  }

  // --- 게시판 환경설정 ---
  if (rawPath === '/board-settings' && method === 'GET') {
    return db.boardSetting
  }

  if (rawPath === '/board-settings/seo' && method === 'PUT') {
    db.boardSetting = {
      ...db.boardSetting,
      ...body,
      seoCacheResetAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    save(db)
    return db.boardSetting
  }

  if (rawPath === '/board-settings/seo/cache-reset' && method === 'POST') {
    db.boardSetting = { ...db.boardSetting, seoCacheResetAt: new Date().toISOString() }
    save(db)
    return db.boardSetting
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
