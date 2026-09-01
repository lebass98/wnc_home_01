import { useEffect, useRef, useState, type DragEvent, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { SiteSetting, SiteSettingInput } from '@wnc/shared'
import { api, IS_DEMO } from '../../lib/api'
import { ErrorMessage, Loading, PageHeader } from '../../components/ui'

const TABS = [
  { key: 'general', label: '일반' },
  { key: 'seo', label: 'SEO' },
] as const

type TabKey = (typeof TABS)[number]['key']

const EMPTY: SiteSettingInput = {
  siteName: '',
  siteUrl: '',
  description: '',
  adminEmail: '',
  titleImage: null,
}

export default function SettingsPage() {
  const [params, setParams] = useSearchParams()
  const tab: TabKey = params.get('tab') === 'seo' ? 'seo' : 'general'

  const [form, setForm] = useState<SiteSettingInput>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    api<SiteSetting>('/settings')
      .then((s) =>
        setForm({
          siteName: s.siteName,
          siteUrl: s.siteUrl,
          description: s.description ?? '',
          adminEmail: s.adminEmail,
          titleImage: s.titleImage,
        }),
      )
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  function set<K extends keyof SiteSettingInput>(key: K, value: SiteSettingInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setNotice('')
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    try {
      await api<SiteSetting>('/settings', { method: 'PUT', body: form, auth: true })
      setNotice('설정을 저장했습니다.')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <PageHeader title="환경설정" description="사이트 기본 정보와 운영에 필요한 값을 설정합니다." />

      {/* 탭 */}
      <div className="mb-6 border-b border-slate-200 dark:border-slate-700">
        <nav className="-mb-px flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setParams(t.key === 'general' ? {} : { tab: t.key })}
              className={`border-b-2 px-5 py-3 text-sm font-semibold transition ${
                tab === t.key
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'seo' ? (
        <div className="card p-6 sm:p-8">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">SEO</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            검색엔진 관련 설정은 아직 준비 중입니다.
          </p>
        </div>
      ) : loading ? (
        <Loading />
      ) : (
        <form onSubmit={handleSubmit} className="card p-6 sm:p-8">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">사이트 정보</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">기본 사이트 정보를 설정합니다.</p>

          <div className="mt-6 space-y-5">
            {error && <ErrorMessage message={error} />}
            {notice && (
              <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                {notice}
              </div>
            )}

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="siteName" className="label">
                  사이트 이름 <span className="text-red-500">*</span>
                </label>
                <input
                  id="siteName"
                  required
                  maxLength={100}
                  value={form.siteName}
                  onChange={(e) => set('siteName', e.target.value)}
                  className="input"
                  placeholder="워드앤코드"
                />
              </div>

              <div>
                <label htmlFor="siteUrl" className="label">
                  사이트 URL <span className="text-red-500">*</span>
                </label>
                <input
                  id="siteUrl"
                  required
                  type="url"
                  maxLength={200}
                  value={form.siteUrl}
                  onChange={(e) => set('siteUrl', e.target.value)}
                  className="input"
                  placeholder="https://wnc.co.kr"
                />
              </div>
            </div>

            <div>
              <label htmlFor="description" className="label">
                사이트 설명
              </label>
              <textarea
                id="description"
                rows={4}
                maxLength={500}
                value={form.description ?? ''}
                onChange={(e) => set('description', e.target.value)}
                className="input resize-y"
                placeholder="사이트에 대한 간단한 설명을 입력하세요."
              />
            </div>

            <div>
              <label htmlFor="adminEmail" className="label">
                관리자 이메일 <span className="text-red-500">*</span>
              </label>
              <input
                id="adminEmail"
                required
                type="email"
                maxLength={200}
                value={form.adminEmail}
                onChange={(e) => set('adminEmail', e.target.value)}
                className="input"
                placeholder="admin@wnc.co.kr"
              />
            </div>

            <div>
              <span className="label">사이트 타이틀 이미지</span>
              <p className="-mt-1 mb-2 text-xs text-slate-500 dark:text-slate-400">
                헤더에 표시될 로고 이미지입니다.
              </p>
              <ImageDropzone value={form.titleImage ?? null} onChange={(url) => set('titleImage', url)} />
            </div>
          </div>

          <div className="mt-8 flex gap-3 border-t border-slate-200 pt-6 dark:border-slate-700">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      )}
    </>
  )
}

/** 드래그 앤 드롭과 클릭으로 이미지를 올리는 영역 */
function ImageDropzone({
  value,
  onChange,
}: {
  value: string | null
  onChange: (url: string | null) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function handleFile(file: File) {
    setUploading(true)
    setError('')
    try {
      if (IS_DEMO) {
        // 데모 모드에는 서버가 없으므로 base64 로 저장한다.
        if (file.size > 1.5 * 1024 * 1024) {
          throw new Error('데모 모드에서는 1.5MB 이하 이미지만 사용할 수 있습니다.')
        }
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = () => reject(new Error('파일을 읽을 수 없습니다.'))
          reader.readAsDataURL(file)
        })
        onChange(dataUrl)
        return
      }

      const body = new FormData()
      body.append('file', file)
      const token = localStorage.getItem('wnc_admin_token')
      const res = await fetch('/api/uploads', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message ?? '업로드에 실패했습니다.')
      onChange(data.url)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setUploading(false)
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <div>
      <div
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') fileRef.current?.click()
        }}
        className={`grid cursor-pointer place-items-center rounded-xl border-2 border-dashed px-6 py-12 text-center transition ${
          dragging
            ? 'border-brand-500 bg-brand-50 dark:bg-slate-700'
            : 'border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-700/50'
        }`}
      >
        {value ? (
          <img src={value} alt="사이트 타이틀 이미지" className="max-h-24 object-contain" />
        ) : (
          <>
            <svg className="h-10 w-10 text-slate-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7 16a4 4 0 01-.88-7.9A5 5 0 1115.9 6h.1a4 4 0 010 8h-1m-5-1l2-2m0 0l2 2m-2-2v8"
              />
            </svg>
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
              {uploading ? '업로드 중...' : '파일을 드래그하거나 클릭하여 업로드'}
            </p>
            <p className="mt-1 text-xs text-slate-400">JPG, PNG, WEBP, GIF, SVG · 최대 5MB</p>
          </>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ''
        }}
      />

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      {value && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="mt-2 text-xs font-medium text-red-600 hover:text-red-700"
        >
          이미지 제거
        </button>
      )}
    </div>
  )
}
