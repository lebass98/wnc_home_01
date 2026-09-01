import type { PageVersionItem } from '@wnc/shared'
import { formatStamp } from '../lib/format'
import { Badge } from './ui'

/**
 * 페이지 상세·수정 화면이 함께 쓰는 버전 이력 카드.
 * 표는 카드 안쪽에 테두리 박스로 넣어 카드 여백을 유지한다.
 */
export default function PageVersionHistory({
  versions,
  onView,
  emptyLabel,
}: {
  versions: PageVersionItem[]
  onView: (version: number) => void
  /** 값이 있으면 표 대신 이 문구를 보여준다 (새 페이지 등). */
  emptyLabel?: string
}) {
  return (
    <div className="card">
      <h2 className="px-6 pt-5 text-base font-semibold text-slate-900 dark:text-slate-100">버전 이력</h2>

      <div className="px-6 pb-6 pt-4">
        <p className="mb-4 flex items-start gap-2 rounded-lg bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
          <svg className="mt-0.5 h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM11 6a1 1 0 11-2 0 1 1 0 012 0zm-2 3a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          보기 버튼을 클릭하면 내용을 확인하고 복원할 수 있습니다. 저장할 때마다 최근 50개까지 보관됩니다.
        </p>

        {emptyLabel ? (
          <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">{emptyLabel}</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="w-full min-w-[42rem] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400">
                  <th className="px-5 py-3">버전</th>
                  <th className="px-4 py-3">저장자</th>
                  <th className="px-4 py-3">저장일시</th>
                  <th className="px-4 py-3">변경내역</th>
                  <th className="px-5 py-3 text-right">작업</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {versions.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="whitespace-nowrap px-5 py-4">
                      <span className="mr-2 font-semibold text-slate-900 dark:text-slate-100">v{v.version}</span>
                      {v.current && <Badge tone="green">현재</Badge>}
                    </td>
                    <td className="px-4 py-4 text-slate-700 dark:text-slate-300">{v.authorName}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-slate-600 dark:text-slate-400">
                      {formatStamp(v.createdAt)}
                    </td>
                    <td className="px-4 py-4 italic text-slate-500 dark:text-slate-400">{v.note}</td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => onView(v.version)}
                        className="rounded-md bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-600 transition hover:bg-brand-100 dark:bg-brand-600/20 dark:text-brand-300"
                      >
                        보기
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
