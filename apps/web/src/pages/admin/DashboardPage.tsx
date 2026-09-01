import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { DashboardStats } from '@wnc/shared'
import { BOARD_CATEGORY_LABEL, CONTACT_STATUS_LABEL } from '@wnc/shared'
import { api } from '../../lib/api'
import { formatDate, formatNumber } from '../../lib/format'
import { Badge, ErrorMessage, Loading, PageHeader } from '../../components/ui'

const STATUS_TONE = { NEW: 'red', IN_PROGRESS: 'amber', DONE: 'green' } as const

function StatCard({
  label,
  value,
  sub,
  icon,
  tone,
}: {
  label: string
  value: string
  sub?: string
  icon: string
  tone: string
}) {
  return (
    <div className="card p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
          {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
        </div>
        <div className={`grid h-11 w-11 place-items-center rounded-lg ${tone}`}>
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
          </svg>
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api<DashboardStats>('/dashboard/stats', { auth: true })
      .then(setStats)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Loading />
  if (error) return <ErrorMessage message={error} />
  if (!stats) return null

  // 문의 상태 분포는 최근 목록이 아닌 전체 집계 기준으로 계산한다.
  const contactPie = [
    { name: '신규', value: stats.newContacts, color: '#ef4444' },
    { name: '처리 완료 외', value: Math.max(0, stats.totalContacts - stats.newContacts), color: '#22c55e' },
  ].filter((d) => d.value > 0)

  const chartData = stats.trend.map((t) => ({
    ...t,
    label: t.date.slice(5).replace('-', '/'),
  }))

  return (
    <>
      <PageHeader title="대시보드" description="사이트 운영 현황을 한눈에 확인하세요." />

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="전체 게시글"
          value={formatNumber(stats.totalPosts)}
          sub={`공개 ${stats.publishedPosts}건 · 비공개 ${stats.totalPosts - stats.publishedPosts}건`}
          tone="bg-blue-50 text-blue-600"
          icon="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
        <StatCard
          label="총 조회수"
          value={formatNumber(stats.totalViews)}
          sub="전체 게시글 누적"
          tone="bg-violet-50 text-violet-600"
          icon="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
        />
        <StatCard
          label="등록 제품"
          value={formatNumber(stats.totalProducts)}
          sub={`공개 ${stats.publishedProducts}건 · 카테고리 ${stats.totalCategories}개`}
          tone="bg-amber-50 text-amber-600"
          icon="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
        />
        <StatCard
          label="전체 문의"
          value={formatNumber(stats.totalContacts)}
          sub="누적 접수 건수"
          tone="bg-emerald-50 text-emerald-600"
          icon="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
        <StatCard
          label="미처리 문의"
          value={formatNumber(stats.newContacts)}
          sub="확인이 필요합니다"
          tone="bg-red-50 text-red-600"
          icon="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-2">
          <h2 className="font-semibold text-slate-900">최근 14일 등록 추이</h2>
          <div className="mt-6 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gPosts" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gContacts" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }}
                  labelStyle={{ color: '#0f172a', fontWeight: 600 }}
                />
                <Legend wrapperStyle={{ fontSize: 13 }} />
                <Area
                  type="monotone"
                  dataKey="posts"
                  name="게시글"
                  stroke="#2563eb"
                  strokeWidth={2}
                  fill="url(#gPosts)"
                />
                <Area
                  type="monotone"
                  dataKey="contacts"
                  name="문의"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#gContacts)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="font-semibold text-slate-900">문의 처리 현황</h2>
          {contactPie.length === 0 ? (
            <p className="py-20 text-center text-sm text-slate-500">접수된 문의가 없습니다.</p>
          ) : (
            <div className="mt-6 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={contactPie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                    {contactPie.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }} />
                  <Legend wrapperStyle={{ fontSize: 13 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <h2 className="font-semibold text-slate-900">최근 게시글</h2>
            <Link to="/admin/posts" className="text-sm font-medium text-brand-600 hover:text-brand-700">
              전체 보기
            </Link>
          </div>
          {stats.recentPosts.length === 0 ? (
            <p className="px-6 py-12 text-center text-sm text-slate-500">게시글이 없습니다.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {stats.recentPosts.map((p) => (
                <li key={p.id}>
                  <Link to={`/admin/posts/${p.id}`} className="flex items-center gap-3 px-6 py-3.5 hover:bg-slate-50">
                    <Badge tone="blue">{BOARD_CATEGORY_LABEL[p.category]}</Badge>
                    <span className="flex-1 truncate text-sm text-slate-900">{p.title}</span>
                    {!p.published && <Badge tone="slate">비공개</Badge>}
                    <span className="shrink-0 text-xs text-slate-500">{formatDate(p.createdAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <h2 className="font-semibold text-slate-900">최근 문의</h2>
            <Link to="/admin/contacts" className="text-sm font-medium text-brand-600 hover:text-brand-700">
              전체 보기
            </Link>
          </div>
          {stats.recentContacts.length === 0 ? (
            <p className="px-6 py-12 text-center text-sm text-slate-500">문의가 없습니다.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {stats.recentContacts.map((c) => (
                <li key={c.id} className="flex items-center gap-3 px-6 py-3.5">
                  <Badge tone={STATUS_TONE[c.status]}>{CONTACT_STATUS_LABEL[c.status]}</Badge>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {c.name}
                      {c.company && <span className="ml-1.5 text-slate-500">· {c.company}</span>}
                    </p>
                    <p className="truncate text-xs text-slate-500">{c.message}</p>
                  </div>
                  <span className="shrink-0 text-xs text-slate-500">{formatDate(c.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  )
}
