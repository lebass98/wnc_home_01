import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { SiteTemplateFile, SiteTemplateInfo } from '@wnc/shared'
import { api } from '../../lib/api'
import { invalidateSiteDesign } from '../../lib/siteDesign'
import { invalidatePageLayouts } from '../../lib/pageLayouts'
import { FOOTERS, HEADERS } from '../../layouts'
import { Badge, EmptyState, ErrorMessage, Loading, Modal, PageHeader, Pagination, RowMenu, ToggleSwitch } from '../../components/ui'

/**
 * 템플릿 관리 — 헤더·푸터·화면별 레이아웃 선택을 한 벌(템플릿)로 묶어 관리한다.
 * 활성 템플릿 한 벌이 사이트 전면부에 적용되며, 목록에서 켜고 끄는 것만으로 디자인이 통째로 바뀐다.
 */

const PER_PAGE = 10

/** 등록부에서 레이아웃 이름을 찾는다 — 등록이 지워진 키는 키 그대로 보여 준다. */
const headerLabel = (key: string) => HEADERS.find((h) => h.key === key)?.label ?? key
const footerLabel = (key: string) => FOOTERS.find((f) => f.key === key)?.label ?? key

/** 템플릿 아이콘 — 팔레트 */
function TemplateIcon() {
  return (
    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-slate-900 text-white dark:bg-slate-700">
      <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 3a9 9 0 100 18h.8a2 2 0 001.4-3.4 2 2 0 011.4-3.4H18a3.8 3.8 0 003.8-3.8C21.8 6 17.4 3 12 3z"
        />
        <circle cx="7.5" cy="11" r="1.1" fill="currentColor" stroke="none" />
        <circle cx="10.5" cy="7.5" r="1.1" fill="currentColor" stroke="none" />
        <circle cx="15" cy="7.5" r="1.1" fill="currentColor" stroke="none" />
      </svg>
    </span>
  )
}

export default function TemplatesPage() {
  const [rows, setRows] = useState<SiteTemplateInfo[] | null>(null)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'user' | 'admin'>('user')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [working, setWorking] = useState(false)

  // 열려 있는 대화상자
  const [metaTarget, setMetaTarget] = useState<SiteTemplateInfo | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

  async function load() {
    try {
      setRows(await api<SiteTemplateInfo[]>('/templates', { auth: true }))
      setError('')
    } catch (e) {
      setError((e as Error).message)
    }
  }
  useEffect(() => {
    load()
  }, [])

  /** 활성 템플릿이 바뀌거나 그 내용이 바뀌면 열려 있는 사이트 화면도 다시 읽게 한다. */
  function refreshSite() {
    invalidateSiteDesign()
    invalidatePageLayouts()
  }

  async function activate(row: SiteTemplateInfo) {
    if (row.active) {
      alert('사용 중인 템플릿은 끌 수 없습니다.\n다른 템플릿을 켜면 이 템플릿은 자동으로 꺼집니다.')
      return
    }
    setWorking(true)
    try {
      setRows(await api<SiteTemplateInfo[]>(`/templates/${row.id}/activate`, { method: 'POST', auth: true }))
      refreshSite()
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setWorking(false)
    }
  }

  async function duplicate(row: SiteTemplateInfo) {
    setWorking(true)
    try {
      await api(`/templates/${row.id}/duplicate`, { method: 'POST', auth: true })
      await load()
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setWorking(false)
    }
  }

  async function remove(row: SiteTemplateInfo) {
    if (!confirm(`'${row.name}' 템플릿을 삭제할까요?\n되돌릴 수 없습니다.`)) return
    try {
      await api(`/templates/${row.id}`, { method: 'DELETE', auth: true })
      await load()
    } catch (e) {
      alert((e as Error).message)
    }
  }

  /** 내보내기 — 가져오기로 다시 들일 수 있는 JSON 파일을 내려받는다. */
  async function exportOne(row: SiteTemplateInfo) {
    try {
      const data = await api<SiteTemplateFile>(`/templates/${row.id}/export`, { auth: true })
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${row.name.replace(/[\\/:*?"<>|]/g, '_')}.wnc-template.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      alert((e as Error).message)
    }
  }

  const filtered = useMemo(() => {
    if (!rows) return []
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) =>
      [r.name, r.description, r.author].some((v) => v.toLowerCase().includes(q)),
    )
  }, [rows, query])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const safePage = Math.min(page, totalPages)
  const paged = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE)
  const rangeStart = filtered.length === 0 ? 0 : (safePage - 1) * PER_PAGE + 1
  const rangeEnd = Math.min(filtered.length, safePage * PER_PAGE)

  return (
    <div>
      <PageHeader
        title="템플릿 관리"
        description="템플릿과 레이아웃을 관리하여 웹사이트의 디자인을 구성할 수 있습니다."
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={load}
              aria-label="목록 새로고침"
              title="새로고침"
              className="grid h-10 w-10 place-items-center rounded-lg border border-slate-300 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v6h6M20 20v-6h-6M5.5 9a7.5 7.5 0 0113-2.2M18.5 15a7.5 7.5 0 01-13 2.2" />
              </svg>
            </button>
            <button type="button" onClick={() => setImportOpen(true)} className="btn-secondary">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3M12 4v11m0-11L8 8m4-4l4 4" />
              </svg>
              수동 설치
            </button>
            <button type="button" onClick={() => setCreateOpen(true)} className="btn-primary">
              새 템플릿
            </button>
          </div>
        }
      />

      {/* 탭 */}
      <div className="mb-6 border-b border-slate-200 dark:border-slate-700">
        <nav className="-mb-px flex gap-1">
          {(
            [
              { key: 'user', label: '유저 템플릿' },
              { key: 'admin', label: '관리자 템플릿' },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
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

      {tab === 'admin' ? (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">관리자 템플릿</h2>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">관리자 화면에 적용되는 템플릿을 관리합니다.</p>
          <div className="mt-4">
            <EmptyState label="관리자 화면 템플릿은 아직 제공되지 않습니다. 오른쪽 위의 다크 모드 전환으로 밝기를 바꿀 수 있습니다." />
          </div>
        </div>
      ) : !rows ? (
        <Loading />
      ) : (
        <div className="card p-6">
          {/* 제목 · 검색 */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">사용자 템플릿</h2>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">사용자 화면에 적용되는 템플릿을 관리합니다.</p>
            </div>
            <div className="relative sm:w-72">
              <svg
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" />
              </svg>
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setPage(1)
                }}
                placeholder="템플릿 검색..."
                className="input pl-10"
              />
            </div>
          </div>

          {/* 목록 */}
          <div className="mt-5 space-y-3">
            {paged.length === 0 ? (
              <EmptyState label={query ? '검색 결과가 없습니다.' : '등록된 템플릿이 없습니다.'} />
            ) : (
              paged.map((row) => (
                <div
                  key={row.id}
                  className="flex flex-col gap-4 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center dark:border-slate-700"
                >
                  <TemplateIcon />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[15px] font-bold text-slate-900 dark:text-slate-100">{row.name}</p>
                      {row.active ? <Badge tone="green">현재 활성</Badge> : <Badge>비활성</Badge>}
                      <span className="rounded-md border border-slate-200 px-1.5 py-0.5 text-[11px] font-medium text-slate-500 dark:border-slate-600 dark:text-slate-400">
                        v{row.version}
                      </span>
                      {row.builtin && (
                        <span className="rounded-md border border-slate-200 px-1.5 py-0.5 text-[11px] font-medium text-slate-500 dark:border-slate-600 dark:text-slate-400">
                          기본 제공
                        </span>
                      )}
                    </div>
                    {row.description && (
                      <p className="mt-1 truncate text-sm text-slate-600 dark:text-slate-300">{row.description}</p>
                    )}
                    <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                      <span>작성자: {row.author || '—'}</span>
                      <span aria-hidden>·</span>
                      <span>
                        구성: 헤더 {headerLabel(row.header)} · 푸터 {footerLabel(row.footer)} · 화면 레이아웃{' '}
                        {Object.keys(row.pageLayouts).length}건
                      </span>
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2.5">
                    {row.active && (
                      <Link to="/admin/pages" className="btn-secondary hidden sm:inline-flex">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l-4 3 4 3m8-6l4 3-4 3m-3-9l-2 12" />
                        </svg>
                        코드 편집
                      </Link>
                    )}
                    <ToggleSwitch checked={row.active} onChange={() => !working && activate(row)} label={`${row.name} 활성화`} />
                    <RowMenu
                      items={[
                        {
                          label: '정보 수정',
                          icon: 'M9 12h6m-6 4h4M8 4h8a2 2 0 012 2v12a2 2 0 01-2 2H8a2 2 0 01-2-2V6a2 2 0 012-2z',
                          onClick: () => setMetaTarget(row),
                        },
                        {
                          label: '복제',
                          icon: 'M8 8h10a2 2 0 012 2v10a2 2 0 01-2 2H8a2 2 0 01-2-2V10a2 2 0 012-2zm8-4H6a2 2 0 00-2 2v10',
                          onClick: () => duplicate(row),
                        },
                        {
                          label: '내보내기',
                          icon: 'M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3M12 15V4m0 11l-4-4m4 4l4-4',
                          onClick: () => exportOne(row),
                        },
                        ...(!row.builtin && !row.active
                          ? [
                              {
                                label: '삭제',
                                icon: 'M19 7l-.9 12.1A2 2 0 0116.1 21H7.9a2 2 0 01-2-1.9L5 7m3 0V5a2 2 0 012-2h4a2 2 0 012 2v2m-9 0h12',
                                danger: true,
                                onClick: () => remove(row),
                              },
                            ]
                          : []),
                      ]}
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          <Pagination page={safePage} totalPages={totalPages} onChange={setPage} edges />
          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            총 {filtered.length}개 중 {rangeStart}-{rangeEnd}개 표시
          </p>
        </div>
      )}

      {/* 하단 안내 */}
      <div className="mt-6 flex gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200">
        <svg className="mt-0.5 h-5 w-5 shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
        </svg>
        <div>
          <p className="font-semibold">사용자 템플릿 안내:</p>
          <p className="mt-0.5">
            템플릿은 헤더·푸터·화면별 레이아웃 선택을 한 벌로 묶은 것입니다. 활성화하면 사이트 전면부에 바로 적용되고,
            화면별 서브 레이아웃은 [페이지 관리]에서 고르는 대로 활성 템플릿에 저장됩니다.
          </p>
        </div>
      </div>

      {metaTarget && (
        <MetaEditModal
          template={metaTarget}
          onClose={() => setMetaTarget(null)}
          onSaved={(next) => {
            setMetaTarget(null)
            setRows((prev) => prev?.map((r) => (r.id === next.id ? next : r)) ?? null)
          }}
        />
      )}
      {createOpen && (
        <CreateModal
          onClose={() => setCreateOpen(false)}
          onSaved={() => {
            setCreateOpen(false)
            load()
          }}
        />
      )}
      {importOpen && (
        <ImportModal
          onClose={() => setImportOpen(false)}
          onSaved={() => {
            setImportOpen(false)
            load()
          }}
        />
      )}
    </div>
  )
}

/** 정보 수정 — 이름·설명·버전 */
function MetaEditModal({
  template,
  onClose,
  onSaved,
}: {
  template: SiteTemplateInfo
  onClose: () => void
  onSaved: (next: SiteTemplateInfo) => void
}) {
  const [name, setName] = useState(template.name)
  const [description, setDescription] = useState(template.description)
  const [version, setVersion] = useState(template.version)
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!name.trim()) {
      alert('템플릿 이름을 입력하세요.')
      return
    }
    setSaving(true)
    try {
      onSaved(
        await api<SiteTemplateInfo>(`/templates/${template.id}`, {
          method: 'PUT',
          body: { name: name.trim(), description: description.trim(), version: version.trim() || '1.0.0' },
          auth: true,
        }),
      )
    } catch (e) {
      alert((e as Error).message)
      setSaving(false)
    }
  }

  return (
    <Modal
      title="템플릿 정보 수정"
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-secondary">
            취소
          </button>
          <button type="button" onClick={save} disabled={saving} className="btn-primary">
            {saving ? '저장 중...' : '저장'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="label" htmlFor="tpl-name">
            이름
          </label>
          <input id="tpl-name" value={name} onChange={(e) => setName(e.target.value)} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="tpl-desc">
            설명
          </label>
          <input id="tpl-desc" value={description} onChange={(e) => setDescription(e.target.value)} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="tpl-ver">
            버전
          </label>
          <input id="tpl-ver" value={version} onChange={(e) => setVersion(e.target.value)} className="input" placeholder="1.0.0" />
        </div>
      </div>
    </Modal>
  )
}

/** 새 템플릿 — 지금 활성 템플릿을 복제해 시작한다. */
function CreateModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!name.trim()) {
      alert('템플릿 이름을 입력하세요.')
      return
    }
    setSaving(true)
    try {
      await api('/templates', { method: 'POST', body: { name: name.trim(), description: description.trim() || undefined }, auth: true })
      onSaved()
    } catch (e) {
      alert((e as Error).message)
      setSaving(false)
    }
  }

  return (
    <Modal
      title="새 템플릿"
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-secondary">
            취소
          </button>
          <button type="button" onClick={save} disabled={saving} className="btn-primary">
            {saving ? '만드는 중...' : '만들기'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          지금 활성 템플릿의 구성을 복제해 새 템플릿을 만듭니다. 만든 뒤 레이아웃 편집으로 구성을 바꿀 수 있습니다.
        </p>
        <div>
          <label className="label" htmlFor="tpl-new-name">
            이름
          </label>
          <input id="tpl-new-name" value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="예: 우리회사 시안 A" />
        </div>
        <div>
          <label className="label" htmlFor="tpl-new-desc">
            설명 (선택)
          </label>
          <input id="tpl-new-desc" value={description} onChange={(e) => setDescription(e.target.value)} className="input" />
        </div>
      </div>
    </Modal>
  )
}

/** 수동 설치 — 파일 업로드 또는 GitHub 주소로 템플릿을 들여온다. (참고: 그누보드7 수동 설치) */
function ImportModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [tab, setTab] = useState<'file' | 'github'>('file')
  const [fileName, setFileName] = useState('')
  const [url, setUrl] = useState('')
  const [fetching, setFetching] = useState(false)
  const [payload, setPayload] = useState<SiteTemplateFile | null>(null)
  const [showManifest, setShowManifest] = useState(false)
  const [problem, setProblem] = useState('')
  const [saving, setSaving] = useState(false)

  /** 읽어 온 내용이 우리 템플릿 형식인지 확인해 담는다. */
  function accept(raw: string, from: string): void {
    try {
      const parsed = JSON.parse(raw)
      if (parsed?.type !== 'wnc-template' || typeof parsed.name !== 'string') {
        setProblem(`워드앤코드 템플릿 형식이 아닙니다. ${from}이(가) [내보내기]로 받은 JSON 인지 확인해 주세요.`)
        return
      }
      setPayload(parsed as SiteTemplateFile)
      setProblem('')
    } catch {
      setProblem(`${from}을(를) JSON 으로 읽을 수 없습니다. 파일이 손상되지 않았는지 확인해 주세요.`)
    }
  }

  async function pick(file: File | undefined) {
    if (!file) return
    setFileName(file.name)
    setPayload(null)
    setShowManifest(false)
    accept(await file.text(), '선택한 파일')
  }

  /** GitHub 화면 주소(blob)는 원본(raw) 주소로 바꿔 받는다. */
  async function fetchFromUrl() {
    const target = url.trim().replace(
      /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\//,
      'https://raw.githubusercontent.com/$1/$2/',
    )
    if (!/^https:\/\//.test(target)) {
      setProblem('https:// 로 시작하는 파일 주소를 입력하세요.')
      return
    }
    setFetching(true)
    setPayload(null)
    setShowManifest(false)
    try {
      const res = await fetch(target)
      if (!res.ok) throw new Error()
      accept(await res.text(), '주소의 파일')
    } catch {
      setProblem('주소에서 파일을 가져오지 못했습니다. 공개 저장소의 파일인지, 주소가 정확한지 확인해 주세요.')
    } finally {
      setFetching(false)
    }
  }

  async function install() {
    if (!payload) return
    setSaving(true)
    try {
      await api('/templates/import', { method: 'POST', body: payload, auth: true })
      onSaved()
    } catch (e) {
      alert((e as Error).message)
      setSaving(false)
    }
  }

  return (
    <Modal
      title="템플릿 수동 설치"
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-secondary">
            취소
          </button>
          <button type="button" onClick={install} disabled={!payload || saving} className="btn-primary">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3M12 15V4m0 11l-4-4m4 4l4-4" />
            </svg>
            {saving ? '설치 중...' : '설치'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-600 dark:text-slate-300">파일 업로드 또는 GitHub 저장소에서 템플릿을 설치할 수 있습니다.</p>

        {/* manifest 미리보기 — 파일을 읽은 뒤에만 열 수 있다 */}
        <button
          type="button"
          disabled={!payload}
          onClick={() => setShowManifest((v) => !v)}
          className="flex items-center gap-1.5 text-sm font-medium text-brand-600 transition hover:text-brand-700 disabled:cursor-not-allowed disabled:text-slate-400 dark:disabled:text-slate-500"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          manifest 미리보기
        </button>
        {showManifest && payload && (
          <pre className="max-h-48 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200">
            {JSON.stringify(payload, null, 2)}
          </pre>
        )}

        {/* 탭 — 파일 업로드 / GitHub */}
        <div className="border-b border-slate-200 dark:border-slate-700">
          <nav className="-mb-px flex gap-1">
            {(
              [
                { key: 'file', label: '파일 업로드', icon: 'M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3M12 4v11m0-11L8 8m4-4l4 4' },
                { key: 'github', label: 'GitHub', icon: 'M6 3v12m0 0a3 3 0 103 3m-3-3a3 3 0 013-3h6a3 3 0 003-3V6m0 0a3 3 0 10-.001-.001' },
              ] as const
            ).map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
                  tab === t.key
                    ? 'border-brand-600 text-brand-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d={t.icon} />
                </svg>
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        {tab === 'file' ? (
          <div>
            <p className="label">템플릿 파일 (.json)</p>
            <div className="flex items-center gap-3">
              <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={(e) => pick(e.target.files?.[0])} />
              <button type="button" onClick={() => fileRef.current?.click()} className="btn-secondary">
                찾아보기
              </button>
              <span className={`min-w-0 truncate text-sm ${fileName ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'}`}>
                {fileName || '파일이 선택되지 않음'}
              </span>
            </div>
          </div>
        ) : (
          <div>
            <p className="label">저장소 파일 주소</p>
            <div className="flex items-center gap-2">
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchFromUrl()}
                placeholder="https://github.com/사용자/저장소/blob/main/템플릿.json"
                className="input"
              />
              <button type="button" onClick={fetchFromUrl} disabled={fetching} className="btn-secondary shrink-0">
                {fetching ? '가져오는 중...' : '불러오기'}
              </button>
            </div>
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">공개 저장소의 JSON 파일 주소를 붙여 넣으세요. GitHub 화면 주소는 자동으로 원본 주소로 바꿔 받습니다.</p>
          </div>
        )}

        {problem && <ErrorMessage message={problem} />}
        {payload && (
          <p className="text-sm text-green-700 dark:text-green-400">
            '{payload.name}' 템플릿을 확인했습니다 — 설치를 누르면 목록에 추가됩니다.
          </p>
        )}

        {/* 안내 상자 */}
        <div className="flex gap-2.5 rounded-lg border border-blue-200 bg-blue-50 p-3.5 text-sm text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200">
          <svg className="mt-0.5 h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
          </svg>
          <p>
            템플릿 파일은 반드시{' '}
            <code className="rounded bg-blue-100 px-1.5 py-0.5 text-xs font-semibold dark:bg-blue-900/50">wnc-template</code>{' '}
            형식(JSON)이어야 하며, [내보내기]로 받은 파일 구조를 따라야 합니다.
          </p>
        </div>
      </div>
    </Modal>
  )
}
