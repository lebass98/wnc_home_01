import { Suspense, lazy, useEffect, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { SitePageBackup, SitePageCheck, SitePageSource } from '@wnc/shared'
import { ApiError, api } from '../../lib/api'
import { formatStamp } from '../../lib/format'
import DiffView from '../../components/DiffView'
import { Badge, ErrorMessage, Loading, PageHeader } from '../../components/ui'

// 편집기는 무거우므로 화면을 열 때 불러온다.
const CodeEditor = lazy(() => import('../../components/CodeEditor'))

/** 바이트를 KB 로 */
const kb = (n: number) => `${(n / 1024).toFixed(1)} KB`

/** 가운데 영역에 무엇을 보여 줄지 */
type Pane = { mode: 'code' } | { mode: 'diff'; label: string; content: string }

/** 카드 제목 줄 — 아이콘과 이름 (페이지 수정 화면과 같은 모양) */
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
 * 코드 화면의 페이지 수정 — 페이지 관리에서 코드 화면·레이아웃의 '수정'을 누르면 온다.
 * 실제 소스 파일을 고치며, 저장 전에 문법을 검사하고 원본은 백업으로 남아 되돌릴 수 있다.
 */
export default function SitePageEditPage() {
  const { key } = useParams<{ key: string }>()
  const navigate = useNavigate()

  const [source, setSource] = useState<SitePageSource | null>(null)
  const [loadError, setLoadError] = useState('')
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [backups, setBackups] = useState<SitePageBackup[]>([])
  const [showBackups, setShowBackups] = useState(false)
  const [pane, setPane] = useState<Pane>({ mode: 'code' })

  // 문법 검사 결과 — 저장 실패로 돌아온 것도 여기에 담는다.
  const [check, setCheck] = useState<SitePageCheck | null>(null)
  const [checking, setChecking] = useState(false)
  /** 편집기가 이동할 줄 — 같은 줄을 다시 눌러도 움직이도록 값을 새로 만든다. */
  const [jump, setJump] = useState<{ line: number } | null>(null)

  useEffect(() => {
    let alive = true
    setSource(null)
    setLoadError('')
    Promise.all([
      api<SitePageSource>(`/site-pages/${key}/source`, { auth: true }),
      api<SitePageBackup[]>(`/site-pages/${key}/backups`, { auth: true }),
    ])
      .then(([src, list]) => {
        if (!alive) return
        setSource(src)
        setDraft(src.content)
        setBackups(list)
      })
      .catch((e: Error) => alive && setLoadError(e.message))
    return () => {
      alive = false
    }
  }, [key])

  const dirty = source !== null && draft !== source.content

  /** 목록으로 — 저장하지 않은 변경이 있으면 먼저 물어본다. */
  function goList() {
    if (dirty && !confirm('고친 내용을 저장하지 않았습니다. 목록으로 갈까요?')) return
    navigate('/admin/pages')
  }

  /** 저장하지 않고 문법만 확인한다. */
  async function handleCheck() {
    if (!source) return
    setChecking(true)
    setNotice('')
    try {
      const res = await api<SitePageCheck>(`/site-pages/${source.key}/check`, {
        method: 'POST',
        body: { content: draft },
        auth: true,
      })
      setCheck(res)
      if (!res.ok && res.line) setJump({ line: res.line })
    } catch (e) {
      setNotice((e as Error).message)
    } finally {
      setChecking(false)
    }
  }

  async function handleSave() {
    if (!source) return
    if (!confirm(`${source.file} 을 저장할까요?\n저장 전 원본은 백업으로 남고, 개발 서버에 바로 반영됩니다.`)) return
    setSaving(true)
    setNotice('')
    try {
      const res = await api<{ saved: boolean; message?: string; updatedAt?: string }>(`/site-pages/${source.key}/source`, {
        method: 'PUT',
        body: { content: draft },
        auth: true,
      })
      if (!res.saved) {
        setNotice(res.message ?? '바뀐 내용이 없습니다.')
        return
      }
      setSource({ ...source, content: draft, updatedAt: res.updatedAt ?? source.updatedAt })
      setBackups(await api<SitePageBackup[]>(`/site-pages/${source.key}/backups`, { auth: true }))
      setCheck(null)
      setPane({ mode: 'code' })
      setNotice('저장했습니다. 홈페이지를 새로고침하면 바로 보입니다.')
    } catch (e) {
      // 서버가 문법 오류로 막았으면 어디가 문제인지 함께 보여 준다.
      const detail = e instanceof ApiError ? (e.data as { check?: SitePageCheck } | undefined)?.check : undefined
      if (detail) {
        setCheck(detail)
        if (detail.line) setJump({ line: detail.line })
      }
      setNotice((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  /** 백업 내용을 받아 지금 코드와 비교해 보여 준다. */
  async function showBackupDiff(b: SitePageBackup) {
    if (!source) return
    try {
      const res = await api<{ name: string; content: string }>(`/site-pages/${source.key}/backups/${b.name}`, { auth: true })
      setPane({ mode: 'diff', label: `${formatStamp(b.createdAt)} 백업`, content: res.content })
    } catch (e) {
      alert((e as Error).message)
    }
  }

  async function handleRestore(b: SitePageBackup) {
    if (!source) return
    if (!confirm(`${formatStamp(b.createdAt)} 백업으로 되돌릴까요?\n지금 내용도 백업으로 남아 다시 되돌릴 수 있습니다.`)) return
    try {
      await api(`/site-pages/${source.key}/backups/${b.name}/restore`, { method: 'POST', auth: true })
      const src = await api<SitePageSource>(`/site-pages/${source.key}/source`, { auth: true })
      setSource(src)
      setDraft(src.content)
      setBackups(await api<SitePageBackup[]>(`/site-pages/${source.key}/backups`, { auth: true }))
      setCheck(null)
      setPane({ mode: 'code' })
      setNotice('되돌렸습니다. 홈페이지를 새로고침하면 바로 보입니다.')
    } catch (e) {
      alert((e as Error).message)
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(draft)
      setNotice('코드를 복사했습니다.')
    } catch {
      setNotice('복사에 실패했습니다. 코드를 직접 선택해 복사해 주세요.')
    }
  }

  // 미리보기 — 주소가 있고 ':id' 같은 자리표가 없을 때만 열 수 있다.
  const previewable = Boolean(source?.path) && !source?.path.includes(':')

  return (
    <>
      <PageHeader
        title="페이지 수정"
        description="페이지 정보를 수정합니다. 코드 화면은 실제 소스 파일을 고치며, 저장 전 원본은 백업으로 남습니다."
        action={
          <div className="flex items-center gap-2">
            {previewable && source && (
              <a
                href={`${import.meta.env.BASE_URL}${source.path.replace(/^\//, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
              >
                미리보기
              </a>
            )}
            <button type="button" onClick={goList} className="btn-secondary">
              목록
            </button>
          </div>
        }
      />

      {loadError ? (
        <>
          <ErrorMessage message={loadError} />
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
            데모 모드이거나 파일이 없는 화면일 수 있습니다.
          </p>
        </>
      ) : !source ? (
        <Loading label="소스를 읽는 중..." />
      ) : (
        <>
          {/* 기본 정보 */}
          <div className="card mb-6 p-6">
            <CardTitle icon="M9 12h6m-6 4h6M8 4h8a2 2 0 012 2v12a2 2 0 01-2 2H8a2 2 0 01-2-2V6a2 2 0 012-2z">기본 정보</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[15px] font-bold text-slate-900 dark:text-slate-100">{source.label}</p>
              <Badge tone="blue">{source.kind === 'layout' ? '레이아웃' : '코드 화면'}</Badge>
            </div>
            {source.description && <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{source.description}</p>}
            <dl className="mt-4 grid gap-x-10 gap-y-3 border-t border-slate-200 pt-4 text-sm dark:border-slate-700 sm:grid-cols-2">
              {[
                ['URL', source.path || '— (단독 화면 아님)'],
                ['파일', source.file],
                ['크기', `${kb(new Blob([source.content]).size)} · ${source.content.split('\n').length}줄`],
                ['수정일', source.updatedAt ? formatStamp(source.updatedAt) : '-'],
              ].map(([label, value]) => (
                <div key={label} className="flex gap-6">
                  <dt className="w-20 shrink-0 text-slate-500 dark:text-slate-400">{label}</dt>
                  <dd className="text-slate-800 dark:text-slate-200">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* 내용 — 소스 코드 */}
          <div className="card mb-6 p-6">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <CardTitle icon="M8 9l-4 3 4 3m8-6l4 3-4 3m-3-9l-2 12">내용</CardTitle>
              <div className="mb-4 flex flex-wrap items-center gap-1.5">
                <button type="button" onClick={handleCopy} className="btn-secondary px-2.5 py-1 text-xs">
                  복사
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowBackups((v) => !v)
                    setPane({ mode: 'code' })
                  }}
                  className="btn-secondary px-2.5 py-1 text-xs"
                  aria-expanded={showBackups}
                >
                  백업 {backups.length}개
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPane((p) => (p.mode === 'diff' ? { mode: 'code' } : { mode: 'diff', label: '고친 내용', content: draft }))
                  }
                  disabled={!dirty}
                  className="btn-secondary px-2.5 py-1 text-xs"
                >
                  {pane.mode === 'diff' ? '코드로 돌아가기' : '변경 내용'}
                </button>
                <button type="button" onClick={handleCheck} disabled={checking} className="btn-secondary px-2.5 py-1 text-xs">
                  {checking ? '검사 중...' : '문법 검사'}
                </button>
              </div>
            </div>

            {dirty && <p className="mb-3 text-xs font-medium text-amber-600">저장하지 않은 변경이 있습니다</p>}

            {notice && (
              <p className="mb-3 whitespace-pre-line rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:bg-slate-900/50 dark:text-slate-300">
                {notice}
              </p>
            )}

            {/* 문법 검사 결과 */}
            {check && (
              <div
                className={`mb-3 rounded-lg px-3 py-2 text-sm ${
                  check.ok
                    ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300'
                    : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300'
                }`}
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-medium">{check.ok ? '문법에 문제가 없습니다.' : check.message}</span>
                  {!check.ok && check.line && (
                    <button
                      type="button"
                      onClick={() => setJump({ line: check.line! })}
                      className="rounded border border-current px-2 py-0.5 text-xs"
                    >
                      {check.line}번째 줄로 이동
                    </button>
                  )}
                </div>
                {!check.ok && check.excerpt && (
                  <pre className="mt-1.5 overflow-x-auto rounded bg-black/10 px-2 py-1 text-xs dark:bg-black/30">
                    <code>{check.excerpt}</code>
                  </pre>
                )}
              </div>
            )}

            {/* 백업 목록 */}
            {showBackups && (
              <div className="mb-3 rounded-lg border border-slate-200 dark:border-slate-700">
                <p className="border-b border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 dark:border-slate-700 dark:text-slate-400">
                  저장 전 원본 백업 — 최근 것이 위입니다. 되돌리기 전에 '변경 내용'으로 무엇이 바뀌는지 볼 수 있습니다.
                </p>
                {backups.length === 0 ? (
                  <p className="px-3 py-3 text-sm text-slate-500">아직 백업이 없습니다. 코드를 저장하면 그 전 원본이 남습니다.</p>
                ) : (
                  <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                    {backups.map((b) => (
                      <li key={b.name} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                        <span className="text-slate-700 dark:text-slate-300">
                          {formatStamp(b.createdAt)} <span className="text-xs text-slate-400">· {kb(b.size)}</span>
                        </span>
                        <span className="inline-flex gap-1.5">
                          <button type="button" onClick={() => showBackupDiff(b)} className="btn-secondary px-2.5 py-1 text-xs">
                            변경 내용
                          </button>
                          <button type="button" onClick={() => handleRestore(b)} className="btn-secondary px-2.5 py-1 text-xs">
                            이 백업으로 되돌리기
                          </button>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {pane.mode === 'diff' ? (
              <>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{pane.label}과 비교</p>
                  <button type="button" onClick={() => setPane({ mode: 'code' })} className="btn-secondary px-2.5 py-1 text-xs">
                    코드로 돌아가기
                  </button>
                </div>
                <DiffView before={source.content} after={pane.content} beforeLabel="지금 코드" afterLabel={pane.label} />
              </>
            ) : (
              <Suspense fallback={<Loading label="편집기 불러오는 중..." />}>
                <CodeEditor value={draft} onChange={setDraft} jump={jump} className="border border-slate-200 dark:border-slate-700" />
              </Suspense>
            )}
          </div>

          {/* 취소 · 저장 */}
          <div className="card flex items-center justify-end gap-2.5 p-4">
            <button type="button" onClick={goList} className="btn-secondary">
              취소
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !dirty}
              className="btn bg-slate-900 text-white hover:bg-slate-700 focus:ring-slate-500 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-white"
            >
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </>
      )}
    </>
  )
}
