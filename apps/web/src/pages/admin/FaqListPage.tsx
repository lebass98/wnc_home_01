import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { Faq, Paginated } from '@wnc/shared'
import { api, qs } from '../../lib/api'
import { formatStamp } from '../../lib/format'
import FaqCategoryManager from '../../components/FaqCategoryManager'
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

export default function FaqListPage() {
  const navigate = useNavigate()

  const [keyword, setKeyword] = useState('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const [data, setData] = useState<Paginated<Faq> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [selected, setSelected] = useState<number[]>([])
  const [working, setWorking] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    api<Paginated<Faq>>(`/faqs/admin${qs({ page, pageSize, q: q || undefined })}`, { auth: true })
      .then((res) => {
        setData(res)
        // 목록이 바뀌면 사라진 항목의 선택은 버린다.
        setSelected((prev) => prev.filter((id) => res.items.some((f) => f.id === id)))
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [page, pageSize, q])

  useEffect(load, [load])

  const items = data?.items ?? []
  const allChecked = items.length > 0 && selected.length === items.length

  function toggleSelect(id: number) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]))
  }

  /** 목록에서 바로 공개 여부를 켜고 끈다. */
  async function handleTogglePublished(item: Faq, published: boolean) {
    try {
      await api(`/faqs/${item.id}/published`, { method: 'PATCH', body: { published }, auth: true })
      load()
    } catch (e) {
      alert((e as Error).message)
    }
  }

  async function handleDelete(item: Faq) {
    if (!confirm(`'${item.question}' 질문을 삭제할까요?\n삭제하면 되돌릴 수 없습니다.`)) return
    try {
      await api(`/faqs/${item.id}`, { method: 'DELETE', auth: true })
      load()
    } catch (e) {
      alert((e as Error).message)
    }
  }

  async function handleBulkDelete() {
    if (selected.length === 0) return
    if (!confirm(`선택한 ${selected.length}개 질문을 삭제할까요?\n삭제하면 되돌릴 수 없습니다.`)) return
    setWorking(true)
    try {
      await api('/faqs/bulk-delete', { method: 'POST', body: { ids: selected }, auth: true })
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
        title="자주 묻는 질문"
        description="홈페이지 문의하기 › 자주 묻는 질문에 보여 줄 질문과 답변을 관리합니다. 순서가 작을수록 위에 옵니다."
        action={
          <Link to="/admin/faqs/new" className="btn-primary">
            + 질문 등록
          </Link>
        }
      />

      {/* 분류 관리 — 질문 작성 시 여기서 등록한 분류 중에서 고른다. */}
      <div className="mb-4">
        <FaqCategoryManager onChange={load} />
      </div>

      {/* 검색 */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          setQ(keyword.trim())
          setPage(1)
        }}
        className="card mb-4 flex flex-col gap-3 p-5 sm:flex-row sm:items-center"
      >
        <input
          type="search"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="질문·답변·분류로 검색..."
          className="input sm:max-w-md"
        />
        <div className="flex gap-2">
          <button type="submit" className="btn-primary border border-transparent">
            검색
          </button>
          <button
            type="button"
            onClick={() => {
              setKeyword('')
              setQ('')
              setPage(1)
            }}
            className="btn-secondary"
          >
            초기화
          </button>
        </div>
      </form>

      {/* 개수 · 페이지당 개수 */}
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          검색결과 <span className="font-semibold text-slate-900 dark:text-slate-100">{items.length}</span>
          {' / '}총 <span className="font-semibold text-slate-900 dark:text-slate-100">{data?.total ?? 0}</span>건
        </p>
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
          <EmptyState label="등록된 질문이 없습니다. 오른쪽 위 '질문 등록'으로 첫 질문을 만들어 보세요." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[56rem] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400">
                  <th className="w-12 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allChecked}
                      onChange={(e) => setSelected(e.target.checked ? items.map((f) => f.id) : [])}
                      className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                      aria-label="전체 선택"
                    />
                  </th>
                  <th className="w-16 px-4 py-3">순서</th>
                  <th className="w-28 px-4 py-3">분류</th>
                  <th className="px-4 py-3">질문</th>
                  <th className="w-36 px-4 py-3">등록일</th>
                  <th className="w-20 px-4 py-3">공개</th>
                  <th className="w-20 px-4 py-3 text-right">관리</th>
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
                        aria-label={`${item.question} 선택`}
                      />
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{item.sortOrder}</td>
                    <td className="px-4 py-3">
                      {item.category ? <Badge tone="blue">{item.category}</Badge> : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="max-w-md px-4 py-3">
                      <Link
                        to={`/admin/faqs/${item.id}`}
                        className="block truncate font-medium text-slate-900 hover:text-brand-600 dark:text-slate-100"
                      >
                        {item.question}
                      </Link>
                      <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{item.answer}</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-400">
                      {formatStamp(item.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <ToggleSwitch
                        checked={item.published}
                        onChange={(v) => handleTogglePublished(item, v)}
                        label={`${item.question} 공개 여부`}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <RowMenu
                        items={[
                          { label: '수정', icon: ICON.edit, onClick: () => navigate(`/admin/faqs/${item.id}`) },
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
