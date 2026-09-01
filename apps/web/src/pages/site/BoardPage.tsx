import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import type { BoardCategory, Paginated, PostListItem } from '@wnc/shared'
import { BOARD_CATEGORY_LABEL } from '@wnc/shared'
import { api, qs } from '../../lib/api'
import { formatDate } from '../../lib/format'
import PageHero from '../../components/PageHero'
import { Badge, EmptyState, Loading, Pagination } from '../../components/ui'
import { usePageTitle } from '../../lib/seo'

const TABS: { value: BoardCategory | ''; label: string }[] = [
  { value: '', label: '전체' },
  { value: 'NOTICE', label: '공지사항' },
  { value: 'NEWS', label: '뉴스' },
  { value: 'PRESS', label: '보도자료' },
]

export default function BoardPage() {
  usePageTitle('소식')
  const [searchParams, setSearchParams] = useSearchParams()
  const category = (searchParams.get('category') ?? '') as BoardCategory | ''
  const page = Number(searchParams.get('page') ?? 1)
  const q = searchParams.get('q') ?? ''

  const [keyword, setKeyword] = useState(q)
  const [data, setData] = useState<Paginated<PostListItem> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api<Paginated<PostListItem>>(`/posts${qs({ page, pageSize: 10, category: category || undefined, q: q || undefined })}`)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [page, category, q])

  /** 탭·검색·페이지를 하나의 쿼리스트링으로 관리한다. */
  function update(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams)
    for (const [k, v] of Object.entries(next)) {
      if (v) params.set(k, v)
      else params.delete(k)
    }
    setSearchParams(params)
  }

  return (
    <>
      <PageHero title="소식" description="워드앤코드의 공지사항과 새로운 소식을 전해드립니다." />

      <section className="py-14">
        <div className="container-wnc">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {TABS.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => update({ category: tab.value, page: '' })}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                    category === tab.value
                      ? 'bg-brand-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                update({ q: keyword, page: '' })
              }}
              className="flex gap-2"
            >
              <input
                type="search"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="검색어를 입력하세요"
                className="input sm:w-56"
              />
              <button type="submit" className="btn-secondary shrink-0">
                검색
              </button>
            </form>
          </div>

          <div className="mt-8">
            {loading ? (
              <Loading />
            ) : !data || data.items.length === 0 ? (
              <EmptyState label="등록된 게시글이 없습니다." />
            ) : (
              <ul className="divide-y divide-slate-200 border-y border-slate-200">
                {data.items.map((post) => (
                  <li key={post.id}>
                    <Link
                      to={`/board/${post.id}`}
                      className="flex flex-col gap-2 py-5 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:gap-5 sm:px-2"
                    >
                      <Badge tone="blue">{BOARD_CATEGORY_LABEL[post.category]}</Badge>
                      <h2 className="flex-1 font-medium text-slate-900">{post.title}</h2>
                      <div className="flex shrink-0 gap-4 text-xs text-slate-500">
                        <span>조회 {post.views}</span>
                        <span>{formatDate(post.createdAt)}</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {data && (
            <Pagination
              page={data.page}
              totalPages={data.totalPages}
              onChange={(p) => update({ page: String(p) })}
            />
          )}
        </div>
      </section>
    </>
  )
}
