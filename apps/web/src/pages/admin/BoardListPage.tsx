import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import type { Board, BoardInput } from '@wnc/shared'
import { api, qs } from '../../lib/api'
import { clearBoardCache } from '../../lib/boards'
import { formatDate } from '../../lib/format'
import { Badge, EmptyState, ErrorMessage, Loading, Modal, PageHeader } from '../../components/ui'

const EMPTY: BoardInput = { name: '', slug: '', description: '', published: true, sortOrder: 0 }

export default function BoardListPage() {
  const [boards, setBoards] = useState<Board[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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

  async function handleDelete(board: Board) {
    if (!confirm(`'${board.name}' 게시판을 삭제할까요?`)) return
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
        title="게시판 목록"
        description="글이 담기는 게시판을 만들고 이름·노출 여부를 관리합니다."
        action={
          <button type="button" onClick={() => setEditing('new')} className="btn-primary">
            + 게시판 추가
          </button>
        }
      />

      {error && <div className="mb-4"><ErrorMessage message={error} /></div>}

      <div className="card">
        {loading ? (
          <Loading />
        ) : boards.length === 0 ? (
          <EmptyState label="게시판이 없습니다. 오른쪽 위 '게시판 추가'로 만들어 보세요." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400">
                  <th className="px-4 py-3">게시판명</th>
                  <th className="px-4 py-3">슬러그</th>
                  <th className="px-4 py-3">설명</th>
                  <th className="px-4 py-3 text-right">글 수</th>
                  <th className="px-4 py-3">노출</th>
                  <th className="px-4 py-3 text-right">순서</th>
                  <th className="px-4 py-3">만든 날짜</th>
                  <th className="px-4 py-3 text-right">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {boards.map((board) => (
                  <tr key={board.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="px-4 py-3">
                      <Link
                        to={`/admin/posts/list${qs({ category: board.slug })}`}
                        className="font-medium text-slate-900 hover:text-brand-600 dark:text-slate-100"
                      >
                        {board.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">{board.slug}</td>
                    <td className="max-w-xs truncate px-4 py-3 text-slate-600 dark:text-slate-400">
                      {board.description || '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">{board.postCount}</td>
                    <td className="px-4 py-3">
                      {board.published ? <Badge tone="green">노출</Badge> : <Badge tone="slate">숨김</Badge>}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">{board.sortOrder}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-400">
                      {formatDate(board.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <Link
                        to={`/admin/posts/list${qs({ category: board.slug })}`}
                        className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400"
                      >
                        글 관리
                      </Link>
                      <button
                        type="button"
                        onClick={() => setEditing(board)}
                        className="ml-3 text-sm font-medium text-brand-600 hover:text-brand-700"
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(board)}
                        className="ml-3 text-sm font-medium text-red-600 hover:text-red-700"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
      <form id="board-form" onSubmit={handleSubmit} className="space-y-4">
        {error && <ErrorMessage message={error} />}

        <div>
          <label htmlFor="name" className="label">
            게시판명 <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            required
            maxLength={60}
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            className="input"
            placeholder="공지사항"
          />
        </div>

        <div>
          <label htmlFor="slug" className="label">
            슬러그
          </label>
          <input
            id="slug"
            maxLength={40}
            value={form.slug ?? ''}
            onChange={(e) => set('slug', e.target.value)}
            className="input font-mono"
            placeholder="비우면 이름에서 자동 생성"
          />
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            주소에 쓰이는 값입니다. 비우면 이름에서 만들며, 바꾸면 이 게시판의 글도 함께 옮겨집니다.
          </p>
        </div>

        <div>
          <label htmlFor="description" className="label">
            설명
          </label>
          <textarea
            id="description"
            rows={2}
            maxLength={300}
            value={form.description ?? ''}
            onChange={(e) => set('description', e.target.value)}
            className="input resize-y"
            placeholder="게시판 상단과 검색 결과에 쓰입니다."
          />
        </div>

        <div className="grid grid-cols-[1fr_8rem] items-end gap-4">
          <label className="flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              checked={form.published}
              onChange={(e) => set('published', e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">홈페이지에 노출</span>
          </label>

          <div>
            <label htmlFor="sortOrder" className="label">
              정렬 순서
            </label>
            <input
              id="sortOrder"
              type="number"
              value={form.sortOrder ?? 0}
              onChange={(e) => set('sortOrder', Number(e.target.value))}
              className="input"
            />
          </div>
        </div>
      </form>
    </Modal>
  )
}
