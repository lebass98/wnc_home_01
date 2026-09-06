import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import type { ActivityActor, ActivityLog, ActivityLogType, Paginated } from '@wnc/shared'
import { ACTIVITY_LOG_TYPE_LABEL } from '@wnc/shared'
import { api, qs } from '../../lib/api'
import { formatDateTime } from '../../lib/format'
import { DateRangePicker } from '../../components/DatePicker'
import { Badge, EmptyState, ErrorMessage, Loading, PageHeader, Pagination } from '../../components/ui'

/**
 * 활동 로그 — 관리자가 한 모든 변경(등록·수정·삭제·설정·로그인)과 보안 이벤트를 조회한다.
 * 기록은 서버 미들웨어가 자동으로 남기므로 여기서는 보기·거르기·지우기만 한다.
 *
 * 위: 검색 상자 → 타입·행위자·기간 필터 → 검색/초기화
 * 아래: 건수·정렬·페이지 크기 → 선택 막대 → 표(펼치면 요청 요약) → 쪽 번호
 */

const TYPES: ActivityLogType[] = ['ADMIN', 'SYSTEM']
const TYPE_TONE: Record<ActivityLogType, 'blue' | 'amber'> = { ADMIN: 'blue', SYSTEM: 'amber' }
const PAGE_SIZES = [10, 20, 50, 100]

/** 기간 빠른 선택 — 오늘부터 며칠 전까지 */
const QUICK_RANGES: { label: string; days: number }[] = [
  { label: '오늘', days: 0 },
  { label: '1주일', days: 7 },
  { label: '1개월', days: 30 },
  { label: '3개월', days: 90 },
  { label: '6개월', days: 180 },
  { label: '1년', days: 365 },
]

/** <input type="datetime-local"> 이 받는 로컬 시각 문자열 */
function toLocalInput(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

interface Filters {
  q: string
  type: ActivityLogType | ''
  actorId: string
  from: string
  to: string
}
const EMPTY_FILTERS: Filters = { q: '', type: '', actorId: '', from: '', to: '' }

export default function ActivityLogPage() {
  // 입력 중인 값(draft)과 실제로 조회에 쓰는 값(filters)을 나눈다 — [검색]을 눌러야 반영된다.
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS)
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [sort, setSort] = useState<'desc' | 'asc'>('desc')
  const [pageSize, setPageSize] = useState(10)
  const [page, setPage] = useState(1)

  const [data, setData] = useState<Paginated<ActivityLog> | null>(null)
  const [actors, setActors] = useState<ActivityActor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    const toIso = (v: string) => (v ? new Date(v).toISOString() : undefined)
    api<Paginated<ActivityLog>>(
      `/activity-logs${qs({
        page,
        pageSize,
        sort,
        type: filters.type || undefined,
        q: filters.q || undefined,
        actorId: filters.actorId || undefined,
        from: toIso(filters.from),
        to: toIso(filters.to),
      })}`,
      { auth: true },
    )
      .then((res) => {
        setData(res)
        setSelected(new Set())
        setExpanded(new Set())
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [page, pageSize, sort, filters])

  useEffect(load, [load])
  useEffect(() => {
    api<ActivityActor[]>('/activity-logs/actors', { auth: true })
      .then(setActors)
      .catch(() => setActors([]))
  }, [data?.total])

  function search(e?: FormEvent) {
    e?.preventDefault()
    setPage(1)
    setFilters(draft)
  }
  function reset() {
    setDraft(EMPTY_FILTERS)
    setFilters(EMPTY_FILTERS)
    setPage(1)
  }
  function quickRange(days: number) {
    const to = new Date()
    const from = new Date()
    from.setDate(from.getDate() - days)
    from.setHours(0, 0, 0, 0)
    setDraft((d) => ({ ...d, from: toLocalInput(from), to: toLocalInput(to) }))
  }

  const items = data?.items ?? []
  const allChecked = items.length > 0 && items.every((l) => selected.has(l.id))
  const toggleAll = () => setSelected(allChecked ? new Set() : new Set(items.map((l) => l.id)))
  const toggleOne = (id: number) =>
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const toggleExpand = (id: number) =>
    setExpanded((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  async function deleteSelected() {
    if (selected.size === 0) return
    if (!confirm(`선택한 로그 ${selected.size}건을 지울까요? 지운 기록은 되돌릴 수 없습니다.`)) return
    setDeleting(true)
    try {
      await api('/activity-logs', { method: 'DELETE', body: { ids: [...selected] }, auth: true })
      load()
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setDeleting(false)
    }
  }

  const actorLabel = useMemo(() => {
    const m = new Map<number, string>()
    for (const a of actors) m.set(a.actorId, a.actorName || a.actorEmail)
    return m
  }, [actors])

  return (
    <>
      <PageHeader
        title="활동 로그"
        description="관리자가 한 등록·수정·삭제·설정·로그인과 보안 이벤트가 자동으로 남습니다."
        action={
          <button type="button" onClick={load} className="btn-secondary" aria-label="새로고침" title="새로고침">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M5.6 15A7 7 0 0018.4 9M18.4 9A7 7 0 005.6 15" />
            </svg>
          </button>
        }
      />

      {/* 필터 */}
      <form onSubmit={search} className="card p-5">
        <div className="flex gap-2">
          <select
            value={draft.type}
            onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value as ActivityLogType | '' }))}
            className="select w-36"
            aria-label="로그 타입"
          >
            <option value="">전체</option>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {ACTIVITY_LOG_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
          <input
            value={draft.q}
            onChange={(e) => setDraft((d) => ({ ...d, q: e.target.value }))}
            className="input flex-1"
            placeholder="설명 · 대상 · 행위자 · IP 로 검색"
          />
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-[6rem_1fr] sm:items-center">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">로그 타입</span>
          <div className="flex flex-wrap gap-4 text-sm">
            {(['', ...TYPES] as (ActivityLogType | '')[]).map((t) => (
              <label key={t || 'all'} className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="type"
                  checked={draft.type === t}
                  onChange={() => setDraft((d) => ({ ...d, type: t }))}
                  className="h-4 w-4 border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                {t ? ACTIVITY_LOG_TYPE_LABEL[t] : '전체'}
              </label>
            ))}
          </div>

          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">행위자</span>
          <select
            value={draft.actorId}
            onChange={(e) => setDraft((d) => ({ ...d, actorId: e.target.value }))}
            className="select w-full sm:w-64"
            aria-label="행위자"
          >
            <option value="">행위자 선택</option>
            {actors.map((a) => (
              <option key={a.actorId} value={a.actorId}>
                {a.actorName || a.actorEmail} ({a.count})
              </option>
            ))}
          </select>

          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">기간</span>
          <div className="flex flex-wrap items-center gap-3">
            {/* 팝업 관리의 게시기간과 같은 달력 — 시작·끝을 한 달력에서 고르고 [확인]으로 반영한다 */}
            <DateRangePicker
              start={draft.from}
              end={draft.to}
              onChange={(from, to) => setDraft((d) => ({ ...d, from, to }))}
              withTime
              startLabel="시작일시"
              endLabel="종료일시"
              className="w-full max-w-xl"
            />
            <div className="flex flex-wrap gap-1.5">
              {QUICK_RANGES.map((r) => (
                <button
                  key={r.label}
                  type="button"
                  onClick={() => quickRange(r.days)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-400 hover:text-slate-900 dark:border-slate-600 dark:text-slate-300"
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-center gap-2">
          <button type="submit" className="btn-primary px-6">
            검색
          </button>
          <button type="button" onClick={reset} className="btn-secondary px-6">
            초기화
          </button>
        </div>
      </form>

      {error && <ErrorMessage message={error} />}

      {/* 건수 · 정렬 · 페이지 크기 */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-700 dark:text-slate-300">
          총 <span className="font-semibold text-slate-900 dark:text-slate-100">{data?.total ?? 0}</span>건
        </p>
        <div className="flex gap-2">
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as 'desc' | 'asc')
              setPage(1)
            }}
            className="select w-28"
            aria-label="정렬"
          >
            <option value="desc">최신순</option>
            <option value="asc">오래된순</option>
          </select>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value))
              setPage(1)
            }}
            className="select w-24"
            aria-label="페이지 크기"
          >
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 선택 막대 */}
      <div className="mt-3 flex items-center justify-between rounded-lg bg-slate-100 px-4 py-3 text-sm dark:bg-slate-800">
        <span className="font-medium text-slate-700 dark:text-slate-300">{selected.size}건 선택됨</span>
        <button
          type="button"
          onClick={deleteSelected}
          disabled={selected.size === 0 || deleting}
          className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-default disabled:opacity-50 dark:border-red-900/50 dark:bg-slate-900 dark:hover:bg-red-950/40"
        >
          {deleting ? '삭제 중...' : '선택 삭제'}
        </button>
      </div>

      {/* 표 */}
      <div className="card mt-3 overflow-hidden">
        {loading ? (
          <Loading />
        ) : items.length === 0 ? (
          <EmptyState label="조건에 맞는 로그가 없습니다." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[64rem] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400">
                  <th className="w-8 px-3 py-3" />
                  <th className="w-10 px-2 py-3">
                    <input type="checkbox" checked={allChecked} onChange={toggleAll} aria-label="전체 선택" className="h-4 w-4 rounded border-slate-300" />
                  </th>
                  <th className="px-3 py-3">#</th>
                  <th className="px-3 py-3">타입</th>
                  <th className="px-3 py-3">액션</th>
                  <th className="px-3 py-3">설명</th>
                  <th className="px-3 py-3">대상</th>
                  <th className="px-3 py-3">행위자</th>
                  <th className="px-3 py-3">IP주소</th>
                  <th className="px-3 py-3">일시</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {items.map((log) => {
                  const open = expanded.has(log.id)
                  return (
                    <LogRow
                      key={log.id}
                      log={log}
                      open={open}
                      checked={selected.has(log.id)}
                      actorName={log.actorName || (log.actorId ? actorLabel.get(log.actorId) : undefined) || null}
                      onToggle={() => toggleOne(log.id)}
                      onExpand={() => toggleExpand(log.id)}
                    />
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {data && (
        <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} total={data.total} pageSize={data.pageSize} />
      )}
    </>
  )
}

/** 로그 한 줄 — 요청 요약(detail)이 있으면 왼쪽 화살표로 펼친다. */
function LogRow({
  log,
  open,
  checked,
  actorName,
  onToggle,
  onExpand,
}: {
  log: ActivityLog
  open: boolean
  checked: boolean
  actorName: string | null
  onToggle: () => void
  onExpand: () => void
}) {
  const hasDetail = Boolean(log.detail)
  return (
    <>
      <tr className={`align-top ${checked ? 'bg-brand-50/60 dark:bg-brand-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-700/40'}`}>
        <td className="px-3 py-3">
          {hasDetail && (
            <button
              type="button"
              onClick={onExpand}
              aria-expanded={open}
              aria-label={open ? '요약 접기' : '요약 펼치기'}
              className="grid h-6 w-6 place-items-center rounded text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700"
            >
              <svg className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" />
              </svg>
            </button>
          )}
        </td>
        <td className="px-2 py-3">
          <input type="checkbox" checked={checked} onChange={onToggle} aria-label={`${log.id}번 선택`} className="h-4 w-4 rounded border-slate-300" />
        </td>
        <td className="px-3 py-3 tabular-nums text-slate-500 dark:text-slate-400">{log.id}</td>
        <td className="px-3 py-3">
          <Badge tone={TYPE_TONE[log.type]}>{ACTIVITY_LOG_TYPE_LABEL[log.type]}</Badge>
        </td>
        <td className="whitespace-nowrap px-3 py-3 font-semibold text-slate-900 dark:text-slate-100">{log.action}</td>
        <td className="max-w-md px-3 py-3 text-slate-700 dark:text-slate-300">{log.description}</td>
        <td className="whitespace-nowrap px-3 py-3 text-slate-600 dark:text-slate-400">{log.target ?? '-'}</td>
        <td className="px-3 py-3">
          {actorName || log.actorEmail ? (
            <div className="flex items-start gap-1.5">
              <svg className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM5 20a7 7 0 0114 0" />
              </svg>
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">{actorName ?? '-'}</p>
                {log.actorEmail && <p className="text-xs text-slate-500 dark:text-slate-400">({log.actorEmail})</p>}
              </div>
            </div>
          ) : (
            <span className="text-slate-400">-</span>
          )}
        </td>
        <td className="whitespace-nowrap px-3 py-3 font-mono text-[13px] text-slate-700 dark:text-slate-300">{log.ip || '-'}</td>
        <td className="whitespace-nowrap px-3 py-3 tabular-nums text-slate-600 dark:text-slate-400">{formatDateTime(log.createdAt)}</td>
      </tr>
      {open && hasDetail && (
        <tr className="bg-slate-50 dark:bg-slate-900/40">
          <td colSpan={10} className="px-6 py-3">
            <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-lg bg-slate-900 p-3 text-xs leading-relaxed text-slate-100">
              {JSON.stringify(log.detail, null, 2)}
            </pre>
          </td>
        </tr>
      )}
    </>
  )
}
