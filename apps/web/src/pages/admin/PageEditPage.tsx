import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { Page, PageInput, PageVersionDetail, PageVersionItem } from '@wnc/shared'
import { api } from '../../lib/api'
import { formatStamp } from '../../lib/format'
import RichEditor from '../../components/RichEditor'
import RichText from '../../components/RichText'
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

  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  /** 페이지 본문과 버전 목록을 함께 다시 읽는다. */
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
        // 만들자마자 버전 기록을 볼 수 있도록 수정 화면으로 넘어간다.
        navigate(`/admin/pages/${created.id}`, { replace: true })
      } else {
        await api<Page>(`/pages/${id}`, { method: 'PUT', body: form, auth: true })
        load()
        setNotice('저장했습니다. 변경된 내용은 새 버전으로 보관됩니다.')
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function openPreview(version: number) {
    try {
      setPreview(await api<PageVersionDetail>(`/pages/${id}/versions/${version}`, { auth: true }))
    } catch (e) {
      alert((e as Error).message)
    }
  }

  /** 이전 버전으로 되돌린다. 되돌리기 역시 새 버전으로 쌓이므로 다시 취소할 수 있다. */
  async function handleRestore(version: number) {
    if (!confirm(`v${version} 내용으로 되돌릴까요?\n지금 내용은 버전 기록에 그대로 남습니다.`)) return
    try {
      await api(`/pages/${id}/versions/${version}/restore`, { method: 'POST', auth: true })
      setPreview(null)
      load()
      setNotice(`v${version} 내용으로 되돌렸습니다.`)
    } catch (e) {
      alert((e as Error).message)
    }
  }

  if (loading) return <Loading />

  return (
    <>
      <PageHeader
        title={isNew ? '페이지 추가' : '페이지 수정'}
        description={
          isNew
            ? '발행으로 저장하면 /page/슬러그 주소로 홈페이지에 바로 노출됩니다.'
            : '저장할 때마다 이전 내용이 버전으로 보관되어 언제든 되돌릴 수 있습니다.'
        }
        action={
          <div className="flex items-center gap-2">
            {current?.published && (
              <a
                href={`${import.meta.env.BASE_URL}page/${current.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
              >
                페이지 열기
              </a>
            )}
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

      <div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
        <form onSubmit={handleSubmit} className="card p-6 sm:p-8">
          <div className="space-y-5">
            {error && <ErrorMessage message={error} />}
            {notice && (
              <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                {notice}
              </div>
            )}

            <div className="grid gap-5 sm:grid-cols-[1fr_16rem]">
              <div>
                <label htmlFor="title" className="label">
                  제목 <span className="text-red-500">*</span>
                </label>
                <input
                  id="title"
                  required
                  maxLength={200}
                  value={form.title}
                  onChange={(e) => set('title', e.target.value)}
                  className="input"
                  placeholder="예) 회사소개"
                />
              </div>

              <div>
                <label htmlFor="slug" className="label">
                  슬러그
                </label>
                <input
                  id="slug"
                  maxLength={80}
                  value={form.slug ?? ''}
                  onChange={(e) => set('slug', e.target.value)}
                  className="input font-mono"
                  placeholder="비우면 제목에서 자동 생성"
                />
                <p className="mt-1.5 text-xs text-slate-500">
                  주소: /page/{form.slug?.trim() || '자동생성'}
                </p>
              </div>
            </div>

            <div>
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

            <div>
              <label className="label">본문</label>
              <RichEditor value={form.content} onChange={(html) => set('content', html)} />
            </div>

            <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
              <div className="space-y-3">
                <label className="flex cursor-pointer items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={form.published}
                    onChange={(e) => set('published', e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    발행 — 체크를 해제하면 홈페이지에서 보이지 않습니다.
                  </span>
                </label>

                <label className="flex cursor-pointer items-center gap-2.5">
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
              </div>

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
          </div>

          <div className="mt-8 flex gap-3 border-t border-slate-200 pt-6 dark:border-slate-700">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? '저장 중...' : isNew ? '만들기' : '저장'}
            </button>
            <button type="button" onClick={() => navigate('/admin/pages')} className="btn-secondary">
              취소
            </button>
          </div>
        </form>

        {/* 버전 기록 — 새 페이지에는 아직 기록이 없다. */}
        <aside className="card h-fit">
          <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-700">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">버전 기록</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              저장할 때마다 자동으로 백업됩니다. 최근 50개까지 보관합니다.
            </p>
          </div>

          {isNew ? (
            <p className="px-5 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
              페이지를 만들면 이곳에 버전이 쌓입니다.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-700">
              {versions.map((v) => (
                <li key={v.id} className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">
                      v{v.version}
                    </span>
                    {v.current && <Badge tone="blue">현재</Badge>}
                    {v.published ? <Badge tone="green">발행</Badge> : <Badge tone="slate">미발행</Badge>}
                  </div>
                  <p className="mt-1.5 truncate text-sm text-slate-700 dark:text-slate-300">{v.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {v.note} · {v.authorName} · {formatStamp(v.createdAt)}
                  </p>
                  <div className="mt-2 flex gap-3">
                    <button
                      type="button"
                      onClick={() => openPreview(v.version)}
                      className="text-xs font-medium text-brand-600 hover:text-brand-700"
                    >
                      미리보기
                    </button>
                    {!v.current && (
                      <button
                        type="button"
                        onClick={() => handleRestore(v.version)}
                        className="text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                      >
                        이 버전으로 되돌리기
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>

      {preview && (
        <Modal
          title={`v${preview.version} 미리보기`}
          onClose={() => setPreview(null)}
          wide
          footer={
            <>
              {!preview.current && (
                <button type="button" onClick={() => handleRestore(preview.version)} className="btn-primary">
                  이 버전으로 되돌리기
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
