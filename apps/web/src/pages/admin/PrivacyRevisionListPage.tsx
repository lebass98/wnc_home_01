import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { PrivacyRevisionListItem } from '@wnc/shared'
import { api } from '../../lib/api'
import { formatDate, formatStamp } from '../../lib/format'
import { EmptyState, ErrorMessage, Loading, PageHeader, RowMenu } from '../../components/ui'

const ICON = {
  edit: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.586-9.414a2 2 0 112.828 2.828L11.828 15.9 8 16.9l1-3.828 8.414-8.486z',
  trash: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M4 7h16M10 4h4a1 1 0 011 1v2H9V5a1 1 0 011-1z',
}

/**
 * 개인정보처리방침 개정 이력 — 홈페이지 방침 하단 '개정이력' 표에 그대로 보인다.
 * 최신 시행일이 위로 오고, 번호는 오래된 것부터 1번이다.
 */
export default function PrivacyRevisionListPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<PrivacyRevisionListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    api<PrivacyRevisionListItem[]>('/privacy-revisions')
      .then(setItems)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(load, [load])

  async function handleDelete(item: PrivacyRevisionListItem) {
    if (!confirm(`'${item.title}' 이력을 삭제할까요?\n삭제하면 되돌릴 수 없습니다.`)) return
    try {
      await api(`/privacy-revisions/${item.id}`, { method: 'DELETE', auth: true })
      load()
    } catch (e) {
      alert((e as Error).message)
    }
  }

  return (
    <>
      <PageHeader
        title="개인정보 이력"
        description="개인정보처리방침의 개정 이력을 관리합니다. 홈페이지 방침 하단의 '개정이력' 표에 그대로 보이고, 자세히보기로 당시 본문을 엽니다."
        action={
          <Link to="/admin/privacy-revisions/new" className="btn-primary">
            + 이력 등록
          </Link>
        }
      />

      {error && (
        <div className="mb-4">
          <ErrorMessage message={error} />
        </div>
      )}

      <div className="card">
        {loading ? (
          <Loading />
        ) : items.length === 0 ? (
          <EmptyState label="등록된 개정 이력이 없습니다. 오른쪽 위 '이력 등록'으로 첫 이력을 만들어 보세요." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[56rem] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400">
                  <th className="w-16 px-4 py-3">번호</th>
                  <th className="px-4 py-3">개정이력</th>
                  <th className="w-32 px-4 py-3">시행일</th>
                  <th className="w-40 px-4 py-3">등록일</th>
                  <th className="w-20 px-4 py-3 text-right">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {items.map((item, i) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{items.length - i}</td>
                    <td className="max-w-md px-4 py-3">
                      <Link
                        to={`/admin/privacy-revisions/${item.id}`}
                        className="block truncate font-medium text-slate-900 hover:text-brand-600 dark:text-slate-100"
                      >
                        {item.title}
                      </Link>
                      {item.summary && (
                        <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{item.summary}</p>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-400">
                      {formatDate(item.effectiveAt)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-400">
                      {formatStamp(item.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <RowMenu
                        items={[
                          { label: '수정', icon: ICON.edit, onClick: () => navigate(`/admin/privacy-revisions/${item.id}`) },
                          { label: '삭제', icon: ICON.trash, danger: true, onClick: () => handleDelete(item) },
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
    </>
  )
}
