import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { Board, BoardInput, BoardType, LocalizedText, SecretMode } from '@wnc/shared'
import { BOARD_TYPE_LABEL, SECRET_MODE_LABEL } from '@wnc/shared'
import { api } from '../../lib/api'
import { clearBoardCache } from '../../lib/boards'
import LocalizedInput from '../../components/LocalizedInput'
import TagInput from '../../components/TagInput'
import { ErrorMessage, Loading, PageHeader, ToggleSwitch } from '../../components/ui'

const TABS = ['기본 설정', '권한 설정', '목록 설정', '게시글 설정', '알림 설정'] as const
type Tab = (typeof TABS)[number]

const TYPES: BoardType[] = ['basic', 'gallery', 'card']
const SECRET_MODES: SecretMode[] = ['off', 'optional', 'always']

interface FormState extends BoardInput {
  nameI18n: LocalizedText
  descriptionI18n: LocalizedText
  categories: string[]
  secretMode: SecretMode
  showViews: boolean
  useReport: boolean
  showInAdminMenu: boolean
}

const EMPTY: FormState = {
  name: '',
  slug: '',
  type: 'basic',
  description: '',
  nameI18n: {},
  descriptionI18n: {},
  categories: [],
  secretMode: 'off',
  showViews: true,
  useReport: false,
  showInAdminMenu: false,
  published: true,
  sortOrder: 0,
}

/** 설정 한 줄 — 왼쪽 설명, 오른쪽 조작부 */
function Row({
  title,
  description,
  control,
  children,
}: {
  title: string
  description?: string
  /** 오른쪽 끝에 붙는 토글·셀렉트 */
  control?: ReactNode
  /** 제목 아래로 들어가는 입력란 */
  children?: ReactNode
}) {
  return (
    <div className="border-b border-slate-200 py-5 last:border-b-0 dark:border-slate-700">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{title}</p>
          {description && (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
          )}
        </div>
        {control && <div className="shrink-0">{control}</div>}
      </div>
      {children && <div className="mt-3">{children}</div>}
    </div>
  )
}

export default function BoardEditPage() {
  const { id } = useParams<{ id: string }>()
  const isNew = !id
  const navigate = useNavigate()

  const [tab, setTab] = useState<Tab>('기본 설정')
  const [form, setForm] = useState<FormState>(EMPTY)
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isNew) return
    api<Board>(`/boards/${id}`, { auth: true })
      .then((b) =>
        setForm({
          name: b.name,
          slug: b.slug,
          type: b.type,
          description: b.description ?? '',
          // 기존 게시판은 i18n 값이 비어 있을 수 있어 대표 이름으로 채운다.
          nameI18n: Object.keys(b.nameI18n).length ? b.nameI18n : { ko: b.name },
          descriptionI18n: Object.keys(b.descriptionI18n).length
            ? b.descriptionI18n
            : { ko: b.description ?? '' },
          categories: b.categories,
          secretMode: b.secretMode,
          showViews: b.showViews,
          useReport: b.useReport,
          showInAdminMenu: b.showInAdminMenu,
          published: b.published,
          sortOrder: b.sortOrder,
        }),
      )
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id, isNew])

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const koName = form.nameI18n.ko?.trim()
    if (!koName) {
      setError('게시판명(한국어)을 입력하세요.')
      setTab('기본 설정')
      return
    }
    setSaving(true)
    setError('')
    try {
      const body: BoardInput = { ...form, name: koName }
      if (isNew) {
        await api('/boards', { method: 'POST', body, auth: true })
      } else {
        await api(`/boards/${id}`, { method: 'PUT', body, auth: true })
      }
      clearBoardCache()
      navigate('/admin/posts')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Loading />

  // 슬러그를 비워 두면 저장 시 자동 생성되므로 안내용 경로에는 예시를 보여준다.
  const slugPreview = form.slug?.trim() || 'notice'

  return (
    <>
      <PageHeader
        title={isNew ? '게시판 추가' : '게시판 설정'}
        description="게시판의 이름과 동작 방식을 설정합니다."
      />

      <form onSubmit={handleSubmit}>
        {/* 탭 */}
        <div className="mb-5 border-b border-slate-200 dark:border-slate-700">
          <nav className="-mb-px flex gap-1 overflow-x-auto" role="tablist">
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition ${
                  tab === t
                    ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {t}
              </button>
            ))}
          </nav>
        </div>

        {error && (
          <div className="mb-4">
            <ErrorMessage message={error} />
          </div>
        )}

        <div className="card p-6">
          {tab === '기본 설정' ? (
            <>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">기본 설정</h2>

              <div className="mt-2">
                <Row
                  title="활성화"
                  description="비활성화된 게시판은 사용자 페이지에 표시되지 않습니다"
                  control={
                    <ToggleSwitch
                      checked={form.published}
                      onChange={(v) => set('published', v)}
                      label="게시판 활성화"
                    />
                  }
                />

                <Row title="슬러그 *">
                  <input
                    id="slug"
                    value={form.slug ?? ''}
                    onChange={(e) => set('slug', e.target.value)}
                    maxLength={40}
                    placeholder="예: notice (영문, 숫자, 하이픈만 가능)"
                    className="input font-mono"
                  />
                  <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                    URL 및 테이블명으로 사용됩니다 (영문, 숫자, 하이픈만 가능)
                  </p>

                  {/* 접근 경로 안내 */}
                  <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/40">
                    <div className="flex gap-2">
                      <svg
                        className="mt-0.5 h-4 w-4 shrink-0 text-slate-400"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        이 게시판은 아래 경로로 접근할 수 있습니다.
                      </p>
                    </div>

                    <ul className="mt-2.5 space-y-1.5 pl-6 text-sm text-slate-600 dark:text-slate-400">
                      <li className="flex flex-wrap items-center gap-2">
                        <span>• 관리자 메뉴 경로:</span>
                        <code className="rounded border border-slate-200 bg-white px-2 py-0.5 font-mono text-xs text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          /admin/board/{slugPreview}
                        </code>
                      </li>
                      <li className="flex flex-wrap items-center gap-2">
                        <span>• 사용자 메뉴 경로:</span>
                        <code className="rounded border border-slate-200 bg-white px-2 py-0.5 font-mono text-xs text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          /board/{slugPreview}
                        </code>
                      </li>
                    </ul>

                    <div className="mt-4 flex items-start justify-between gap-4 border-t border-slate-200 pt-4 dark:border-slate-700">
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          관리자 메뉴에 표시
                        </p>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                          이 게시판을 관리자 메뉴에 노출합니다. 저장 시 반영되며, [게시판 관리] 메뉴 아래에
                          추가됩니다.
                        </p>
                      </div>
                      <ToggleSwitch
                        checked={form.showInAdminMenu}
                        onChange={(v) => set('showInAdminMenu', v)}
                        label="관리자 메뉴에 표시"
                      />
                    </div>
                  </div>
                </Row>

                <Row title="게시판명 *">
                  <LocalizedInput
                    id="board-name"
                    value={form.nameI18n}
                    onChange={(v) => set('nameI18n', v)}
                    placeholder="예: 공지사항"
                    maxLength={60}
                  />
                </Row>

                <Row title="게시판 설명">
                  <LocalizedInput
                    id="board-desc"
                    value={form.descriptionI18n}
                    onChange={(v) => set('descriptionI18n', v)}
                    placeholder="게시판의 용도를 간략하게 설명하세요"
                    multiline
                    rows={3}
                  />
                  <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                    게시판 목록에서 사용자에게 표시되는 설명입니다
                  </p>
                </Row>

                <Row title="게시판 유형">
                  <select
                    id="board-type"
                    value={form.type}
                    onChange={(e) => set('type', e.target.value as BoardType)}
                    className="input"
                  >
                    {TYPES.map((t) => (
                      <option key={t} value={t}>
                        {BOARD_TYPE_LABEL[t]} ({t})
                      </option>
                    ))}
                  </select>
                  <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                    목록을 어떤 모양으로 보여줄지 정합니다.
                  </p>
                </Row>

                <Row title="분류" description="게시글 분류를 관리합니다">
                  <TagInput
                    id="board-categories"
                    value={form.categories}
                    onChange={(v) => set('categories', v)}
                  />
                  <p className="mt-2 text-sm text-amber-600 dark:text-amber-500">
                    분류를 삭제해도 해당 분류의 게시글은 유지되며, &lsquo;미분류&rsquo; 필터에서 조회할 수
                    있습니다.
                  </p>
                </Row>

                <Row
                  title="비밀글 모드"
                  control={
                    <select
                      value={form.secretMode}
                      onChange={(e) => set('secretMode', e.target.value as SecretMode)}
                      className="input w-40"
                      aria-label="비밀글 모드"
                    >
                      {SECRET_MODES.map((m) => (
                        <option key={m} value={m}>
                          {SECRET_MODE_LABEL[m]}
                        </option>
                      ))}
                    </select>
                  }
                />

                <Row
                  title="조회수 표시"
                  description="게시글 목록 및 상세에서 조회수를 표시합니다"
                  control={
                    <ToggleSwitch
                      checked={form.showViews}
                      onChange={(v) => set('showViews', v)}
                      label="조회수 표시"
                    />
                  }
                />

                <Row
                  title="신고 사용"
                  description="부적절한 게시글/댓글 신고 기능을 활성화합니다"
                  control={
                    <ToggleSwitch
                      checked={form.useReport}
                      onChange={(v) => set('useReport', v)}
                      label="신고 사용"
                    />
                  }
                />
              </div>
            </>
          ) : (
            <div className="py-16 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {tab}은 아직 준비 중입니다.
              </p>
            </div>
          )}
        </div>

        <div className="mt-5 flex gap-3">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? '저장 중...' : '저장'}
          </button>
          <button type="button" onClick={() => navigate('/admin/posts')} className="btn-secondary">
            취소
          </button>
        </div>
      </form>
    </>
  )
}
