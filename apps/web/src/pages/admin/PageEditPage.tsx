import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { Page, PageInput, PageVersionDetail, PageVersionItem } from '@wnc/shared'
import { api } from '../../lib/api'
import { formatStamp } from '../../lib/format'
import RichEditor from '../../components/RichEditor'
import RichText from '../../components/RichText'
import PageVersionHistory from '../../components/PageVersionHistory'
import { Badge, ErrorMessage, Loading, Modal, PageHeader } from '../../components/ui'

const EMPTY: PageInput = {
  slug: '',
  title: '',
  description: '',
  content: '',
  published: false,
  showInNav: false,
  sortOrder: 0,
}

export default function PageEditPage() {
  const { id } = useParams<{ id: string }>()
  const isNew = !id
  const navigate = useNavigate()

  const [form, setForm] = useState<PageInput>(EMPTY)
  const [current, setCurrent] = useState<Page | null>(null)
  const [versions, setVersions] = useState<PageVersionItem[]>([])
  const [preview, setPreview] = useState<PageVersionDetail | null>(null)
  const [openContent, setOpenContent] = useState(true)

  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  /** 페이지 내용과 버전 이력을 함께 다시 읽는다. */
  const load = useCallback(() => {
    if (!id) return
    setLoading(true)
    Promise.all([
      api<Page>(`/pages/${id}`, { auth: true }),
      api<PageVersionItem[]>(`/pages/${id}/versions`, { auth: true }),
    ])
      .then(([page, list]) => {
        setCurrent(page)
        setVersions(list)
        setForm({
          slug: page.slug,
          title: page.title,
          description: page.description ?? '',
          content: page.content,
          published: page.published,
          showInNav: page.showInNav,
          sortOrder: page.sortOrder,
        })
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(load, [load])

  function set<K extends keyof PageInput>(key: K, value: PageInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setNotice('')
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    try {
      if (isNew) {
        const created = await api<Page>('/pages', { method: 'POST', body: form, auth: true })
        // 만들자마자 버전 이력을 볼 수 있도록 수정 화면으로 넘어간다.
        navigate(`/admin/pages/${created.id}`, { replace: true })
      } else {
        await api<Page>(`/pages/${id}`, { method: 'PUT', body: form, auth: true })
        load()
        setNotice('저장했습니다. 바뀐 내용은 새 버전으로 보관됩니다.')
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
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
      setNotice(`v${version} 내용으로 복원했습니다.`)
    } catch (e) {
      alert((e as Error).message)
    }
  }

  if (loading) return <Loading />

  // 작성자는 가장 오래된 버전을 남긴 사람이다.
  const author = versions.length > 0 ? versions[versions.length - 1].authorName : '-'

  return (
    <>
      <PageHeader
        title={isNew ? '페이지 추가' : '페이지 수정'}
        description={
          isNew
            ? '발행 상태로 저장하면 /page/슬러그 주소로 홈페이지에 바로 노출됩니다.'
            : '저장할 때마다 이전 내용이 버전으로 보관되어 언제든 복원할 수 있습니다.'
        }
        action={
          <div className="flex items-center gap-2">
            {!isNew && (
              <button
                type="button"
                onClick={() => navigate(`/admin/pages/${id}/detail`)}
                className="btn-secondary"
              >
                상세
              </button>
            )}
            <button type="button" onClick={() => navigate('/admin/pages')} className="btn-secondary">
              목록
            </button>
          </div>
        }
      />

      {error && <div className="mb-4"><ErrorMessage message={error} /></div>}
      {notice && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {notice}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* 기본 정보 */}
        <div className="card mb-6 p-6">
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 dark:border-slate-600">
            {([true, false] as const).map((state) => (
              <button
                key={String(state)}
                type="button"
                onClick={() => set('published', state)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                  form.published === state
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

          <div className="mt-4">
            <label htmlFor="title" className="label">
              제목 <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              required
              maxLength={200}
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              className="input text-lg font-semibold"
              placeholder="예) 문의하기"
            />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto]">
            <div>
              <label htmlFor="slug" className="label">
                슬러그
              </label>
              <input
                id="slug"
                maxLength={80}
                value={form.slug ?? ''}
                onChange={(e) => set('slug', e.target.value)}
                className="input tabular-nums"
                placeholder="비우면 제목에서 자동 생성"
              />
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                주소: /page/{form.slug?.trim() || '자동생성'}
              </p>
            </div>

            {current && (
              <div className="flex items-center gap-3 sm:mt-7 sm:self-start">
                <Badge tone="blue">v{current.version}</Badge>
                {current.published && (
                  <a
                    href={`${import.meta.env.BASE_URL}page/${current.slug}`}
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
                )}
              </div>
            )}
          </div>

          <div className="mt-4">
            <label htmlFor="description" className="label">
              한 줄 설명
            </label>
            <input
              id="description"
              maxLength={300}
              value={form.description ?? ''}
              onChange={(e) => set('description', e.target.value)}
              className="input"
              placeholder="페이지 상단에 제목과 함께 보여집니다."
            />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_10rem]">
            <label className="flex cursor-pointer items-center gap-2.5 sm:mt-8">
              <input
                type="checkbox"
                checked={form.showInNav}
                onChange={(e) => set('showInNav', e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">
                상단 메뉴에 표시 — 발행 상태일 때만 메뉴에 나타납니다.
              </span>
            </label>

            <div>
              <label htmlFor="sortOrder" className="label">
                정렬 순서
              </label>
              <input
                id="sortOrder"
                type="number"
                value={form.sortOrder ?? 0}
                onChange={(e) => set('sortOrder', Number(e.target.value))}
                className="input"
              />
            </div>
          </div>

          {current && (
            <dl className="mt-5 grid gap-x-10 gap-y-3 border-t border-slate-200 pt-5 text-sm dark:border-slate-700 sm:grid-cols-2">
              {[
                ['작성자', author],
                ['발행일시', formatStamp(current.publishedAt)],
                ['생성일', formatStamp(current.createdAt)],
                ['수정일', formatStamp(current.updatedAt)],
              ].map(([label, value]) => (
                <div key={label} className="flex gap-6">
                  <dt className="w-20 shrink-0 text-slate-500 dark:text-slate-400">{label}</dt>
                  <dd className="text-slate-800 dark:text-slate-200">{value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        {/* 내용 */}
        <div className="card mb-6">
          <button
            type="button"
            onClick={() => setOpenContent((v) => !v)}
            className="flex w-full items-center justify-between px-6 py-4 text-left"
            aria-expanded={openContent}
          >
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">내용</h2>
            <svg
              className={`h-5 w-5 text-slate-400 transition ${openContent ? '' : 'rotate-180'}`}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
            </svg>
          </button>
          {openContent && (
            <div className="px-6 pb-6 pt-1">
              <RichEditor value={form.content} onChange={(html) => set('content', html)} />
            </div>
          )}
        </div>

        <PageVersionHistory
          versions={versions}
          onView={openVersion}
          emptyLabel={isNew ? '페이지를 만들면 이곳에 버전이 쌓입니다.' : undefined}
        />

        {/* 저장 */}
        <div className="card mt-6 flex flex-wrap gap-3 p-4">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? '저장 중...' : isNew ? '만들기' : '저장'}
          </button>
          <button type="button" onClick={() => navigate('/admin/pages')} className="btn-secondary">
            취소
          </button>
          <p className="ml-auto self-center text-xs text-slate-500 dark:text-slate-400">
            내용이 바뀐 저장만 새 버전으로 기록됩니다.
          </p>
        </div>
      </form>

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
