import { useCallback, useEffect, useState, type FormEvent } from 'react'
import type { CategoryNode } from '@wnc/shared'
import { MAX_CATEGORY_DEPTH, CATEGORY_DEPTH_LABEL } from '@wnc/shared'
import { api } from '../../lib/api'
import { flattenCategories, totalProductCount } from '../../lib/category'
import { Badge, ErrorMessage, Loading, PageHeader } from '../../components/ui'

interface FormState {
  id: number | null
  name: string
  parentId: number | null
  sortOrder: number
}

const EMPTY: FormState = { id: null, name: '', parentId: null, sortOrder: 0 }

export default function CategoryPage() {
  const [nodes, setNodes] = useState<CategoryNode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState<FormState>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    api<CategoryNode[]>('/categories')
      .then(setNodes)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(load, [load])

  const flat = flattenCategories(nodes)

  /** 부모로 선택 가능한 후보 — 3차는 더 하위를 가질 수 없으므로 제외한다. */
  const parentOptions = flat.filter((c) => {
    if (c.depth >= MAX_CATEGORY_DEPTH) return false
    // 수정 중이라면 자기 자신과 자손은 부모가 될 수 없다.
    if (form.id !== null) {
      if (c.id === form.id) return false
      let cursor: CategoryNode | undefined = c
      while (cursor) {
        if (cursor.parentId === form.id) return false
        cursor = flat.find((x) => x.id === cursor!.parentId)
      }
    }
    return true
  })

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setFormError('')
    try {
      const body = { name: form.name, parentId: form.parentId, sortOrder: form.sortOrder }
      if (form.id === null) {
        await api('/categories', { method: 'POST', body, auth: true })
      } else {
        await api(`/categories/${form.id}`, { method: 'PUT', body, auth: true })
      }
      setForm(EMPTY)
      load()
    } catch (err) {
      setFormError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(node: CategoryNode) {
    if (!confirm(`'${node.name}' 카테고리를 삭제할까요?`)) return
    try {
      await api(`/categories/${node.id}`, { method: 'DELETE', auth: true })
      if (form.id === node.id) setForm(EMPTY)
      load()
    } catch (e) {
      alert((e as Error).message)
    }
  }

  const renderRows = (list: CategoryNode[]) =>
    list.map((node) => (
      <div key={node.id}>
        <div
          className={`flex items-center gap-3 border-b border-slate-100 py-2.5 pr-2 ${
            form.id === node.id ? 'bg-brand-50' : 'hover:bg-slate-50'
          }`}
          style={{ paddingLeft: `${(node.depth - 1) * 1.5 + 0.5}rem` }}
        >
          <Badge tone={node.depth === 1 ? 'blue' : node.depth === 2 ? 'green' : 'slate'}>
            {CATEGORY_DEPTH_LABEL[node.depth]}
          </Badge>
          <span className="flex-1 truncate text-sm font-medium text-slate-900">{node.name}</span>
          <span className="shrink-0 text-xs text-slate-500">
            제품 {node.productCount}
            {node.children.length > 0 && ` (하위 포함 ${totalProductCount(node)})`}
          </span>
          <button
            type="button"
            onClick={() =>
              setForm({ id: node.id, name: node.name, parentId: node.parentId, sortOrder: node.sortOrder })
            }
            className="shrink-0 text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            수정
          </button>
          <button
            type="button"
            onClick={() => handleDelete(node)}
            className="shrink-0 text-sm font-medium text-red-600 hover:text-red-700"
          >
            삭제
          </button>
        </div>
        {node.children.length > 0 && renderRows(node.children)}
      </div>
    ))

  return (
    <>
      <PageHeader
        title="제품 카테고리"
        description={`대분류·중분류·소분류 ${MAX_CATEGORY_DEPTH}차까지 구성할 수 있습니다.`}
      />

      {error && <ErrorMessage message={error} />}

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="card">
          <div className="border-b border-slate-200 px-5 py-3.5">
            <h2 className="font-semibold text-slate-900">카테고리 목록</h2>
          </div>
          {loading ? (
            <Loading />
          ) : nodes.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-slate-500">
              등록된 카테고리가 없습니다. 우측에서 추가하세요.
            </p>
          ) : (
            <div>{renderRows(nodes)}</div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="card h-fit p-5">
          <h2 className="font-semibold text-slate-900">
            {form.id === null ? '카테고리 추가' : '카테고리 수정'}
          </h2>

          <div className="mt-4 space-y-4">
            {formError && <ErrorMessage message={formError} />}

            <div>
              <label htmlFor="cat-parent" className="label">
                상위 카테고리
              </label>
              <select
                id="cat-parent"
                value={form.parentId ?? ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, parentId: e.target.value ? Number(e.target.value) : null }))
                }
                className="input"
              >
                <option value="">없음 (대분류로 생성)</option>
                {parentOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {'— '.repeat(c.depth - 1)}
                    {c.name}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-slate-500">
                {MAX_CATEGORY_DEPTH}차 카테고리는 하위를 가질 수 없어 목록에 표시되지 않습니다.
              </p>
            </div>

            <div>
              <label htmlFor="cat-name" className="label">
                카테고리명 <span className="text-red-500">*</span>
              </label>
              <input
                id="cat-name"
                required
                maxLength={60}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="input"
                placeholder="예: 네트워크 장비"
              />
            </div>

            <div>
              <label htmlFor="cat-order" className="label">
                정렬 순서
              </label>
              <input
                id="cat-order"
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))}
                className="input"
              />
              <p className="mt-1.5 text-xs text-slate-500">숫자가 작을수록 먼저 표시됩니다.</p>
            </div>
          </div>

          <div className="mt-6 flex gap-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? '저장 중...' : form.id === null ? '추가' : '수정'}
            </button>
            {form.id !== null && (
              <button type="button" onClick={() => setForm(EMPTY)} className="btn-secondary">
                취소
              </button>
            )}
          </div>
        </form>
      </div>
    </>
  )
}
