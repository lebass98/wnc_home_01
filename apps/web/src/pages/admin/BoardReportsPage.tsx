import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Paginated, PostReportItem, ReportStatus } from '@wnc/shared'
import { REPORT_STATUS_LABEL, REPORT_STATUSES } from '@wnc/shared'
import { api, qs } from '../../lib/api'
import { formatDateTime } from '../../lib/format'
import { Badge, EmptyState, ErrorMessage, Loading, PageHeader, Pagination, RowMenu } from '../../components/ui'

/**
 * 게시판 신고현황 — 방문자가 접수한 신고를 확인하고 처리한다.
 * 신고 받기와 사유 목록은 [게시판 환경설정 > 게시판 설정]에서 정한다.
 */

const STATUS_TONE: Record<ReportStatus, 'red' | 'green' | 'slate'> = {
  NEW: 'red',
  DONE: 'green',
  REJECTED: 'slate',
}

const ICON = {
  done: 'M5 13l4 4L19 7',
  reject: 'M6 18L18 6M6 6l12 12',
  back: 'M3 10h11a4 4 0 010 8h-1M3 10l4-4M3 10l4 4',
  trash: 'M19 7l-.9 12.1A2 2 0 0116.1 21H7.9a2 2 0 01-2-1.9L5 7m3 0V5a2 2 0 012-2h4a2 2 0 012 2v2m-9 0h12',
}

export default function BoardReportsPage() {
  const [data, setData] = useState<Paginated<PostReportItem> | null>(null)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<'all' | ReportStatus>('all')
  const [q, setQ] = useState('')
  const [keyword, setKeyword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [openMemo, setOpenMemo] = useState<number | null>(null)
  const [memo, setMemo] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    api<Paginated<PostReportItem>>(`/reports${qs({ page, pageSize: 20, status, q: keyword || undefined })}`, { auth: true })
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [page, status, keyword])

  useEffect(load, [load])

  /** 처리 상태를 바꾼다 — 처리·반려하면 신고로 가려 둔 글이 다시 보인다. */
  async function change(item: PostReportItem, next: ReportStatus) {
    try {
      await api(`/reports/${item.id}`, { method: 'PATCH', body: { status: next }, auth: true })
      load()
    } catch (e) {
      alert((e as Error).message)
    }
  }

  async function saveMemo(item: PostReportItem) {
    try {
      await api(`/reports/${item.id}`, { method: 'PATCH', body: { memo }, auth: true })
      setOpenMemo(null)
      load()
    } catch (e) {
      alert((e as Error).message)
    }
  }

  async function remove(item: PostReportItem) {
    if (!confirm('이 신고 기록을 지울까요?\n글은 그대로 두고 기록만 지웁니다.')) return
    try {
      await api(`/reports/${item.id}`, { method: 'DELETE', auth: true })
      load()
    } catch (e) {
      alert((e as Error).message)
    }
  }

  const counts = data?.items.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1
    return acc
  }, {})

  return (
    <>
      <PageHeader
        title="게시판 신고현황"
        description="이용자가 신고한 게시글을 확인하고 처리합니다. 신고 받기와 사유는 [게시판 환경설정 > 게시판 설정]에서 정합니다."
        action={
          <Link to="/admin/posts/settings?tab=board" className="btn-secondary">
            신고 설정
          </Link>
        }
      />

      {error && <ErrorMessage message={error} />}

      {/* 상태 거르기 · 검색 */}
      <div className="card mb-4 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {(['all', ...REPORT_STATUSES] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setStatus(key)
                setPage(1)
              }}
              className={`rounded-lg px-3.5 py-2 text-sm font-medium transition ${
                status === key
                  ? 'bg-brand-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              {key === 'all' ? '전체' : REPORT_STATUS_LABEL[key]}
              {counts && key !== 'all' && counts[key] ? ` ${counts[key]}` : ''}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            setKeyword(q.trim())
            setPage(1)
          }}
          className="flex gap-2"
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="글 제목·사유로 검색"
            className="input sm:w-64"
          />
          <button type="submit" className="btn-secondary shrink-0">
            검색
          </button>
        </form>
      </div>

      <div className="card">
        {loading ? (
          <Loading />
        ) : !data || data.items.length === 0 ? (
          <EmptyState label="접수된 신고가 없습니다." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[54rem] text-left text-sm">
              <thead className="border-b border-slate-200 text-xs font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-400">
                <tr>
                  <th className="w-24 px-4 py-3">상태</th>
                  <th className="px-4 py-3">신고한 글</th>
                  <th className="w-40 px-4 py-3">사유</th>
                  <th className="w-40 px-4 py-3">접수일</th>
                  <th className="w-24 px-4 py-3 text-right">처리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {data.items.map((item) => (
                  <tr key={item.id} className="align-top">
                    <td className="px-4 py-3">
                      <Badge tone={STATUS_TONE[item.status]}>{REPORT_STATUS_LABEL[item.status]}</Badge>
                    </td>

                    <td className="px-4 py-3">
                      {item.postTitle ? (
                        <Link
                          to={`/admin/posts/${item.postId}`}
                          className="font-medium text-slate-900 hover:text-brand-600 dark:text-slate-100"
                        >
                          {item.postTitle}
                        </Link>
                      ) : (
                        <span className="text-slate-400">삭제된 글</span>
                      )}
                      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                        <span>신고 {item.postReportCount}건</span>
                        {item.postHidden && (
                          <>
                            <span aria-hidden>·</span>
                            <span className="font-medium text-red-600">신고로 가려짐</span>
                          </>
                        )}
                      </p>
                      {item.detail && <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300">{item.detail}</p>}
                      {item.memo && (
                        <p className="mt-1.5 rounded bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600 dark:bg-slate-900/50 dark:text-slate-400">
                          메모 — {item.memo}
                        </p>
                      )}

                      {openMemo === item.id && (
                        <div className="mt-2 flex gap-2">
                          <input
                            value={memo}
                            onChange={(e) => setMemo(e.target.value)}
                            placeholder="처리 메모"
                            className="input"
                            maxLength={500}
                          />
                          <button type="button" onClick={() => saveMemo(item)} className="btn-primary shrink-0 px-3 py-1.5 text-xs">
                            저장
                          </button>
                          <button type="button" onClick={() => setOpenMemo(null)} className="btn-secondary shrink-0 px-3 py-1.5 text-xs">
                            취소
                          </button>
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{item.reason}</td>
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums text-slate-500 dark:text-slate-400">
                      {formatDateTime(item.createdAt)}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <RowMenu
                        items={[
                          ...(item.status !== 'DONE'
                            ? [{ label: '처리완료', icon: ICON.done, onClick: () => change(item, 'DONE') }]
                            : []),
                          ...(item.status !== 'REJECTED'
                            ? [{ label: '반려', icon: ICON.reject, onClick: () => change(item, 'REJECTED') }]
                            : []),
                          ...(item.status !== 'NEW'
                            ? [{ label: '접수로 되돌리기', icon: ICON.back, onClick: () => change(item, 'NEW') }]
                            : []),
                          {
                            label: '메모 남기기',
                            icon: 'M9 12h6m-6 4h4M8 4h8a2 2 0 012 2v12a2 2 0 01-2 2H8a2 2 0 01-2-2V6a2 2 0 012-2z',
                            onClick: () => {
                              setMemo(item.memo)
                              setOpenMemo(item.id)
                            },
                          },
                          { label: '기록 삭제', icon: ICON.trash, danger: true, onClick: () => remove(item) },
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} total={data.total} pageSize={data.pageSize} />}
    </>
  )
}
