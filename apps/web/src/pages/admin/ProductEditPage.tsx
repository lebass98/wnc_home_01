import { lazy, Suspense, useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { CategoryNode, Product, ProductInput, ProductSpec } from '@wnc/shared'
import { api } from '../../lib/api'
import { flattenCategories } from '../../lib/category'
// 편집기(TipTap)는 용량이 커서 관리자가 이 화면에 들어올 때만 불러온다.
const RichEditor = lazy(() => import('../../components/RichEditor'))
import ThumbnailInput from '../../components/ThumbnailInput'
import { ErrorMessage, Loading, PageHeader } from '../../components/ui'

const EMPTY: ProductInput = {
  name: '',
  model: '',
  summary: '',
  price: null,
  thumbnail: null,
  content: '',
  specs: [],
  categoryId: 0,
  published: true,
  featured: false,
}

export default function ProductEditPage() {
  const { id } = useParams<{ id: string }>()
  const isNew = !id
  const navigate = useNavigate()

  const [form, setForm] = useState<ProductInput>(EMPTY)
  const [categories, setCategories] = useState<CategoryNode[]>([])
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api<CategoryNode[]>('/categories')
      .then((res) => {
        setCategories(res)
        // 새 제품이면 첫 번째 선택 가능한 카테고리를 기본값으로 둔다.
        if (isNew) {
          const first = flattenCategories(res)[0]
          if (first) setForm((f) => (f.categoryId === 0 ? { ...f, categoryId: first.id } : f))
        }
      })
      .catch(() => setCategories([]))
  }, [isNew])

  useEffect(() => {
    if (isNew) return
    api<Product>(`/products/${id}`, { auth: true })
      .then((p) =>
        setForm({
          name: p.name,
          model: p.model ?? '',
          summary: p.summary ?? '',
          price: p.price,
          thumbnail: p.thumbnail,
          content: p.content,
          specs: p.specs,
          categoryId: p.categoryId,
          published: p.published,
          featured: p.featured,
          sortOrder: p.sortOrder,
        }),
      )
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id, isNew])

  function set<K extends keyof ProductInput>(key: K, value: ProductInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function updateSpec(index: number, patch: Partial<ProductSpec>) {
    setForm((prev) => ({
      ...prev,
      specs: prev.specs.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.categoryId) {
      setError('카테고리를 선택하세요. 등록된 카테고리가 없다면 먼저 카테고리를 만들어야 합니다.')
      return
    }
    setSaving(true)
    setError('')
    try {
      // 빈 사양 행은 저장하지 않는다.
      const body = {
        ...form,
        model: form.model || null,
        summary: form.summary || null,
        specs: form.specs.filter((s) => s.label.trim() || s.value.trim()),
      }
      if (isNew) {
        await api('/products', { method: 'POST', body, auth: true })
      } else {
        await api(`/products/${id}`, { method: 'PUT', body, auth: true })
      }
      navigate('/admin/products')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Loading />

  const flat = flattenCategories(categories)

  return (
    <>
      <PageHeader
        title={isNew ? '새 제품 등록' : '제품 수정'}
        description="기본 정보와 사양을 입력하고, 하단 편집기로 상세 내용을 작성하세요."
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <ErrorMessage message={error} />}

        {flat.length === 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            등록된 카테고리가 없습니다. 제품을 저장하려면 먼저{' '}
            <a href="/admin/categories" className="font-semibold underline">
              카테고리를 등록
            </a>
            하세요.
          </div>
        )}

        {/* 기본 정보 */}
        <div className="card p-6">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">기본 정보</h2>

          <div className="mt-5 space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="name" className="label">
                  제품명 <span className="text-red-500">*</span>
                </label>
                <input
                  id="name"
                  required
                  maxLength={150}
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  className="input"
                  placeholder="예: 그룹웨어 Pro"
                />
              </div>

              <div>
                <label htmlFor="model" className="label">
                  모델명
                </label>
                <input
                  id="model"
                  maxLength={100}
                  value={form.model ?? ''}
                  onChange={(e) => set('model', e.target.value)}
                  className="input"
                  placeholder="예: WNC-1000"
                />
              </div>

              <div>
                <label htmlFor="category" className="label">
                  카테고리 <span className="text-red-500">*</span>
                </label>
                <select
                  id="category"
                  required
                  value={form.categoryId || ''}
                  onChange={(e) => set('categoryId', Number(e.target.value))}
                  className="input"
                >
                  <option value="">선택하세요</option>
                  {flat.map((c) => (
                    <option key={c.id} value={c.id}>
                      {'— '.repeat(c.depth - 1)}
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="price" className="label">
                  가격 (원)
                </label>
                <input
                  id="price"
                  type="number"
                  min={0}
                  value={form.price ?? ''}
                  onChange={(e) => set('price', e.target.value === '' ? null : Number(e.target.value))}
                  className="input"
                  placeholder="비워두면 '가격 문의'로 표시됩니다"
                />
              </div>
            </div>

            <div>
              <label htmlFor="summary" className="label">
                한 줄 요약
              </label>
              <input
                id="summary"
                maxLength={300}
                value={form.summary ?? ''}
                onChange={(e) => set('summary', e.target.value)}
                className="input"
                placeholder="목록 카드에 표시되는 짧은 설명"
              />
            </div>

            <ThumbnailInput value={form.thumbnail ?? null} onChange={(url) => set('thumbnail', url)} />

            <div className="flex flex-wrap gap-6">
              <label className="flex cursor-pointer items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={(e) => set('published', e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">공개 (체크 해제 시 사이트에 노출되지 않음)</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(e) => set('featured', e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">추천 제품으로 표시</span>
              </label>
            </div>
          </div>
        </div>

        {/* 사양 */}
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-slate-100">제품 사양</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                상세 페이지 우측에 표 형태로 표시됩니다.
              </p>
            </div>
            <button
              type="button"
              onClick={() => set('specs', [...form.specs, { label: '', value: '' }])}
              className="btn-secondary"
            >
              + 항목 추가
            </button>
          </div>

          {form.specs.length === 0 ? (
            <p className="mt-6 rounded-lg bg-slate-50 dark:bg-slate-900/50 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
              등록된 사양이 없습니다. &lsquo;항목 추가&rsquo;를 눌러 입력하세요.
            </p>
          ) : (
            <div className="mt-5 space-y-2.5">
              {form.specs.map((spec, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    value={spec.label}
                    onChange={(e) => updateSpec(i, { label: e.target.value })}
                    className="input sm:w-52"
                    placeholder="항목 (예: 지원 OS)"
                    maxLength={60}
                  />
                  <input
                    value={spec.value}
                    onChange={(e) => updateSpec(i, { value: e.target.value })}
                    className="input flex-1"
                    placeholder="내용 (예: Windows / Linux)"
                    maxLength={300}
                  />
                  <button
                    type="button"
                    onClick={() => set('specs', form.specs.filter((_, idx) => idx !== i))}
                    className="shrink-0 rounded-lg px-3 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    삭제
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 상세 내용 */}
        <div className="card p-6">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">상세 내용</h2>
          <p className="mb-4 mt-1 text-sm text-slate-500 dark:text-slate-400">
            제품 상세 페이지 하단에 표시됩니다. 서식·목록·이미지·링크를 사용할 수 있습니다.
          </p>
          <Suspense
            fallback={
              <div className="rounded-lg border border-slate-300 p-6 text-sm text-slate-500 dark:text-slate-400">
                편집기 불러오는 중...
              </div>
            }
          >
            <RichEditor value={form.content} onChange={(html) => set('content', html)} />
          </Suspense>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? '저장 중...' : '저장'}
          </button>
          <button type="button" onClick={() => navigate('/admin/products')} className="btn-secondary">
            취소
          </button>
        </div>
      </form>
    </>
  )
}
