import { useCallback, useEffect, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { SiteStats, StatCount } from '@wnc/shared'
import { api, qs } from '../../lib/api'
import { DateRangePicker } from '../../components/DatePicker'
import { ErrorMessage, Loading, PageHeader } from '../../components/ui'

/**
 * 통계 — 홈페이지 방문을 여섯 갈래로 나눠 본다.
 * 값은 방문할 때마다 쌓이는 기록(Visit)에서 오고, 관리자 화면은 세지 않는다.
 */

/** 그래프에 쓰는 색 — 앞에서부터 돌려 쓴다. */
const COLORS = ['#2563eb', '#7dbbbd', '#f59e0b', '#8b5cf6', '#ef4444', '#10b981', '#64748b']

/** 오늘부터 n일 전 날짜 (yyyy-MM-dd) */
function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 카드 한 장 */
function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="card p-5">
      <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">{title}</h2>
      {hint && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

/** 값이 하나도 없을 때 */
function NoData() {
  return (
    <div className="grid h-56 place-items-center text-sm text-slate-400 dark:text-slate-500">
      아직 쌓인 기록이 없습니다.
    </div>
  )
}

/** 도넛 + 순위 표 — 기기·브라우저·운영체제·유입경로가 함께 쓴다. */
function Breakdown({ items }: { items: StatCount[] }) {
  if (items.length === 0) return <NoData />
  const total = items.reduce((sum, i) => sum + i.count, 0)

  return (
    <div className="grid gap-4 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] sm:items-center">
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={items} dataKey="count" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={2}>
              {items.map((item, i) => (
                <Cell key={item.name} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v: number) => `${v}회`} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <ul className="space-y-2">
        {items.map((item, i) => {
          const share = total > 0 ? Math.round((item.count / total) * 100) : 0
          return (
            <li key={item.name}>
              <div className="flex items-center gap-2 text-sm">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="min-w-0 flex-1 truncate text-slate-700 dark:text-slate-300">{item.name}</span>
                <span className="tabular-nums text-slate-500 dark:text-slate-400">
                  {item.count.toLocaleString()}회 · {share}%
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                <div className="h-full rounded-full" style={{ width: `${share}%`, background: COLORS[i % COLORS.length] }} />
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default function StatsPage() {
  const [from, setFrom] = useState(daysAgo(29))
  const [to, setTo] = useState(daysAgo(0))
  const [data, setData] = useState<SiteStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    api<SiteStats>(`/stats${qs({ from, to })}`, { auth: true })
      .then((d) => {
        setData(d)
        setError('')
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [from, to])

  useEffect(load, [load])

  /** 기간 단추 — 자주 쓰는 범위를 한 번에 고른다. */
  const quick = (days: number) => {
    setFrom(daysAgo(days - 1))
    setTo(daysAgo(0))
  }

  const summary = data?.summary

  return (
    <>
      <PageHeader
        title="통계"
        description="홈페이지 방문을 날짜·시간대·기기·브라우저·운영체제·유입경로로 나눠 봅니다. 관리자 화면은 세지 않습니다."
      />

      {/* 기간 고르기 */}
      <div className="card mb-4 flex flex-col gap-3 p-4 lg:flex-row lg:items-end lg:justify-between">
        <DateRangePicker start={from} end={to} onChange={(s, e) => { setFrom(s); setTo(e) }} className="lg:max-w-xl" />
        <div className="flex flex-wrap gap-1.5">
          {[
            { label: '오늘', days: 1 },
            { label: '7일', days: 7 },
            { label: '30일', days: 30 },
            { label: '90일', days: 90 },
          ].map((q) => (
            <button key={q.label} type="button" onClick={() => quick(q.days)} className="btn-secondary px-3 py-2 text-xs">
              {q.label}
            </button>
          ))}
        </div>
      </div>

      {error && <ErrorMessage message={error} />}

      {loading || !data ? (
        <Loading />
      ) : (
        <div className="space-y-4">
          {/* 요약 */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: '조회수', value: summary!.views.toLocaleString(), unit: '회' },
              { label: '방문자', value: summary!.visitors.toLocaleString(), unit: '명' },
              { label: '하루 평균', value: summary!.dailyAverage.toLocaleString(), unit: '회' },
              {
                label: '가장 붐빈 시간',
                value: summary!.busiestHour === null ? '-' : `${summary!.busiestHour}`,
                unit: summary!.busiestHour === null ? '' : '시',
              },
            ].map((s) => (
              <div key={s.label} className="card p-5">
                <p className="text-sm text-slate-500 dark:text-slate-400">{s.label}</p>
                <p className="mt-1.5 text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
                  {s.value}
                  <span className="ml-1 text-sm font-normal text-slate-500 dark:text-slate-400">{s.unit}</span>
                </p>
              </div>
            ))}
          </div>

          {/* 1. 일별 트렌드 */}
          <Card title="일별 트렌드" hint="날짜마다 조회수와 방문자 수입니다.">
            {data.daily.length === 0 ? (
              <NoData />
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.daily} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="date" tickFormatter={(v: string) => v.slice(5)} fontSize={12} stroke="#94a3b8" />
                    <YAxis allowDecimals={false} fontSize={12} stroke="#94a3b8" />
                    <Tooltip formatter={(v: number, name) => [`${v}${name === '방문자' ? '명' : '회'}`, name]} />
                    <Legend />
                    <Line type="monotone" dataKey="views" name="조회수" stroke={COLORS[0]} strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="visitors" name="방문자" stroke={COLORS[1]} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          {/* 2. 시간대별 분포 */}
          <Card title="시간대별 분포" hint="하루 24시간 중 언제 많이 보는지입니다.">
            {data.summary.views === 0 ? (
              <NoData />
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.hourly} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="hour" tickFormatter={(v: number) => `${v}시`} fontSize={12} stroke="#94a3b8" interval={1} />
                    <YAxis allowDecimals={false} fontSize={12} stroke="#94a3b8" />
                    <Tooltip formatter={(v: number) => `${v}회`} labelFormatter={(v) => `${v}시`} />
                    <Bar dataKey="views" name="조회수" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          {/* 3~6. 나눠 보기 */}
          <div className="grid gap-4 xl:grid-cols-2">
            <Card title="디바이스별 접속통계" hint="PC·모바일·태블릿 비율입니다.">
              <Breakdown items={data.devices} />
            </Card>
            <Card title="브라우저별 접속통계" hint="크롬·사파리 등 어떤 브라우저로 들어오는지입니다.">
              <Breakdown items={data.browsers} />
            </Card>
            <Card title="운영체제별 접속통계" hint="윈도우·맥·안드로이드·iOS 비율입니다.">
              <Breakdown items={data.os} />
            </Card>
            <Card title="유입경로별 접속통계" hint="직접 들어왔는지, 검색·SNS·외부 링크를 거쳤는지입니다.">
              <Breakdown items={data.sources} />
            </Card>
          </div>

          {/* 많이 본 화면 */}
          <Card title="많이 본 화면" hint="기간 안에서 조회수가 높은 순서입니다.">
            {data.pages.length === 0 ? (
              <NoData />
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                {data.pages.map((p, i) => (
                  <li key={p.name} className="flex items-center gap-3 py-2.5 text-sm">
                    <span className="w-6 shrink-0 tabular-nums text-slate-400">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate text-slate-700 dark:text-slate-300">{p.name}</span>
                    <span className="tabular-nums text-slate-500 dark:text-slate-400">{p.count.toLocaleString()}회</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </>
  )
}
