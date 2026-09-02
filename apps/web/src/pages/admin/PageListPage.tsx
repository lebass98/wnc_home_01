import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type {
  PageListItem,
  PageSearchField,
  PageSort,
  PageStatusFilter,
  Paginated,
} from '@wnc/shared'
import { PAGE_SORT_LABEL } from '@wnc/shared'
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
} from '../../components/ui'

const ICON = {
  view: 'M2.5 12S5.5 5.5 12 5.5 21.5 12 21.5 12 18.5 18.5 12 18.5 2.5 12 2.5 12z M12 14.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z',
  edit: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.586-9.414a2 2 0 112.828 2.828L11.828 15.9 8 16.9l1-3.828 8.414-8.486z',
  trash: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M4 7h16M10 4h4a1 1 0 011 1v2H9V5a1 1 0 011-1z',
}

const PAGE_SIZES = [20, 50, 100]

export default function PageListPage() {
  const navigate = useNavigate()

  // --- 조회 조건 ---
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [status, setStatus] = useState<PageStatusFilter>('all')
  const [sort, setSort] = useState<PageSort>('latest')
  const [field, setField] = useState<PageSearchField>('all')
  const [keyword, setKeyword] = useState('')
  const [q, setQ] = useState('')

  const [data, setData] = useState<Paginated<PageListItem> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // --- 선택 ---
  const [selected, setSelected] = useState<number[]>([])
  const [working, setWorking] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    api<Paginated<PageListItem>>(
      `/pages${qs({ page, pageSize, status, sort, field, q: q || undefined, includeDrafts: 1 })}`,
      { auth: true },
    )
      .then((res) => {
        setData(res)
        // 목록이 바뀌면 사라진 항목의 선택은 버린다.
        setSelected((prev) => prev.filter((id) => res.items.some((p) => p.id === id)))
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [page, pageSize, status, sort, field, q])

  useEffect(load, [load])

  const items = data?.items ?? []
  const allChecked = items.length > 0 && selected.length === items.length

  function toggle(id: number) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]))
  }

  /** 선택한 페이지들의 발행 상태를 한 번에 바꾼다. */
  async function handleBulk(published: boolean) {
    if (selected.length === 0) return
    if (!confirm(`선택한 ${selected.length}개 페이지를 ${published ? '발행' : '미발행'} 처리할까요?`)) return
    setWorking(true)
    try {
      await api('/pages/bulk', { method: 'PATCH', body: { ids: selected, published }, auth: true })
      setSelected([])
      load()
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setWorking(false)
    }
  }

  async function handleDelete(item: PageListItem) {
    if (!confirm(`'${item.title}' 페이지를 삭제할까요?\n버전 기록까지 함께 지워지며 복구할 수 없습니다.`)) return
    try {
      await api(`/pages/${item.id}`, { method: 'DELETE', auth: true })
      load()
    } catch (e) {
      alert((e as Error).message)
    }
  }

  /** 조회 조건을 바꾸면 항상 1페이지로 돌아간다. */
  function reset<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v)
      setPage(1)
    }
  }

  return (
    <>
      <PageHeader
        title="페이지 관리"
        description="정적 페이지를 만들고 발행 상태와 버전을 관리합니다."
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={load}
              className="grid h-10 w-10 place-items-center rounded-lg border border-slate-300 text-slate-500 transition hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-700"
              aria-label="목록 새로고침"
              title="새로고침"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 4v5h5M20 20v-5h-5M20 9a8 8 0 00-14.9-2M4 15a8 8 0 0014.9 2"
                />
              </svg>
            </button>
            <Link to="/admin/pages/new" className="btn-primary">
              + 페이지 추가
            </Link>
          </div>
        }
      />

      {/* 검색 */}
      <div className="card mb-4 p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setQ(keyword.trim())
            setPage(1)
          }}
          className="flex flex-col gap-2 sm:flex-row"
        >
          <select
            value={field}
            onChange={(e) => reset(setField)(e.target.value as PageSearchField)}
            className="select sm:w-32"
            aria-label="검색 범위"
          >
            <option value="all">전체</option>
            <option value="title">제목</option>
            <option value="slug">슬러그</option>
          </select>
          <input
            type="search"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="제목 또는 슬러그로 검색..."
            className="input flex-1"
          />
          <button type="submit" className="btn-primary shrink-0">
            검색
          </button>
        </form>
      </div>

      {/* 개수 · 필터 */}
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          총 <span className="font-semibold text-slate-900 dark:text-slate-100">{data?.total ?? 0}</span>개
        </p>
        <div className="flex flex-wrap gap-2">
          <select
            value={status}
            onChange={(e) => reset(setStatus)(e.target.value as PageStatusFilter)}
            className="select w-auto"
            aria-label="발행 상태"
          >
            <option value="all">전체</option>
            <option value="published">발행</option>
            <option value="draft">미발행</option>
          </select>
          <select
            value={sort}
            onChange={(e) => reset(setSort)(e.target.value as PageSort)}
            className="select w-auto"
            aria-label="정렬"
          >
            {(Object.keys(PAGE_SORT_LABEL) as PageSort[]).map((s) => (
              <option key={s} value={s}>
                {PAGE_SORT_LABEL[s]}
              </option>
            ))}
          </select>
          <select
            value={pageSize}
            onChange={(e) => reset(setPageSize)(Number(e.target.value))}
            className="select w-auto"
            aria-label="페이지당 개수"
          >
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>
                {n}개
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
        <span className="text-sm text-slate-500 dark:text-slate-400">상태 변경:</span>
        <button
          type="button"
          onClick={() => handleBulk(true)}
          disabled={selected.length === 0 || working}
          className="btn bg-green-600 px-3 py-1.5 text-white hover:bg-green-700 focus:ring-green-500"
        >
          일괄 발행
        </button>
        <button
          type="button"
          onClick={() => handleBulk(false)}
          disabled={selected.length === 0 || working}
          className="btn bg-slate-500 px-3 py-1.5 text-white hover:bg-slate-600 focus:ring-slate-400"
        >
          일괄 미발행
        </button>
      </div>

      {error && <div className="mb-4"><ErrorMessage message={error} /></div>}

      <div className="card">
        {loading ? (
          <Loading />
        ) : items.length === 0 ? (
          <EmptyState label="페이지가 없습니다. 오른쪽 위 '페이지 추가'로 첫 페이지를 만들어 보세요." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[60rem] text-sm">
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
                  <th className="px-4 py-3">제목</th>
                  <th className="px-4 py-3">슬러그</th>
                  <th className="px-4 py-3">발행</th>
                  <th className="px-4 py-3">버전</th>
                  <th className="px-4 py-3">생성일</th>
                  <th className="px-4 py-3">발행일시</th>
                  <th className="px-4 py-3 text-right">작업</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.includes(item.id)}
                        onChange={() => toggle(item.id)}
                        className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                        aria-label={`${item.title} 선택`}
                      />
                    </td>
                    <td className="max-w-xs px-4 py-3">
                      <Link
                        to={`/admin/pages/${item.id}/detail`}
                        className="block truncate font-medium text-slate-900 hover:text-brand-600 dark:text-slate-100"
                      >
                        {item.title}
                      </Link>
                      <span className="text-xs text-slate-400">/page/{item.slug}</span>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-slate-600 dark:text-slate-400">{item.slug}</td>
                    <td className="px-4 py-3">
                      {item.published ? <Badge tone="green">발행</Badge> : <Badge tone="slate">미발행</Badge>}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">v{item.version}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-400">
                      {formatStamp(item.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-400">
                      {formatStamp(item.publishedAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <RowMenu
                        items={[
                          { label: '상세보기', icon: ICON.view, onClick: () => navigate(`/admin/pages/${item.id}/detail`) },
                          { label: '수정', icon: ICON.edit, onClick: () => navigate(`/admin/pages/${item.id}`) },
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
