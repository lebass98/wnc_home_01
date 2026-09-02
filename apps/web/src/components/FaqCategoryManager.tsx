import { useEffect, useState, type FormEvent } from 'react'
import type { FaqCategory } from '@wnc/shared'
import { api } from '../lib/api'
import { ErrorMessage } from './ui'

const ICON = {
  up: 'M5 15l7-7 7 7',
  down: 'M19 9l-7 7-7-7',
  edit: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.586-9.414a2 2 0 112.828 2.828L11.828 15.9 8 16.9l1-3.828 8.414-8.486z',
  trash: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M4 7h16M10 4h4a1 1 0 011 1v2H9V5a1 1 0 011-1z',
}

/**
 * 자주 묻는 질문의 분류를 등록·이름 변경·순서 조정·삭제한다.
 * 질문 작성 화면에서는 여기서 등록한 분류 중에서 고르기만 한다.
 */
export default function FaqCategoryManager({ onChange }: { onChange?: () => void }) {
  const [categories, setCategories] = useState<FaqCategory[]>([])
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api<FaqCategory[]>('/faqs/categories')
      .then(setCategories)
      .catch((e: Error) => setError(e.message))
  }, [])

  /** 서버는 바뀐 뒤의 전체 목록을 돌려주므로 그대로 갈아 끼운다. */
  async function run(request: () => Promise<FaqCategory[]>) {
    setBusy(true)
    setError('')
    try {
      setCategories(await request())
      onChange?.()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  function handleAdd(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError('분류 이름을 입력하세요. 예: 서비스, 견적·계약')
      return
    }
    run(() => api<FaqCategory[]>('/faqs/categories', { method: 'POST', body: { name: trimmed }, auth: true })).then(
      () => setName(''),
    )
  }

  function handleRename(cat: FaqCategory) {
    const trimmed = editingName.trim()
    if (!trimmed || trimmed === cat.name) {
      setEditingId(null)
      return
    }
    run(() =>
      api<FaqCategory[]>(`/faqs/categories/${cat.id}`, { method: 'PUT', body: { name: trimmed }, auth: true }),
    ).then(() => setEditingId(null))
  }

  /** 이웃과 순서 값을 맞바꾼다. 두 번 저장하지만 목록은 마지막 응답으로 맞춘다. */
  function handleMove(index: number, dir: -1 | 1) {
    const a = categories[index]
    const b = categories[index + dir]
    if (!a || !b) return
    // 순서 값이 같으면 자리가 안 바뀌므로 위치 번호로 다시 매긴다.
    const orderA = index + dir
    const orderB = index
    run(async () => {
      await api<FaqCategory[]>(`/faqs/categories/${a.id}`, { method: 'PUT', body: { name: a.name, sortOrder: orderA }, auth: true })
      return api<FaqCategory[]>(`/faqs/categories/${b.id}`, { method: 'PUT', body: { name: b.name, sortOrder: orderB }, auth: true })
    })
  }

  function handleDelete(cat: FaqCategory) {
    const note =
      cat.faqCount > 0
        ? `\n이 분류를 쓰는 질문 ${cat.faqCount}개는 '분류 없음'으로 바뀝니다.`
        : ''
    if (!confirm(`'${cat.name}' 분류를 삭제할까요?${note}`)) return
    run(() => api<FaqCategory[]>(`/faqs/categories/${cat.id}`, { method: 'DELETE', auth: true }))
  }

  return (
    <div className="card p-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100">분류 관리</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          홈페이지 탭은 이 순서대로 보입니다. 이름을 바꾸면 그 분류를 쓰는 질문도 함께 바뀝니다.
        </p>
      </div>

      {error && (
        <div className="mt-3">
          <ErrorMessage message={error} />
        </div>
      )}

      <ul className="mt-4 divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-slate-700 dark:border-slate-700">
        {categories.length === 0 && (
          <li className="px-4 py-4 text-sm text-slate-500 dark:text-slate-400">
            등록된 분류가 없습니다. 아래에서 첫 분류를 추가하세요.
          </li>
        )}
        {categories.map((cat, i) => (
          <li key={cat.id} className="flex items-center gap-2 px-3 py-2">
            {/* 순서 */}
            <div className="flex flex-col">
              <button
                type="button"
                onClick={() => handleMove(i, -1)}
                disabled={busy || i === 0}
                aria-label={`${cat.name} 위로`}
                className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 dark:hover:bg-slate-700"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d={ICON.up} />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => handleMove(i, 1)}
                disabled={busy || i === categories.length - 1}
                aria-label={`${cat.name} 아래로`}
                className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 dark:hover:bg-slate-700"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d={ICON.down} />
                </svg>
              </button>
            </div>

            {/* 이름 — 누르면 바로 고친다 */}
            {editingId === cat.id ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleRename(cat)
                }}
                className="flex flex-1 items-center gap-2"
              >
                <input
                  autoFocus
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={() => handleRename(cat)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                  maxLength={30}
                  className="input h-9 max-w-xs py-1"
                  aria-label="분류 이름"
                />
                <button type="submit" className="btn-primary h-9 px-3 py-1 text-xs">
                  저장
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setEditingId(cat.id)
                  setEditingName(cat.name)
                }}
                className="flex flex-1 items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-slate-900 hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-700/50"
                title="눌러서 이름 바꾸기"
              >
                <span className="font-medium">{cat.name}</span>
                <span className="text-xs text-slate-400">질문 {cat.faqCount}개</span>
                <svg className="ml-auto h-3.5 w-3.5 text-slate-300" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d={ICON.edit} />
                </svg>
              </button>
            )}

            <button
              type="button"
              onClick={() => handleDelete(cat)}
              disabled={busy}
              aria-label={`${cat.name} 삭제`}
              className="rounded p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d={ICON.trash} />
              </svg>
            </button>
          </li>
        ))}
      </ul>

      {/* 추가 */}
      <form onSubmit={handleAdd} className="mt-3 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="새 분류 이름 (예: 결제)"
          maxLength={30}
          className="input max-w-xs"
        />
        <button type="submit" disabled={busy} className="btn-secondary shrink-0">
          + 분류 추가
        </button>
      </form>
    </div>
  )
}
