import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import type { Board, BoardInput, BoardType } from '@wnc/shared'
import { BOARD_TYPE_DESCRIPTION, BOARD_TYPE_LABEL } from '@wnc/shared'
import { api, qs } from '../../lib/api'
import { clearBoardCache } from '../../lib/boards'
import { formatDateTime } from '../../lib/format'
import { EmptyState, ErrorMessage, Loading, Modal, PageHeader, Pagination } from '../../components/ui'

const EMPTY: BoardInput = {
  name: '',
  slug: '',
  type: 'basic',
  description: '',
  published: true,
  sortOrder: 0,
}

const TYPES: BoardType[] = ['basic', 'gallery', 'card']
const PAGE_SIZE = 10

/** 유형별 뱃지 색상 */
const TYPE_TONE: Record<BoardType, string> = {
  basic: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/30',
  gallery: 'bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-500/30',
  card: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30',
}

export default function BoardListPage() {
  const [boards, setBoards] = useState<Board[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [menuFor, setMenuFor] = useState<number | null>(null)

  /** 편집 중인 게시판. null 이면 닫힌 상태, 'new' 면 추가 */
  const [editing, setEditing] = useState<Board | 'new' | null>(null)

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
    if (!confirm(`'${board.name}' 게시판을 삭제할까요?\n담긴 글이 있으면 삭제할 수 없습니다.`)) return
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
        title="게시판 관리"
        description="게시판 목록을 관리합니다"
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={load}
              title="새로고침"
              aria-label="새로고침"
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
            <button type="button" onClick={() => setEditing('new')} className="btn-primary">
              <span className="text-base leading-none">+</span> 게시판 추가
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
              placeholder="게시판 검색..."
              className="input pl-9"
              aria-label="게시판 검색"
            />
          </div>
        </div>

        {loading ? (
          <Loading />
        ) : filtered.length === 0 ? (
          <EmptyState
            label={
              keyword
                ? `'${keyword}'에 대한 검색 결과가 없습니다.`
                : "게시판이 없습니다. 오른쪽 위 '게시판 추가'로 만들어 보세요."
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
                        게시글: <span className="text-slate-700 dark:text-slate-300">{board.postCount}</span>
                      </span>
                      <span className="text-slate-300 dark:text-slate-600">·</span>
                      <span>
                        생성일:{' '}
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
                            글 목록 보기
                          </Link>
                          <button
                            type="button"
                            onClick={() => {
                              setMenuFor(null)
                              setEditing(board)
                            }}
                            className="block w-full px-3.5 py-2 text-left text-sm text-slate-700 hover:bg-slate-50
                                       dark:text-slate-200 dark:hover:bg-slate-700"
                          >
                            수정
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
                            삭제
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

      {editing && (
        <BoardForm
          board={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            clearBoardCache()
            load()
          }}
        />
      )}
    </>
  )
}

/** 게시판 추가·수정 대화상자 */
function BoardForm({
  board,
  onClose,
  onSaved,
}: {
  board: Board | null
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<BoardInput>(
    board
      ? {
          name: board.name,
          slug: board.slug,
          type: board.type,
          description: board.description ?? '',
          published: board.published,
          sortOrder: board.sortOrder,
        }
      : EMPTY,
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set<K extends keyof BoardInput>(key: K, value: BoardInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (board) {
        await api(`/boards/${board.id}`, { method: 'PUT', body: form, auth: true })
      } else {
        await api('/boards', { method: 'POST', body: form, auth: true })
      }
      onSaved()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={board ? '게시판 수정' : '게시판 추가'}
      onClose={onClose}
      footer={
        <>
          <button type="submit" form="board-form" disabled={saving} className="btn-primary">
            {saving ? '저장 중...' : '저장'}
          </button>
          <button type="button" onClick={onClose} className="btn-secondary">
            취소
          </button>
        </>
      }
    >
      <form id="board-form" onSubmit={handleSubmit} className="space-y-5">
        {error && <ErrorMessage message={error} />}

        <div>
          <label htmlFor="board-name" className="label">
            게시판 이름 <span className="text-red-500">*</span>
          </label>
          <input
            id="board-name"
            required
            maxLength={60}
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            className="input"
            placeholder="예: 공지사항"
          />
        </div>

        {/* 게시판 유형 */}
        <div>
          <span className="label">게시판 유형</span>
          <div className="space-y-2">
            {TYPES.map((t) => (
              <label
                key={t}
                className={`flex cursor-pointer gap-3 rounded-lg border p-3 transition ${
                  form.type === t
                    ? 'border-brand-500 bg-brand-50 dark:border-brand-500 dark:bg-brand-500/10'
                    : 'border-slate-200 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-700/50'
                }`}
              >
                <input
                  type="radio"
                  name="board-type"
                  value={t}
                  checked={form.type === t}
                  onChange={() => set('type', t)}
                  className="mt-0.5 h-4 w-4 shrink-0 border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-slate-900 dark:text-slate-100">
                    {BOARD_TYPE_LABEL[t]}
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                    {BOARD_TYPE_DESCRIPTION[t]}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="board-slug" className="label">
            슬러그
          </label>
          <input
            id="board-slug"
            maxLength={40}
            value={form.slug ?? ''}
            onChange={(e) => set('slug', e.target.value)}
            className="input"
            placeholder="비우면 이름으로 자동 생성됩니다"
          />
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            주소에 쓰이는 영문 이름입니다. 바꾸면 이 게시판의 글도 함께 옮겨집니다.
          </p>
        </div>

        <div>
          <label htmlFor="board-desc" className="label">
            설명
          </label>
          <input
            id="board-desc"
            maxLength={200}
            value={form.description ?? ''}
            onChange={(e) => set('description', e.target.value)}
            className="input"
            placeholder="게시판 상단과 검색 결과에 쓰입니다."
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="board-order" className="label">
              정렬 순서
            </label>
            <input
              id="board-order"
              type="number"
              value={form.sortOrder ?? 0}
              onChange={(e) => set('sortOrder', Number(e.target.value))}
              className="input"
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2.5 sm:mt-7">
            <input
              type="checkbox"
              checked={form.published}
              onChange={(e) => set('published', e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">홈페이지에 노출</span>
          </label>
        </div>
      </form>
    </Modal>
  )
}
