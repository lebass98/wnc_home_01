import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { BoardCategory, Paginated, PostListItem } from '@wnc/shared'
import { BOARD_CATEGORY_LABEL } from '@wnc/shared'
import { api, qs } from '../../lib/api'
import { formatDate } from '../../lib/format'
import { Badge, EmptyState, ErrorMessage, Loading, PageHeader, Pagination } from '../../components/ui'

export default function PostListPage() {
  const [page, setPage] = useState(1)
  const [category, setCategory] = useState<BoardCategory | ''>('')
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
        title="게시판 관리"
        description="공지사항·뉴스·보도자료를 작성하고 관리합니다."
        action={
          <Link to="/admin/posts/new" className="btn-primary">
            + 새 글 작성
          </Link>
        }
      />

      <div className="card">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center">
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value as BoardCategory | '')
              setPage(1)
            }}
            className="input sm:w-40"
          >
            <option value="">전체 분류</option>
            <option value="NOTICE">공지사항</option>
            <option value="NEWS">뉴스</option>
            <option value="PRESS">보도자료</option>
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
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-500">
                  <th className="px-4 py-3">분류</th>
                  <th className="px-4 py-3">제목</th>
                  <th className="px-4 py-3">작성자</th>
                  <th className="px-4 py-3">상태</th>
                  <th className="px-4 py-3 text-right">조회</th>
                  <th className="px-4 py-3">작성일</th>
                  <th className="px-4 py-3 text-right">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map((post) => (
                  <tr key={post.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Badge tone="blue">{BOARD_CATEGORY_LABEL[post.category]}</Badge>
                    </td>
                    <td className="max-w-sm px-4 py-3">
                      <Link
                        to={`/admin/posts/${post.id}`}
                        className="block truncate font-medium text-slate-900 hover:text-brand-600"
                      >
                        {post.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{post.authorName}</td>
                    <td className="px-4 py-3">
                      {post.published ? (
                        <Badge tone="green">공개</Badge>
                      ) : (
                        <Badge tone="slate">비공개</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">{post.views}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(post.createdAt)}</td>
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

        {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />}
      </div>
    </>
  )
}
