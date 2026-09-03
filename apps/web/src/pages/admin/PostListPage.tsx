import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSearchParams } from 'react-router-dom'
import type { BoardCategory, Paginated, PostListItem } from '@wnc/shared'
import { api, qs } from '../../lib/api'
import { boardName, useBoards } from '../../lib/boards'
import { formatDate } from '../../lib/format'
import { Badge, EmptyState, ErrorMessage, Loading, PageHeader, Pagination } from '../../components/ui'

export default function PostListPage() {
  const boards = useBoards(true)
  const [searchParams] = useSearchParams()

  const [page, setPage] = useState(1)
  // 게시판 목록에서 '글 관리' 로 들어오면 그 게시판만 보여 준다.
  const [category, setCategory] = useState<BoardCategory | ''>(searchParams.get('category') ?? '')
  const [keyword, setKeyword] = useState('')
  const [q, setQ] = useState('')

  const [data, setData] = useState<Paginated<PostListItem> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    api<Paginated<PostListItem>>(
      `/posts${qs({ page, pageSize: 10, category: category || undefined, q: q || undefined, includeDrafts: 1 })}`,
      { auth: true },
    )
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [page, category, q])

  useEffect(load, [load])

  async function handleDelete(id: number, title: string) {
    if (!confirm(`'${title}' 게시글을 삭제할까요?\n삭제한 글은 복구할 수 없습니다.`)) return
    try {
      await api(`/posts/${id}`, { method: 'DELETE', auth: true })
      load()
    } catch (e) {
      alert((e as Error).message)
    }
  }

  return (
    <>
      <PageHeader
        title="게시글 목록"
        description="게시판에 올라간 글을 작성하고 관리합니다."
        action={
          <div className="flex items-center gap-2">
            <Link to="/admin/posts" className="btn-secondary">
              게시판 목록
            </Link>
            <Link to="/admin/posts/new" className="btn-primary">
              + 새 글 작성
            </Link>
          </div>
        }
      />

      <div className="card">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 dark:border-slate-700 sm:flex-row sm:items-center">
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value as BoardCategory | '')
              setPage(1)
            }}
            className="select sm:w-40"
          >
            <option value="">전체 게시판</option>
            {boards.map((b) => (
              <option key={b.id} value={b.slug}>
                {b.name}
              </option>
            ))}
          </select>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              setQ(keyword)
              setPage(1)
            }}
            className="flex flex-1 gap-2"
          >
            <input
              type="search"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="제목 또는 내용 검색"
              className="input"
            />
            <button type="submit" className="btn-secondary shrink-0">
              검색
            </button>
          </form>
        </div>

        {error && <div className="p-4"><ErrorMessage message={error} /></div>}

        {loading ? (
          <Loading />
        ) : !data || data.items.length === 0 ? (
          <EmptyState label="게시글이 없습니다." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400">
                  <th className="px-4 py-3">게시판</th>
                  <th className="px-4 py-3">제목</th>
                  <th className="px-4 py-3">작성자</th>
                  <th className="px-4 py-3">상태</th>
                  <th className="px-4 py-3 text-right">조회</th>
                  <th className="px-4 py-3">작성일</th>
                  <th className="px-4 py-3 text-right">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {data.items.map((post) => (
                  <tr key={post.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="px-4 py-3">
                      <Badge tone="blue">{boardName(boards, post.category)}</Badge>
                    </td>
                    <td className="max-w-sm px-4 py-3">
                      <Link
                        to={`/admin/posts/${post.id}`}
                        className="block truncate font-medium text-slate-900 hover:text-brand-600"
                      >
                        {post.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{post.authorName}</td>
                    <td className="px-4 py-3">
                      {post.published ? (
                        <Badge tone="green">공개</Badge>
                      ) : (
                        <Badge tone="slate">비공개</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">{post.views}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{formatDate(post.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(post.id, post.title)}
                        className="text-sm font-medium text-red-600 hover:text-red-700"
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

        {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} total={data.total} pageSize={data.pageSize} />}
      </div>
    </>
  )
}
