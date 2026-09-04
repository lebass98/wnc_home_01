import { useEffect, useState } from 'react'
import type { BoardSetting } from '@wnc/shared'
import { api } from '../lib/api'

/**
 * 글 신고 — 부적절한 글을 방문자가 알려 준다.
 * 받을지 여부와 고를 수 있는 사유는 관리자 [게시판 환경설정 > 게시판 설정]에서 정한다.
 * 접수한 신고는 [게시판 신고현황]에서 처리한다.
 */
export default function PostReportButton({ postId }: { postId: number }) {
  const [setting, setSetting] = useState<BoardSetting | null>(null)
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [detail, setDetail] = useState('')
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    api<BoardSetting>('/board-settings')
      .then(setSetting)
      // 설정을 못 받으면 신고 버튼을 보이지 않는다 — 없어도 글은 읽을 수 있다.
      .catch(() => setSetting(null))
  }, [])

  const reasons = (setting?.reportReasons ?? '')
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean)

  // 창을 열면 첫 사유를 골라 둔다.
  useEffect(() => {
    if (open && !reason) setReason(reasons[0] ?? '')
  }, [open, reason, reasons])

  // 열려 있는 동안 ESC 로 닫는다.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  if (!setting?.reportEnabled || reasons.length === 0) return null

  async function send() {
    if (!reason) {
      setError('신고 사유를 골라 주세요.')
      return
    }
    setSending(true)
    setError('')
    try {
      const res = await api<{ message: string }>('/reports', {
        method: 'POST',
        body: { postId, reason, detail: detail.trim() },
      })
      setDone(res.message)
      setOpen(false)
      setDetail('')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      {done ? (
        <p className="text-sm text-mint-600">{done}</p>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-slate-700"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 21V5a2 2 0 012-2h9l-1 3h5a1 1 0 011 1v7a1 1 0 01-1 1h-6l1-3H5" />
          </svg>
          신고
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal aria-label="글 신고">
          <div className="absolute inset-0 bg-slate-950/60" onClick={() => setOpen(false)} aria-hidden />
          <div className="relative w-full max-w-md bg-white p-6 shadow-2xl sm:p-8">
            <h2 className="text-lg font-bold text-slate-900">이 글을 신고합니다</h2>
            <p className="mt-1.5 text-sm text-slate-500">
              접수된 내용은 관리자가 확인해 조치합니다. 같은 글은 한 번만 신고할 수 있습니다.
            </p>

            <fieldset className="mt-5">
              <legend className="text-sm font-semibold text-slate-900">신고 사유</legend>
              <div className="mt-2 space-y-1.5">
                {reasons.map((r) => (
                  <label key={r} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                    <input
                      type="radio"
                      name="report-reason"
                      checked={reason === r}
                      onChange={() => setReason(r)}
                      className="h-4 w-4 border-slate-300 text-mint-600 focus:ring-mint-500"
                    />
                    {r}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="mt-4">
              <label htmlFor="report-detail" className="text-sm font-semibold text-slate-900">
                자세한 내용 <span className="font-normal text-slate-400">(선택)</span>
              </label>
              <textarea
                id="report-detail"
                rows={3}
                maxLength={500}
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                placeholder="어떤 점이 문제인지 적어 주시면 처리에 도움이 됩니다."
                className="mt-1.5 w-full resize-y border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-mint-500 focus:outline-none"
              />
            </div>

            {error && <p className="mt-3 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={send}
                disabled={sending}
                className="bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-mint-600 disabled:opacity-60"
              >
                {sending ? '보내는 중...' : '신고하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
