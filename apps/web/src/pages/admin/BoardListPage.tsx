import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import type { Board, BoardType } from '@wnc/shared'
import { BOARD_TYPE_LABEL } from '@wnc/shared'
import { api, qs } from '../../lib/api'
import { clearBoardCache } from '../../lib/boards'
import { formatDateTime } from '../../lib/format'
import { EmptyState, ErrorMessage, Loading, PageHeader, Pagination } from '../../components/ui'

const PAGE_SIZE = 10

/** 유형별 뱃지 색상 */
const TYPE_TONE: Record<BoardType, string> = {
  basic: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/30',
  gallery: 'bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-500/30',
  card: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30',
}

export default function BoardListPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [boards, setBoards] = useState<Board[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [menuFor, setMenuFor] = useState<number | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    api<Board[]>(`/boards${qs({ includeHidden: 1 })}`, { auth: true })
      .then(setBoards)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(load, [load])

  // 메뉴가 열린 상태에서 바깥을 누르면 닫는다.
  useEffect(() => {
    if (menuFor === null) return
    const close = () => setMenuFor(null)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [menuFor])

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase()
    if (!q) return boards
    return boards.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.slug.toLowerCase().includes(q) ||
        (b.description ?? '').toLowerCase().includes(q),
    )
  }, [boards, keyword])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, totalPages)
  const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)

  /** 노출 여부를 토글한다. 실패하면 원래 값으로 되돌린다. */
  async function togglePublished(board: Board) {
    const next = !board.published
    setBoards((prev) => prev.map((b) => (b.id === board.id ? { ...b, published: next } : b)))
    try {
      await api(`/boards/${board.id}`, {
        method: 'PUT',
        body: {
          name: board.name,
          slug: board.slug,
          type: board.type,
          description: board.description,
          published: next,
          sortOrder: board.sortOrder,
        },
        auth: true,
      })
      clearBoardCache()
    } catch (e) {
      setBoards((prev) => prev.map((b) => (b.id === board.id ? { ...b, published: board.published } : b)))
      alert((e as Error).message)
    }
  }

  async function handleDelete(board: Board) {
    if (!confirm(t('board.deleteConfirm', { name: board.name }))) return
    try {
      await api(`/boards/${board.id}`, { method: 'DELETE', auth: true })
      clearBoardCache()
      load()
    } catch (e) {
      alert((e as Error).message)
    }
  }

  return (
    <>
      <PageHeader
        title={t('board.title')}
        description={t('board.description')}
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={load}
              title={t('common.refresh')}
              aria-label={t('common.refresh')}
              className="grid h-10 w-10 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100
                         dark:text-slate-400 dark:hover:bg-slate-700"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
            <button type="button" onClick={() => navigate('/admin/boards/new')} className="btn-primary">
              <span className="text-base leading-none">+</span> {t('board.addBoard')}
            </button>
          </div>
        }
      />

      {error && (
        <div className="mb-4">
          <ErrorMessage message={error} />
        </div>
      )}

      <div className="card p-4 sm:p-5">
        {/* 검색 */}
        <div className="mb-4 flex justify-end">
          <div className="relative w-full sm:w-72">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="search"
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value)
                setPage(1)
              }}
              placeholder={t('board.searchPlaceholder')}
              className="input pl-9"
              aria-label={t('board.searchPlaceholder')}
            />
          </div>
        </div>

        {loading ? (
          <Loading />
        ) : filtered.length === 0 ? (
          <EmptyState
            label={
              keyword
                ? t('board.noSearchResult', { keyword })
                : t('board.empty')
            }
          />
        ) : (
          <ul className="space-y-3">
            {visible.map((board) => (
              <li
                key={board.id}
                className="rounded-xl border border-slate-200 bg-white p-4 transition hover:shadow-sm
                           dark:border-slate-700 dark:bg-slate-800/60 sm:p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${TYPE_TONE[board.type]}`}
                      >
                        {board.slug}
                      </span>
                      <Link
                        to={`/admin/posts/list${qs({ category: board.slug })}`}
                        className="truncate text-base font-bold text-slate-900 hover:text-brand-600 dark:text-slate-100"
                      >
                        {board.name}
                      </Link>
                      <span className="text-sm text-slate-400 dark:text-slate-500">
                        ({BOARD_TYPE_LABEL[board.type]})
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
                      <span>
                        {t('board.postCount')}: <span className="text-slate-700 dark:text-slate-300">{board.postCount}</span>
                      </span>
                      <span className="text-slate-300 dark:text-slate-600">·</span>
                      <span>
                        {t('common.createdAt')}:{' '}
                        <span className="text-slate-700 dark:text-slate-300">
                          {formatDateTime(board.createdAt)}
                        </span>
                      </span>
                    </div>

                    {board.description && (
                      <p className="mt-1.5 truncate text-sm text-slate-500 dark:text-slate-400">
                        {board.description}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    {/* 노출 토글 */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={board.published}
                      aria-label={`${board.name} 노출`}
                      title={board.published ? '홈페이지에 노출 중' : '숨김'}
                      onClick={() => togglePublished(board)}
                      className={`relative h-6 w-11 shrink-0 rounded-full transition focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1 ${
                        board.published ? 'bg-brand-600' : 'bg-slate-300 dark:bg-slate-600'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                          board.published ? 'left-[1.375rem]' : 'left-0.5'
                        }`}
                      />
                    </button>

                    {/* 더보기 메뉴 */}
                    <div className="relative">
                      <button
                        type="button"
                        aria-label={`${board.name} 관리 메뉴`}
                        aria-haspopup="menu"
                        aria-expanded={menuFor === board.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          setMenuFor(menuFor === board.id ? null : board.id)
                        }}
                        className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 transition
                                   hover:bg-slate-100 hover:text-slate-600
                                   dark:hover:bg-slate-700 dark:hover:text-slate-200"
                      >
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                          <circle cx="5" cy="12" r="1.6" />
                          <circle cx="12" cy="12" r="1.6" />
                          <circle cx="19" cy="12" r="1.6" />
                        </svg>
                      </button>

                      {menuFor === board.id && (
                        <div
                          role="menu"
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 top-10 z-20 w-40 overflow-hidden rounded-lg border border-slate-200
                                     bg-white py-1 shadow-lg dark:border-slate-600 dark:bg-slate-800"
                        >
                          <Link
                            to={`/admin/posts/list${qs({ category: board.slug })}`}
                            className="block px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50
                                       dark:text-slate-200 dark:hover:bg-slate-700"
                          >
                            {t('board.viewPosts')}
                          </Link>
                          <button
                            type="button"
                            onClick={() => {
                              setMenuFor(null)
                              navigate(`/admin/boards/${board.id}`)
                            }}
                            className="block w-full px-3.5 py-2 text-left text-sm text-slate-700 hover:bg-slate-50
                                       dark:text-slate-200 dark:hover:bg-slate-700"
                          >
                            {t('common.edit')}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setMenuFor(null)
                              handleDelete(board)
                            }}
                            className="block w-full px-3.5 py-2 text-left text-sm text-red-600 hover:bg-red-50
                                       dark:text-red-400 dark:hover:bg-red-500/10"
                          >
                            {t('common.delete')}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {!loading && filtered.length > 0 && (
          <Pagination page={current} totalPages={totalPages} onChange={setPage} />
        )}
      </div>

    </>
  )
}
