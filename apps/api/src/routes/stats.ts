import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { asyncHandler } from '../lib/handler.js'
import { requireAuth } from '../lib/auth.js'

/**
 * 방문 통계 — 홈페이지가 화면을 열 때마다 한 건씩 보내고, 관리자 [통계]가 모아 본다.
 *
 * 개인을 알아볼 수 있는 값은 담지 않는다. IP 도 저장하지 않고,
 * 브라우저가 지어 낸 방문자 표시(visitorId)로 '같은 사람인지'만 구분한다.
 */
export const statsRouter = Router()

/* ---------- 브라우저가 보내는 값 읽기 ---------- */

/** 사용자 에이전트에서 기기 종류를 알아낸다. */
function readDevice(ua: string): string {
  if (/iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(ua)) return 'tablet'
  if (/Mobi|iPhone|iPod|Android|BlackBerry|IEMobile|Opera Mini/i.test(ua)) return 'mobile'
  return 'desktop'
}

/** 브라우저 이름 — 겹쳐 적히는 문자열이라 좁은 것부터 본다. */
function readBrowser(ua: string): string {
  if (/SamsungBrowser/i.test(ua)) return 'Samsung Internet'
  if (/Edg\//i.test(ua)) return 'Edge'
  if (/OPR\/|Opera/i.test(ua)) return 'Opera'
  if (/Whale/i.test(ua)) return 'Whale'
  if (/Firefox\//i.test(ua)) return 'Firefox'
  if (/Chrome\//i.test(ua)) return 'Chrome'
  if (/Safari\//i.test(ua)) return 'Safari'
  return '기타'
}

/** 운영체제 — 아이패드는 맥으로 보이기도 해서 기기 종류를 함께 본다. */
function readOs(ua: string, device: string): string {
  if (/Windows NT/i.test(ua)) return 'Windows'
  if (/Android/i.test(ua)) return 'Android'
  if (/iPhone|iPod/i.test(ua)) return 'iOS'
  if (/iPad/i.test(ua)) return 'iPadOS'
  if (/Mac OS X/i.test(ua)) return device === 'tablet' ? 'iPadOS' : 'macOS'
  if (/CrOS/i.test(ua)) return 'ChromeOS'
  if (/Linux/i.test(ua)) return 'Linux'
  return '기타'
}

/** 검색·SNS 로 알아보는 도메인 조각 */
const SEARCH_HOSTS = ['google.', 'naver.', 'daum.', 'bing.', 'yahoo.', 'duckduckgo.', 'zum.', 'baidu.']
const SNS_HOSTS = ['facebook.', 'instagram.', 't.co', 'twitter.', 'x.com', 'kakao.', 'band.us', 'linkedin.', 'youtube.', 'threads.']

/** 유입 주소를 보고 어디를 거쳐 왔는지와 도메인을 가려낸다. */
function readSource(referrer: string, host: string): { source: string; domain: string } {
  if (!referrer) return { source: 'direct', domain: '' }
  let domain = ''
  try {
    domain = new URL(referrer).hostname.replace(/^www\./, '')
  } catch {
    return { source: 'direct', domain: '' }
  }
  // 우리 사이트 안에서 옮겨 다닌 것은 유입으로 세지 않는다.
  if (domain && host && domain === host.replace(/^www\./, '').split(':')[0]) return { source: 'direct', domain: '' }
  if (SEARCH_HOSTS.some((h) => domain.includes(h))) return { source: 'search', domain }
  if (SNS_HOSTS.some((h) => domain.includes(h))) return { source: 'sns', domain }
  return { source: 'referral', domain }
}

/* ---------- 수집 ---------- */

const visitSchema = z.object({
  path: z.string().trim().min(1).max(300),
  visitorId: z.string().trim().max(64).default(''),
  referrer: z.string().trim().max(500).default(''),
})

/** 방문 한 건 — 홈페이지가 화면을 열 때 부른다. 실패해도 화면에는 지장이 없다. */
statsRouter.post(
  '/visits',
  asyncHandler(async (req, res) => {
    const data = visitSchema.parse(req.body)
    // 관리자 화면은 통계에 넣지 않는다.
    if (data.path.startsWith('/admin')) return res.status(204).end()

    const ua = String(req.headers['user-agent'] ?? '')
    const device = readDevice(ua)
    const { source, domain } = readSource(data.referrer, String(req.headers.host ?? ''))

    await prisma.visit.create({
      data: {
        path: data.path,
        visitorId: data.visitorId,
        device,
        browser: readBrowser(ua),
        os: readOs(ua, device),
        source,
        referrer: domain,
      },
    })
    res.status(204).end()
  }),
)

/* ---------- 집계 ---------- */

const rangeSchema = z.object({
  /** YYYY-MM-DD — 없으면 최근 30일 */
  from: z.string().trim().optional(),
  to: z.string().trim().optional(),
})

/** 'YYYY-MM-DD' 로 — 서버가 있는 곳의 날짜를 그대로 쓴다. */
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 이름별로 세어 많은 순으로 — 비어 있으면 '기타' 로 묶는다. */
function tally(rows: { [k: string]: any }[], key: string, label?: (v: string) => string): { name: string; count: number }[] {
  const map = new Map<string, number>()
  for (const r of rows) {
    const raw = String(r[key] ?? '').trim() || '기타'
    const name = label ? label(raw) : raw
    map.set(name, (map.get(name) ?? 0) + 1)
  }
  return [...map.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)
}

/** 관리자 통계 — 기간 안의 방문을 여섯 갈래로 나눠 준다. */
statsRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { from, to } = rangeSchema.parse(req.query)

    // 기본은 오늘까지 최근 30일.
    const end = to ? new Date(`${to}T23:59:59.999`) : new Date()
    const start = from ? new Date(`${from}T00:00:00.000`) : new Date(end.getTime() - 29 * 24 * 60 * 60 * 1000)
    start.setHours(0, 0, 0, 0)

    const rows = await prisma.visit.findMany({
      where: { createdAt: { gte: start, lte: end } },
      select: { path: true, visitorId: true, device: true, browser: true, os: true, source: true, createdAt: true },
    })

    // 날짜별 — 하루도 빠짐없이 채워 그래프가 끊기지 않게 한다.
    const dayViews = new Map<string, number>()
    const dayVisitors = new Map<string, Set<string>>()
    const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, views: 0 }))

    for (const r of rows) {
      const key = dayKey(r.createdAt)
      dayViews.set(key, (dayViews.get(key) ?? 0) + 1)
      if (!dayVisitors.has(key)) dayVisitors.set(key, new Set())
      if (r.visitorId) dayVisitors.get(key)!.add(r.visitorId)
      hours[r.createdAt.getHours()].views += 1
    }

    const daily: { date: string; views: number; visitors: number }[] = []
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = dayKey(d)
      daily.push({ date: key, views: dayViews.get(key) ?? 0, visitors: dayVisitors.get(key)?.size ?? 0 })
    }

    const visitors = new Set(rows.map((r) => r.visitorId).filter(Boolean)).size
    const busiest = hours.reduce((best, h) => (h.views > best.views ? h : best), { hour: -1, views: 0 })

    const DEVICE_LABEL: Record<string, string> = { desktop: 'PC', mobile: '모바일', tablet: '태블릿' }
    const SOURCE_LABEL: Record<string, string> = {
      direct: '직접 유입',
      search: '검색',
      sns: 'SNS',
      referral: '외부 링크',
    }

    res.json({
      from: dayKey(start),
      to: dayKey(end),
      summary: {
        views: rows.length,
        visitors,
        dailyAverage: daily.length > 0 ? Math.round(rows.length / daily.length) : 0,
        busiestHour: busiest.views > 0 ? busiest.hour : null,
      },
      daily,
      hourly: hours,
      devices: tally(rows, 'device', (v) => DEVICE_LABEL[v] ?? v),
      browsers: tally(rows, 'browser'),
      os: tally(rows, 'os'),
      sources: tally(rows, 'source', (v) => SOURCE_LABEL[v] ?? v),
      pages: tally(rows, 'path').slice(0, 10),
    })
  }),
)
