import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import type { BoardBasicInput, BoardReportInput, BoardSeoInput, BoardSetting } from '@wnc/shared'
import { BOARD_SEO_VARIABLES } from '@wnc/shared'
import { api } from '../../lib/api'
import { formatStamp } from '../../lib/format'
import { ErrorMessage, Loading, PageHeader, ToggleSwitch } from '../../components/ui'

const TABS = [
  { key: 'basic', label: '기본설정' },
  { key: 'board', label: '게시판 설정' },
  { key: 'seo', label: 'SEO 설정' },
] as const

type TabKey = (typeof TABS)[number]['key']

export default function BoardSettingsPage() {
  const [params, setParams] = useSearchParams()
  const requested = params.get('tab')
  const tab: TabKey = TABS.some((t) => t.key === requested) ? (requested as TabKey) : 'basic'

  const [setting, setSetting] = useState<BoardSetting | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api<BoardSetting>('/board-settings')
      .then(setSetting)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <>
      <PageHeader title="게시판 환경설정" description="게시판 동작 방식과 검색엔진 노출을 설정합니다." />

      <div className="mb-6 border-b border-slate-200 dark:border-slate-700">
        <nav className="-mb-px flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setParams(t.key === 'basic' ? {} : { tab: t.key })}
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
        <SeoTab setting={setting} onSaved={setSetting} />
      ) : tab === 'basic' ? (
        <BasicTab setting={setting} onSaved={setSetting} />
      ) : (
        <ReportTab setting={setting} onSaved={setSetting} />
      )}
    </>
  )
}

/** 설정 한 줄 — 이름·설명을 왼쪽에, 입력을 오른쪽에 둔다. */
function Field({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children: ReactNode
}) {
  return (
    <div className="grid gap-2 border-b border-slate-100 py-5 first:pt-0 last:border-0 last:pb-0 sm:grid-cols-[16rem_minmax(0,1fr)] sm:gap-6 dark:border-slate-700">
      <div>
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{label}</p>
        {description && <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{description}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

/** 저장 단추와 알림을 함께 두는 아래 줄 */
function SaveRow({ saving, notice }: { saving: boolean; notice: string }) {
  return (
    <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-slate-200 pt-5 dark:border-slate-700">
      <button type="submit" disabled={saving} className="btn-primary">
        {saving ? '저장 중...' : '저장'}
      </button>
      {notice && <p className="text-sm text-green-700 dark:text-green-400">{notice}</p>}
    </div>
  )
}

/**
 * 기본설정 — 홈페이지 게시판 목록이 어떻게 보일지 정한다.
 * 여기서 정한 값은 소식 목록 화면이 그대로 읽는다.
 */
function BasicTab({ setting, onSaved }: { setting: BoardSetting; onSaved: (s: BoardSetting) => void }) {
  const [form, setForm] = useState<BoardBasicInput>({
    listCount: setting.listCount,
    newDays: setting.newDays,
    showAuthor: setting.showAuthor,
    showSearch: setting.showSearch,
  })
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  const set = <K extends keyof BoardBasicInput>(key: K, value: BoardBasicInput[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setNotice('')
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      onSaved(await api<BoardSetting>('/board-settings/basic', { method: 'PUT', body: form, auth: true }))
      setNotice('저장했습니다. 홈페이지 소식 목록에 바로 반영됩니다.')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="card p-6 sm:p-8">
      <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">기본설정</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">홈페이지 소식(게시판) 목록이 보이는 방식입니다.</p>

      {error && (
        <div className="mt-4">
          <ErrorMessage message={error} />
        </div>
      )}

      <div className="mt-6">
        <Field label="한 쪽에 보여 줄 글 수" description="목록 한 쪽에 몇 건씩 보여 줄지 정합니다. (5~100)">
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <input
              type="number"
              min={5}
              max={100}
              value={form.listCount}
              onChange={(e) => set('listCount', Number(e.target.value))}
              className="input w-28"
              aria-label="한 쪽에 보여 줄 글 수"
            />
            <span>건</span>
          </div>
        </Field>

        <Field
          label="새 글 표시 기간"
          description="이 기간 안에 올라온 글에 'NEW' 를 붙입니다. 0 이면 붙이지 않습니다."
        >
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <input
              type="number"
              min={0}
              max={30}
              value={form.newDays}
              onChange={(e) => set('newDays', Number(e.target.value))}
              className="input w-28"
              aria-label="새 글 표시 기간"
            />
            <span>일 이내</span>
          </div>
        </Field>

        <Field label="목록에 작성자 표시" description="끄면 목록에서 작성자 칸을 감춥니다.">
          <ToggleSwitch checked={form.showAuthor} onChange={(v) => set('showAuthor', v)} label="목록에 작성자 표시" />
        </Field>

        <Field label="목록에 검색 상자 표시" description="끄면 방문자가 목록에서 검색할 수 없습니다.">
          <ToggleSwitch checked={form.showSearch} onChange={(v) => set('showSearch', v)} label="목록에 검색 상자 표시" />
        </Field>
      </div>

      <SaveRow saving={saving} notice={notice} />
    </form>
  )
}

/**
 * 게시판 설정 — 신고 접수 방식을 정한다.
 * 접수된 신고는 [게시판 신고현황]에서 처리한다.
 */
function ReportTab({ setting, onSaved }: { setting: BoardSetting; onSaved: (s: BoardSetting) => void }) {
  const [form, setForm] = useState<BoardReportInput>({
    reportEnabled: setting.reportEnabled,
    reportReasons: setting.reportReasons,
    reportHideAt: setting.reportHideAt,
  })
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  const set = <K extends keyof BoardReportInput>(key: K, value: BoardReportInput[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setNotice('')
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      onSaved(await api<BoardSetting>('/board-settings/report', { method: 'PUT', body: form, auth: true }))
      setNotice('저장했습니다.')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="card p-6 sm:p-8">
      <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">게시판 설정</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        방문자가 부적절한 글을 알려 오는 신고 기능입니다. 접수된 신고는{' '}
        <Link to="/admin/posts/reports" className="font-medium text-brand-600 hover:text-brand-700">
          게시판 신고현황
        </Link>
        에서 처리합니다.
      </p>

      {error && (
        <div className="mt-4">
          <ErrorMessage message={error} />
        </div>
      )}

      <div className="mt-6">
        <Field label="신고 받기" description="끄면 홈페이지 글에서 신고 단추가 사라집니다.">
          <ToggleSwitch checked={form.reportEnabled} onChange={(v) => set('reportEnabled', v)} label="신고 받기" />
        </Field>

        <Field label="신고 사유" description="한 줄에 하나씩 적습니다. 방문자는 이 중에서 고릅니다.">
          <textarea
            rows={5}
            maxLength={500}
            value={form.reportReasons}
            onChange={(e) => set('reportReasons', e.target.value)}
            disabled={!form.reportEnabled}
            className="input resize-y"
            aria-label="신고 사유"
          />
        </Field>

        <Field
          label="자동으로 가리기"
          description="한 글에 신고가 이만큼 쌓이면 목록에서 감춥니다. 신고현황에서 처리하면 다시 보입니다. 0 이면 감추지 않습니다."
        >
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <input
              type="number"
              min={0}
              max={100}
              value={form.reportHideAt}
              onChange={(e) => set('reportHideAt', Number(e.target.value))}
              disabled={!form.reportEnabled}
              className="input w-28"
              aria-label="자동으로 가릴 신고 수"
            />
            <span>건 이상이면 감춤</span>
          </div>
        </Field>
      </div>

      <SaveRow saving={saving} notice={notice} />
    </form>
  )
}

/** 템플릿 입력 아래에 쓸 수 있는 변수를 알려 준다. */
function VariableHint({ variables }: { variables: readonly string[] }) {
  return (
    <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
      사용 가능한 변수: <span className="tabular-nums">{variables.join(', ')}</span>
    </p>
  )
}

/** 페이지 유형 한 종류의 메타 제목·설명 */
function MetaGroup({
  title,
  variables,
  titleValue,
  descriptionValue,
  onTitleChange,
  onDescriptionChange,
  idPrefix,
}: {
  title: string
  variables: readonly string[]
  titleValue: string
  descriptionValue: string
  onTitleChange: (v: string) => void
  onDescriptionChange: (v: string) => void
  idPrefix: string
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-5 dark:border-slate-700">
      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{title}</h3>

      <div className="mt-4">
        <label htmlFor={`${idPrefix}-title`} className="label">
          메타 제목
        </label>
        <input
          id={`${idPrefix}-title`}
          maxLength={200}
          value={titleValue}
          onChange={(e) => onTitleChange(e.target.value)}
          className="input tabular-nums"
        />
        <VariableHint variables={variables.filter((v) => v !== '{board_description}')} />
      </div>

      <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-700">
        <label htmlFor={`${idPrefix}-description`} className="label">
          메타 설명
        </label>
        <textarea
          id={`${idPrefix}-description`}
          rows={3}
          maxLength={400}
          value={descriptionValue}
          onChange={(e) => onDescriptionChange(e.target.value)}
          className="input resize-y tabular-nums"
        />
        <VariableHint variables={variables} />
      </div>
    </div>
  )
}

function SeoTab({ setting, onSaved }: { setting: BoardSetting; onSaved: (s: BoardSetting) => void }) {
  const [form, setForm] = useState<BoardSeoInput>({
    seoListTitle: setting.seoListTitle,
    seoListDescription: setting.seoListDescription,
    seoBoardTitle: setting.seoBoardTitle,
    seoBoardDescription: setting.seoBoardDescription,
    seoPostTitle: setting.seoPostTitle,
    seoPostDescription: setting.seoPostDescription,
    seoServeList: setting.seoServeList,
    seoServeBoard: setting.seoServeBoard,
    seoServePost: setting.seoServePost,
  })
  const [resetAt, setResetAt] = useState(setting.seoCacheResetAt)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  function set<K extends keyof BoardSeoInput>(key: K, value: BoardSeoInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setNotice('')
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const saved = await api<BoardSetting>('/board-settings/seo', { method: 'PUT', body: form, auth: true })
      onSaved(saved)
      setResetAt(saved.seoCacheResetAt)
      setNotice('SEO 설정을 저장했습니다. 캐시도 함께 비웠습니다.')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function handleCacheReset() {
    if (!confirm('게시판 SEO 캐시를 비울까요?\n다음 방문부터 저장된 설정을 다시 읽습니다.')) return
    setResetting(true)
    try {
      const saved = await api<BoardSetting>('/board-settings/seo/cache-reset', { method: 'POST', auth: true })
      onSaved(saved)
      setResetAt(saved.seoCacheResetAt)
      setNotice('SEO 캐시를 비웠습니다.')
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setResetting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <ErrorMessage message={error} />}
      {notice && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {notice}
        </div>
      )}

      {/* 메타 설정 */}
      <div className="card p-6 sm:p-8">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">메타 설정</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          검색엔진에 표시될 제목과 설명을 페이지 유형별로 설정합니다.
        </p>

        <div className="mt-6 space-y-5">
          <MetaGroup
            title="게시판 목록 페이지"
            idPrefix="list"
            variables={BOARD_SEO_VARIABLES.list}
            titleValue={form.seoListTitle}
            descriptionValue={form.seoListDescription}
            onTitleChange={(v) => set('seoListTitle', v)}
            onDescriptionChange={(v) => set('seoListDescription', v)}
          />

          <MetaGroup
            title="게시판 글 목록 페이지"
            idPrefix="board"
            variables={BOARD_SEO_VARIABLES.board}
            titleValue={form.seoBoardTitle}
            descriptionValue={form.seoBoardDescription}
            onTitleChange={(v) => set('seoBoardTitle', v)}
            onDescriptionChange={(v) => set('seoBoardDescription', v)}
          />

          <MetaGroup
            title="게시글 상세 페이지"
            idPrefix="post"
            variables={BOARD_SEO_VARIABLES.post}
            titleValue={form.seoPostTitle}
            descriptionValue={form.seoPostDescription}
            onTitleChange={(v) => set('seoPostTitle', v)}
            onDescriptionChange={(v) => set('seoPostDescription', v)}
          />
        </div>
      </div>

      {/* SEO 제공 페이지 */}
      <div className="card p-6 sm:p-8">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">SEO 제공 페이지</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          검색 봇에게 메타 정보를 제공할 페이지를 선택합니다.
        </p>

        <div className="mt-6">
          <span className="label">SEO 를 제공할 페이지</span>
          <div className="mt-2 space-y-2.5 border-t border-slate-100 pt-3 dark:border-slate-700">
            {(
              [
                ['seoServeList', '게시판 목록 페이지'],
                ['seoServeBoard', '게시판 글 목록 페이지'],
                ['seoServePost', '게시글 상세 페이지'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex cursor-pointer items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={form[key]}
                  onChange={(e) => set(key, e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="mt-6 border-t border-slate-200 pt-5 dark:border-slate-700">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">SEO 캐시 관리</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            게시판 관련 SEO 캐시를 직접 비웁니다. 설정을 저장하면 자동으로 비워집니다.
            <span className="ml-1">마지막 초기화: {formatStamp(resetAt)}</span>
          </p>
          <button
            type="button"
            onClick={handleCacheReset}
            disabled={resetting}
            className="btn-danger mt-3"
          >
            {resetting ? '초기화 중...' : 'SEO 캐시 초기화'}
          </button>
        </div>
      </div>

      <div className="card flex gap-3 p-4">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? '저장 중...' : '저장'}
        </button>
        <p className="ml-auto self-center text-xs text-slate-500 dark:text-slate-400">
          저장하면 공개 사이트의 게시판 페이지 제목·설명에 바로 반영됩니다.
        </p>
      </div>
    </form>
  )
}
