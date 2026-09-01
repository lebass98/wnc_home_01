import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { CategoryNode, Paginated, ProductListItem, ProductSort } from '@wnc/shared'
import { api, qs } from '../../lib/api'
import { ancestorIds, findCategory } from '../../lib/category'
import PageHero from '../../components/PageHero'
import CategoryTree from '../../components/CategoryTree'
import ProductCard from '../../components/ProductCard'
import { EmptyState, ErrorMessage, Loading, Pagination } from '../../components/ui'
import { usePageTitle } from '../../lib/seo'

const SORTS: { value: ProductSort; label: string }[] = [
  { value: 'latest', label: '최신순' },
  { value: 'name', label: '이름순' },
  { value: 'views', label: '조회순' },
]

const PAGE_SIZE = 12

export default function ProductsPage() {
  usePageTitle('제품소개')
  const [searchParams, setSearchParams] = useSearchParams()
  const categoryId = searchParams.get('category') ? Number(searchParams.get('category')) : null
  const page = Number(searchParams.get('page') ?? 1)
  const q = searchParams.get('q') ?? ''
  const sort = (searchParams.get('sort') ?? 'latest') as ProductSort

  const [keyword, setKeyword] = useState(q)
  const [categories, setCategories] = useState<CategoryNode[]>([])
  const [data, setData] = useState<Paginated<ProductListItem> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [mobileFilter, setMobileFilter] = useState(false)

  // 검색어가 외부(주소창)에서 바뀌면 입력창도 맞춰준다.
  useEffect(() => setKeyword(q), [q])

  useEffect(() => {
    api<CategoryNode[]>('/categories')
      .then(setCategories)
      .catch(() => setCategories([]))
  }, [])

  useEffect(() => {
    setLoading(true)
    setError('')
    api<Paginated<ProductListItem>>(
      `/products${qs({ page, pageSize: PAGE_SIZE, category: categoryId ?? undefined, q: q || undefined, sort })}`,
    )
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [page, categoryId, q, sort])

  function update(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams)
    for (const [k, v] of Object.entries(next)) {
      if (v) params.set(k, v)
      else params.delete(k)
    }
    setSearchParams(params)
  }

  const selected = useMemo(
    () => (categoryId ? findCategory(categories, categoryId) : null),
    [categories, categoryId],
  )

  // 선택된 카테고리의 상위 경로 (빵부스러기)
  const breadcrumb = useMemo(() => {
    if (!categoryId) return []
    const ids = [...ancestorIds(categories, categoryId), categoryId]
    return ids.map((id) => findCategory(categories, id)).filter(Boolean) as CategoryNode[]
  }, [categories, categoryId])

  return (
    <>
      <PageHero
        title="제품 소개"
        description="워드앤코드가 제공하는 소프트웨어·하드웨어·클라우드 제품을 소개합니다."
      />

      <section className="py-12">
        <div className="container-wnc">
          <div className="lg:grid lg:grid-cols-[16rem_1fr] lg:gap-10">
            {/* 좌측 카테고리 (데스크톱) */}
            <aside className="hidden lg:block">
              <div className="sticky top-24">
                <h2 className="mb-3 text-sm font-bold text-slate-900">카테고리</h2>
                <CategoryTree
                  nodes={categories}
                  selectedId={categoryId}
                  onSelect={(id) => update({ category: id ? String(id) : '', page: '' })}
                />
              </div>
            </aside>

            <div>
              {/* 검색 + 정렬 */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    update({ q: keyword, page: '' })
                  }}
                  className="flex flex-1 gap-2"
                >
                  <div className="relative flex-1">
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
                      onChange={(e) => setKeyword(e.target.value)}
                      placeholder="제품명 또는 모델명으로 검색"
                      className="input pl-9"
                    />
                  </div>
                  <button type="submit" className="btn-primary shrink-0">
                    검색
                  </button>
                </form>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setMobileFilter(true)}
                    className="btn-secondary shrink-0 lg:hidden"
                  >
                    카테고리
                  </button>
                  <select
                    value={sort}
                    onChange={(e) => update({ sort: e.target.value, page: '' })}
                    className="select sm:w-32"
                    aria-label="정렬"
                  >
                    {SORTS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 현재 위치 + 결과 수 */}
              <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-4">
                <div className="flex flex-wrap items-center gap-1.5 text-sm">
                  <button
                    type="button"
                    onClick={() => update({ category: '', page: '' })}
                    className="text-slate-500 hover:text-brand-600"
                  >
                    전체
                  </button>
                  {breadcrumb.map((c) => (
                    <span key={c.id} className="flex items-center gap-1.5">
                      <span className="text-slate-300">/</span>
                      <button
                        type="button"
                        onClick={() => update({ category: String(c.id), page: '' })}
                        className={
                          c.id === categoryId
                            ? 'font-semibold text-slate-900'
                            : 'text-slate-500 hover:text-brand-600'
                        }
                      >
                        {c.name}
                      </button>
                    </span>
                  ))}
                  {q && (
                    <span className="ml-1 text-slate-500">
                      · &lsquo;<span className="font-medium text-slate-900">{q}</span>&rsquo; 검색 결과
                    </span>
                  )}
                </div>
                {data && <p className="text-sm text-slate-500">총 {data.total}개</p>}
              </div>

              {/* 제품 그리드 — 가로 4개 */}
              <div className="mt-6">
                {error && <ErrorMessage message={error} />}
                {loading ? (
                  <Loading />
                ) : !data || data.items.length === 0 ? (
                  <EmptyState
                    label={
                      q
                        ? `'${q}'에 대한 검색 결과가 없습니다.`
                        : selected
                          ? `'${selected.name}' 카테고리에 등록된 제품이 없습니다.`
                          : '등록된 제품이 없습니다.'
                    }
                  />
                ) : (
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {data.items.map((p) => (
                      <ProductCard key={p.id} product={p} />
                    ))}
                  </div>
                )}
              </div>

              {data && (
                <Pagination
                  page={data.page}
                  totalPages={data.totalPages}
                  onChange={(p) => {
                    update({ page: String(p) })
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 모바일 카테고리 드로어 */}
      {mobileFilter && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setMobileFilter(false)} aria-hidden />
          <aside className="absolute inset-y-0 left-0 w-72 overflow-y-auto bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-bold text-slate-900">카테고리</h2>
              <button
                type="button"
                onClick={() => setMobileFilter(false)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                aria-label="닫기"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <CategoryTree
              nodes={categories}
              selectedId={categoryId}
              onSelect={(id) => {
                update({ category: id ? String(id) : '', page: '' })
                setMobileFilter(false)
              }}
            />
          </aside>
        </div>
      )}
    </>
  )
}
