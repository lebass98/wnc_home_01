import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { MediaItem } from '@wnc/shared'
import { api, IS_DEMO } from '../../lib/api'
import { formatStamp } from '../../lib/format'
import { invalidateMediaAlts, uploadMediaFile } from '../../lib/media'
import { Badge, EmptyState, ErrorMessage, Loading, PageHeader } from '../../components/ui'

/**
 * 미디어 라이브러리 — 관리자가 올린 그림·문서를 한곳에서 본다.
 * 대체 텍스트를 적어 두면 홈페이지 본문 그림의 alt 가 비어 있을 때 채워진다(검색·화면 읽기 프로그램용).
 * 어디에 쓰였는지 보여 주고, 아무 데도 안 쓰인 파일은 골라 정리할 수 있다.
 */

type KindFilter = 'all' | 'image' | 'doc'
type UseFilter = 'all' | 'used' | 'unused'

function formatSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)}MB`
  return `${Math.max(1, Math.round(bytes / 1024))}KB`
}

const KIND_LABEL: Record<MediaItem['kind'], string> = { image: '그림', video: '영상', pdf: 'PDF', zip: 'ZIP', file: '파일' }

export default function MediaLibraryPage() {
  const [items, setItems] = useState<MediaItem[] | null>(null)
  const [error, setError] = useState('')
  const [kind, setKind] = useState<KindFilter>('all')
  const [use, setUse] = useState<UseFilter>('all')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [uploading, setUploading] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function load() {
    api<MediaItem[]>('/media', { auth: true })
      .then((list) => {
        setItems(list)
        setError('')
      })
      .catch((e: Error) => setError(e.message))
  }
  useEffect(load, [])

  const shown = useMemo(() => {
    if (!items) return []
    const q = query.trim().toLowerCase()
    return items.filter((m) => {
      if (kind === 'image' && m.kind !== 'image') return false
      if (kind === 'doc' && m.kind === 'image') return false
      if (use === 'used' && m.usages.length === 0) return false
      if (use === 'unused' && m.usages.length > 0) return false
      return !q || [m.name, m.originalName, m.alt, m.title].some((v) => v.toLowerCase().includes(q))
    })
  }, [items, kind, use, query])

  const unused = items?.filter((m) => m.usages.length === 0) ?? []
  const current = items?.find((m) => m.name === selected) ?? null

  async function upload(files: FileList) {
    const list = [...files]
    const failed: string[] = []
    for (const [i, file] of list.entries()) {
      setUploading(`올리는 중 ${i + 1}/${list.length}`)
      try {
        await uploadMediaFile(file)
      } catch (e) {
        failed.push((e as Error).message)
      }
    }
    setUploading('')
    load()
    if (failed.length) alert(`올리지 못한 파일이 있습니다.\n\n${failed.join('\n')}`)
  }

  async function cleanUnused() {
    if (unused.length === 0) return
    const total = unused.reduce((sum, m) => sum + m.size, 0)
    if (!confirm(`아무 데도 쓰이지 않는 파일 ${unused.length}개(${formatSize(total)})를 지울까요?\n되돌릴 수 없습니다.`)) return
    const failed: string[] = []
    for (const m of unused) {
      try {
        await api(`/media/${m.name}`, { method: 'DELETE', auth: true })
      } catch (e) {
        failed.push(`${m.originalName || m.name}: ${(e as Error).message}`)
      }
    }
    setSelected(null)
    load()
    if (failed.length) alert(`지우지 못한 파일이 있습니다.\n\n${failed.join('\n')}`)
  }

  return (
    <>
      <PageHeader
        title="미디어 라이브러리"
        description="올린 그림·문서를 한곳에서 보고, 대체 텍스트를 적고, 쓰지 않는 파일을 정리합니다."
        action={
          <div className="flex gap-2">
            <button type="button" onClick={cleanUnused} disabled={IS_DEMO || unused.length === 0} className="btn-secondary disabled:opacity-50">
              미사용 정리{unused.length > 0 && ` (${unused.length})`}
            </button>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,application/zip,.zip"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) upload(e.target.files)
                e.target.value = ''
              }}
            />
            <button type="button" onClick={() => fileRef.current?.click()} disabled={IS_DEMO || !!uploading} className="btn-primary disabled:opacity-50">
              {uploading || '파일 올리기'}
            </button>
          </div>
        }
      />

      {IS_DEMO && (
        <p className="mb-4 rounded-lg bg-amber-50 p-3.5 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          GitHub Pages 데모에는 업로드 서버가 없어 미디어 라이브러리가 비어 있습니다. 로컬 개발 서버에서 이용하세요.
        </p>
      )}

      <div className="card mb-4 flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="파일 이름·대체 텍스트로 찾기" className="input sm:max-w-xs" />
        <select value={kind} onChange={(e) => setKind(e.target.value as KindFilter)} className="select sm:w-36" aria-label="종류">
          <option value="all">모든 종류</option>
          <option value="image">그림</option>
          <option value="doc">문서·기타</option>
        </select>
        <select value={use} onChange={(e) => setUse(e.target.value as UseFilter)} className="select sm:w-36" aria-label="쓰임">
          <option value="all">전체</option>
          <option value="used">쓰이는 파일</option>
          <option value="unused">미사용 파일</option>
        </select>
        <p className="text-sm text-slate-500 sm:ml-auto dark:text-slate-400">
          {items ? `${shown.length}개 · 전체 ${items.length}개` : ''}
        </p>
      </div>

      {error && <ErrorMessage message={error} />}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="card p-4">
          {!items ? (
            <Loading />
          ) : shown.length === 0 ? (
            <EmptyState label={items.length === 0 ? '올린 파일이 없습니다.' : '조건에 맞는 파일이 없습니다.'} />
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
              {shown.map((m) => (
                <li key={m.name}>
                  <button
                    type="button"
                    onClick={() => setSelected(m.name)}
                    aria-pressed={selected === m.name}
                    className={`group block w-full overflow-hidden rounded-lg border text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                      selected === m.name ? 'border-brand-500 ring-2 ring-brand-500/40' : 'border-slate-200 hover:border-slate-400 dark:border-slate-700'
                    }`}
                  >
                    <div className="relative aspect-square bg-slate-100 dark:bg-slate-900">
                      {m.kind === 'image' ? (
                        <img src={m.url} alt={m.alt} loading="lazy" className="h-full w-full object-cover" />
                      ) : (
                        <span className="grid h-full w-full place-items-center text-lg font-bold text-slate-400">{KIND_LABEL[m.kind]}</span>
                      )}
                      {m.usages.length === 0 && (
                        <span className="absolute left-1.5 top-1.5 rounded bg-slate-900/70 px-1.5 py-0.5 text-[10px] font-medium text-white">미사용</span>
                      )}
                    </div>
                    <p className="truncate px-2 pt-1.5 text-xs font-medium text-slate-700 dark:text-slate-200">{m.originalName || m.name}</p>
                    <p className="px-2 pb-1.5 text-[11px] text-slate-400">{formatSize(m.size)}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <aside className="card h-fit p-4 lg:sticky lg:top-[8.75rem]">
          {current ? (
            <MediaDetail
              key={current.name}
              item={current}
              onSaved={(alt, title) => setItems((prev) => prev?.map((m) => (m.name === current.name ? { ...m, alt, title } : m)) ?? null)}
              onDeleted={() => {
                setSelected(null)
                load()
              }}
            />
          ) : (
            <p className="py-10 text-center text-sm text-slate-400">파일을 고르면 자세한 정보가 여기 나옵니다.</p>
          )}
        </aside>
      </div>
    </>
  )
}

/** 고른 파일 — 미리보기·주소 복사·대체 텍스트·쓰인 곳·삭제 */
function MediaDetail({ item, onSaved, onDeleted }: { item: MediaItem; onSaved: (alt: string, title: string) => void; onDeleted: () => void }) {
  const [alt, setAlt] = useState(item.alt)
  const [title, setTitle] = useState(item.title)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const dirty = alt !== item.alt || title !== item.title

  async function save() {
    setSaving(true)
    try {
      await api(`/media/${item.name}`, { method: 'PUT', body: { alt, title }, auth: true })
      invalidateMediaAlts()
      onSaved(alt.trim(), title.trim())
      setNotice('저장했습니다.')
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function copy() {
    const url = `${window.location.origin}${item.url}`
    try {
      await navigator.clipboard.writeText(url)
      setNotice('주소를 복사했습니다.')
    } catch {
      prompt('주소를 복사하세요.', url)
    }
  }

  async function remove() {
    const used = item.usages.length
    const message = used
      ? `이 파일은 ${used}곳에서 쓰이고 있습니다. 지우면 그곳의 그림·첨부가 깨집니다.\n그래도 지울까요? 되돌릴 수 없습니다.`
      : `'${item.originalName || item.name}' 을(를) 지울까요?\n되돌릴 수 없습니다.`
    if (!confirm(message)) return
    try {
      await api(`/media/${item.name}${used ? '?force=1' : ''}`, { method: 'DELETE', auth: true })
      onDeleted()
    } catch (e) {
      alert((e as Error).message)
    }
  }

  return (
    <div className="space-y-4">
      {item.kind === 'image' ? (
        <a href={item.url} target="_blank" rel="noopener noreferrer" title="원본 보기">
          <img src={item.url} alt={item.alt} className="max-h-64 w-full rounded-lg bg-slate-100 object-contain dark:bg-slate-900" />
        </a>
      ) : (
        <a href={item.url} target="_blank" rel="noopener noreferrer" className="grid h-32 place-items-center rounded-lg bg-slate-100 text-sm font-medium text-brand-600 dark:bg-slate-900">
          {KIND_LABEL[item.kind]} 파일 열기 ↗
        </a>
      )}

      <dl className="grid grid-cols-[4.5rem_1fr] gap-y-1.5 text-xs">
        <dt className="text-slate-400">원래 이름</dt>
        <dd className="break-all text-slate-700 dark:text-slate-200">{item.originalName || '—'}</dd>
        <dt className="text-slate-400">파일</dt>
        <dd className="break-all font-mono text-[11px] text-slate-600 dark:text-slate-300">{item.url}</dd>
        <dt className="text-slate-400">크기</dt>
        <dd className="text-slate-700 dark:text-slate-200">{formatSize(item.size)}</dd>
        <dt className="text-slate-400">올린 날</dt>
        <dd className="tabular-nums text-slate-700 dark:text-slate-200">{formatStamp(item.createdAt)}</dd>
      </dl>

      <button type="button" onClick={copy} className="btn-secondary w-full">
        주소 복사
      </button>

      <div className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-700">
        <div>
          <label htmlFor="media-alt" className="label">
            대체 텍스트
          </label>
          <input id="media-alt" value={alt} maxLength={300} onChange={(e) => setAlt(e.target.value)} className="input" placeholder="그림을 설명하는 한 문장" />
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            검색 엔진과 화면 읽기 프로그램이 읽습니다. 본문 그림의 대체 텍스트가 비어 있으면 이 값이 쓰입니다.
          </p>
        </div>
        <div>
          <label htmlFor="media-title" className="label">
            제목
          </label>
          <input id="media-title" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} className="input" placeholder="관리용 이름 (찾기에 쓰입니다)" />
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={save} disabled={saving || !dirty} className="btn-primary disabled:opacity-50">
            {saving ? '저장 중…' : '저장'}
          </button>
          {notice && <span className="text-xs text-green-600">{notice}</span>}
        </div>
      </div>

      <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
        <p className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-300">쓰인 곳 {item.usages.length}곳</p>
        {item.usages.length === 0 ? (
          <p className="text-xs text-slate-400">아무 데도 쓰이지 않습니다.</p>
        ) : (
          <ul className="space-y-1.5">
            {item.usages.map((u, i) => (
              <li key={`${u.link}-${i}`} className="flex items-center gap-2 text-xs">
                <Badge>{u.kind}</Badge>
                <Link to={u.link} className="truncate text-slate-700 hover:text-brand-600 dark:text-slate-200">
                  {u.label}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button type="button" onClick={remove} className="w-full rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:hover:bg-red-950/40">
        파일 삭제
      </button>
    </div>
  )
}
