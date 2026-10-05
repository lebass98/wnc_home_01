import { useEffect, useMemo, useState } from 'react'
import type { MediaItem } from '@wnc/shared'
import { api } from '../lib/api'
import { EmptyState, ErrorMessage, Loading, Modal } from './ui'

/**
 * 미디어 고르기 — 이미 올린 그림 중에서 골라 쓴다. 같은 그림을 또 올리지 않아도 된다.
 * 대체 텍스트·원래 파일 이름으로 찾을 수 있다.
 */
export default function MediaPicker({ onPick, onClose }: { onPick: (url: string) => void; onClose: () => void }) {
  const [items, setItems] = useState<MediaItem[] | null>(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')

  useEffect(() => {
    api<MediaItem[]>('/media', { auth: true })
      .then((list) => setItems(list.filter((m) => m.kind === 'image')))
      .catch((e: Error) => setError(e.message))
  }, [])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!items || !q) return items ?? []
    return items.filter((m) => [m.name, m.originalName, m.alt, m.title].some((v) => v.toLowerCase().includes(q)))
  }, [items, query])

  return (
    <Modal title="미디어 라이브러리에서 고르기" onClose={onClose} wide>
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="파일 이름·대체 텍스트로 찾기" className="input mb-4" autoFocus />
      {error && <ErrorMessage message={error} />}
      {!items ? (
        <Loading />
      ) : shown.length === 0 ? (
        <EmptyState label={query ? '찾는 그림이 없습니다.' : '올린 그림이 없습니다. [파일 업로드]로 먼저 올려 주세요.'} />
      ) : (
        <ul className="grid max-h-[60vh] grid-cols-3 gap-3 overflow-y-auto sm:grid-cols-4">
          {shown.map((m) => (
            <li key={m.name}>
              <button
                type="button"
                onClick={() => {
                  onPick(m.url)
                  onClose()
                }}
                className="group block w-full overflow-hidden rounded-lg border border-slate-200 text-left transition hover:border-brand-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-slate-700"
              >
                <img src={m.url} alt={m.alt} loading="lazy" className="aspect-square w-full bg-slate-100 object-cover dark:bg-slate-900" />
                <p className="truncate px-2 py-1.5 text-[11px] text-slate-600 dark:text-slate-300">{m.alt || m.originalName || m.name}</p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}
