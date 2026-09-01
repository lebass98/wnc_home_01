import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { CategoryNode, Paginated, ProductListItem } from '@wnc/shared'
import { api, qs } from '../../lib/api'
import { formatDate } from '../../lib/format'
import { flattenCategories, formatPrice } from '../../lib/category'
import { Badge, EmptyState, ErrorMessage, Loading, PageHeader, Pagination } from '../../components/ui'

export default function ProductListPage() {
  const [page, setPage] = useState(1)
  const [category, setCategory] = useState<number | ''>('')
  const [keyword, setKeyword] = useState('')
  const [q, setQ] = useState('')

  const [categories, setCategories] = useState<CategoryNode[]>([])
  const [data, setData] = useState<Paginated<ProductListItem> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api<CategoryNode[]>('/categories')
      .then(setCategories)
      .catch(() => setCategories([]))
  }, [])

  const load = useCallback(() => {
    setLoading(true)
    api<Paginated<ProductListItem>>(
      `/products${qs({ page, pageSize: 12, category: category || undefined, q: q || undefined, includeDrafts: 1 })}`,
      { auth: true },
    )
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [page, category, q])

  useEffect(load, [load])

  async function handleDelete(product: ProductListItem) {
    if (!confirm(`'${product.name}' 제품을 삭제할까요?\n삭제한 제품은 복구할 수 없습니다.`)) return
    try {
      await api(`/products/${product.id}`, { method: 'DELETE', auth: true })
      load()
    } catch (e) {
      alert((e as Error).message)
    }
  }

  return (
    <>
      <PageHeader
        title="제품 관리"
        description="제품을 등록하고 카테고리·노출 상태를 관리합니다."
        action={
          <div className="flex gap-2">
            <Link to="/admin/categories" className="btn-secondary">
              카테고리 관리
            </Link>
            <Link to="/admin/products/new" className="btn-primary">
              + 새 제품 등록
            </Link>
          </div>
        }
      />

      <div className="card">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center">
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value ? Number(e.target.value) : '')
              setPage(1)
            }}
            className="input sm:w-52"
          >
            <option value="">전체 카테고리</option>
            {flattenCategories(categories).map((c) => (
              <option key={c.id} value={c.id}>
                {'— '.repeat(c.depth - 1)}
                {c.name}
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
              placeholder="제품명 또는 모델명 검색"
              className="input"
            />
            <button type="submit" className="btn-secondary shrink-0">
              검색
            </button>
          </form>
        </div>

        {error && (
          <div className="p-4">
            <ErrorMessage message={error} />
          </div>
        )}

        {loading ? (
          <Loading />
        ) : !data || data.items.length === 0 ? (
          <EmptyState label="등록된 제품이 없습니다." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-500">
                  <th className="px-4 py-3">이미지</th>
                  <th className="px-4 py-3">제품명</th>
                  <th className="px-4 py-3">카테고리</th>
                  <th className="px-4 py-3 text-right">가격</th>
                  <th className="px-4 py-3">상태</th>
                  <th className="px-4 py-3 text-right">조회</th>
                  <th className="px-4 py-3">등록일</th>
                  <th className="px-4 py-3 text-right">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5">
                      <div className="h-12 w-12 overflow-hidden rounded-lg bg-slate-100">
                        {p.thumbnail ? (
                          <img src={p.thumbnail} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="grid h-full w-full place-items-center text-slate-300">
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="max-w-xs px-4 py-2.5">
                      <Link
                        to={`/admin/products/${p.id}`}
                        className="block truncate font-medium text-slate-900 hover:text-brand-600"
                      >
                        {p.name}
                      </Link>
                      {p.model && <p className="truncate text-xs text-slate-500">{p.model}</p>}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{p.categoryName}</td>
                    <td className="px-4 py-2.5 text-right text-slate-600">{formatPrice(p.price)}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-1">
                        {p.published ? <Badge tone="green">공개</Badge> : <Badge tone="slate">비공개</Badge>}
                        {p.featured && <Badge tone="blue">추천</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-600">{p.views}</td>
                    <td className="px-4 py-2.5 text-slate-600">{formatDate(p.createdAt)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(p)}
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
