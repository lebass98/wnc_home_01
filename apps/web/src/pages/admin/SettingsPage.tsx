import { useEffect, useRef, useState, type DragEvent, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { OgType, SeoSettingInput, SiteSetting, SiteSettingInput } from '@wnc/shared'
import { api, IS_DEMO } from '../../lib/api'
import { ErrorMessage, Loading, PageHeader, ToggleSwitch } from '../../components/ui'

const TABS = [
  { key: 'general', label: '일반' },
  { key: 'seo', label: 'SEO' },
] as const

type TabKey = (typeof TABS)[number]['key']

export default function SettingsPage() {
  const [params, setParams] = useSearchParams()
  const tab: TabKey = params.get('tab') === 'seo' ? 'seo' : 'general'

  const [setting, setSetting] = useState<SiteSetting | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api<SiteSetting>('/settings')
      .then(setSetting)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

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

      {error && <ErrorMessage message={error} />}

      {loading || !setting ? (
        <Loading />
      ) : tab === 'seo' ? (
        <SeoForm setting={setting} />
      ) : (
        <GeneralForm setting={setting} />
      )}
    </>
  )
}

/** 저장 결과 안내 — 성공/실패를 같은 자리에 보여준다. */
function SaveNotice({ error, notice }: { error: string; notice: string }) {
  if (error) return <ErrorMessage message={error} />
  if (notice) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
        {notice}
      </div>
    )
  }
  return null
}

/* ------------------------------- 일반 ------------------------------- */

function GeneralForm({ setting }: { setting: SiteSetting }) {
  const [form, setForm] = useState<SiteSettingInput>({
    siteName: setting.siteName,
    siteUrl: setting.siteUrl,
    description: setting.description ?? '',
    adminEmail: setting.adminEmail,
    titleImage: setting.titleImage,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

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
      setNotice('사이트 정보를 저장했습니다.')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card p-6 sm:p-8">
      <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">사이트 정보</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">기본 사이트 정보를 설정합니다.</p>

      <div className="mt-6 space-y-5">
        <SaveNotice error={error} notice={notice} />

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

      <div className="mt-8 border-t border-slate-200 pt-6 dark:border-slate-700">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? '저장 중...' : '저장'}
        </button>
      </div>
    </form>
  )
}

/* -------------------------------- SEO -------------------------------- */

/** 권장 길이를 넘으면 색으로 알려주는 글자 수 표시 */
function CharCount({ value, max }: { value: string; max: number }) {
  const over = value.length > max
  return (
    <span className={`text-xs ${over ? 'font-medium text-red-600' : 'text-slate-400'}`}>
      {value.length} / {max}자 권장
    </span>
  )
}

function SeoForm({ setting }: { setting: SiteSetting }) {
  const [form, setForm] = useState<SeoSettingInput>({
    metaTitle: setting.metaTitle ?? '',
    metaDescription: setting.metaDescription ?? '',
    metaKeywords: setting.metaKeywords ?? '',
    ogEnabled: setting.ogEnabled,
    ogTitle: setting.ogTitle ?? '',
    ogDescription: setting.ogDescription ?? '',
    ogImage: setting.ogImage,
    ogImageAlt: setting.ogImageAlt ?? '',
    ogSiteName: setting.ogSiteName ?? '',
    ogType: setting.ogType as OgType,
    ogLocale: setting.ogLocale,
    allowIndexing: setting.allowIndexing,
    googleVerification: setting.googleVerification ?? '',
    naverVerification: setting.naverVerification ?? '',
    gaId: setting.gaId ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  function set<K extends keyof SeoSettingInput>(key: K, value: SeoSettingInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setNotice('')
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    try {
      await api<SiteSetting>('/settings/seo', { method: 'PUT', body: form, auth: true })
      setNotice('SEO 설정을 저장했습니다.')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {(error || notice) && <SaveNotice error={error} notice={notice} />}

      {/* 검색엔진 노출 */}
      <div className="card p-6 sm:p-8">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">검색엔진 노출</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          검색 결과에 보여질 제목과 설명을 설정합니다. 비워 두면 사이트 이름과 사이트 설명을 사용합니다.
        </p>

        <div className="mt-6 space-y-5">
          <div>
            <div className="flex items-baseline justify-between">
              <label htmlFor="metaTitle" className="label">
                메타 제목
              </label>
              <CharCount value={form.metaTitle ?? ''} max={60} />
            </div>
            <input
              id="metaTitle"
              maxLength={120}
              value={form.metaTitle ?? ''}
              onChange={(e) => set('metaTitle', e.target.value)}
              className="input"
              placeholder="워드앤코드 — 웹·모바일 개발 파트너"
            />
          </div>

          <div>
            <div className="flex items-baseline justify-between">
              <label htmlFor="metaDescription" className="label">
                메타 설명
              </label>
              <CharCount value={form.metaDescription ?? ''} max={160} />
            </div>
            <textarea
              id="metaDescription"
              rows={3}
              maxLength={400}
              value={form.metaDescription ?? ''}
              onChange={(e) => set('metaDescription', e.target.value)}
              className="input resize-y"
              placeholder="검색 결과에 표시될 요약문을 입력하세요."
            />
          </div>

          <div>
            <label htmlFor="metaKeywords" className="label">
              메타 키워드
            </label>
            <input
              id="metaKeywords"
              maxLength={300}
              value={form.metaKeywords ?? ''}
              onChange={(e) => set('metaKeywords', e.target.value)}
              className="input"
              placeholder="홈페이지 제작, 업무 자동화, 클라우드"
            />
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
              쉼표(,)로 구분해 입력합니다.
            </p>
          </div>

          <SettingToggle
            title="검색엔진 수집 허용"
            description="끄면 noindex 로 표시되어 검색 결과에 나오지 않습니다. 준비 중인 사이트에만 사용하세요."
            checked={form.allowIndexing}
            onChange={(v) => set('allowIndexing', v)}
          />
        </div>
      </div>

      {/* SNS 공유 */}
      <div className="card p-6 sm:p-8">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">SNS 공유 (Open Graph)</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          카카오톡·페이스북 등에 링크를 공유할 때 보여지는 정보입니다. 비우면 위의 메타 값을 사용합니다.
        </p>

        <div className="mt-6 space-y-5">
          <SettingToggle
            title="OG 태그 사용"
            description="끄면 og:* 메타 태그를 아예 출력하지 않습니다."
            checked={form.ogEnabled ?? true}
            onChange={(v) => set('ogEnabled', v)}
          />

          <fieldset disabled={!form.ogEnabled} className="space-y-5 disabled:opacity-50">
            <div>
              <label htmlFor="ogTitle" className="label">
                공유 제목 (og:title)
              </label>
              <input
                id="ogTitle"
                maxLength={120}
                value={form.ogTitle ?? ''}
                onChange={(e) => set('ogTitle', e.target.value)}
                className="input"
                placeholder="워드앤코드"
              />
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                비우면 메타 제목을 사용합니다.
              </p>
            </div>

            <div>
              <label htmlFor="ogDescription" className="label">
                공유 설명 (og:description)
              </label>
              <textarea
                id="ogDescription"
                rows={3}
                maxLength={400}
                value={form.ogDescription ?? ''}
                onChange={(e) => set('ogDescription', e.target.value)}
                className="input resize-y"
                placeholder="공유 카드에 표시될 설명을 입력하세요."
              />
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                비우면 메타 설명을 사용합니다.
              </p>
            </div>

            <div>
              <span className="label">공유 이미지 (og:image)</span>
              <p className="-mt-1 mb-2 text-xs text-slate-500 dark:text-slate-400">
                1200 x 630 픽셀 비율을 권장합니다.
              </p>
              <ImageDropzone value={form.ogImage ?? null} onChange={(url) => set('ogImage', url)} />
            </div>

            <div>
              <label htmlFor="ogImageAlt" className="label">
                공유 이미지 대체 텍스트 (og:image:alt)
              </label>
              <input
                id="ogImageAlt"
                maxLength={200}
                value={form.ogImageAlt ?? ''}
                onChange={(e) => set('ogImageAlt', e.target.value)}
                className="input"
                placeholder="워드앤코드 로고"
              />
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                이미지를 읽어 주는 화면낭독기에 전달되는 설명입니다.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-3">
              <div>
                <label htmlFor="ogSiteName" className="label">
                  사이트 이름 (og:site_name)
                </label>
                <input
                  id="ogSiteName"
                  maxLength={100}
                  value={form.ogSiteName ?? ''}
                  onChange={(e) => set('ogSiteName', e.target.value)}
                  className="input"
                  placeholder="비우면 사이트 이름 사용"
                />
              </div>

              <div>
                <label htmlFor="ogType" className="label">
                  콘텐츠 유형 (og:type)
                </label>
                <select
                  id="ogType"
                  value={form.ogType ?? 'website'}
                  onChange={(e) => set('ogType', e.target.value as OgType)}
                  className="select"
                >
                  <option value="website">website — 일반 사이트</option>
                  <option value="article">article — 글·기사</option>
                </select>
              </div>

              <div>
                <label htmlFor="ogLocale" className="label">
                  언어 (og:locale)
                </label>
                <input
                  id="ogLocale"
                  maxLength={20}
                  value={form.ogLocale ?? ''}
                  onChange={(e) => set('ogLocale', e.target.value)}
                  className="input font-mono"
                  placeholder="ko_KR"
                />
              </div>
            </div>
          </fieldset>
        </div>
      </div>

      {/* 사이트 소유확인 · 분석 */}
      <div className="card p-6 sm:p-8">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">사이트 소유확인 · 분석</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          검색엔진에 사이트를 등록할 때 받은 인증 코드를 입력합니다.
        </p>

        <div className="mt-6 space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="googleVerification" className="label">
                구글 서치 콘솔 인증 코드
              </label>
              <input
                id="googleVerification"
                maxLength={200}
                value={form.googleVerification ?? ''}
                onChange={(e) => set('googleVerification', e.target.value)}
                className="input font-mono"
                placeholder="google-site-verification 값"
              />
            </div>

            <div>
              <label htmlFor="naverVerification" className="label">
                네이버 서치어드바이저 인증 코드
              </label>
              <input
                id="naverVerification"
                maxLength={200}
                value={form.naverVerification ?? ''}
                onChange={(e) => set('naverVerification', e.target.value)}
                className="input font-mono"
                placeholder="naver-site-verification 값"
              />
            </div>
          </div>

          <div>
            <label htmlFor="gaId" className="label">
              Google Analytics 측정 ID
            </label>
            <input
              id="gaId"
              maxLength={50}
              value={form.gaId ?? ''}
              onChange={(e) => set('gaId', e.target.value)}
              className="input font-mono sm:w-64"
              placeholder="G-XXXXXXXXXX"
            />
          </div>
        </div>

        <div className="mt-8 border-t border-slate-200 pt-6 dark:border-slate-700">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </form>
  )
}

/** 제목·설명 왼쪽, 스위치 오른쪽으로 놓이는 설정 한 줄 */
function SettingToggle({
  title,
  description,
  checked,
  onChange,
}: {
  title: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg bg-slate-50 px-4 py-3 dark:bg-slate-900/50">
      <div>
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{title}</p>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{description}</p>
      </div>
      <ToggleSwitch checked={checked} onChange={onChange} label={title} />
    </div>
  )
}

/* ----------------------------- 이미지 업로드 ----------------------------- */

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
          <img src={value} alt="업로드한 이미지" className="max-h-24 object-contain" />
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
