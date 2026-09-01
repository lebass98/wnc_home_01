import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { asyncHandler } from '../lib/handler.js'
import { requireAuth } from '../lib/auth.js'

export const dashboardRouter = Router()

const TREND_DAYS = 14

/** YYYY-MM-DD (로컬 기준) */
function dateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

dashboardRouter.get(
  '/stats',
  requireAuth,
  asyncHandler(async (_req, res) => {
    const since = new Date()
    since.setHours(0, 0, 0, 0)
    since.setDate(since.getDate() - (TREND_DAYS - 1))

    const [
      totalPosts,
      publishedPosts,
      totalContacts,
      newContacts,
      viewsAgg,
      trendPosts,
      trendContacts,
      recentPosts,
      recentContacts,
    ] = await Promise.all([
      prisma.post.count(),
      prisma.post.count({ where: { published: true } }),
      prisma.contact.count(),
      prisma.contact.count({ where: { status: 'NEW' } }),
      prisma.post.aggregate({ _sum: { views: true } }),
      prisma.post.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
      prisma.contact.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
      prisma.post.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { author: { select: { name: true } } },
      }),
      prisma.contact.findMany({ take: 5, orderBy: { createdAt: 'desc' } }),
    ])

    // 최근 14일을 0으로 채운 뒤 실제 건수를 누적해 빈 날도 그래프에 나오게 한다.
    const buckets = new Map<string, { date: string; posts: number; contacts: number }>()
    for (let i = 0; i < TREND_DAYS; i++) {
      const d = new Date(since)
      d.setDate(since.getDate() + i)
      const key = dateKey(d)
      buckets.set(key, { date: key, posts: 0, contacts: 0 })
    }
    for (const p of trendPosts) {
      const b = buckets.get(dateKey(p.createdAt))
      if (b) b.posts += 1
    }
    for (const c of trendContacts) {
      const b = buckets.get(dateKey(c.createdAt))
      if (b) b.contacts += 1
    }

    res.json({
      totalPosts,
      publishedPosts,
      totalContacts,
      newContacts,
      totalViews: viewsAgg._sum.views ?? 0,
      trend: [...buckets.values()],
      recentPosts: recentPosts.map((p) => ({
        id: p.id,
        category: p.category,
        title: p.title,
        published: p.published,
        views: p.views,
        authorName: p.author.name,
        createdAt: p.createdAt.toISOString(),
      })),
      recentContacts: recentContacts.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        company: c.company,
        message: c.message,
        status: c.status,
        memo: c.memo,
        createdAt: c.createdAt.toISOString(),
      })),
    })
  }),
)
