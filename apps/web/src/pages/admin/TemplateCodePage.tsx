import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { SitePageBackup, SitePageCheck, SitePageSource, SiteTreeGroup, SiteTreeItem } from '@wnc/shared'
import { ApiError, api } from '../../lib/api'
import { formatStamp } from '../../lib/format'
import DiffView from '../../components/DiffView'
import { ErrorMessage, Loading, PageHeader } from '../../components/ui'

// 편집기는 무거우므로 화면을 열 때 불러온다.
const CodeEditor = lazy(() => import('../../components/CodeEditor'))

/** 바이트를 KB 로 */
const kb = (n: number) => `${(n / 1024).toFixed(1)} KB`

/** 소스 경로를 보기 좋게 — 등록부는 화면 폴더 기준의 상대 경로를 갖고 있다. */
const prettyFile = (file: string) => (file.startsWith('..') ? file.replace(/^(\.\.\/)+/, 'src/') : `src/pages/site/${file}`)

/** 가운데 영역에 무엇을 보여 줄지 */
type Pane = { mode: 'code' } | { mode: 'diff'; label: string; content: string }

/**
 * 템플릿 코드 편집 — 왼쪽에 화면·레이아웃·부품 구조, 오른쪽에 코드창.
 * 구조에서 하나를 고르면 그 소스를 열어 바로 고칠 수 있고,
 * 저장 전에 문법을 검사하며 고치기 전 원본은 백업으로 남는다.
 */

/** 구조 한 줄 — 화면·레이아웃·부품 공통 */
function TreeRow({
  item,
  depth,
  activeKey,
  onSelect,
}: {
  item: SiteTreeItem
  depth: number
  activeKey: string
  onSelect: (key: string) => void
}) {
  // 이 화면이 쓰는 부품 묶음 — 접었다 폈다 한다.
  const [openParts, setOpenParts] = useState(false)
  const active = item.key === activeKey

  return (
    <li>
      <button
        type="button"
        onClick={() => item.available && onSelect(item.key)}
        disabled={!item.available}
        style={{ paddingLeft: `${0.75 + depth * 0.9}rem` }}
        className={`block w-full rounded-lg py-1.5 pr-3 text-left transition disabled:cursor-not-allowed disabled:opacity-40 ${
          active ? 'bg-brand-50 dark:bg-brand-900/30' : 'hover:bg-slate-100 dark:hover:bg-slate-700/60'
        }`}
      >
        <span className={`block truncate text-sm ${active ? 'font-semibold text-brand-700 dark:text-brand-300' : 'text-slate-800 dark:text-slate-200'}`}>
          {item.label}
        </span>
        <span className="block truncate text-xs text-slate-400 dark:text-slate-500">{item.file}</span>
      </button>

      {/* 이 화면이 쓰는 부품 */}
      {item.components.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setOpenParts((v) => !v)}
            style={{ paddingLeft: `${1.6 + depth * 0.9}rem` }}
            className="flex w-full items-center gap-1.5 py-1 pr-3 text-left text-xs text-slate-500 transition hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            aria-expanded={openParts}
          >
            <svg
              className={`h-3 w-3 shrink-0 transition ${openParts ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            이 화면이 쓰는 부품 ({item.components.length})
          </button>
          {openParts && (
            <ul>
              {item.components.map((name) => {
                const key = `component:${name}`
                const on = key === activeKey
                return (
                  <li key={name}>
                    <button
                      type="button"
                      onClick={() => onSelect(key)}
                      style={{ paddingLeft: `${2.5 + depth * 0.9}rem` }}
                      className={`block w-full truncate rounded-lg py-1 pr-3 text-left text-xs transition ${
                        on
                          ? 'bg-brand-50 font-semibold text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700/60'
                      }`}
                    >
                      {name}.tsx
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}

      {/* 하위 화면 */}
      {item.children.length > 0 && (
        <ul>
          {item.children.map((child) => (
            <TreeRow key={child.key} item={child} depth={depth + 1} activeKey={activeKey} onSelect={onSelect} />
          ))}
        </ul>
      )}
    </li>
  )
}

export default function TemplateCodePage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const activeKey = params.get('key') ?? ''

  const [tree, setTree] = useState<SiteTreeGroup[] | null>(null)
  const [treeError, setTreeError] = useState('')
  const [query, setQuery] = useState('')

  const [source, setSource] = useState<SitePageSource | null>(null)
  const [loadError, setLoadError] = useState('')
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [backups, setBackups] = useState<SitePageBackup[]>([])
  const [showBackups, setShowBackups] = useState(false)
  const [pane, setPane] = useState<Pane>({ mode: 'code' })

  const [check, setCheck] = useState<SitePageCheck | null>(null)
  const [checking, setChecking] = useState(false)
  /** 편집기가 이동할 줄 — 같은 줄을 다시 눌러도 움직이도록 값을 새로 만든다. */
  const [jump, setJump] = useState<{ line: number } | null>(null)

  const dirty = source !== null && draft !== source.content

  // 구조 트리
  useEffect(() => {
    api<SiteTreeGroup[]>('/site-pages/tree', { auth: true })
      .then(setTree)
      .catch((e: Error) => setTreeError(e.message))
  }, [])

  // 고른 항목의 소스
  useEffect(() => {
    if (!activeKey) {
      setSource(null)
      return
    }
    let alive = true
    setSource(null)
    setLoadError('')
    setNotice('')
    setCheck(null)
    setPane({ mode: 'code' })
    setShowBackups(false)
    Promise.all([
      api<SitePageSource>(`/site-pages/${encodeURIComponent(activeKey)}/source`, { auth: true }),
      api<SitePageBackup[]>(`/site-pages/${encodeURIComponent(activeKey)}/backups`, { auth: true }),
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
  }, [activeKey])

  /** 다른 항목으로 옮긴다 — 저장하지 않은 변경이 있으면 먼저 물어본다. */
  function select(key: string) {
    if (key === activeKey) return
    if (dirty && !confirm('고친 내용을 저장하지 않았습니다. 다른 파일을 열까요?')) return
    setParams({ key }, { replace: true })
  }

  /** 검색 — 이름이나 경로에 걸리는 항목만 남긴다. 하위 화면도 함께 본다. */
  const filtered = useMemo<SiteTreeGroup[]>(() => {
    if (!tree) return []
    const q = query.trim().toLowerCase()
    if (!q) return tree
    const match = (item: SiteTreeItem): SiteTreeItem | null => {
      const children = item.children.map(match).filter(Boolean) as SiteTreeItem[]
      const hit =
        item.label.toLowerCase().includes(q) ||
        item.file.toLowerCase().includes(q) ||
        item.path.toLowerCase().includes(q) ||
        item.components.some((c) => c.toLowerCase().includes(q))
      if (!hit && children.length === 0) return null
      return { ...item, children }
    }
    return tree
      .map((g) => ({ ...g, items: g.items.map(match).filter(Boolean) as SiteTreeItem[] }))
      .filter((g) => g.items.length > 0)
  }, [tree, query])

  async function handleCheck() {
    if (!source) return
    setChecking(true)
    setNotice('')
    try {
      const res = await api<SitePageCheck>(`/site-pages/${encodeURIComponent(source.key)}/check`, {
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
      const res = await api<{ saved: boolean; message?: string; updatedAt?: string }>(
        `/site-pages/${encodeURIComponent(source.key)}/source`,
        { method: 'PUT', body: { content: draft }, auth: true },
      )
      if (!res.saved) {
        setNotice(res.message ?? '바뀐 내용이 없습니다.')
        return
      }
      setSource({ ...source, content: draft, updatedAt: res.updatedAt ?? source.updatedAt })
      setBackups(await api<SitePageBackup[]>(`/site-pages/${encodeURIComponent(source.key)}/backups`, { auth: true }))
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

  async function showBackupDiff(b: SitePageBackup) {
    if (!source) return
    try {
      const res = await api<{ name: string; content: string }>(
        `/site-pages/${encodeURIComponent(source.key)}/backups/${b.name}`,
        { auth: true },
      )
      setPane({ mode: 'diff', label: `${formatStamp(b.createdAt)} 백업`, content: res.content })
    } catch (e) {
      alert((e as Error).message)
    }
  }

  async function handleRestore(b: SitePageBackup) {
    if (!source) return
    if (!confirm(`${formatStamp(b.createdAt)} 백업으로 되돌릴까요?\n지금 내용도 백업으로 남아 다시 되돌릴 수 있습니다.`)) return
    try {
      await api(`/site-pages/${encodeURIComponent(source.key)}/backups/${b.name}/restore`, { method: 'POST', auth: true })
      const src = await api<SitePageSource>(`/site-pages/${encodeURIComponent(source.key)}/source`, { auth: true })
      setSource(src)
      setDraft(src.content)
      setBackups(await api<SitePageBackup[]>(`/site-pages/${encodeURIComponent(source.key)}/backups`, { auth: true }))
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

  return (
    <>
      <PageHeader
        title="코드 편집"
        description="왼쪽 구조에서 화면·레이아웃·부품을 고르면 오른쪽에서 소스를 바로 고칠 수 있습니다. 저장 전 원본은 백업으로 남습니다."
        action={
          <button type="button" onClick={() => navigate('/admin/templates')} className="btn-secondary">
            템플릿 목록
          </button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[19rem_minmax(0,1fr)]">
        {/* 왼쪽 — 구조 */}
        <aside className="card flex max-h-[calc(100vh-13rem)] flex-col overflow-hidden lg:sticky lg:top-24">
          <div className="border-b border-slate-200 p-3 dark:border-slate-700">
            <p className="mb-2 px-1 text-sm font-semibold text-slate-900 dark:text-slate-100">화면 / 레이아웃</p>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="명칭·경로로 검색..."
              className="input py-2 text-sm"
            />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {treeError ? (
              <div className="p-2">
                <ErrorMessage message={treeError} />
              </div>
            ) : !tree ? (
              <Loading label="구조를 읽는 중..." />
            ) : filtered.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-slate-500">검색 결과가 없습니다.</p>
            ) : (
              filtered.map((group) => (
                <div key={group.group} className="mb-3">
                  <p className="px-2 py-1 text-xs font-semibold text-slate-500 dark:text-slate-400">{group.group}</p>
                  <ul>
                    {group.items.map((item) => (
                      <TreeRow key={item.key} item={item} depth={0} activeKey={activeKey} onSelect={select} />
                    ))}
                  </ul>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* 오른쪽 — 코드창. 넓은 화면에서는 세로를 꽉 채운다. */}
        <section className="card flex flex-col p-5 lg:h-[calc(100vh-13rem)]">
          {!activeKey ? (
            <p className="grid flex-1 place-items-center py-20 text-center text-sm text-slate-500 dark:text-slate-400">
              왼쪽 구조에서 고칠 화면·레이아웃·부품을 골라 주세요.
            </p>
          ) : loadError ? (
            <ErrorMessage message={loadError} />
          ) : !source ? (
            <Loading label="소스를 읽는 중..." />
          ) : (
            <>
              {/* 파일 정보 · 도구 */}
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-bold text-slate-900 dark:text-slate-100">{source.label}</p>
                  <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                    {prettyFile(source.file)}
                    {source.path && ` · ${source.path}`} · {draft.split('\n').length}줄 · 수정{' '}
                    {source.updatedAt ? formatStamp(source.updatedAt) : '-'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button type="button" onClick={handleCopy} className="btn-secondary px-2.5 py-1 text-xs">
                    복사
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowBackups((v) => !v)
                      setPane({ mode: 'code' })
                    }}
                    aria-expanded={showBackups}
                    className="btn-secondary px-2.5 py-1 text-xs"
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
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || !dirty}
                    className="btn bg-slate-900 px-3 py-1 text-xs text-white hover:bg-slate-700 focus:ring-slate-500 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-white"
                  >
                    {saving ? '저장 중...' : '저장'}
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

              {/* 남은 높이를 코드가 모두 차지한다 — 길이가 넘치면 안에서 스크롤된다. */}
              <div className="flex min-h-[28rem] flex-1 flex-col lg:min-h-0">
                {pane.mode === 'diff' ? (
                  <>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{pane.label}과 비교</p>
                      <button type="button" onClick={() => setPane({ mode: 'code' })} className="btn-secondary px-2.5 py-1 text-xs">
                        코드로 돌아가기
                      </button>
                    </div>
                    <div className="min-h-0 flex-1 overflow-auto">
                      <DiffView before={source.content} after={pane.content} beforeLabel="지금 코드" afterLabel={pane.label} />
                    </div>
                  </>
                ) : (
                  <Suspense fallback={<Loading label="편집기 불러오는 중..." />}>
                    <CodeEditor
                      key={source.key}
                      value={draft}
                      onChange={setDraft}
                      jump={jump}
                      className="cm-wnc-fill h-full border border-slate-200 dark:border-slate-700"
                    />
                  </Suspense>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </>
  )
}
