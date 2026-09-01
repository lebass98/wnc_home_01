import { useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { BoardSeoInput, BoardSetting } from '@wnc/shared'
import { BOARD_SEO_VARIABLES } from '@wnc/shared'
import { api } from '../../lib/api'
import { formatStamp } from '../../lib/format'
import { ErrorMessage, Loading, PageHeader } from '../../components/ui'

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
      ) : (
        <div className="card p-6 sm:p-8">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {tab === 'basic' ? '기본설정' : '게시판 설정'}
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            설정 항목은 아직 준비 중입니다.
          </p>
        </div>
      )}
    </>
  )
}

/** 템플릿 입력 아래에 쓸 수 있는 변수를 알려 준다. */
function VariableHint({ variables }: { variables: readonly string[] }) {
  return (
    <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
      사용 가능한 변수: <span className="font-mono">{variables.join(', ')}</span>
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
          className="input font-mono"
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
          className="input resize-y font-mono"
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
