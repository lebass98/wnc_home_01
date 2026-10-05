import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { TrashEntry, TrashList, TrashType } from '@wnc/shared'
import { api, qs } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { formatStamp } from '../../lib/format'
import { Badge, EmptyState, ErrorMessage, Loading, PageHeader } from '../../components/ui'

/**
 * 휴지통 — 삭제한 글·페이지가 30일 동안 머문다.
 * 되살리면 원래 번호로 돌아가고(페이지는 버전 이력까지), 영구 삭제하면 되돌릴 수 없다.
 */

const TYPE_LABEL: Record<TrashType, string> = { post: '게시글', page: '페이지' }
const TABS: { key: TrashType | ''; label: string }[] = [
  { key: '', label: '전체' },
  { key: 'post', label: '게시글' },
  { key: 'page', label: '페이지' },
]

/** 자동으로 비워질 때까지 남은 날 */
function daysLeft(iso: string) {
  return Math.max(0, Math.ceil((Date.parse(iso) - Date.now()) / (24 * 60 * 60 * 1000)))
}

export default function TrashPage() {
  const { user } = useAuth()
  const [type, setType] = useState<TrashType | ''>('')
  const [data, setData] = useState<TrashList | null>(null)
  const [error, setError] = useState('')
  const [working, setWorking] = useState(false)

  const load = useCallback(() => {
    api<TrashList>(`/trash${qs({ type: type || undefined })}`, { auth: true })
      .then((res) => {
        setData(res)
        setError('')
      })
      .catch((e: Error) => setError(e.message))
  }, [type])
  useEffect(load, [load])

  async function restore(item: TrashEntry) {
    setWorking(true)
    try {
      const res = await api<{ type: TrashType; id: number }>(`/trash/${item.id}/restore`, { method: 'POST', auth: true })
      const where = res.type === 'post' ? '게시글 목록' : '페이지 관리'
      alert(`'${item.title}' 을(를) 되살렸습니다. [${where}]에서 확인할 수 있습니다.`)
      load()
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setWorking(false)
    }
  }

  async function purge(item: TrashEntry) {
    if (!confirm(`'${item.title}' 을(를) 영구 삭제할까요?\n되돌릴 수 없습니다.`)) return
    try {
      await api(`/trash/${item.id}`, { method: 'DELETE', auth: true })
      load()
    } catch (e) {
      alert((e as Error).message)
    }
  }

  async function emptyAll() {
    if (!data || data.items.length === 0) return
    if (!confirm(`휴지통의 항목 ${data.items.length}개를 모두 영구 삭제할까요?\n되돌릴 수 없습니다.`)) return
    try {
      await api('/trash', { method: 'DELETE', auth: true })
      load()
    } catch (e) {
      alert((e as Error).message)
    }
  }

  return (
    <>
      <PageHeader
        title="휴지통"
        description={`삭제한 게시글·페이지가 ${data?.keepDays ?? 30}일 동안 보관됩니다. 기간이 지나면 자동으로 영구 삭제됩니다.`}
        action={
          user?.role === 'ADMIN' && (
            <button type="button" onClick={emptyAll} disabled={!data?.items.length} className="btn-secondary text-red-600 disabled:opacity-50">
              휴지통 비우기
            </button>
          )
        }
      />

      <div className="card overflow-hidden">
        <div className="flex gap-1 border-b border-slate-200 px-4 pt-3 dark:border-slate-700">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setType(tab.key)}
              aria-pressed={type === tab.key}
              className={`-mb-px border-b-2 px-3.5 pb-2.5 text-sm font-medium transition ${
                type === tab.key
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="p-4">
            <ErrorMessage message={error} />
          </div>
        )}

        {!data ? (
          <Loading />
        ) : data.items.length === 0 ? (
          <EmptyState label="휴지통이 비어 있습니다." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400">
                  <th className="px-4 py-3">종류</th>
                  <th className="px-4 py-3">제목</th>
                  <th className="px-4 py-3">삭제한 사람</th>
                  <th className="px-4 py-3">삭제일</th>
                  <th className="px-4 py-3">자동 삭제</th>
                  <th className="px-4 py-3 text-right">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {data.items.map((item) => {
                  const left = daysLeft(item.expiresAt)
                  return (
                    <tr key={item.id} className="align-middle hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="px-4 py-3">
                        <Badge tone={item.type === 'post' ? 'blue' : 'slate'}>{TYPE_LABEL[item.type]}</Badge>
                      </td>
                      <td className="max-w-sm px-4 py-3">
                        <p className="truncate font-medium text-slate-900 dark:text-slate-100">{item.title}</p>
                        <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{item.summary}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{item.deletedBy.split('@')[0] || '—'}</td>
                      <td className="whitespace-nowrap px-4 py-3 tabular-nums text-slate-600 dark:text-slate-400">{formatStamp(item.deletedAt)}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className={left <= 3 ? 'font-medium text-red-600' : 'text-slate-600 dark:text-slate-400'}>{left}일 뒤</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <button type="button" onClick={() => restore(item)} disabled={working} className="btn-secondary px-3 py-1.5 text-xs">
                          되살리기
                        </button>
                        <button
                          type="button"
                          onClick={() => purge(item)}
                          className="ml-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 dark:hover:bg-red-950/40"
                        >
                          영구 삭제
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
        게시글은 [<Link to="/admin/posts/list" className="underline">게시판 목록</Link>]에서, 페이지는 [
        <Link to="/admin/pages" className="underline">페이지 관리</Link>]에서 삭제하면 이곳으로 옵니다. 신고 내역·버전 이력도 함께 보관됩니다.
      </p>
    </>
  )
}
