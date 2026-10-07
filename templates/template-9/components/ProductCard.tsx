import { Link } from 'react-router-dom'
import type { ProductListItem } from '@wnc/shared'
import { formatPrice } from '../lib/category'
import { Badge } from './ui'
import { productImage } from '../lib/productImages'

export default function ProductCard({ product }: { product: ProductListItem }) {
  return (
    <Link
      to={`/products/${product.id}`}
      className="card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        <img
          src={productImage(product)}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />

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
