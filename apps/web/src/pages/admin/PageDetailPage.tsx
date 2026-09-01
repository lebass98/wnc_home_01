import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { Page, PageVersionDetail, PageVersionItem } from '@wnc/shared'
import { api } from '../../lib/api'
import { formatStamp } from '../../lib/format'
import RichText from '../../components/RichText'
import { Badge, ErrorMessage, Loading, Modal, PageHeader } from '../../components/ui'

export default function PageDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [page, setPage] = useState<Page | null>(null)
  const [versions, setVersions] = useState<PageVersionItem[]>([])
  const [preview, setPreview] = useState<PageVersionDetail | null>(null)
  const [openPreviewCard, setOpenPreviewCard] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      api<Page>(`/pages/${id}`, { auth: true }),
      api<PageVersionItem[]>(`/pages/${id}/versions`, { auth: true }),
    ])
      .then(([p, list]) => {
        setPage(p)
        setVersions(list)
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(load, [load])

  /** 목록으로 돌아가지 않고 이 화면에서 바로 발행 상태를 바꾼다. */
  async function handlePublish(published: boolean) {
    if (!page || page.published === published) return
    try {
      await api('/pages/bulk', { method: 'PATCH', body: { ids: [page.id], published }, auth: true })
      load()
    } catch (e) {
      alert((e as Error).message)
    }
  }

  async function openVersion(version: number) {
    try {
      setPreview(await api<PageVersionDetail>(`/pages/${id}/versions/${version}`, { auth: true }))
    } catch (e) {
      alert((e as Error).message)
    }
  }

  /** 이전 버전으로 되돌린다. 지금 내용도 버전으로 남아 다시 되돌릴 수 있다. */
  async function handleRestore(version: number) {
    if (!confirm(`v${version} 내용으로 복원할까요?\n지금 내용은 버전 이력에 그대로 남습니다.`)) return
    try {
      await api(`/pages/${id}/versions/${version}/restore`, { method: 'POST', auth: true })
      setPreview(null)
      load()
    } catch (e) {
      alert((e as Error).message)
    }
  }

  if (loading) return <Loading />
  if (error || !page) return <ErrorMessage message={error || '페이지를 찾을 수 없습니다.'} />

  // 작성자는 가장 오래된 버전을 남긴 사람이다.
  const author = versions.length > 0 ? versions[versions.length - 1].authorName : '-'

  return (
    <>
      <PageHeader
        title="페이지 상세"
        description="페이지 내용과 저장된 버전 이력을 확인합니다."
        action={
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => navigate('/admin/pages')} className="btn-secondary">
              목록
            </button>
            <Link to={`/admin/pages/${page.id}`} className="btn-primary">
              수정
            </Link>
          </div>
        }
      />

      {/* 기본 정보 */}
      <div className="card mb-6 p-6">
        <div className="inline-flex rounded-lg border border-slate-200 p-0.5 dark:border-slate-600">
          {([true, false] as const).map((state) => (
            <button
              key={String(state)}
              type="button"
              onClick={() => handlePublish(state)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                page.published === state
                  ? state
                    ? 'bg-green-100 text-green-700'
                    : 'bg-slate-200 text-slate-700 dark:bg-slate-600 dark:text-slate-100'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              {state ? '발행' : '미발행'}
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{page.title}</h2>
          <span className="font-mono text-sm text-slate-500 dark:text-slate-400">{page.slug}</span>
          <Badge tone="blue">v{page.version}</Badge>
          <a
            href={`${import.meta.env.BASE_URL}page/${page.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
            페이지 보기
          </a>
        </div>

        {page.description && (
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{page.description}</p>
        )}

        <dl className="mt-5 grid gap-x-10 gap-y-3 border-t border-slate-200 pt-5 text-sm dark:border-slate-700 sm:grid-cols-2">
          {[
            ['작성자', author],
            ['발행일시', formatStamp(page.publishedAt)],
            ['생성일', formatStamp(page.createdAt)],
            ['수정일', formatStamp(page.updatedAt)],
          ].map(([label, value]) => (
            <div key={label} className="flex gap-6">
              <dt className="w-20 shrink-0 text-slate-500 dark:text-slate-400">{label}</dt>
              <dd className="text-slate-800 dark:text-slate-200">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* 내용 미리보기 */}
      <div className="card mb-6">
        <button
          type="button"
          onClick={() => setOpenPreviewCard((v) => !v)}
          className="flex w-full items-center justify-between px-6 py-4 text-left"
          aria-expanded={openPreviewCard}
        >
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">내용 미리보기</h2>
          <svg
            className={`h-5 w-5 text-slate-400 transition ${openPreviewCard ? '' : 'rotate-180'}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
        </button>
        {openPreviewCard && (
          <div className="px-6 pb-8 pt-1">
            <RichText html={page.content} />
          </div>
        )}
      </div>

      {/* 버전 이력 */}
      <div className="card">
        <div className="px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">버전 이력</h2>
        </div>

        <div className="px-6">
          <p className="flex items-start gap-2 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
            <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            보기 버튼을 누르면 그 시점의 내용을 확인하고 복원할 수 있습니다. 저장할 때마다 최근 50개까지 보관됩니다.
          </p>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[42rem] text-sm">
            <thead>
              <tr className="border-y border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400">
                <th className="px-6 py-3">버전</th>
                <th className="px-4 py-3">저장자</th>
                <th className="px-4 py-3">저장일시</th>
                <th className="px-4 py-3">변경내역</th>
                <th className="px-6 py-3 text-right">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {versions.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className="mr-2 font-semibold text-slate-900 dark:text-slate-100">v{v.version}</span>
                    {v.current && <Badge tone="green">현재</Badge>}
                  </td>
                  <td className="px-4 py-4 text-slate-700 dark:text-slate-300">{v.authorName}</td>
                  <td className="whitespace-nowrap px-4 py-4 text-slate-600 dark:text-slate-400">
                    {formatStamp(v.createdAt)}
                  </td>
                  <td className="px-4 py-4 italic text-slate-500 dark:text-slate-400">{v.note}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => openVersion(v.version)}
                      className="rounded-md border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 transition hover:bg-brand-100"
                    >
                      보기
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {preview && (
        <Modal
          title={`v${preview.version} 내용 보기`}
          onClose={() => setPreview(null)}
          wide
          footer={
            <>
              {!preview.current && (
                <button type="button" onClick={() => handleRestore(preview.version)} className="btn-primary">
                  이 버전으로 복원
                </button>
              )}
              <button type="button" onClick={() => setPreview(null)} className="btn-secondary">
                닫기
              </button>
            </>
          }
        >
          <p className="mb-1 text-lg font-bold text-slate-900 dark:text-slate-100">{preview.title}</p>
          <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
            {preview.note} · {preview.authorName} · {formatStamp(preview.createdAt)}
          </p>
          {preview.description && (
            <p className="mb-4 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:bg-slate-900/50 dark:text-slate-400">
              {preview.description}
            </p>
          )}
          <RichText html={preview.content} />
        </Modal>
      )}
    </>
  )
}
