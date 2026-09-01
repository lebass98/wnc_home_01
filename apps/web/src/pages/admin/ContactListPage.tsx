import { useCallback, useEffect, useState } from 'react'
import type { Contact, ContactStatus, Paginated } from '@wnc/shared'
import { CONTACT_STATUS_LABEL } from '@wnc/shared'
import { api, qs } from '../../lib/api'
import { formatDateTime } from '../../lib/format'
import { Badge, EmptyState, ErrorMessage, Loading, PageHeader, Pagination } from '../../components/ui'

const STATUS_TONE = { NEW: 'red', IN_PROGRESS: 'amber', DONE: 'green' } as const
const STATUSES: ContactStatus[] = ['NEW', 'IN_PROGRESS', 'DONE']

export default function ContactListPage() {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<ContactStatus | ''>('')
  const [keyword, setKeyword] = useState('')
  const [q, setQ] = useState('')

  const [data, setData] = useState<Paginated<Contact> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [selected, setSelected] = useState<Contact | null>(null)
  const [memo, setMemo] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    api<Paginated<Contact>>(
      `/contacts${qs({ page, pageSize: 10, status: status || undefined, q: q || undefined })}`,
      { auth: true },
    )
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [page, status, q])

  useEffect(load, [load])

  function openDetail(contact: Contact) {
    setSelected(contact)
    setMemo(contact.memo ?? '')
  }

  /** 상태와 메모를 함께 저장하고 목록을 갱신한다. */
  async function save(nextStatus: ContactStatus) {
    if (!selected) return
    setSaving(true)
    try {
      const updated = await api<Contact>(`/contacts/${selected.id}`, {
        method: 'PATCH',
        body: { status: nextStatus, memo: memo || null },
        auth: true,
      })
      setSelected(updated)
      load()
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(contact: Contact) {
    if (!confirm(`${contact.name}님의 문의를 삭제할까요?\n삭제한 문의는 복구할 수 없습니다.`)) return
    try {
      await api(`/contacts/${contact.id}`, { method: 'DELETE', auth: true })
      setSelected(null)
      load()
    } catch (e) {
      alert((e as Error).message)
    }
  }

  return (
    <>
      <PageHeader title="문의 관리" description="홈페이지를 통해 접수된 문의를 확인하고 처리합니다." />

      <div className="card">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 dark:border-slate-700 sm:flex-row sm:items-center">
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as ContactStatus | '')
              setPage(1)
            }}
            className="select sm:w-40"
          >
            <option value="">전체 상태</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {CONTACT_STATUS_LABEL[s]}
              </option>
            ))}
          </select>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              setQ(keyword)
              setPage(1)
            }}
            className="flex flex-1 gap-2"
          >
            <input
              type="search"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="이름·이메일·회사명 검색"
              className="input"
            />
            <button type="submit" className="btn-secondary shrink-0">
              검색
            </button>
          </form>
        </div>

        {error && <div className="p-4"><ErrorMessage message={error} /></div>}

        {loading ? (
          <Loading />
        ) : !data || data.items.length === 0 ? (
          <EmptyState label="접수된 문의가 없습니다." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400">
                  <th className="px-4 py-3">상태</th>
                  <th className="px-4 py-3">이름</th>
                  <th className="px-4 py-3">회사</th>
                  <th className="px-4 py-3">문의 내용</th>
                  <th className="px-4 py-3">접수일시</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {data.items.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => openDetail(c)}
                    className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50"
                  >
                    <td className="px-4 py-3">
                      <Badge tone={STATUS_TONE[c.status]}>{CONTACT_STATUS_LABEL[c.status]}</Badge>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{c.name}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{c.company ?? '-'}</td>
                    <td className="max-w-xs truncate px-4 py-3 text-slate-600 dark:text-slate-400">{c.message}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{formatDateTime(c.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />}
      </div>

      {/* 상세 드로어 */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setSelected(null)} aria-hidden />
          <aside className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl dark:bg-slate-800">
            <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
              <h2 className="font-semibold text-slate-900 dark:text-slate-100">문의 상세</h2>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
                aria-label="닫기"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </header>

            <div className="flex-1 space-y-6 overflow-y-auto p-6">
              <dl className="space-y-3.5">
                {[
                  ['이름', selected.name],
                  ['이메일', selected.email],
                  ['연락처', selected.phone ?? '-'],
                  ['회사명', selected.company ?? '-'],
                  ['접수일시', formatDateTime(selected.createdAt)],
                ].map(([k, v]) => (
                  <div key={k} className="flex gap-4">
                    <dt className="w-20 shrink-0 text-sm text-slate-500 dark:text-slate-400">{k}</dt>
                    <dd className="break-all text-sm text-slate-900 dark:text-slate-100">{v}</dd>
                  </div>
                ))}
              </dl>

              <div>
                <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">문의 내용</h3>
                <p className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-50 dark:bg-slate-900/50 p-4 text-sm leading-relaxed text-slate-800">
                  {selected.message}
                </p>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-medium text-slate-500 dark:text-slate-400">처리 상태</h3>
                <div className="flex gap-2">
                  {STATUSES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      disabled={saving}
                      onClick={() => save(s)}
                      className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
                        selected.status === s
                          ? 'bg-brand-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                      }`}
                    >
                      {CONTACT_STATUS_LABEL[s]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="memo" className="label">
                  내부 메모
                </label>
                <textarea
                  id="memo"
                  rows={5}
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  className="input resize-none"
                  placeholder="처리 내용이나 참고사항을 기록하세요."
                />
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => save(selected.status)}
                  className="btn-primary mt-3 w-full"
                >
                  {saving ? '저장 중...' : '메모 저장'}
                </button>
              </div>
            </div>

            <footer className="border-t border-slate-200 p-6 dark:border-slate-700">
              <div className="flex gap-3">
                <a href={`mailto:${selected.email}`} className="btn-secondary flex-1">
                  이메일 답장
                </a>
                <button type="button" onClick={() => handleDelete(selected)} className="btn-danger">
                  삭제
                </button>
              </div>
            </footer>
          </aside>
        </div>
      )}
    </>
  )
}
