import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { Page, PageVersionDetail, PageVersionItem } from '@wnc/shared'
import { api } from '../../lib/api'
import { formatStamp } from '../../lib/format'
import RichText from '../../components/RichText'
import PageVersionHistory from '../../components/PageVersionHistory'
import SitePreviewModal from '../../components/SitePreviewModal'
import { Badge, ErrorMessage, Loading, Modal, PageHeader } from '../../components/ui'

/** 한 줄로 저장된 HTML 을 태그마다 줄을 나눠 읽기 쉽게 만든다. 내용 자체는 바꾸지 않는다. */
function formatHtml(html: string): string {
  return html
    .replace(/></g, '>\n<')
    .replace(/(<\/(?:p|h[1-6]|li|ul|ol|blockquote|pre|table|tr|div)>)/g, '$1\n')
    .replace(/\n{2,}/g, '\n')
    .trim()
}

export default function PageDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [page, setPage] = useState<Page | null>(null)
  const [versions, setVersions] = useState<PageVersionItem[]>([])
  const [preview, setPreview] = useState<PageVersionDetail | null>(null)
  const [openPreviewCard, setOpenPreviewCard] = useState(true)
  // 미리보기 카드에서 렌더링 결과 대신 실제 HTML 코드를 본다.
  const [showCode, setShowCode] = useState(false)
  const [sitePreview, setSitePreview] = useState(false)
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
            <button type="button" onClick={() => setSitePreview(true)} className="btn-secondary">
              실제 화면 미리보기
            </button>
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
          <span className="tabular-nums text-sm text-slate-500 dark:text-slate-400">{page.slug}</span>
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
            ['검색 제목', page.metaTitle || `(제목 사용) ${page.title}`],
            ['검색 설명', page.metaDescription || (page.description ? `(한 줄 설명 사용) ${page.description}` : '(사이트 기본값)')],
            ['공유 이미지', page.ogImage || '(사이트 기본값)'],
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
            <div className="mb-4 inline-flex rounded-lg border border-slate-200 p-0.5 dark:border-slate-600">
              {([false, true] as const).map((code) => (
                <button
                  key={String(code)}
                  type="button"
                  onClick={() => setShowCode(code)}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                    showCode === code
                      ? 'bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-900'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {code ? '코드 보기' : '미리보기'}
                </button>
              ))}
            </div>
            {showCode ? (
              // 저장된 HTML 을 있는 그대로 — 태그가 해석되지 않고 코드로 보인다.
              <pre className="overflow-x-auto rounded-lg bg-slate-950 px-4 py-3 text-[13px] leading-6 text-slate-100">
                <code>{formatHtml(page.content)}</code>
              </pre>
            ) : (
              <RichText html={page.content} />
            )}
          </div>
        )}
      </div>

      <PageVersionHistory versions={versions} onView={openVersion} />

      {sitePreview && (
        <SitePreviewModal slug={page.slug} published={page.published} onClose={() => setSitePreview(false)} />
      )}

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
