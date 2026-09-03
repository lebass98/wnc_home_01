import { useCallback, useEffect, useRef, useState, type DragEvent, type FormEvent, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { BoardLocale, Page, PageAttachment, PageInput, PageVersionDetail, PageVersionItem } from '@wnc/shared'
import { BOARD_LOCALES, BOARD_LOCALE_LABEL } from '@wnc/shared'
import { api } from '../../lib/api'
import { formatStamp } from '../../lib/format'
import RichEditor from '../../components/RichEditor'
import RichText from '../../components/RichText'
import LocalizedInput from '../../components/LocalizedInput'
import PageVersionHistory from '../../components/PageVersionHistory'
import SitePreviewModal from '../../components/SitePreviewModal'
import { Badge, ErrorMessage, Loading, Modal, PageHeader } from '../../components/ui'

/**
 * 페이지 수정 — 기본 정보(슬러그·발행·다국어 제목/내용) · 첨부파일 · SEO 설정 세 카드 구성.
 * 제목과 본문은 언어 칩으로 한국어/English/日本語 를 오가며 따로 적는다.
 */

const EMPTY: PageInput = {
  slug: '',
  title: '',
  titleI18n: { ko: '' },
  description: '',
  content: '',
  contentI18n: { ko: '' },
  attachments: [],
  published: false,
  showInNav: false,
  sortOrder: 0,
  metaTitle: '',
  metaDescription: '',
  metaKeywords: '',
  ogImage: '',
}

/** 첨부파일 제한 — 안내문·검사에 함께 쓴다. */
const MAX_FILES = 5
const MAX_FILE_MB = 10
const FILE_EXTS = '.jpg,.jpeg,.png,.gif,.webp,.pdf,.zip'

const BASE_LOCALE: BoardLocale = 'ko'

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)}MB`
  return `${Math.max(1, Math.round(bytes / 1024))}KB`
}

/** 카드 제목 줄 — 아이콘과 이름 */
function CardTitle({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-slate-100">
      <svg className="h-5 w-5 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
      </svg>
      {children}
    </h2>
  )
}

/**
 * 내용 언어 칩 — 제목 칩(LocalizedInput)과 같은 생김새.
 * 기본 언어(한국어)는 지울 수 없고, 값이 있는 언어에는 ✓ 가 붙는다.
 */
function ContentLocaleTabs({
  active,
  onActive,
  values,
  onRemove,
}: {
  active: BoardLocale
  onActive: (locale: BoardLocale) => void
  values: Partial<Record<BoardLocale, string>>
  onRemove: (locale: BoardLocale) => void
}) {
  return (
    <div className="mb-2 flex flex-wrap items-center gap-2">
      {BOARD_LOCALES.map((locale) => {
        const isActive = active === locale
        const hasValue = (values[locale] ?? '').trim() !== ''
        return (
          <span
            key={locale}
            className={`inline-flex items-center gap-1.5 rounded-full py-1 pl-3 text-sm font-medium transition ${
              locale === BASE_LOCALE || !hasValue ? 'pr-3' : 'pr-1.5'
            } ${
              isActive
                ? 'bg-brand-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
            }`}
          >
            <button type="button" onClick={() => onActive(locale)} className="inline-flex items-center gap-1.5" aria-pressed={isActive}>
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 21a9 9 0 100-18 9 9 0 000 18zm0 0c2.5-2.3 3.8-5.4 3.8-9S14.5 5.3 12 3m0 18c-2.5-2.3-3.8-5.4-3.8-9S9.5 5.3 12 3M3.5 9h17M3.5 15h17"
                />
              </svg>
              {BOARD_LOCALE_LABEL[locale]}
              {hasValue && locale !== BASE_LOCALE && (
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.4} viewBox="0 0 24 24" aria-label="입력됨">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
            {locale !== BASE_LOCALE && hasValue && (
              <button
                type="button"
                onClick={() => onRemove(locale)}
                aria-label={`${BOARD_LOCALE_LABEL[locale]} 입력 지우기`}
                className={`grid h-5 w-5 place-items-center rounded-full transition ${
                  isActive ? 'hover:bg-white/20' : 'hover:bg-slate-300 dark:hover:bg-slate-500'
                }`}
              >
                <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2.4} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </span>
        )
      })}
    </div>
  )
}

export default function PageEditPage() {
  const { id } = useParams<{ id: string }>()
  const isNew = !id
  const navigate = useNavigate()

  const [form, setForm] = useState<PageInput>(EMPTY)
  const [current, setCurrent] = useState<Page | null>(null)
  const [versions, setVersions] = useState<PageVersionItem[]>([])
  const [preview, setPreview] = useState<PageVersionDetail | null>(null)

  // 내용 — 언어별로 오가며 적는다. HTML 모드에서는 코드를 직접 고친다.
  const [contentLocale, setContentLocale] = useState<BoardLocale>(BASE_LOCALE)
  const [codeMode, setCodeModeState] = useState(false)
  const [editorKey, setEditorKey] = useState(0)
  const setCodeMode = (code: boolean) => {
    if (!code) setEditorKey((k) => k + 1)
    setCodeModeState(code)
  }
  const [contentPreview, setContentPreview] = useState(false)

  // 슬러그 중복 확인 결과 — 슬러그를 고치면 다시 확인해야 한다.
  const [slugCheck, setSlugCheck] = useState<{ ok: boolean; message: string } | null>(null)

  // 첨부파일 업로드 진행 상태
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  // 실제 홈페이지 레이아웃으로 보는 미리보기 — 저장된 내용 기준
  const [sitePreview, setSitePreview] = useState(false)

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
          // 기본 컬럼 값을 한국어 자리에 채워 언어 칩이 항상 한국어부터 시작하게 한다.
          titleI18n: { ko: page.title, ...page.titleI18n },
          description: page.description ?? '',
          content: page.content,
          contentI18n: { ko: page.content, ...page.contentI18n },
          attachments: page.attachments ?? [],
          published: page.published,
          showInNav: page.showInNav,
          sortOrder: page.sortOrder,
          metaTitle: page.metaTitle ?? '',
          metaDescription: page.metaDescription ?? '',
          metaKeywords: page.metaKeywords ?? '',
          ogImage: page.ogImage ?? '',
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

  const contentOf = (locale: BoardLocale) => form.contentI18n?.[locale] ?? ''
  function setContent(locale: BoardLocale, html: string) {
    setForm((prev) => ({ ...prev, contentI18n: { ...prev.contentI18n, [locale]: html } }))
    setNotice('')
  }
  function removeContentLocale(locale: BoardLocale) {
    setForm((prev) => {
      const next = { ...prev.contentI18n }
      delete next[locale]
      return { ...prev, contentI18n: next }
    })
    if (contentLocale === locale) switchContentLocale(BASE_LOCALE)
  }
  /** 언어를 바꾸면 에디터를 새로 만들어 그 언어의 본문을 읽게 한다. */
  function switchContentLocale(locale: BoardLocale) {
    setContentLocale(locale)
    setEditorKey((k) => k + 1)
  }

  /** [중복 확인] — 서버에 슬러그를 물어본다. */
  async function checkSlug() {
    const slug = form.slug?.trim() ?? ''
    if (!slug) {
      setSlugCheck({ ok: false, message: '슬러그를 입력하세요.' })
      return
    }
    try {
      const result = await api<{ ok: boolean; message: string }>(
        `/pages/slug-check?slug=${encodeURIComponent(slug)}&excludeId=${id ?? 0}`,
        { auth: true },
      )
      setSlugCheck(result)
    } catch (e) {
      setSlugCheck({ ok: false, message: (e as Error).message })
    }
  }

  /** 첨부파일 업로드 — 남은 자리만큼만 받고, 한 개씩 올려 결과를 목록에 더한다. */
  async function addFiles(files: FileList | File[]) {
    const list = [...files]
    if (list.length === 0) return
    const room = MAX_FILES - (form.attachments?.length ?? 0)
    if (room <= 0) {
      alert(`첨부파일은 ${MAX_FILES}개까지 올릴 수 있습니다. 기존 파일을 지우고 다시 올려 주세요.`)
      return
    }
    setUploading(true)
    try {
      const added: PageAttachment[] = []
      for (const file of list.slice(0, room)) {
        if (file.size > MAX_FILE_MB * 1024 * 1024) {
          alert(`'${file.name}' — 파일 크기는 ${MAX_FILE_MB}MB 를 넘을 수 없습니다.`)
          continue
        }
        const data = new FormData()
        data.append('file', file)
        const token = localStorage.getItem('wnc_admin_token')
        const res = await fetch('/api/uploads/file', {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: data,
        })
        const body = await res.json()
        if (!res.ok) {
          alert(`'${file.name}' — ${body.message ?? '업로드에 실패했습니다.'}`)
          continue
        }
        added.push({ name: body.name ?? file.name, url: body.url, size: body.size ?? file.size })
      }
      if (list.length > room) alert(`첨부파일은 ${MAX_FILES}개까지라 ${list.length - room}개는 올리지 않았습니다.`)
      if (added.length > 0) set('attachments', [...(form.attachments ?? []), ...added])
    } finally {
      setUploading(false)
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const koTitle = form.titleI18n?.ko?.trim() ?? ''
    if (!koTitle) {
      setError('제목(한국어)을 입력하세요.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    setSaving(true)
    setError('')
    setNotice('')
    const body: PageInput = { ...form, title: koTitle, content: form.contentI18n?.ko ?? '' }
    try {
      if (isNew) {
        const created = await api<Page>('/pages', { method: 'POST', body, auth: true })
        // 만들자마자 버전 이력을 볼 수 있도록 수정 화면으로 넘어간다.
        navigate(`/admin/pages/${created.id}`, { replace: true })
      } else {
        await api<Page>(`/pages/${id}`, { method: 'PUT', body, auth: true })
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
        description={isNew ? '발행 상태로 저장하면 /page/슬러그 주소로 홈페이지에 바로 노출됩니다.' : '페이지 정보를 수정합니다.'}
        action={
          <div className="flex items-center gap-2">
            {!isNew && current && (
              <button type="button" onClick={() => setSitePreview(true)} className="btn-secondary">
                실제 화면 미리보기
              </button>
            )}
            {!isNew && (
              <button type="button" onClick={() => navigate(`/admin/pages/${id}/detail`)} className="btn-secondary">
                상세
              </button>
            )}
            <button type="button" onClick={() => navigate('/admin/pages')} className="btn-secondary">
              목록
            </button>
          </div>
        }
      />

      {error && (
        <div className="mb-4">
          <ErrorMessage message={error} />
        </div>
      )}
      {notice && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{notice}</div>
      )}

      <form onSubmit={handleSubmit}>
        {/* 기본 정보 */}
        <div className="card mb-6 p-6">
          <CardTitle icon="M9 12h6m-6 4h6M8 4h8a2 2 0 012 2v12a2 2 0 01-2 2H8a2 2 0 01-2-2V6a2 2 0 012-2z">기본 정보</CardTitle>

          {/* 슬러그 · 발행 여부 */}
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_16rem]">
            <div>
              <label htmlFor="slug" className="label">
                슬러그 <span className="text-red-500">*</span>
              </label>
              <div className="flex items-start gap-2">
                <input
                  id="slug"
                  maxLength={80}
                  value={form.slug ?? ''}
                  onChange={(e) => {
                    set('slug', e.target.value)
                    setSlugCheck(null)
                  }}
                  className={`input tabular-nums ${
                    slugCheck ? (slugCheck.ok ? '!border-green-500 !ring-1 !ring-green-500' : '!border-red-400 !ring-1 !ring-red-400') : ''
                  }`}
                  placeholder="비우면 제목에서 자동 생성"
                />
                <button type="button" onClick={checkSlug} className="btn-secondary shrink-0">
                  중복 확인
                </button>
              </div>
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">URL: /page/{form.slug?.trim() || '슬러그'}</p>
              <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">영문 소문자, 숫자, 하이픈(-)만 사용 가능</p>
              {slugCheck && (
                <p className={`mt-0.5 text-xs font-medium ${slugCheck.ok ? 'text-green-600' : 'text-red-600'}`}>{slugCheck.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="published" className="label">
                발행 여부
              </label>
              <select
                id="published"
                value={form.published ? 'published' : 'draft'}
                onChange={(e) => set('published', e.target.value === 'published')}
                className="select"
              >
                <option value="published">발행</option>
                <option value="draft">미발행</option>
              </select>
              {current && (
                <div className="mt-2 flex items-center gap-2.5">
                  <Badge tone="blue">v{current.version}</Badge>
                  {current.published && (
                    <a
                      href={`${import.meta.env.BASE_URL}page/${current.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-brand-600 hover:text-brand-700"
                    >
                      페이지 보기 ↗
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 제목 — 언어 칩 */}
          <div className="mt-5">
            <label htmlFor="title-i18n" className="label">
              제목 <span className="text-red-500">*</span>
            </label>
            <LocalizedInput
              id="title-i18n"
              value={form.titleI18n ?? {}}
              onChange={(next) => set('titleI18n', next)}
              placeholder="페이지 제목"
              maxLength={200}
            />
          </div>

          {/* 한 줄 설명 */}
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

          {/* 내용 — 미리보기 · HTML 모드 · 언어 칩 */}
          <div className="mt-5">
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                내용 <span className="text-red-500">*</span>
              </span>
              <button type="button" onClick={() => setContentPreview(true)} className="btn-secondary !px-3 !py-1 text-xs">
                미리보기
              </button>
              <label className="flex cursor-pointer items-center gap-1.5 text-sm text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={codeMode}
                  onChange={(e) => setCodeMode(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                HTML 모드
              </label>
            </div>

            <ContentLocaleTabs
              active={contentLocale}
              onActive={switchContentLocale}
              values={form.contentI18n ?? {}}
              onRemove={removeContentLocale}
            />

            {codeMode ? (
              <textarea
                value={contentOf(contentLocale)}
                onChange={(e) => setContent(contentLocale, e.target.value)}
                spellCheck={false}
                className="input min-h-[20rem] resize-y font-mono text-[13px] leading-6"
                style={{ tabSize: 2 }}
                aria-label={`HTML 코드 (${BOARD_LOCALE_LABEL[contentLocale]})`}
              />
            ) : (
              <RichEditor
                key={`${contentLocale}-${editorKey}`}
                value={contentOf(contentLocale)}
                onChange={(html) => setContent(contentLocale, html)}
              />
            )}
          </div>

          {/* 표시 설정 */}
          <div className="mt-5 grid gap-4 border-t border-slate-200 pt-5 dark:border-slate-700 sm:grid-cols-[1fr_10rem]">
            <label className="flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                checked={form.showInNav}
                onChange={(e) => set('showInNav', e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">상단 메뉴에 표시 — 발행 상태일 때만 메뉴에 나타납니다.</span>
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

        {/* 첨부파일 */}
        <div className="card mb-6 p-6">
          <CardTitle icon="M15.2 7.1l-6.9 6.9a2 2 0 102.8 2.8l6.9-6.9a4 4 0 10-5.6-5.6l-6.9 6.9a6 6 0 108.4 8.4l6-6">첨부파일</CardTitle>

          <input ref={fileRef} type="file" multiple accept={FILE_EXTS} hidden onChange={(e) => e.target.files && addFiles(e.target.files)} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            disabled={uploading}
            className={`grid w-full place-items-center gap-1 rounded-xl border-2 border-dashed px-6 py-10 text-center transition ${
              dragOver
                ? 'border-brand-500 bg-brand-50/60 dark:bg-brand-900/20'
                : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800/60'
            }`}
          >
            <svg className="h-9 w-9 text-slate-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2A2.5 2.5 0 005.5 21h13a2.5 2.5 0 002.5-2.5v-2M12 3v13m0-13L7.5 7.5M12 3l4.5 4.5" />
            </svg>
            <span className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              {uploading ? '올리는 중...' : '파일을 드래그하거나 클릭하여 업로드'}
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              최대 {MAX_FILES}개, 개당 {MAX_FILE_MB}MB ({FILE_EXTS})
            </span>
          </button>

          {(form.attachments?.length ?? 0) > 0 && (
            <ul className="mt-4 space-y-2">
              {form.attachments!.map((file, i) => (
                <li
                  key={`${file.url}-${i}`}
                  className="flex items-center gap-3 rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm dark:border-slate-700"
                >
                  <svg className="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.2 7.1l-6.9 6.9a2 2 0 102.8 2.8l6.9-6.9a4 4 0 10-5.6-5.6l-6.9 6.9a6 6 0 108.4 8.4l6-6" />
                  </svg>
                  <a href={file.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate text-slate-700 hover:text-brand-700 dark:text-slate-200">
                    {file.name}
                  </a>
                  <span className="shrink-0 text-xs text-slate-400">{formatSize(file.size)}</span>
                  <button
                    type="button"
                    onClick={() => set('attachments', form.attachments!.filter((_, k) => k !== i))}
                    aria-label={`${file.name} 삭제`}
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">첨부한 파일은 저장을 눌러야 페이지에 반영됩니다.</p>
        </div>

        {/* SEO 설정 */}
        <div className="card mb-6 p-6">
          <CardTitle icon="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z">SEO 설정</CardTitle>

          <div className="space-y-4">
            <div>
              <label htmlFor="metaTitle" className="label">
                SEO 제목
              </label>
              <input
                id="metaTitle"
                maxLength={120}
                value={form.metaTitle ?? ''}
                onChange={(e) => set('metaTitle', e.target.value)}
                className="input"
                placeholder="검색 엔진에 표시될 제목"
              />
            </div>
            <div>
              <label htmlFor="metaDescription" className="label">
                SEO 설명
              </label>
              <textarea
                id="metaDescription"
                rows={3}
                maxLength={400}
                value={form.metaDescription ?? ''}
                onChange={(e) => set('metaDescription', e.target.value)}
                className="input resize-y"
                placeholder="검색 엔진에 표시될 설명"
              />
            </div>
            <div>
              <label htmlFor="metaKeywords" className="label">
                SEO 키워드
              </label>
              <input
                id="metaKeywords"
                maxLength={300}
                value={form.metaKeywords ?? ''}
                onChange={(e) => set('metaKeywords', e.target.value)}
                className="input"
                placeholder="쉼표로 구분하여 입력"
              />
            </div>
            <div>
              <label htmlFor="ogImage" className="label">
                공유 이미지 주소
              </label>
              <input
                id="ogImage"
                maxLength={500}
                value={form.ogImage ?? ''}
                onChange={(e) => set('ogImage', e.target.value)}
                className="input tabular-nums"
                placeholder="https://… 또는 /uploads/… — 비우면 사이트 기본 이미지"
              />
            </div>
          </div>
        </div>

        <PageVersionHistory
          versions={versions}
          onView={openVersion}
          emptyLabel={isNew ? '페이지를 만들면 이곳에 버전이 쌓입니다.' : undefined}
        />

        {/* 취소 · 저장 */}
        <div className="card mt-6 flex items-center justify-end gap-2.5 p-4">
          <button type="button" onClick={() => navigate('/admin/pages')} className="btn-secondary">
            취소
          </button>
          <button
            type="submit"
            disabled={saving}
            className="btn bg-slate-900 text-white hover:bg-slate-700 focus:ring-slate-500 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-white"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </form>

      {sitePreview && current && (
        <SitePreviewModal slug={current.slug} published={current.published} onClose={() => setSitePreview(false)} />
      )}

      {/* 내용 미리보기 — 지금 고르고 있는 언어의 본문 */}
      {contentPreview && (
        <Modal title={`내용 미리보기 (${BOARD_LOCALE_LABEL[contentLocale]})`} onClose={() => setContentPreview(false)} wide>
          {contentOf(contentLocale).trim() ? (
            <RichText html={contentOf(contentLocale)} />
          ) : (
            <p className="text-sm text-slate-500">아직 입력한 내용이 없습니다.</p>
          )}
        </Modal>
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
