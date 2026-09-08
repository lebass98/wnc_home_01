import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import type { CategoryNode } from '@wnc/shared'
import { MAX_CATEGORY_DEPTH, CATEGORY_DEPTH_LABEL } from '@wnc/shared'
import { api } from '../../lib/api'
import { flattenCategories, totalProductCount } from '../../lib/category'
import { Badge, ErrorMessage, Loading, PageHeader } from '../../components/ui'

interface FormState {
  id: number | null
  name: string
  parentId: number | null
}

const EMPTY: FormState = { id: null, name: '', parentId: null }

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
  /** 순서를 옮긴 뒤에는 목록을 깜빡이지 않고 조용히 다시 받는다. */
  const refresh = () => api<CategoryNode[]>('/categories').then(setNodes)

  useEffect(load, [load])

  const flat = flattenCategories(nodes)
  const nameRef = useRef<HTMLInputElement>(null)

  /** 뿌리부터 이 카테고리까지의 이름 경로 — 폼의 '추가 위치' 안내에 쓴다. */
  const pathOf = (id: number | null): string[] => {
    const names: string[] = []
    let cursor = flat.find((c) => c.id === id)
    while (cursor) {
      names.unshift(cursor.name)
      cursor = flat.find((x) => x.id === cursor!.parentId)
    }
    return names
  }

  // 지금 폼 내용이 저장되면 몇 차가 되는지
  const formDepth = (flat.find((c) => c.id === form.parentId)?.depth ?? 0) + 1

  /** 트리의 [+ 하위] — 그 카테고리 아래에 추가하도록 폼을 채우고 이름 칸에 커서를 둔다. */
  function startAddUnder(parentId: number | null) {
    setForm({ id: null, name: '', parentId })
    setFormError('')
    nameRef.current?.focus()
  }

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
      // 순서는 목록의 ▲▼ 로 다루므로 여기서는 보내지 않는다 (새 항목은 맨 뒤에 붙는다).
      const body = { name: form.name, parentId: form.parentId }
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

  /** 같은 부모 안에서 한 칸 위/아래로 — 형제 순서를 통째로 보내 서버가 다시 매긴다. */
  const [movingId, setMovingId] = useState<number | null>(null)
  async function handleMove(siblings: CategoryNode[], index: number, dir: -1 | 1) {
    const target = index + dir
    if (target < 0 || target >= siblings.length) return
    const ids = siblings.map((c) => c.id)
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    setMovingId(siblings[index].id)
    try {
      await api('/categories/reorder', { method: 'PUT', body: { parentId: siblings[index].parentId, ids }, auth: true })
      await refresh()
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setMovingId(null)
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
    list.map((node, index) => (
      <div key={node.id}>
        <div
          className={`flex items-center gap-3 border-b border-slate-100 dark:border-slate-700 py-2.5 pr-2 ${
            form.id === node.id
              ? 'bg-brand-50 dark:bg-brand-900/30'
              : form.id === null && form.parentId === node.id
                ? 'bg-amber-50 dark:bg-amber-900/20' // 이 카테고리 아래에 추가하는 중
                : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
          }`}
          style={{ paddingLeft: `${(node.depth - 1) * 1.5 + 0.5}rem` }}
        >
          <Badge tone={node.depth === 1 ? 'blue' : node.depth === 2 ? 'green' : 'slate'}>
            {CATEGORY_DEPTH_LABEL[node.depth]}
          </Badge>
          <span className="flex-1 truncate text-sm font-medium text-slate-900 dark:text-slate-100">{node.name}</span>
          <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">
            제품 {node.productCount}
            {node.children.length > 0 && ` (하위 포함 ${totalProductCount(node)})`}
          </span>
          {/* 순서 — 같은 부모 안에서만 한 칸씩 옮긴다. 다른 부모로 보내는 건 [수정]의 상위 카테고리로. */}
          <div className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-slate-100 p-0.5 dark:bg-slate-700/60">
            <span className="w-6 text-center text-[11px] font-semibold tabular-nums text-slate-400 dark:text-slate-500">
              {index + 1}
            </span>
            <button
              type="button"
              onClick={() => handleMove(list, index, -1)}
              disabled={index === 0 || movingId !== null}
              aria-label={`${node.name} 위로`}
              title="위로"
              className="grid h-7 w-7 place-items-center rounded-full text-slate-500 transition hover:bg-white hover:text-brand-600 hover:shadow-sm disabled:cursor-default disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:shadow-none dark:text-slate-300 dark:hover:bg-slate-600"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.4} viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 14.5l6-6 6 6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => handleMove(list, index, 1)}
              disabled={index === list.length - 1 || movingId !== null}
              aria-label={`${node.name} 아래로`}
              title="아래로"
              className="grid h-7 w-7 place-items-center rounded-full text-slate-500 transition hover:bg-white hover:text-brand-600 hover:shadow-sm disabled:cursor-default disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:shadow-none dark:text-slate-300 dark:hover:bg-slate-600"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.4} viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 9.5l6 6 6-6" />
              </svg>
            </button>
          </div>
          {node.depth < MAX_CATEGORY_DEPTH && (
            <button
              type="button"
              onClick={() => startAddUnder(node.id)}
              title={`'${node.name}' 아래에 ${CATEGORY_DEPTH_LABEL[node.depth + 1]} 추가`}
              className="shrink-0 text-sm font-medium text-slate-500 hover:text-brand-600 dark:text-slate-400"
            >
              +하위
            </button>
          )}
          <button
            type="button"
            onClick={() =>
              setForm({ id: node.id, name: node.name, parentId: node.parentId })
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
          <div className="border-b border-slate-200 px-5 py-3.5 dark:border-slate-700">
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">카테고리 목록</h2>
          </div>
          {loading ? (
            <Loading />
          ) : nodes.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
              등록된 카테고리가 없습니다. 우측에서 추가하세요.
            </p>
          ) : (
            <div>{renderRows(nodes)}</div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="card h-fit p-5">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">
            {form.id !== null ? '카테고리 수정' : form.parentId === null ? '대분류 추가' : '하위 카테고리 추가'}
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
                className="select"
              >
                <option value="">없음 (대분류로 생성)</option>
                {parentOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {'— '.repeat(c.depth - 1)}
                    {c.name}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                {MAX_CATEGORY_DEPTH}차 카테고리는 하위를 가질 수 없어 목록에 표시되지 않습니다.
              </p>
            </div>

            {/* 어디에 몇 차로 들어가는지 — 상위를 고를 때마다 바로 바뀐다. */}
            <div className="rounded-lg bg-slate-50 px-3 py-2.5 dark:bg-slate-900/50">
              <p className="flex flex-wrap items-center gap-x-1 gap-y-0.5 text-xs text-slate-600 dark:text-slate-300">
                {pathOf(form.parentId).map((n) => (
                  <span key={n} className="inline-flex items-center gap-1">
                    <span>{n}</span>
                    <span className="text-slate-400">›</span>
                  </span>
                ))}
                <span className="font-semibold text-brand-600">{form.name.trim() || '(새 카테고리)'}</span>
              </p>
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <Badge tone={formDepth === 1 ? 'blue' : formDepth === 2 ? 'green' : 'slate'}>
                  {CATEGORY_DEPTH_LABEL[formDepth]}
                </Badge>
                {formDepth}차로 {form.id === null ? '추가' : '저장'}됩니다.
              </p>
            </div>

            <div>
              <label htmlFor="cat-name" className="label">
                카테고리명 <span className="text-red-500">*</span>
              </label>
              <input
                id="cat-name"
                ref={nameRef}
                required
                maxLength={60}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="input"
                placeholder="예: 네트워크 장비"
              />
            </div>

          </div>

          <div className="mt-6 flex gap-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? '저장 중...' : form.id === null ? '추가' : '수정'}
            </button>
            {(form.id !== null || form.parentId !== null || form.name !== '') && (
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
