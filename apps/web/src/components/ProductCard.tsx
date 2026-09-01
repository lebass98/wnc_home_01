import { Link } from 'react-router-dom'
import type { ProductListItem } from '@wnc/shared'
import { formatPrice } from '../lib/category'
import { Badge } from './ui'

/** 썸네일이 없을 때 보여줄 자리표시자 */
function Placeholder() {
  return (
    <div className="grid h-full w-full place-items-center bg-slate-100 text-slate-300">
      <svg className="h-12 w-12" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    </div>
  )
}

export default function ProductCard({ product }: { product: ProductListItem }) {
  return (
    <Link
      to={`/products/${product.id}`}
      className="card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        {product.thumbnail ? (
          <img
            src={product.thumbnail}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <Placeholder />
        )}
        {product.featured && (
          <span className="absolute left-3 top-3 rounded-full bg-brand-600 px-2.5 py-1 text-xs font-semibold text-white">
            추천
          </span>
        )}
        {!product.published && (
          <span className="absolute right-3 top-3">
            <Badge tone="slate">비공개</Badge>
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs font-medium text-brand-600">{product.categoryName}</p>
        <h3 className="mt-1.5 line-clamp-2 font-semibold leading-snug text-slate-900 group-hover:text-brand-700">
          {product.name}
        </h3>
        {product.model && <p className="mt-1 text-xs text-slate-500">모델: {product.model}</p>}
        {product.summary && (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-600">{product.summary}</p>
        )}
        <p className="mt-auto pt-3 text-sm font-bold text-slate-900">{formatPrice(product.price)}</p>
      </div>
    </Link>
  )
}
