import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { Paginated, Product, ProductListItem } from '@wnc/shared'
import { api, qs } from '../../lib/api'
import { formatDate } from '../../lib/format'
import { formatPrice } from '../../lib/category'
import RichText from '../../components/RichText'
import ProductCard from '../../components/ProductCard'
import { ErrorMessage, Loading } from '../../components/ui'
import { usePageTitle } from '../../lib/seo'

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [product, setProduct] = useState<Product | null>(null)
  const [related, setRelated] = useState<ProductListItem[]>([])
  const [loading, setLoading] = useState(true)
  usePageTitle(product?.name)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    setProduct(null)
    api<Product>(`/products/${id}`)
      .then(setProduct)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  // 같은 카테고리의 다른 제품을 추천한다.
  useEffect(() => {
    if (!product) return
    api<Paginated<ProductListItem>>(`/products${qs({ category: product.categoryId, pageSize: 5 })}`)
      .then((res) => setRelated(res.items.filter((p) => p.id !== product.id).slice(0, 4)))
      .catch(() => setRelated([]))
  }, [product])

  if (loading) return <Loading />
  if (error) {
    return (
      <div className="container-wnc py-20">
        <ErrorMessage message={error} />
        <Link to="/products" className="btn-secondary mt-6">
          제품 목록으로
        </Link>
      </div>
    )
  }
  if (!product) return null

  return (
    <>
      {/* 빵부스러기 */}
      <div className="border-b border-slate-200 bg-slate-50">
        <div className="container-wnc flex flex-wrap items-center gap-1.5 py-4 text-sm">
          <Link to="/products" className="text-slate-500 hover:text-brand-600">
            제품 소개
          </Link>
          {product.categoryPath.map((c) => (
            <span key={c.id} className="flex items-center gap-1.5">
              <span className="text-slate-300">/</span>
              <Link to={`/products?category=${c.id}`} className="text-slate-500 hover:text-brand-600">
                {c.name}
              </Link>
            </span>
          ))}
        </div>
      </div>

      <section className="py-10 sm:py-14">
        <div className="container-wnc">
          {/* 상단: 좌측 이미지 / 우측 정보 */}
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-14">
            <div>
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                <div className="aspect-square">
                  {product.thumbnail ? (
                    <img
                      src={product.thumbnail}
                      alt={product.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-slate-300">
                      <svg className="h-20 w-20" fill="none" stroke="currentColor" strokeWidth={1.2} viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col">
              <p className="text-sm font-semibold text-brand-600">{product.categoryName}</p>
              <h1 className="mt-2 text-3xl font-bold leading-snug tracking-tight text-slate-900">
                {product.name}
              </h1>
              {product.summary && (
                <p className="mt-3 leading-relaxed text-slate-600">{product.summary}</p>
              )}

              <p className="mt-6 text-2xl font-bold text-slate-900">{formatPrice(product.price)}</p>

              {/* 사양 테이블 */}
              <dl className="mt-8 divide-y divide-slate-200 border-y border-slate-200">
                {product.model && (
                  <div className="flex gap-4 py-3">
                    <dt className="w-28 shrink-0 text-sm font-medium text-slate-500">모델명</dt>
                    <dd className="text-sm text-slate-900">{product.model}</dd>
                  </div>
                )}
                {product.specs.map((spec, i) => (
                  <div key={`${spec.label}-${i}`} className="flex gap-4 py-3">
                    <dt className="w-28 shrink-0 text-sm font-medium text-slate-500">{spec.label}</dt>
                    <dd className="text-sm text-slate-900">{spec.value}</dd>
                  </div>
                ))}
                <div className="flex gap-4 py-3">
                  <dt className="w-28 shrink-0 text-sm font-medium text-slate-500">등록일</dt>
                  <dd className="text-sm text-slate-900">{formatDate(product.createdAt)}</dd>
                </div>
              </dl>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to={`/contact?product=${encodeURIComponent(product.name)}`}
                  className="btn-primary flex-1 px-6 py-3 sm:flex-none"
                >
                  이 제품 문의하기
                </Link>
                <Link to="/products" className="btn-secondary px-6 py-3">
                  목록으로
                </Link>
              </div>
            </div>
          </div>

          {/* 하단: 상세 내용 */}
          <div className="mt-14 border-t border-slate-200 pt-10">
            <h2 className="text-xl font-bold text-slate-900">상세 정보</h2>
            <div className="mt-6">
              <RichText html={product.content} />
            </div>
          </div>

          {/* 관련 제품 */}
          {related.length > 0 && (
            <div className="mt-16 border-t border-slate-200 pt-10">
              <h2 className="text-xl font-bold text-slate-900">같은 카테고리의 다른 제품</h2>
              <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {related.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  )
}
