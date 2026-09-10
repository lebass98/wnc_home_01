import { componentSettingsSchema, defaultComponentResponse, findTemplateLinkIssues, type ComponentSettingsResponse } from '@wnc/shared'
import { describeActivity, summarizeActivityBody, type ActivityLog } from '@wnc/shared'
import type {
  Contact,
  ContactStatus,
  DashboardStats,
  PageInput,
  Paginated,
  Post,
  PostInput,
  PostListItem,
  SiteStats,
  StatCount,
  StatDaily,
  StatHourly,
} from '@wnc/shared'
import { SITE_PAGES } from '@wnc/shared'
import {
  createDemoCategories,
  createDemoContacts,
  createDemoPages,
  createDemoPosts,
  createDemoProducts,
  createDemoSetting,
  createDemoMenus,
  createDemoBoardSetting,
  createDemoBoards,
  createDemoPopups,
  createDemoFaqs,
  createDemoFaqCategories,
  createDemoPrivacyRevisions,
  DEMO_CREDENTIALS,
  DEMO_USER,
  type DemoCategory,
  type DemoPage,
  type DemoPageVersion,
  type DemoProduct,
  type DemoSetting,
  type DemoMenuItem,
  type DemoBoardSetting,
  type DemoBoard,
  type DemoPopup,
  type DemoFaq,
  type DemoFaqCategory,
  type DemoPrivacyRevision,
} from './demoData'

/**
 * 백엔드가 없는 환경(GitHub Pages)에서 API 를 브라우저 안에서 흉내 낸다.
 * 데이터는 localStorage 에 저장되므로 새로고침해도 유지되지만, 기기 간에는 공유되지 않는다.
 */

// 시드 구성이 크게 바뀔 때 버전을 올린다 — 옛 저장본을 버리고 새 시드를 받게 한다.
const STORAGE_KEY = 'wnc_demo_db_v2'

/** 디자인 템플릿 — 헤더·푸터·화면별 레이아웃 선택 한 벌 */
interface DemoTemplate {
  /** 함께 담긴 메뉴·페이지 — '현재 사이트 담기'와 활성화 전환 때 갈무리된다. */
  data?: { menus: DemoMenuItem[]; pages: DemoPage[] }
  id: number
  name: string
  description: string
  author: string
  version: string
  builtin: boolean
  active: boolean
  header: string
  footer: string
  pageLayouts: Record<string, string>
  createdAt: string
  updatedAt: string
}

function basicTemplate(): DemoTemplate {
  const now = new Date().toISOString()
  return {
    id: 1,
    name: '인테리어',
    description: '워드앤코드 인테리어 템플릿',
    author: 'wordncode',
    version: '1.0.0',
    builtin: true,
    active: true,
    // 배포된 소스(인테리어 시안)와 같은 구성이어야 데모 화면이 어긋나지 않는다.
    header: 'interior',
    footer: 'interior',
    pageLayouts: { '/terms': 'left', '/privacy': 'left' },
    createdAt: now,
    updatedAt: now,
  }
}
const TREND_DAYS = 14

interface DemoDb {
  componentSettings?: ComponentSettingsResponse
  posts: Post[]
  contacts: Contact[]
  categories: DemoCategory[]
  products: DemoProduct[]
  pages: DemoPage[]
  pageVersions: DemoPageVersion[]
  setting: DemoSetting
  boardSetting: DemoBoardSetting
  boards: DemoBoard[]
  popups: DemoPopup[]
  /** 디자인 템플릿 — 활성 한 벌이 사이트에 적용된다 */
  templates: DemoTemplate[]
  nextTemplateId: number
  faqs: DemoFaq[]
  faqCategories: DemoFaqCategory[]
  privacyRevisions: DemoPrivacyRevision[]
  /** 관리자 활동 로그 — 데모에서는 변경 요청을 이 저장소에 남긴다 */
  activityLogs: ActivityLog[]
  nextActivityLogId: number
  menus: DemoMenuItem[]
  nextMenuId: number
  nextBoardId: number
  nextPopupId: number
  nextFaqId: number
  nextFaqCategoryId: number
  nextPrivacyRevisionId: number
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
  const popups = createDemoPopups()
  const faqs = createDemoFaqs()
  const faqCategories = createDemoFaqCategories()
  const privacyRevisions = createDemoPrivacyRevisions()
  const menus = createDemoMenus()
  return {
    templates: [basicTemplate()],
    nextTemplateId: 2,
    posts,
    contacts,
    categories,
    products,
    pages,
    pageVersions: versions,
    setting: createDemoSetting(),
    boardSetting: createDemoBoardSetting(),
    boards: createDemoBoards(),
    popups,
    faqs,
    faqCategories,
    privacyRevisions,
    menus,
    nextMenuId: menus.length + 1,
    nextBoardId: 4,
    nextPopupId: popups.length + 1,
    nextFaqId: faqs.length + 1,
    nextFaqCategoryId: faqCategories.length + 1,
    nextPrivacyRevisionId: privacyRevisions.length + 1,
    nextPostId: posts.length + 1,
    nextContactId: contacts.length + 1,
    nextCategoryId: Math.max(...categories.map((c) => c.id)) + 1,
    nextProductId: products.length + 1,
    nextPageId: pages.length + 1,
    nextPageVersionId: versions.length + 1,
    activityLogs: [],
    nextActivityLogId: 1,
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
        Array.isArray(parsed.boards) &&
        Array.isArray(parsed.popups) &&
        Array.isArray(parsed.faqs) &&
        Array.isArray(parsed.faqCategories) &&
        Array.isArray(parsed.privacyRevisions) &&
        Array.isArray(parsed.menus)
      ) {
        // 이전 저장본(템플릿 없음)은 그때의 디자인 선택을 기본 템플릿으로 옮긴다.
        if (!Array.isArray(parsed.templates) || parsed.templates.length === 0) {
          const legacy = parsed as unknown as { siteDesign?: { header: string; footer: string }; pageLayouts?: Record<string, string> }
          const base = basicTemplate()
          base.header = legacy.siteDesign?.header ?? 'basic'
          base.footer = legacy.siteDesign?.footer ?? 'basic'
          if (legacy.pageLayouts && Object.keys(legacy.pageLayouts).length > 0) base.pageLayouts = { ...legacy.pageLayouts }
          parsed.templates = [base]
          parsed.nextTemplateId = 2
        }
        parsed.nextTemplateId ??= Math.max(...parsed.templates.map((t) => t.id)) + 1
        // 이전 저장본의 메뉴에 '서비스'(/service) 가 없으면 사업분야 아래에 채워 넣는다.
        // 저장본은 시드를 다시 부르지 않으므로, 시드에 새로 넣은 메뉴는 여기서 따라 넣어야 예전 방문자도 본다.
        if (!parsed.menus.some((m) => m.url === '/service')) {
          const business = parsed.menus.find((m) => m.parentId === null && m.url === '/services')
          if (business) {
            parsed.nextMenuId ??= Math.max(0, ...parsed.menus.map((m) => m.id)) + 1
            const siblings = parsed.menus.filter((m) => m.parentId === business.id)
            const at = new Date().toISOString()
            const base = { newTab: false, autoChildren: 'none' as const, published: true, showInGnb: true, showInFooter: true, showInSitemap: true, createdAt: at, updatedAt: at }
            // 회사소개 묶음처럼 자기 화면을 첫 항목으로 두고, 그 다음에 서비스를 붙인다.
            if (!siblings.some((m) => m.url === '/services')) {
              for (const m of siblings) m.sortOrder += 1
              parsed.menus.push({ ...base, id: parsed.nextMenuId++, parentId: business.id, label: '사업분야', url: '/services', sortOrder: 0 })
            }
            const last = Math.max(-1, ...parsed.menus.filter((m) => m.parentId === business.id).map((m) => m.sortOrder))
            parsed.menus.push({ ...base, id: parsed.nextMenuId++, parentId: business.id, label: '서비스', url: '/service', sortOrder: last + 1 })
          }
        }
        // 이전 저장본의 페이지에 다국어·첨부 항목이 없으면 기본값을 채운다.
        for (const pg of parsed.pages) {
          pg.titleI18n ??= {}
          pg.contentI18n ??= {}
          pg.attachments ??= []
          pg.metaKeywords ??= null
        }
        // 이전 저장본에 활동 로그가 없으면 빈 목록으로 시작한다.
        parsed.activityLogs ??= []
        parsed.nextActivityLogId ??= Math.max(0, ...parsed.activityLogs.map((l) => l.id)) + 1
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
  const { id, category, title, thumbnail, subCategory, published, views, authorName, createdAt } = p
  // 본문 앞부분을 한 줄로 줄인다 — 카드형 목록의 요약
  const text = p.content
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const excerpt = text.length > 120 ? `${text.slice(0, 120)}…` : text
  return { id, category, title, excerpt, thumbnail, subCategory, published, views, authorName, createdAt }
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

/* ------------------------------------------------------------------ *
 *  통계 — 데모에는 서버가 없어 방문 기록이 쌓이지 않는다.
 *  날짜를 씨앗 삼아 늘 같은 값을 만들어 내고, 이 창에서 실제로 돌아다닌
 *  방문을 그 위에 얹는다. (지어 낸 값이라 실제 접속 수가 아니다)
 * ------------------------------------------------------------------ */

/** 이 창에서 실제로 열어 본 화면 — 새로고침하면 사라진다. */
const demoVisits: { path: string; at: number }[] = []

/** 같은 씨앗이면 늘 같은 수를 내놓는 난수 — 새로고침해도 그래프가 흔들리지 않게 한다. */
function seededRandom(seed: number): () => number {
  let t = seed >>> 0
  return () => {
    t = (t + 0x6d2b79f5) >>> 0
    let x = Math.imul(t ^ (t >>> 15), 1 | t)
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}

/** 가중치가 붙은 후보 중 하나를 고른다. */
function pickWeighted(rand: () => number, table: readonly (readonly [string, number])[]): string {
  const total = table.reduce((sum, [, w]) => sum + w, 0)
  let r = rand() * total
  for (const [name, w] of table) {
    r -= w
    if (r <= 0) return name
  }
  return table[table.length - 1][0]
}

const VISIT_DEVICE_MIX = [['PC', 52], ['모바일', 40], ['태블릿', 8]] as const
const VISIT_BROWSER_MIX = [
  ['Chrome', 55], ['Safari', 20], ['Edge', 11], ['Samsung Internet', 6],
  ['Whale', 4], ['Firefox', 3], ['기타', 1],
] as const
const VISIT_OS_MIX = [
  ['Windows', 41], ['Android', 22], ['iOS', 18], ['macOS', 13], ['iPadOS', 4], ['Linux', 2],
] as const
const VISIT_SOURCE_MIX = [['직접 유입', 42], ['검색', 34], ['SNS', 14], ['외부 링크', 10]] as const
const VISIT_PATH_MIX = [
  ['/', 30], ['/about', 12], ['/products', 11], ['/services', 10], ['/board', 9],
  ['/service', 8], ['/contact', 8], ['/contact/faq', 5], ['/about/directions', 4],
  ['/terms', 2], ['/privacy', 1],
] as const
/** 0~23시 방문이 몰리는 정도 — 새벽은 뜸하고 낮과 저녁에 몰린다. */
const VISIT_HOUR_MIX = [1, 1, 1, 1, 1, 2, 4, 8, 14, 20, 24, 22, 18, 24, 26, 25, 22, 18, 14, 12, 10, 8, 5, 3]

/** 지금 브라우저가 무엇인지 — 서버의 판정 규칙과 같게 본다. */
function readDemoAgent(): { device: string; browser: string; os: string } {
  const ua = navigator.userAgent
  const device = /iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(ua)
    ? '태블릿'
    : /Mobi|iPhone|iPod|Android|BlackBerry|IEMobile|Opera Mini/i.test(ua)
      ? '모바일'
      : 'PC'
  const browser = /SamsungBrowser/i.test(ua)
    ? 'Samsung Internet'
    : /Edg\//i.test(ua) ? 'Edge'
      : /OPR\/|Opera/i.test(ua) ? 'Opera'
        : /Whale/i.test(ua) ? 'Whale'
          : /Firefox\//i.test(ua) ? 'Firefox'
            : /Chrome\//i.test(ua) ? 'Chrome'
              : /Safari\//i.test(ua) ? 'Safari' : '기타'
  const os = /Windows NT/i.test(ua)
    ? 'Windows'
    : /Android/i.test(ua) ? 'Android'
      : /iPhone|iPod/i.test(ua) ? 'iOS'
        : /iPad/i.test(ua) ? 'iPadOS'
          : /Mac OS X/i.test(ua) ? (device === '태블릿' ? 'iPadOS' : 'macOS')
            : /CrOS/i.test(ua) ? 'ChromeOS'
              : /Linux/i.test(ua) ? 'Linux' : '기타'
  return { device, browser, os }
}

/** 많은 순으로 정렬한 이름·건수 목록 */
function toStatCounts(map: Map<string, number>): StatCount[] {
  return [...map.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)
}

/** 기간 안의 방문을 여섯 갈래로 나눠 준다 — 실제 API `GET /stats` 와 같은 형태다. */
function demoStats(from: string | null, to: string | null): SiteStats {
  const end = to ? new Date(`${to}T23:59:59.999`) : new Date()
  const start = from ? new Date(`${from}T00:00:00.000`) : new Date(end.getTime() - 29 * 24 * 60 * 60 * 1000)
  start.setHours(0, 0, 0, 0)

  const daily: StatDaily[] = []
  const hourly: StatHourly[] = Array.from({ length: 24 }, (_, hour) => ({ hour, views: 0 }))
  const devices = new Map<string, number>()
  const browsers = new Map<string, number>()
  const os = new Map<string, number>()
  const sources = new Map<string, number>()
  const pages = new Map<string, number>()
  const bump = (map: Map<string, number>, name: string) => map.set(name, (map.get(name) ?? 0) + 1)

  let views = 0
  let visitorSum = 0

  for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = dateKey(d)
    // 날짜 자체를 씨앗으로 삼아 같은 날은 늘 같은 값이 나오게 한다.
    const rand = seededRandom(Number(key.replace(/-/g, '')))
    const weekday = d.getDay()
    const busy = weekday === 0 ? 0.55 : weekday === 6 ? 0.62 : 1
    const count = Math.round(90 * busy * (0.75 + rand() * 0.5))

    for (let i = 0; i < count; i++) {
      let r = rand() * VISIT_HOUR_MIX.reduce((s, w) => s + w, 0)
      let hour = 23
      for (let h = 0; h < 24; h++) {
        r -= VISIT_HOUR_MIX[h]
        if (r <= 0) { hour = h; break }
      }
      hourly[hour].views += 1
      bump(devices, pickWeighted(rand, VISIT_DEVICE_MIX))
      bump(browsers, pickWeighted(rand, VISIT_BROWSER_MIX))
      bump(os, pickWeighted(rand, VISIT_OS_MIX))
      bump(sources, pickWeighted(rand, VISIT_SOURCE_MIX))
      bump(pages, pickWeighted(rand, VISIT_PATH_MIX))
    }

    // 한 사람이 여러 화면을 보므로 방문자는 조회수보다 적다.
    const dayVisitors = Math.round(count * 0.62)
    daily.push({ date: key, views: count, visitors: dayVisitors })
    views += count
    visitorSum += dayVisitors
  }

  // 이 창에서 실제로 열어 본 화면을 지어 낸 값 위에 얹는다.
  const agent = readDemoAgent()
  for (const v of demoVisits) {
    const at = new Date(v.at)
    if (at < start || at > end) continue
    const row = daily.find((x) => x.date === dateKey(at))
    if (!row) continue
    row.views += 1
    hourly[at.getHours()].views += 1
    views += 1
    bump(devices, agent.device)
    bump(browsers, agent.browser)
    bump(os, agent.os)
    bump(sources, '직접 유입')
    bump(pages, v.path)
  }

  const busiest = hourly.reduce((best, h) => (h.views > best.views ? h : best), { hour: -1, views: 0 })

  return {
    from: dateKey(start),
    to: dateKey(end),
    summary: {
      views,
      // 다시 찾아오는 사람이 있어 날짜별 방문자를 그대로 더한 값보다 적다.
      visitors: Math.round(visitorSum * 0.72),
      dailyAverage: daily.length > 0 ? Math.round(views / daily.length) : 0,
      busiestHour: busiest.views > 0 ? busiest.hour : null,
    },
    daily,
    hourly,
    devices: toStatCounts(devices),
    browsers: toStatCounts(browsers),
    os: toStatCounts(os),
    sources: toStatCounts(sources),
    pages: toStatCounts(pages).slice(0, 10),
  }
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

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

/** 데모 로그 한 줄 — 서버 미들웨어(activityLog.ts)와 같은 규칙으로 남긴다. */
function recordDemoActivity(input: Omit<ActivityLog, 'id' | 'createdAt' | 'ip'>) {
  const db = load()
  db.activityLogs.push({ ...input, id: db.nextActivityLogId++, ip: '127.0.0.1', createdAt: new Date().toISOString() })
  // 끝없이 쌓이지 않게 최근 2,000건만 둔다 (브라우저 저장소 용량).
  if (db.activityLogs.length > 2000) db.activityLogs.splice(0, db.activityLogs.length - 2000)
  save(db)
}

/** 실제 API 와 동일한 경로/메서드를 받아 동일한 형태의 응답을 돌려준다. 변경 요청은 활동 로그에 남긴다. */
export function handleDemoRequest(path: string, method: string, body: any): unknown {
  const result = handleDemoRequestInner(path, method, body)
  const rawPath = path.split('?')[0]
  // 방문 기록은 화면을 열 때마다 들어와 로그를 뒤덮는다 — 통계에만 쌓는다.
  if (MUTATING.has(method) && !rawPath.startsWith('/auth/') && rawPath !== '/stats/visits') {
    const described = describeActivity(method, rawPath, body)
    if (described) {
      const detail = { method, path, status: 200, body: summarizeActivityBody(body) }
      if (rawPath === '/contacts' && method === 'POST') {
        recordDemoActivity({
          type: 'SYSTEM',
          action: '문의 접수',
          description: `방문자 문의 접수 — ${String(body?.name ?? '').slice(0, 30)}`,
          target: '문의',
          targetId: null,
          actorId: null,
          actorName: null,
          actorEmail: null,
          detail,
        })
      } else {
        recordDemoActivity({
          type: 'ADMIN',
          ...described,
          actorId: DEMO_USER.id,
          actorName: DEMO_USER.name,
          actorEmail: DEMO_USER.email,
          detail,
        })
      }
    }
  }
  return result
}

function handleDemoRequestInner(path: string, method: string, body: any): unknown {
  const [rawPath, search = ''] = path.split('?')
  const params = new URLSearchParams(search)
  const db = load()

  if (rawPath === '/components' && method === 'GET') return structuredClone(db.componentSettings ?? defaultComponentResponse())
  const componentMatch = rawPath.match(/^\/components\/([^/]+)$/)
  if (componentMatch && method === 'PUT') {
    if (localStorage.getItem('wnc_admin_token') !== 'demo-token') throw new DemoError('관리자 로그인이 필요합니다.', 401)
    const key = componentSettingsSchema.keyof().safeParse(componentMatch[1])
    if (!key.success) throw new DemoError('알 수 없는 컴포넌트입니다.', 400)
    const parsed = componentSettingsSchema.shape[key.data].safeParse(body?.value)
    if (!parsed.success || !Number.isInteger(body?.revision) || body.revision < 0) throw new DemoError('입력값을 확인해 주세요.', 400)
    const settings = db.componentSettings ?? defaultComponentResponse()
    if (settings.revisions[key.data] !== body.revision) throw new DemoError('다른 화면에서 설정이 변경되었습니다. 최신 설정을 다시 불러와 주세요.', 409)
    Object.assign(settings.settings, { [key.data]: parsed.data })
    settings.revisions[key.data]++
    db.componentSettings = settings
    save(db)
    return { key: key.data, value: parsed.data, revision: settings.revisions[key.data] }
  }

  const num = (key: string, fallback: number) => {
    const v = Number(params.get(key))
    return Number.isFinite(v) && v > 0 ? v : fallback
  }

  // --- 인증 ---
  // --- 활동 로그 ---
  if (rawPath === '/activity-logs' && method === 'GET') {
    const type = params.get('type')
    const q = params.get('q')?.toLowerCase()
    const actorId = Number(params.get('actorId')) || null
    const from = params.get('from') ? new Date(params.get('from') as string).getTime() : null
    const to = params.get('to') ? new Date(params.get('to') as string).getTime() : null
    const asc = params.get('sort') === 'asc'
    let items = db.activityLogs.filter((l) => {
      if (type && l.type !== type) return false
      if (actorId && l.actorId !== actorId) return false
      const t = new Date(l.createdAt).getTime()
      if (from && t < from) return false
      if (to && t > to) return false
      if (q) {
        const hay = [l.description, l.action, l.target, l.actorName, l.actorEmail, l.ip].join(' ').toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
    items = items.slice().sort((a, b) => (asc ? a.id - b.id : b.id - a.id))
    return paginate(items, num('page', 1), num('pageSize', 10))
  }
  if (rawPath === '/activity-logs/actors' && method === 'GET') {
    const byId = new Map<number, { actorId: number; actorName: string; actorEmail: string; count: number }>()
    for (const l of db.activityLogs) {
      if (l.actorId === null) continue
      const cur = byId.get(l.actorId)
      if (cur) cur.count += 1
      else byId.set(l.actorId, { actorId: l.actorId, actorName: l.actorName ?? '', actorEmail: l.actorEmail ?? '', count: 1 })
    }
    return [...byId.values()]
  }
  if (rawPath === '/activity-logs' && method === 'DELETE') {
    const ids = new Set<number>(body?.ids ?? [])
    const before = db.activityLogs.length
    db.activityLogs = db.activityLogs.filter((l) => !ids.has(l.id))
    save(db)
    return { deleted: before - db.activityLogs.length }
  }

  if (rawPath === '/auth/login' && method === 'POST') {
    if (body?.email === DEMO_CREDENTIALS.email && body?.password === DEMO_CREDENTIALS.password) {
      recordDemoActivity({
        type: 'ADMIN',
        action: '로그인',
        description: '관리자 로그인',
        target: '계정',
        targetId: null,
        actorId: DEMO_USER.id,
        actorName: DEMO_USER.name,
        actorEmail: DEMO_USER.email,
        detail: null,
      })
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
      name: body.nameI18n?.ko?.trim() || body.name,
      slug,
      type: body.type ?? 'basic',
      description: body.descriptionI18n?.ko || body.description || null,
      nameI18n: body.nameI18n ?? {},
      descriptionI18n: body.descriptionI18n ?? {},
      showInAdminMenu: Boolean(body.showInAdminMenu),
      categories: body.categories ?? [],
      secretMode: body.secretMode ?? 'off',
      showViews: body.showViews ?? true,
      useReport: Boolean(body.useReport),
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

    // 설정 화면에서 게시판 하나를 불러온다.
    if (method === 'GET') {
      return { ...board, postCount: db.posts.filter((p) => p.category === board.slug).length }
    }

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
        type: body.type ?? board.type,
        description: body.descriptionI18n?.ko || body.description || null,
        nameI18n: body.nameI18n ?? board.nameI18n,
        descriptionI18n: body.descriptionI18n ?? board.descriptionI18n,
        showInAdminMenu: Boolean(body.showInAdminMenu),
        categories: body.categories ?? board.categories,
        secretMode: body.secretMode ?? board.secretMode,
        showViews: body.showViews ?? board.showViews,
        useReport: Boolean(body.useReport),
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

  // --- 팝업 ---
  /** 사용여부와 게시기간으로 지금 상태를 계산한다. (실제 API 와 같은 규칙) */
  const popupStatus = (p: DemoPopup, now: number) => {
    if (!p.enabled) return 'stopped'
    if (now < new Date(p.startAt).getTime()) return 'waiting'
    if (now > new Date(p.endAt).getTime()) return 'ended'
    return 'ongoing'
  }
  const popupItem = (p: DemoPopup, now: number) => ({
    id: p.id,
    name: p.name,
    placement: p.placement,
    placementPath: p.placementPath,
    windowType: p.windowType,
    image: p.image,
    linkUrl: p.linkUrl,
    linkNewTab: p.linkNewTab,
    startAt: p.startAt,
    endAt: p.endAt,
    enabled: p.enabled,
    status: popupStatus(p, now),
    sortOrder: p.sortOrder,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  })
  const popupDetail = (p: DemoPopup, now: number) => ({
    ...popupItem(p, now),
    content: p.content,
    scrollbar: p.scrollbar,
    positionTop: p.positionTop,
    positionLeft: p.positionLeft,
    width: p.width,
    height: p.height,
    hidePeriod: p.hidePeriod,
  })


  // --- 디자인 템플릿 — 활성 한 벌이 사이트에 적용된다 ---
  const activeTemplate = () => {
    let active = db.templates.find((t) => t.active)
    if (!active) {
      active = db.templates[0] ?? basicTemplate()
      if (db.templates.length === 0) db.templates.push(active)
      active.active = true
      save(db)
    }
    return active
  }
  const templateItem = ({ data, ...t }: DemoTemplate) => ({
    ...t,
    pageLayouts: { ...t.pageLayouts },
    dataMenus: data ? data.menus.filter((m) => m.parentId === null).length : 0,
    dataPages: data ? data.pages.length : 0,
    // 데모에는 템플릿 정보를 적어 두지 않는다.
    license: '',
    coreVersion: '',
    requires: [],
    changelog: [],
  })
  /** 지금 메뉴·페이지를 템플릿에 담을 형태로 복사한다. */
  const cloneSiteData = () => structuredClone({ menus: db.menus, pages: db.pages })
  /** 메뉴 주소와 화면이 서로 맞는지 — 실제 API 와 같은 규칙을 쓴다. */
  const demoLinkIssues = () =>
    findTemplateLinkIssues(
      db.menus.map((m) => ({ label: m.label, url: m.url, published: m.published })),
      db.pages.map((pg) => ({ slug: pg.slug, title: pg.title, published: pg.published })),
    )
  const templatesSorted = () =>
    [...db.templates].sort((a, b) => Number(b.active) - Number(a.active) || b.updatedAt.localeCompare(a.updatedAt))

  if (rawPath === '/design' && method === 'GET') {
    const t = activeTemplate()
    return { header: t.header, footer: t.footer, updatedAt: t.updatedAt }
  }

  // --- 화면별 레이아웃 — 활성 템플릿의 값이다 ---
  if (rawPath === '/site-pages/layouts' && method === 'GET') return { ...activeTemplate().pageLayouts }
  if (rawPath === '/site-pages/layouts' && method === 'PUT') {
    const t = activeTemplate()
    if (body.layout === 'basic') delete t.pageLayouts[body.path]
    else t.pageLayouts[body.path] = body.layout
    t.updatedAt = new Date().toISOString()
    save(db)
    return { ...t.pageLayouts }
  }

  // --- 템플릿 관리 ---
  if (rawPath === '/templates' && method === 'GET') return templatesSorted().map((t) => ({ ...templateItem(t), files: 0 }))
  if (rawPath === '/templates/link-check' && method === 'GET') return demoLinkIssues()
  // 적용 기록 — 데모에는 사이트 파일이 없어 비어 있다.
  if (rawPath === '/templates/apply-backups' && method === 'GET') return []
  if (rawPath.startsWith('/templates/apply-backups/')) {
    throw new DemoError('GitHub Pages 데모에서는 사이트 파일을 되돌릴 수 없습니다. 로컬 개발 서버에서 이용하세요.', 400)
  }
  if (/^\/templates\/\d+\/info$/.test(rawPath) && method === 'GET') {
    throw new DemoError('GitHub Pages 데모에서는 템플릿 파일을 읽을 수 없어 정보를 보여줄 수 없습니다.', 400)
  }
  if (rawPath === '/templates/import-zip' && method === 'POST') {
    throw new DemoError('GitHub Pages 데모에서는 템플릿 파일(zip)을 설치할 수 없습니다. 로컬 개발 서버에서 이용하세요.', 400)
  }
  if (rawPath === '/templates' && method === 'POST') {
    const name = String(body.name ?? '').trim()
    if (!name) throw new DemoError('템플릿 이름을 입력하세요.', 400)
    const base = activeTemplate()
    const now = new Date().toISOString()
    const created: DemoTemplate = {
      id: db.nextTemplateId++,
      name,
      description: String(body.description ?? '').trim() || `${base.name} 템플릿을 복제해 만든 템플릿`,
      author: 'demo',
      version: '1.0.0',
      builtin: false,
      active: false,
      header: base.header,
      footer: base.footer,
      pageLayouts: { ...base.pageLayouts },
      // 실제 API 처럼 지금 메뉴·페이지를 출발점으로 담는다.
      data: cloneSiteData(),
      createdAt: now,
      updatedAt: now,
    }
    db.templates.push(created)
    save(db)
    return templateItem(created)
  }
  if (rawPath === '/templates/import' && method === 'POST') {
    if (body.type !== 'wnc-template' || !String(body.name ?? '').trim())
      throw new DemoError('워드앤코드 템플릿 파일이 아닙니다. 내보내기로 받은 JSON 파일을 올려 주세요.', 400)
    const now = new Date().toISOString()
    const created: DemoTemplate = {
      id: db.nextTemplateId++,
      name: String(body.name).trim(),
      description: String(body.description ?? '').trim(),
      author: 'demo',
      version: String(body.version ?? '').trim() || '1.0.0',
      builtin: false,
      active: false,
      header: typeof body.header === 'string' ? body.header : 'basic',
      footer: typeof body.footer === 'string' ? body.footer : 'basic',
      pageLayouts: body.pageLayouts && typeof body.pageLayouts === 'object' ? { ...body.pageLayouts } : {},
      createdAt: now,
      updatedAt: now,
    }
    db.templates.push(created)
    save(db)
    return templateItem(created)
  }
  if (/^\/templates\/\d+\/snapshot$/.test(rawPath) && method === 'POST') {
    const t = db.templates.find((x) => x.id === Number(rawPath.split('/')[2]))
    if (!t) throw new DemoError('템플릿을 찾을 수 없습니다.', 404)
    // 데모에는 사이트 파일이 없어 메뉴·페이지만 담긴다.
    t.data = cloneSiteData()
    t.updatedAt = new Date().toISOString()
    save(db)
    return { ...templateItem(t), files: 0 }
  }
  const templateMatch = rawPath.match(/^\/templates\/(\d+)(\/(activate|duplicate|export))?$/)
  if (templateMatch) {
    const t = db.templates.find((x) => x.id === Number(templateMatch[1]))
    if (!t) throw new DemoError('템플릿을 찾을 수 없습니다.', 404)
    const action = templateMatch[3]

    if (action === 'activate' && method === 'POST') {
      // 이미 켜져 있으면 실제 API 처럼 아무것도 바꾸지 않는다.
      if (t.active) {
        return {
          templates: templatesSorted().map((x) => ({ ...templateItem(x), files: 0 })),
          applied: 0,
          backup: '',
          dataApplied: null,
          linkIssues: demoLinkIssues(),
        }
      }
      const withData = body?.withData === true
      if (withData && !t.data) {
        throw new DemoError('이 템플릿에는 메뉴·페이지 데이터가 없습니다. 화면만 적용해 주세요.', 400)
      }
      // 실제 API 처럼, 쓰던 템플릿에 지금 메뉴·페이지를 갈무리해 둔다.
      const current = db.templates.find((x) => x.active)
      if (current && current.id !== t.id) current.data = cloneSiteData()
      for (const x of db.templates) x.active = false
      t.active = true
      let dataApplied: { menus: number; pages: number } | null = null
      if (withData && t.data) {
        const now = new Date().toISOString()
        const incoming = structuredClone(t.data)
        db.menus = incoming.menus
        // 실제 API 는 페이지를 전부 지우고 1버전으로 새로 만든다 — 이력도 v1 한 건씩만 남긴다.
        db.pages = incoming.pages.map((pg) => ({
          ...pg,
          version: 1,
          publishedAt: pg.published ? now : null,
          updatedAt: now,
        }))
        db.pageVersions = db.pages.map((pg, i) => ({
          id: i + 1,
          pageId: pg.id,
          version: 1,
          title: pg.title,
          description: pg.description,
          content: pg.content,
          published: pg.published,
          showInNav: pg.showInNav,
          note: '템플릿 데모 데이터 적용',
          authorName: '템플릿',
          createdAt: now,
        }))
        // 새 항목이 이어서 만들어질 수 있게 번호를 맞춘다.
        db.nextMenuId = Math.max(0, ...db.menus.map((m) => m.id)) + 1
        db.nextPageId = Math.max(0, ...db.pages.map((pg) => pg.id)) + 1
        db.nextPageVersionId = db.pageVersions.length + 1
        dataApplied = { menus: db.menus.filter((m) => m.parentId === null).length, pages: db.pages.length }
      }
      save(db)
      // 데모에는 파일이 없어 화면은 구성만 바뀐다.
      return {
        templates: templatesSorted().map((x) => ({ ...templateItem(x), files: 0 })),
        applied: 0,
        backup: '',
        dataApplied,
        linkIssues: demoLinkIssues(),
      }
    }
    if (action === 'duplicate' && method === 'POST') {
      const now = new Date().toISOString()
      const created: DemoTemplate = {
        ...t,
        id: db.nextTemplateId++,
        name: `${t.name} 복사본`,
        author: 'demo',
        builtin: false,
        active: false,
        pageLayouts: { ...t.pageLayouts },
        // 담긴 메뉴·페이지도 제 몫으로 복사한다 — 원본과 같은 객체를 나눠 쓰지 않는다.
        data: t.data ? structuredClone(t.data) : undefined,
        createdAt: now,
        updatedAt: now,
      }
      db.templates.push(created)
      save(db)
      return templateItem(created)
    }
    if (action === 'export' && method === 'GET') {
      return {
        type: 'wnc-template',
        name: t.name,
        description: t.description,
        version: t.version,
        header: t.header,
        footer: t.footer,
        pageLayouts: { ...t.pageLayouts },
      }
    }
    if (!action && method === 'PUT') {
      if (typeof body.name === 'string' && body.name.trim()) t.name = body.name.trim()
      if (typeof body.description === 'string') t.description = body.description.trim()
      if (typeof body.version === 'string' && body.version.trim()) t.version = body.version.trim()
      if (typeof body.header === 'string') t.header = body.header
      if (typeof body.footer === 'string') t.footer = body.footer
      if (body.pageLayouts && typeof body.pageLayouts === 'object') t.pageLayouts = { ...body.pageLayouts }
      t.updatedAt = new Date().toISOString()
      save(db)
      return templateItem(t)
    }
    if (!action && method === 'DELETE') {
      if (t.builtin) throw new DemoError('기본 제공 템플릿은 삭제할 수 없습니다.', 400)
      if (t.active) throw new DemoError('사용 중인 템플릿은 삭제할 수 없습니다. 다른 템플릿을 먼저 활성화하세요.', 400)
      db.templates = db.templates.filter((x) => x.id !== t.id)
      save(db)
      return { ok: true }
    }
  }

  // --- 사이트 페이지(실제 화면) — 데모에서는 파일을 읽을 수 없어 목록만 준다 ---
  // 구조 트리 — 데모에서는 파일을 읽을 수 없어 목록만 만들어 준다.
  if (rawPath === '/site-pages/tree' && method === 'GET') {
    const item = (p: (typeof SITE_PAGES)[number]) => ({
      key: p.key,
      label: p.label,
      path: p.path,
      file: p.file.startsWith('..') ? p.file.replace(/^(\.\.\/)+/, 'src/') : `src/pages/site/${p.file}`,
      kind: p.kind ?? 'page',
      available: false,
      lines: 0,
      components: [],
      children: [],
    })
    return [
      { group: '공통 레이아웃', items: SITE_PAGES.filter((p) => p.kind === 'layout').map(item) },
      { group: '템플릿', items: SITE_PAGES.filter((p) => p.kind !== 'layout').map(item) },
    ]
  }

  if (rawPath === '/site-pages' && method === 'GET') {
    return SITE_PAGES.map((p) => ({ ...p, available: false, size: 0, lines: 0, updatedAt: null, backups: 0 }))
  }
  if (rawPath.startsWith('/site-pages/')) {
    throw new DemoError('GitHub Pages 데모에서는 소스 코드를 읽거나 고칠 수 없습니다. 로컬 개발 서버에서 이용하세요.', 400)
  }

  // --- 개인정보처리방침 개정 이력 ---
  const revisionItem = ({ content: _c, ...rest }: DemoPrivacyRevision) => rest
  const revisionsSorted = () => [...db.privacyRevisions].sort((a, b) => b.effectiveAt.localeCompare(a.effectiveAt) || b.id - a.id)

  if (rawPath === '/privacy-revisions' && method === 'GET') return revisionsSorted().map(revisionItem)

  if (rawPath === '/privacy-revisions' && method === 'POST') {
    const now = new Date().toISOString()
    const rev: DemoPrivacyRevision = {
      id: db.nextPrivacyRevisionId++,
      title: body.title,
      effectiveAt: new Date(body.effectiveAt).toISOString(),
      summary: body.summary ?? '',
      content: body.content,
      createdAt: now,
      updatedAt: now,
    }
    db.privacyRevisions.push(rev)
    save(db)
    return rev
  }

  const revisionMatch = rawPath.match(/^\/privacy-revisions\/(\d+)$/)
  if (revisionMatch) {
    const idx = db.privacyRevisions.findIndex((r) => r.id === Number(revisionMatch[1]))
    if (idx === -1) throw new DemoError('개정 이력을 찾을 수 없습니다.', 404)
    const rev = db.privacyRevisions[idx]
    if (method === 'GET') return rev
    if (method === 'PUT') {
      db.privacyRevisions[idx] = {
        ...rev,
        title: body.title,
        effectiveAt: new Date(body.effectiveAt).toISOString(),
        summary: body.summary ?? '',
        content: body.content,
        updatedAt: new Date().toISOString(),
      }
      save(db)
      return db.privacyRevisions[idx]
    }
    if (method === 'DELETE') {
      db.privacyRevisions.splice(idx, 1)
      save(db)
      return null
    }
  }

  // --- 자주 묻는 질문 분류 ---
  const faqCategoryList = () =>
    [...db.faqCategories]
      .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
      .map((c) => ({ ...c, faqCount: db.faqs.filter((f) => f.category === c.name).length }))

  if (rawPath === '/faqs/categories' && method === 'GET') return faqCategoryList()

  if (rawPath === '/faqs/categories' && method === 'POST') {
    const name = String(body.name ?? '').trim()
    if (!name) throw new DemoError('분류 이름을 입력하세요.', 400)
    if (db.faqCategories.some((c) => c.name === name)) {
      throw new DemoError(`'${name}' 분류가 이미 있습니다. 다른 이름을 쓰세요.`, 409)
    }
    const now = new Date().toISOString()
    const last = Math.max(-1, ...db.faqCategories.map((c) => c.sortOrder))
    db.faqCategories.push({
      id: db.nextFaqCategoryId++,
      name,
      sortOrder: body.sortOrder ?? last + 1,
      createdAt: now,
      updatedAt: now,
    })
    save(db)
    return faqCategoryList()
  }

  const faqCategoryMatch = rawPath.match(/^\/faqs\/categories\/(\d+)$/)
  if (faqCategoryMatch) {
    const idx = db.faqCategories.findIndex((c) => c.id === Number(faqCategoryMatch[1]))
    if (idx === -1) throw new DemoError('분류를 찾을 수 없습니다.', 404)
    const cat = db.faqCategories[idx]

    if (method === 'PUT') {
      const name = String(body.name ?? '').trim()
      if (!name) throw new DemoError('분류 이름을 입력하세요.', 400)
      if (name !== cat.name && db.faqCategories.some((c) => c.name === name)) {
        throw new DemoError(`'${name}' 분류가 이미 있습니다. 다른 이름을 쓰세요.`, 409)
      }
      // 이름을 바꾸면 그 분류를 쓰던 질문들도 함께 바뀐다.
      for (const f of db.faqs) if (f.category === cat.name) f.category = name
      db.faqCategories[idx] = {
        ...cat,
        name,
        sortOrder: body.sortOrder ?? cat.sortOrder,
        updatedAt: new Date().toISOString(),
      }
      save(db)
      return faqCategoryList()
    }

    if (method === 'DELETE') {
      // 분류를 지우면 그 분류를 쓰던 질문은 '분류 없음'이 된다.
      for (const f of db.faqs) if (f.category === cat.name) f.category = ''
      db.faqCategories.splice(idx, 1)
      save(db)
      return faqCategoryList()
    }
  }

  // --- 자주 묻는 질문 ---
  if (rawPath === '/faqs' && method === 'GET') {
    return db.faqs
      .filter((f) => f.published)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
  }

  if (rawPath === '/faqs/admin' && method === 'GET') {
    const q = params.get('q')?.toLowerCase()
    let items = [...db.faqs].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
    if (q) {
      items = items.filter(
        (f) =>
          f.question.toLowerCase().includes(q) ||
          f.answer.toLowerCase().includes(q) ||
          f.category.toLowerCase().includes(q),
      )
    }
    return paginate(items, num('page', 1), num('pageSize', 20))
  }

  if (rawPath === '/faqs' && method === 'POST') {
    const now = new Date().toISOString()
    const last = Math.max(-1, ...db.faqs.map((f) => f.sortOrder))
    const faq: DemoFaq = {
      id: db.nextFaqId++,
      category: body.category ?? '',
      question: body.question,
      answer: body.answer,
      published: body.published ?? true,
      sortOrder: body.sortOrder ?? last + 1,
      createdAt: now,
      updatedAt: now,
    }
    db.faqs.push(faq)
    save(db)
    return faq
  }

  if (rawPath === '/faqs/bulk-delete' && method === 'POST') {
    const ids: number[] = body.ids ?? []
    const before = db.faqs.length
    db.faqs = db.faqs.filter((f) => !ids.includes(f.id))
    save(db)
    return { deleted: before - db.faqs.length }
  }

  const faqPublishedMatch = rawPath.match(/^\/faqs\/(\d+)\/published$/)
  if (faqPublishedMatch && method === 'PATCH') {
    const faq = db.faqs.find((f) => f.id === Number(faqPublishedMatch[1]))
    if (!faq) throw new DemoError('질문을 찾을 수 없습니다.', 404)
    faq.published = Boolean(body.published)
    faq.updatedAt = new Date().toISOString()
    save(db)
    return faq
  }

  const faqMatch = rawPath.match(/^\/faqs\/(\d+)$/)
  if (faqMatch) {
    const idx = db.faqs.findIndex((f) => f.id === Number(faqMatch[1]))
    if (idx === -1) throw new DemoError('질문을 찾을 수 없습니다.', 404)
    const faq = db.faqs[idx]

    if (method === 'GET') return faq

    if (method === 'PUT') {
      db.faqs[idx] = {
        ...faq,
        category: body.category ?? '',
        question: body.question,
        answer: body.answer,
        published: body.published ?? faq.published,
        sortOrder: body.sortOrder ?? faq.sortOrder,
        updatedAt: new Date().toISOString(),
      }
      save(db)
      return db.faqs[idx]
    }

    if (method === 'DELETE') {
      db.faqs.splice(idx, 1)
      save(db)
      return null
    }
  }

  if (rawPath === '/popups/active' && method === 'GET') {
    const now = Date.now()
    return db.popups
      .filter(
        (p) =>
          p.enabled &&
          new Date(p.startAt).getTime() <= now &&
          new Date(p.endAt).getTime() >= now,
      )
      .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
      .map((p) => popupDetail(p, now))
  }

  if (rawPath === '/popups' && method === 'GET') {
    const now = Date.now()
    const page = Number(params.get('page') ?? 1)
    const pageSize = Number(params.get('pageSize') ?? 10)
    const sort = params.get('sort') ?? 'latest'
    const q = params.get('q')?.toLowerCase()
    const wanted = params.get('status')?.split(',').filter(Boolean) ?? []
    const from = params.get('from')
    const to = params.get('to')

    let items = [...db.popups]
    if (q) items = items.filter((p) => p.name.toLowerCase().includes(q))
    // 게시기간이 검색 구간과 조금이라도 겹치면 결과에 넣는다.
    if (from) items = items.filter((p) => new Date(p.endAt).getTime() >= new Date(from).getTime())
    if (to) {
      const end = new Date(`${to.slice(0, 10)}T23:59:59`).getTime()
      items = items.filter((p) => new Date(p.startAt).getTime() <= end)
    }
    if (wanted.length > 0) items = items.filter((p) => wanted.includes(popupStatus(p, now)))

    items.sort((a, b) =>
      sort === 'oldest'
        ? a.createdAt.localeCompare(b.createdAt)
        : sort === 'startAt'
          ? b.startAt.localeCompare(a.startAt)
          : sort === 'name'
            ? a.name.localeCompare(b.name, 'ko')
            : b.createdAt.localeCompare(a.createdAt),
    )

    const paged = paginate(items, page, pageSize)
    return { ...paged, items: paged.items.map((p) => popupItem(p, now)) }
  }

  if (rawPath === '/popups' && method === 'POST') {
    const now = new Date().toISOString()
    const popup: DemoPopup = {
      id: db.nextPopupId++,
      name: body.name,
      placement: body.placement ?? 'main',
      placementPath: body.placement === 'path' ? body.placementPath || null : null,
      windowType: body.windowType ?? 'fixed',
      scrollbar: body.scrollbar ?? 'none',
      content: body.content ?? '',
      image: body.image || null,
      linkUrl: body.linkUrl || null,
      linkNewTab: Boolean(body.linkNewTab),
      startAt: body.startAt,
      endAt: body.endAt,
      enabled: Boolean(body.enabled),
      positionTop: body.positionTop ?? 120,
      positionLeft: body.positionLeft ?? 120,
      width: body.width ?? 400,
      height: body.height ?? 500,
      hidePeriod: body.hidePeriod ?? 'day',
      sortOrder: body.sortOrder ?? 0,
      createdAt: now,
      updatedAt: now,
    }
    db.popups.push(popup)
    save(db)
    return popupDetail(popup, Date.now())
  }

  if (rawPath === '/popups/bulk-delete' && method === 'POST') {
    const ids: number[] = body.ids ?? []
    const before = db.popups.length
    db.popups = db.popups.filter((p) => !ids.includes(p.id))
    save(db)
    return { deleted: before - db.popups.length }
  }

  const popupEnabledMatch = rawPath.match(/^\/popups\/(\d+)\/enabled$/)
  if (popupEnabledMatch && method === 'PATCH') {
    const id = Number(popupEnabledMatch[1])
    const popup = db.popups.find((p) => p.id === id)
    if (!popup) throw new DemoError('팝업을 찾을 수 없습니다.', 404)
    popup.enabled = Boolean(body.enabled)
    popup.updatedAt = new Date().toISOString()
    save(db)
    return popupItem(popup, Date.now())
  }

  const popupMatch = rawPath.match(/^\/popups\/(\d+)$/)
  if (popupMatch) {
    const id = Number(popupMatch[1])
    const idx = db.popups.findIndex((p) => p.id === id)
    if (idx === -1) throw new DemoError('팝업을 찾을 수 없습니다.', 404)
    const popup = db.popups[idx]

    if (method === 'GET') return popupDetail(popup, Date.now())

    if (method === 'PUT') {
      db.popups[idx] = {
        ...popup,
        name: body.name,
        placement: body.placement ?? popup.placement,
        placementPath: body.placement === 'path' ? body.placementPath || null : null,
        windowType: body.windowType ?? popup.windowType,
        scrollbar: body.scrollbar ?? popup.scrollbar,
        content: body.content ?? '',
        image: body.image || null,
        linkUrl: body.linkUrl || null,
        linkNewTab: Boolean(body.linkNewTab),
        startAt: body.startAt,
        endAt: body.endAt,
        enabled: Boolean(body.enabled),
        positionTop: body.positionTop ?? popup.positionTop,
        positionLeft: body.positionLeft ?? popup.positionLeft,
        width: body.width ?? popup.width,
        height: body.height ?? popup.height,
        hidePeriod: body.hidePeriod ?? popup.hidePeriod,
        sortOrder: body.sortOrder ?? popup.sortOrder,
        updatedAt: new Date().toISOString(),
      }
      save(db)
      return popupDetail(db.popups[idx], Date.now())
    }

    if (method === 'DELETE') {
      db.popups.splice(idx, 1)
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
    const sub = params.get('subCategory')
    if (sub) items = items.filter((p) => p.subCategory === sub)
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
      // 순서를 따로 주지 않으면 같은 부모의 맨 뒤에 붙인다
      sortOrder:
        body.sortOrder ??
        Math.max(-1, ...db.categories.filter((c) => c.parentId === parentId).map((c) => c.sortOrder)) + 1,
      parentId,
    }
    db.categories.push(cat)
    save(db)
    return { ...cat, productCount: 0 }
  }

  // 같은 부모 아래 형제 순서를 통째로 다시 매긴다 — 목록의 ▲▼
  if (rawPath === '/categories/reorder' && method === 'PUT') {
    const { parentId, ids } = body as { parentId: number | null; ids: number[] }
    const siblings = db.categories.filter((c) => c.parentId === (parentId ?? null))
    const known = new Set(siblings.map((c) => c.id))
    if (ids.length !== known.size || ids.some((id) => !known.has(id))) {
      throw new DemoError('순서 목록이 현재 카테고리와 맞지 않습니다. 화면을 새로고침한 뒤 다시 시도하세요.', 400)
    }
    ids.forEach((id, i) => {
      const c = db.categories.find((x) => x.id === id)
      if (c) c.sortOrder = i
    })
    save(db)
    return null
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

  if (rawPath === '/pages/slug-check' && method === 'GET') {
    const slug = (params.get('slug') ?? '').trim()
    const excludeId = Number(params.get('excludeId') ?? 0) || 0
    if (!slug) return { ok: false, message: '슬러그를 입력하세요.' }
    if (!/^[a-z0-9-]+$/.test(slug)) return { ok: false, message: '영문 소문자, 숫자, 하이픈(-)만 사용할 수 있습니다.' }
    const found = db.pages.find((x) => x.slug === slug)
    if (found && found.id !== excludeId) return { ok: false, message: '이미 사용 중인 슬러그입니다. 다른 값을 입력하세요.' }
    return { ok: true, message: '사용 가능한 슬러그입니다.' }
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
    // 미발행 페이지는 로그인한 관리자(미리보기)에게만 보인다.
    const loggedIn = Boolean(localStorage.getItem('wnc_admin_token'))
    if (!page || (!page.published && !loggedIn)) throw new DemoError('페이지를 찾을 수 없습니다.', 404)
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
      titleI18n: input.titleI18n ?? {},
      contentI18n: input.contentI18n ?? {},
      attachments: input.attachments ?? [],
      metaTitle: input.metaTitle?.trim() || null,
      metaDescription: input.metaDescription?.trim() || null,
      metaKeywords: input.metaKeywords?.trim() || null,
      ogImage: input.ogImage?.trim() || null,
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
      const seo = {
        metaTitle: input.metaTitle?.trim() || null,
        metaDescription: input.metaDescription?.trim() || null,
        metaKeywords: input.metaKeywords?.trim() || null,
        ogImage: input.ogImage?.trim() || null,
      }
      if (
        page.metaTitle !== seo.metaTitle ||
        page.metaDescription !== seo.metaDescription ||
        (page.metaKeywords ?? null) !== seo.metaKeywords ||
        page.ogImage !== seo.ogImage
      ) {
        changes.push('검색 노출')
      }
      if (JSON.stringify(page.titleI18n ?? {}) !== JSON.stringify(input.titleI18n ?? {})) changes.push('제목')
      if (JSON.stringify(page.contentI18n ?? {}) !== JSON.stringify(input.contentI18n ?? {})) changes.push('본문')
      if (JSON.stringify(page.attachments ?? []) !== JSON.stringify(input.attachments ?? [])) changes.push('첨부파일')
      const changed = changes.length > 0

      page.slug = slug
      page.metaTitle = seo.metaTitle
      page.metaDescription = seo.metaDescription
      page.metaKeywords = seo.metaKeywords
      page.ogImage = seo.ogImage
      page.titleI18n = input.titleI18n ?? {}
      page.contentI18n = input.contentI18n ?? {}
      page.attachments = input.attachments ?? []
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

  // --- 홈페이지 메뉴 ---
  const menuTree = (onlyPublished: boolean) => {
    const rows = [...db.menus].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
    const visible = onlyPublished ? rows.filter((r) => r.published) : rows
    return visible
      .filter((r) => r.parentId === null)
      .map((r) => ({ ...r, children: visible.filter((c) => c.parentId === r.id).map((c) => ({ ...c, children: [] })) }))
  }
  const menuInput = (): Omit<DemoMenuItem, 'id' | 'sortOrder' | 'createdAt' | 'updatedAt'> => {
    const label = String(body.label ?? '').trim()
    if (!label) throw new DemoError('메뉴 이름을 입력하세요.', 400)
    const url = String(body.url ?? '').trim()
    if (url && !url.startsWith('/') && !/^https?:\/\//.test(url)) {
      throw new DemoError('주소는 / 로 시작하는 사이트 안 경로이거나 http:// 또는 https:// 로 시작하는 외부 주소여야 합니다.', 400)
    }
    const parentId = body.parentId ? Number(body.parentId) : null
    if (parentId) {
      const parent = db.menus.find((m) => m.id === parentId)
      if (!parent) throw new DemoError('상위 메뉴를 찾을 수 없습니다.', 404)
      if (parent.parentId !== null) throw new DemoError('2차 메뉴 아래에는 메뉴를 더 만들 수 없습니다. 1차 메뉴를 상위로 고르세요.', 400)
    }
    return {
      parentId,
      label,
      url,
      newTab: Boolean(body.newTab),
      autoChildren: parentId ? 'none' : (body.autoChildren ?? 'none'),
      published: body.published ?? true,
      showInGnb: body.showInGnb ?? true,
      showInFooter: body.showInFooter ?? true,
      showInSitemap: body.showInSitemap ?? true,
    }
  }
  const menuLast = (parentId: number | null) =>
    Math.max(-1, ...db.menus.filter((m) => m.parentId === parentId).map((m) => m.sortOrder))

  if (rawPath === '/menus' && method === 'GET') return menuTree(true)
  if (rawPath === '/menus/admin' && method === 'GET') return menuTree(false)

  if (rawPath === '/menus' && method === 'POST') {
    const input = menuInput()
    const now = new Date().toISOString()
    db.menus.push({ ...input, id: db.nextMenuId++, sortOrder: menuLast(input.parentId) + 1, createdAt: now, updatedAt: now })
    save(db)
    return menuTree(false)
  }

  if (rawPath === '/menus/reorder' && method === 'PUT') {
    const parentId = body.parentId ? Number(body.parentId) : null
    const ids: number[] = Array.isArray(body.ids) ? body.ids.map(Number) : []
    const siblings = db.menus.filter((m) => m.parentId === parentId)
    if (ids.length !== siblings.length || ids.some((id) => !siblings.some((s) => s.id === id))) {
      throw new DemoError('순서 목록이 현재 메뉴와 맞지 않습니다. 화면을 새로고침한 뒤 다시 시도하세요.', 400)
    }
    for (const m of siblings) m.sortOrder = ids.indexOf(m.id)
    save(db)
    return menuTree(false)
  }

  const menuMatch = rawPath.match(/^\/menus\/(\d+)(\/flags)?$/)
  if (menuMatch) {
    const idx = db.menus.findIndex((m) => m.id === Number(menuMatch[1]))
    if (idx === -1) throw new DemoError('메뉴를 찾을 수 없습니다.', 404)
    const item = db.menus[idx]

    if (menuMatch[2] && method === 'PATCH') {
      for (const key of ['published', 'showInGnb', 'showInFooter', 'showInSitemap'] as const) {
        if (typeof body[key] === 'boolean') item[key] = body[key]
      }
      item.updatedAt = new Date().toISOString()
      save(db)
      return menuTree(false)
    }

    if (!menuMatch[2] && method === 'PUT') {
      const input = menuInput()
      if (input.parentId === item.id) throw new DemoError('자기 자신을 상위 메뉴로 둘 수 없습니다.', 400)
      if (input.parentId && db.menus.some((m) => m.parentId === item.id)) {
        throw new DemoError('2차 메뉴가 달린 1차 메뉴는 다른 메뉴 아래로 옮길 수 없습니다. 먼저 2차 메뉴를 옮기거나 지우세요.', 400)
      }
      const sortOrder = input.parentId !== item.parentId ? menuLast(input.parentId) + 1 : item.sortOrder
      db.menus[idx] = { ...item, ...input, sortOrder, updatedAt: new Date().toISOString() }
      save(db)
      return menuTree(false)
    }

    if (!menuMatch[2] && method === 'DELETE') {
      db.menus = db.menus.filter((m) => m.id !== item.id && m.parentId !== item.id)
      save(db)
      return menuTree(false)
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

  if (rawPath === '/settings/company' && method === 'PUT') {
    db.setting = {
      ...db.setting,
      companyName: body.companyName,
      companyNameEn: body.companyNameEn ?? '',
      ceo: body.ceo ?? '',
      bizNo: body.bizNo ?? '',
      zipCode: body.zipCode ?? '',
      address: body.address ?? '',
      tel: body.tel ?? '',
      fax: body.fax ?? '',
      email: body.email ?? '',
      hours: body.hours ?? '',
      since: body.since ?? '',
      copyright: body.copyright ?? '',
      mapQuery: body.mapQuery ?? '',
      directionsGuide: body.directionsGuide ?? '',
      snsFacebook: body.snsFacebook ?? '',
      snsYoutube: body.snsYoutube ?? '',
      snsBlog: body.snsBlog ?? '',
      snsInstagram: body.snsInstagram ?? '',
      branches: Array.isArray(body.branches) ? body.branches : [],
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

  if (rawPath === '/board-settings/basic' && method === 'PUT') {
    db.boardSetting = { ...db.boardSetting, ...body, updatedAt: new Date().toISOString() }
    save(db)
    return db.boardSetting
  }
  if (rawPath === '/board-settings/report' && method === 'PUT') {
    db.boardSetting = { ...db.boardSetting, ...body, updatedAt: new Date().toISOString() }
    save(db)
    return db.boardSetting
  }
  // 신고 — 데모에는 접수함이 없다.
  if (rawPath === '/reports' && method === 'GET') {
    return { items: [], total: 0, page: 1, pageSize: 20, totalPages: 1 }
  }
  if (rawPath.startsWith('/reports')) {
    throw new DemoError('GitHub Pages 데모에서는 신고를 접수하거나 처리할 수 없습니다.', 400)
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

  // --- 통계 ---
  if (rawPath === '/stats/visits' && method === 'POST') {
    const visitPath = String(body?.path ?? '')
    if (visitPath && !visitPath.startsWith('/admin')) {
      demoVisits.push({ path: visitPath, at: Date.now() })
      if (demoVisits.length > 500) demoVisits.shift()
    }
    return null
  }

  if (rawPath === '/stats' && method === 'GET') {
    return demoStats(params.get('from'), params.get('to'))
  }

  throw new DemoError('요청한 경로를 찾을 수 없습니다.', 404)
}

/** 데모 데이터를 초기 상태로 되돌린다. */
export function resetDemoData() {
  save(seed())
}
