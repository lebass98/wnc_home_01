import { useEffect, useRef, useState } from 'react'
import type { SitePageBackup, SitePageInfo, SitePageSource } from '@wnc/shared'
import { api } from '../lib/api'
import { formatStamp } from '../lib/format'
import { Loading, Modal } from './ui'

/** 바이트를 KB 로 */
const kb = (n: number) => `${(n / 1024).toFixed(1)} KB`

/**
 * 코드로 만들어진 실제 화면의 소스를 보고 고치는 창.
 * 고치기 전 원본은 서버가 백업으로 남기므로 '백업 N개'에서 되돌릴 수 있다.
 */
export default function SitePageCodeModal({
  item,
  onClose,
  onChanged,
}: {
  item: SitePageInfo
  onClose: () => void
  /** 저장·되돌리기로 파일이 바뀌었을 때 — 목록의 크기·수정일을 다시 읽는다. */
  onChanged?: () => void
}) {
  const [source, setSource] = useState<SitePageSource | null>(null)
  const [loadError, setLoadError] = useState('')
  const [draft, setDraft] = useState('')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [backups, setBackups] = useState<SitePageBackup[]>([])
  const [showBackups, setShowBackups] = useState(false)
  const textRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    let alive = true
    Promise.all([
      api<SitePageSource>(`/site-pages/${item.key}/source`, { auth: true }),
      api<SitePageBackup[]>(`/site-pages/${item.key}/backups`, { auth: true }),
    ])
      .then(([src, list]) => {
        if (!alive) return
        setSource(src)
        setDraft(src.content)
        setBackups(list)
      })
      .catch((e: Error) => alive && setLoadError(e.message))
    return () => {
      alive = false
    }
  }, [item.key])

  function close() {
    if (editing && draft !== source?.content && !confirm('고친 내용을 저장하지 않았습니다. 닫을까요?')) return
    onClose()
  }

  async function handleSave() {
    if (!source) return
    if (!confirm(`${source.file} 을 저장할까요?\n저장 전 원본은 백업으로 남고, 개발 서버에 바로 반영됩니다.`)) return
    setSaving(true)
    setNotice('')
    try {
      const res = await api<{ saved: boolean; message?: string; updatedAt?: string }>(`/site-pages/${source.key}/source`, {
        method: 'PUT',
        body: { content: draft },
        auth: true,
      })
      if (!res.saved) {
        setNotice(res.message ?? '바뀐 내용이 없습니다.')
        return
      }
      setSource({ ...source, content: draft, updatedAt: res.updatedAt ?? source.updatedAt })
      setBackups(await api<SitePageBackup[]>(`/site-pages/${source.key}/backups`, { auth: true }))
      setEditing(false)
      setNotice('저장했습니다. 홈페이지를 새로고침하면 바로 보입니다.')
      onChanged?.()
    } catch (e) {
      setNotice((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function handleRestore(b: SitePageBackup) {
    if (!source) return
    if (!confirm(`${formatStamp(b.createdAt)} 백업으로 되돌릴까요?\n지금 내용도 백업으로 남아 다시 되돌릴 수 있습니다.`)) return
    try {
      await api(`/site-pages/${source.key}/backups/${b.name}/restore`, { method: 'POST', auth: true })
      const src = await api<SitePageSource>(`/site-pages/${source.key}/source`, { auth: true })
      setSource(src)
      setDraft(src.content)
      setBackups(await api<SitePageBackup[]>(`/site-pages/${source.key}/backups`, { auth: true }))
      setEditing(false)
      setNotice('되돌렸습니다. 홈페이지를 새로고침하면 바로 보입니다.')
      onChanged?.()
    } catch (e) {
      alert((e as Error).message)
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(draft)
      setNotice('코드를 복사했습니다.')
    } catch {
      setNotice('복사에 실패했습니다. 코드를 직접 선택해 복사해 주세요.')
    }
  }

  /** Tab 키로 들여쓰기 두 칸 — 브라우저 기본 동작(포커스 이동)을 막는다. */
  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== 'Tab') return
    e.preventDefault()
    const el = e.currentTarget
    const { selectionStart: s, selectionEnd: en } = el
    const next = `${draft.slice(0, s)}  ${draft.slice(en)}`
    setDraft(next)
    requestAnimationFrame(() => el.setSelectionRange(s + 2, s + 2))
  }

  const dirty = editing && source !== null && draft !== source.content
  const lineCount = draft.split('\n').length

  return (
    <Modal
      title={`${item.label} — ${item.file}`}
      onClose={close}
      wide
      footer={
        source ? (
          editing ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setDraft(source.content)
                  setEditing(false)
                }}
                className="btn-secondary"
              >
                편집 취소
              </button>
              <button type="button" onClick={handleSave} disabled={saving || !dirty} className="btn-primary">
                {saving ? '저장 중...' : '저장'}
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={handleCopy} className="btn-secondary">
                복사
              </button>
              <button type="button" onClick={() => setShowBackups((v) => !v)} className="btn-secondary">
                백업 {backups.length}개
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(true)
                  requestAnimationFrame(() => textRef.current?.focus())
                }}
                className="btn-primary"
              >
                코드 편집
              </button>
            </>
          )
        ) : (
          <button type="button" onClick={onClose} className="btn-secondary">
            닫기
          </button>
        )
      }
    >
      {loadError ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{loadError}</p>
      ) : !source ? (
        <Loading label="소스를 읽는 중..." />
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>
              {source.path} · {lineCount}줄 · 수정 {source.updatedAt ? formatStamp(source.updatedAt) : '-'}
            </span>
            {dirty && <span className="font-medium text-amber-600">저장하지 않은 변경이 있습니다</span>}
          </div>

          {notice && (
            <p className="mb-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:bg-slate-900/50 dark:text-slate-300">
              {notice}
            </p>
          )}

          {showBackups && !editing && (
            <div className="mb-3 rounded-lg border border-slate-200 dark:border-slate-700">
              <p className="border-b border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 dark:border-slate-700 dark:text-slate-400">
                저장 전 원본 백업 — 최근 것이 위입니다.
              </p>
              {backups.length === 0 ? (
                <p className="px-3 py-3 text-sm text-slate-500">아직 백업이 없습니다. 코드를 저장하면 그 전 원본이 남습니다.</p>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                  {backups.map((b) => (
                    <li key={b.name} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                      <span className="text-slate-700 dark:text-slate-300">
                        {formatStamp(b.createdAt)} <span className="text-xs text-slate-400">· {kb(b.size)}</span>
                      </span>
                      <button type="button" onClick={() => handleRestore(b)} className="btn-secondary px-2.5 py-1 text-xs">
                        이 백업으로 되돌리기
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* 코드 — 줄 번호와 함께 보여 준다. 편집 중에는 그대로 고칠 수 있다. */}
          <div className="flex overflow-hidden rounded-lg border border-slate-200 bg-slate-950 text-[13px] leading-6 dark:border-slate-700">
            <pre
              aria-hidden
              className="select-none border-r border-white/10 px-3 py-3 text-right tabular-nums text-slate-500"
            >
              {Array.from({ length: lineCount }, (_, i) => i + 1).join('\n')}
            </pre>
            {editing ? (
              <textarea
                ref={textRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKey}
                spellCheck={false}
                className="min-h-[24rem] flex-1 resize-y bg-transparent px-4 py-3 text-slate-100 focus:outline-none"
                style={{ tabSize: 2, whiteSpace: 'pre', overflowWrap: 'normal', overflowX: 'auto' }}
                aria-label="소스 코드"
              />
            ) : (
              <pre className="flex-1 overflow-x-auto px-4 py-3 text-slate-100" style={{ tabSize: 2 }}>
                <code>{draft}</code>
              </pre>
            )}
          </div>
        </>
      )}
    </Modal>
  )
}
