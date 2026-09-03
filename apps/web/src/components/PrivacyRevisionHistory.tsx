import { useEffect, useState } from 'react'
import type { PrivacyRevision, PrivacyRevisionListItem } from '@wnc/shared'
import { api } from '../lib/api'
import { formatDate } from '../lib/format'

/** 날짜를 '2026년 01월 01일' 형태로 */
function longDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}년 ${String(d.getMonth() + 1).padStart(2, '0')}월 ${String(d.getDate()).padStart(2, '0')}일`
}

/**
 * 개인정보 개정이력 — 참고 페이지(zaemit 개인정보처리방침 하단)처럼
 * 최초 시행일·최근 변경일을 적고, 번호·개정이력·보기 표를 둔다. 자세히보기는 당시 본문을 창으로 연다.
 * 이력은 관리자 › 개인정보 이력에서 관리한다.
 */
export default function PrivacyRevisionHistory() {
  const [items, setItems] = useState<PrivacyRevisionListItem[]>([])
  const [detail, setDetail] = useState<PrivacyRevision | null>(null)
  const [loadingId, setLoadingId] = useState<number | null>(null)

  useEffect(() => {
    api<PrivacyRevisionListItem[]>('/privacy-revisions')
      .then(setItems)
      .catch(() => setItems([]))
  }, [])

  // 창이 열려 있는 동안 ESC 로 닫는다.
  useEffect(() => {
    if (!detail) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDetail(null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [detail])

  const open = (id: number) => {
    setLoadingId(id)
    api<PrivacyRevision>(`/privacy-revisions/${id}`)
      .then(setDetail)
      .catch(() => alert('이력을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'))
      .finally(() => setLoadingId(null))
  }

  if (items.length === 0) return null

  // 목록은 최신 시행일이 앞이다.
  const first = items[items.length - 1]
  const latest = items[0]
  const changes = items.length - 1

  return (
    <div className="mt-16 border-t-2 border-slate-900 pt-8">
      <dl className="space-y-1.5 text-[0.95rem] text-slate-700">
        <div className="flex flex-wrap gap-x-3">
          <dt className="font-semibold text-slate-900">최초 개인정보처리방침 시행일 :</dt>
          <dd className="tabular-nums">{longDate(first.effectiveAt)}</dd>
        </div>
        <div className="flex flex-wrap gap-x-3">
          <dt className="font-semibold text-slate-900">개인정보처리방침 {Math.max(changes, 1)}차 변경일 :</dt>
          <dd className="tabular-nums">{changes > 0 ? longDate(latest.effectiveAt) : '변경없음'}</dd>
        </div>
      </dl>

      <h3 className="mt-8 text-lg font-bold text-slate-900">개인정보 개정이력</h3>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[32rem] border-t-2 border-slate-900 text-center text-[0.95rem]">
          <thead>
            <tr className="bg-slate-50 text-sm font-semibold text-slate-900">
              <th className="w-20 border-b border-slate-200 px-4 py-3">번호</th>
              <th className="border-b border-slate-200 px-4 py-3">개정이력</th>
              <th className="w-36 border-b border-slate-200 px-4 py-3">보기</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={item.id} className="text-slate-700">
                <td className="border-b border-slate-200 px-4 py-4 tabular-nums text-slate-500">{items.length - i}</td>
                <td className="border-b border-slate-200 px-4 py-4 text-left">
                  <p className="font-medium text-slate-900">
                    {item.title}
                    <span className="ml-2 text-sm font-normal tabular-nums text-slate-500">
                      (시행일 {formatDate(item.effectiveAt)})
                    </span>
                  </p>
                  {item.summary && <p className="mt-1 text-sm text-slate-500">{item.summary}</p>}
                </td>
                <td className="border-b border-slate-200 px-4 py-4">
                  <button
                    type="button"
                    onClick={() => open(item.id)}
                    disabled={loadingId === item.id}
                    className="inline-flex rounded-md border border-slate-900 px-4 py-1.5 text-sm font-medium text-slate-900 transition hover:bg-slate-900 hover:text-white disabled:opacity-60"
                  >
                    {loadingId === item.id ? '여는 중...' : '자세히보기'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 자세히보기 창 */}
      {detail && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal aria-label={detail.title}>
          <div className="absolute inset-0 bg-slate-950/70" onClick={() => setDetail(null)} aria-hidden />
          <div className="relative flex max-h-[85vh] w-full max-w-3xl flex-col bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5 sm:px-8">
              <div>
                <h4 className="text-lg font-bold text-slate-900">{detail.title}</h4>
                <p className="mt-1 text-sm tabular-nums text-slate-500">시행일 {longDate(detail.effectiveAt)}</p>
              </div>
              <button
                type="button"
                onClick={() => setDetail(null)}
                aria-label="닫기"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto px-6 py-6 sm:px-8">
              {detail.summary && (
                <p className="mb-5 border-l-2 border-mint-400 pl-3 text-sm text-slate-600">변경 요약 — {detail.summary}</p>
              )}
              <p className="whitespace-pre-wrap text-[0.95rem] leading-[1.9] text-slate-700">{detail.content}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
