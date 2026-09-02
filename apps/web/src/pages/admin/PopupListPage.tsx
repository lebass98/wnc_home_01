import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { Paginated, PopupListItem, PopupSort, PopupStatus } from '@wnc/shared'
import {
  POPUP_PLACEMENT_LABEL,
  POPUP_SORT_LABEL,
  POPUP_STATUS_LABEL,
  POPUP_STATUSES,
  POPUP_WINDOW_LABEL,
} from '@wnc/shared'
import { api, qs } from '../../lib/api'
import { formatStamp } from '../../lib/format'
import {
  Badge,
  EmptyState,
  ErrorMessage,
  Loading,
  PageHeader,
  Pagination,
  RowMenu,
  ToggleSwitch,
} from '../../components/ui'

const ICON = {
  edit: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.586-9.414a2 2 0 112.828 2.828L11.828 15.9 8 16.9l1-3.828 8.414-8.486z',
  trash: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M4 7h16M10 4h4a1 1 0 011 1v2H9V5a1 1 0 011-1z',
}

const PAGE_SIZES = [10, 20, 30, 50, 100]

/** 상태별 배지 색 — 진행중만 눈에 띄게 한다. */
const STATUS_TONE: Record<PopupStatus, 'slate' | 'blue' | 'green' | 'amber' | 'red'> = {
  waiting: 'amber',
  ongoing: 'green',
  ended: 'slate',
  stopped: 'red',
}

/** yyyy-MM-dd — <input type="date"> 에 넣는 형식 */
function dateInput(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export default function PopupListPage() {
  const navigate = useNavigate()

  // --- 검색 조건 (검색 버튼을 눌러야 적용된다) ---
  const [statusDraft, setStatusDraft] = useState<PopupStatus[]>([])
  const [fromDraft, setFromDraft] = useState('')
  const [toDraft, setToDraft] = useState('')
  const [nameDraft, setNameDraft] = useState('')

  // --- 실제 조회에 쓰는 조건 ---
  const [status, setStatus] = useState<PopupStatus[]>([])
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [q, setQ] = useState('')

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [sort, setSort] = useState<PopupSort>('latest')

  const [data, setData] = useState<Paginated<PopupListItem> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [selected, setSelected] = useState<number[]>([])
  const [working, setWorking] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    api<Paginated<PopupListItem>>(
      `/popups${qs({
        page,
        pageSize,
        sort,
        q: q || undefined,
        status: status.length > 0 ? status.join(',') : undefined,
        from: from || undefined,
        to: to || undefined,
      })}`,
      { auth: true },
    )
      .then((res) => {
        setData(res)
        // 목록이 바뀌면 사라진 항목의 선택은 버린다.
        setSelected((prev) => prev.filter((id) => res.items.some((p) => p.id === id)))
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [page, pageSize, sort, q, status, from, to])

  useEffect(load, [load])

  const items = data?.items ?? []
  const allChecked = items.length > 0 && selected.length === items.length

  function toggleSelect(id: number) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]))
  }

  /** 검색 조건을 확정한다. 항상 1페이지부터 다시 본다. */
  function handleSearch() {
    setStatus(statusDraft)
    setFrom(fromDraft)
    setTo(toDraft)
    setQ(nameDraft.trim())
    setPage(1)
  }

  function resetSearch() {
    setStatusDraft([])
    setFromDraft('')
    setToDraft('')
    setNameDraft('')
    setStatus([])
    setFrom('')
    setTo('')
    setQ('')
    setPage(1)
  }

  /** 게시기간 빠른 선택 — 오늘 / 이번주 / 이번달 / 전체 */
  function quickRange(kind: 'today' | 'week' | 'month' | 'all') {
    if (kind === 'all') {
      setFromDraft('')
      setToDraft('')
      return
    }
    const now = new Date()
    if (kind === 'today') {
      setFromDraft(dateInput(now))
      setToDraft(dateInput(now))
      return
    }
    if (kind === 'week') {
      // 일요일 시작 기준으로 이번 주의 첫날과 마지막 날을 구한다.
      const start = new Date(now)
      start.setDate(now.getDate() - now.getDay())
      const end = new Date(start)
      end.setDate(start.getDate() + 6)
      setFromDraft(dateInput(start))
      setToDraft(dateInput(end))
      return
    }
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    setFromDraft(dateInput(start))
    setToDraft(dateInput(end))
  }

  /** 목록에서 바로 사용여부를 켜고 끈다. */
  async function handleToggleEnabled(item: PopupListItem, enabled: boolean) {
    try {
      await api(`/popups/${item.id}/enabled`, { method: 'PATCH', body: { enabled }, auth: true })
      load()
    } catch (e) {
      alert((e as Error).message)
    }
  }

  async function handleDelete(item: PopupListItem) {
    if (!confirm(`'${item.name}' 팝업을 삭제할까요?\n삭제하면 되돌릴 수 없습니다.`)) return
    try {
      await api(`/popups/${item.id}`, { method: 'DELETE', auth: true })
      load()
    } catch (e) {
      alert((e as Error).message)
    }
  }

  async function handleBulkDelete() {
    if (selected.length === 0) return
    if (!confirm(`선택한 ${selected.length}개 팝업을 삭제할까요?\n삭제하면 되돌릴 수 없습니다.`)) return
    setWorking(true)
    try {
      await api('/popups/bulk-delete', { method: 'POST', body: { ids: selected }, auth: true })
      setSelected([])
      load()
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setWorking(false)
    }
  }

  return (
    <>
      <PageHeader
        title="팝업 관리"
        description="홈페이지에 띄울 팝업을 만들고 게시기간과 노출 여부를 관리합니다."
        action={
          <Link to="/admin/popups/new" className="btn-primary">
            + 팝업 등록
          </Link>
        }
      />

      {/* 검색 */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleSearch()
        }}
        className="card mb-4 p-5"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <div className="flex-1 space-y-3">
            {/* 사용여부 */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <span className="w-24 shrink-0 text-sm font-medium text-slate-700 dark:text-slate-300">
                진행 상태
              </span>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={statusDraft.length === 0}
                    onChange={() => setStatusDraft([])}
                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  전체
                </label>
                {POPUP_STATUSES.map((s) => (
                  <label
                    key={s}
                    className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-300"
                  >
                    <input
                      type="checkbox"
                      checked={statusDraft.includes(s)}
                      onChange={() =>
                        setStatusDraft((prev) =>
                          prev.includes(s) ? prev.filter((v) => v !== s) : [...prev, s],
                        )
                      }
                      className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                    {POPUP_STATUS_LABEL[s]}
                  </label>
                ))}
              </div>
            </div>

            {/* 게시기간 */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <span className="w-24 shrink-0 text-sm font-medium text-slate-700 dark:text-slate-300">
                게시기간
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="date"
                  value={fromDraft}
                  onChange={(e) => setFromDraft(e.target.value)}
                  className="input w-40"
                  aria-label="게시기간 시작"
                />
                <span className="text-slate-400">~</span>
                <input
                  type="date"
                  value={toDraft}
                  onChange={(e) => setToDraft(e.target.value)}
                  className="input w-40"
                  aria-label="게시기간 종료"
                />
                <div className="flex gap-1">
                  {([
                    ['today', '오늘'],
                    ['week', '이번주'],
                    ['month', '이번달'],
                    ['all', '전체'],
                  ] as const).map(([kind, label]) => (
                    <button
                      key={kind}
                      type="button"
                      onClick={() => quickRange(kind)}
                      className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 팝업이름 */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <span className="w-24 shrink-0 text-sm font-medium text-slate-700 dark:text-slate-300">
                팝업이름
              </span>
              <input
                type="search"
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                placeholder="팝업 이름으로 검색..."
                className="input max-w-md"
              />
            </div>
          </div>

          <div className="flex gap-2 lg:w-40 lg:flex-col">
            {/* 초기화(btn-secondary)에는 테두리가 있어, 높이를 맞추려면 같은 두께의 투명 테두리가 필요하다. */}
            <button type="submit" className="btn-primary flex-1 border border-transparent">
              검색
            </button>
            <button type="button" onClick={resetSearch} className="btn-secondary flex-1">
              초기화
            </button>
          </div>
        </div>
      </form>

      {/* 개수 · 정렬 · 페이지당 개수 */}
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          검색결과 <span className="font-semibold text-slate-900 dark:text-slate-100">{items.length}</span>
          {' / '}총 <span className="font-semibold text-slate-900 dark:text-slate-100">{data?.total ?? 0}</span>건
        </p>
        <div className="flex flex-wrap gap-2">
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as PopupSort)
              setPage(1)
            }}
            className="select w-auto"
            aria-label="정렬"
          >
            {(Object.keys(POPUP_SORT_LABEL) as PopupSort[]).map((s) => (
              <option key={s} value={s}>
                {POPUP_SORT_LABEL[s]}
              </option>
            ))}
          </select>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value))
              setPage(1)
            }}
            className="select w-auto"
            aria-label="페이지당 개수"
          >
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>
                {n}개씩
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 일괄 처리 */}
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60">
        <span className="text-sm text-slate-600 dark:text-slate-400">
          <span className="font-semibold text-slate-900 dark:text-slate-100">{selected.length}</span>개 선택됨
        </span>
        <button
          type="button"
          onClick={handleBulkDelete}
          disabled={selected.length === 0 || working}
          className="btn-danger px-3 py-1.5"
        >
          선택 삭제
        </button>
      </div>

      {error && (
        <div className="mb-4">
          <ErrorMessage message={error} />
        </div>
      )}

      <div className="card">
        {loading ? (
          <Loading />
        ) : items.length === 0 ? (
          <EmptyState label="팝업이 없습니다. 오른쪽 위 '팝업 등록'으로 첫 팝업을 만들어 보세요." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[72rem] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400">
                  <th className="w-12 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allChecked}
                      onChange={(e) => setSelected(e.target.checked ? items.map((p) => p.id) : [])}
                      className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                      aria-label="전체 선택"
                    />
                  </th>
                  <th className="w-16 px-4 py-3">번호</th>
                  <th className="px-4 py-3">팝업이름</th>
                  <th className="px-4 py-3">팝업위치</th>
                  <th className="px-4 py-3">형태</th>
                  <th className="px-4 py-3">등록일</th>
                  <th className="px-4 py-3">시작일</th>
                  <th className="px-4 py-3">종료일</th>
                  <th className="px-4 py-3">상태</th>
                  <th className="px-4 py-3">사용</th>
                  <th className="px-4 py-3 text-right">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.includes(item.id)}
                        onChange={() => toggleSelect(item.id)}
                        className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                        aria-label={`${item.name} 선택`}
                      />
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{item.id}</td>
                    <td className="max-w-xs px-4 py-3">
                      <Link
                        to={`/admin/popups/${item.id}`}
                        className="block truncate font-medium text-slate-900 hover:text-brand-600 dark:text-slate-100"
                      >
                        {item.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      {item.placement === 'path'
                        ? item.placementPath
                        : POPUP_PLACEMENT_LABEL[item.placement]}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      {POPUP_WINDOW_LABEL[item.windowType]}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-400">
                      {formatStamp(item.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-400">
                      {formatStamp(item.startAt).slice(0, 10)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-400">
                      {formatStamp(item.endAt).slice(0, 10)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={STATUS_TONE[item.status]}>{POPUP_STATUS_LABEL[item.status]}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <ToggleSwitch
                        checked={item.enabled}
                        onChange={(v) => handleToggleEnabled(item, v)}
                        label={`${item.name} 사용여부`}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <RowMenu
                        items={[
                          { label: '수정', icon: ICON.edit, onClick: () => navigate(`/admin/popups/${item.id}`) },
                          { label: '삭제', icon: ICON.trash, danger: true, onClick: () => handleDelete(item) },
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} edges />}
    </>
  )
}
