import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { PageLayoutType, PageListItem, Paginated, SitePageInfo, SitePageLayoutMap } from '@wnc/shared'
import { LAYOUTS } from '../../layouts'
import { api, qs } from '../../lib/api'
import { formatStamp } from '../../lib/format'
import { pickMenu, useSiteMenu } from '../../lib/menus'
import { invalidatePageLayouts } from '../../lib/pageLayouts'
import { Badge, EmptyState, ErrorMessage, Loading, PageHeader, Pagination, RowMenu } from '../../components/ui'

const ICON = {
  view: 'M2.5 12S5.5 5.5 12 5.5 21.5 12 21.5 12 18.5 18.5 12 18.5 2.5 12 2.5 12z M12 14.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z',
  edit: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.586-9.414a2 2 0 112.828 2.828L11.828 15.9 8 16.9l1-3.828 8.414-8.486z',
  trash: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M4 7h16M10 4h4a1 1 0 011 1v2H9V5a1 1 0 011-1z',
}

const PAGE_SIZES = [20, 50, 100]

type Kind = 'all' | 'code' | 'editor'
type Status = 'all' | 'published' | 'draft'
type Sort = 'default' | 'updated' | 'title'

const SORT_LABEL: Record<Sort, string> = {
  default: '기본 순서',
  updated: '최근 수정순',
  title: '제목순',
}

/**
 * 코드 화면과 에디터 페이지를 한 줄 형식으로 맞춘 것.
 * 코드 화면은 항상 공개이므로 발행 상태가 null 이고, 주소에 ':id' 가 있으면 미리보기를 열 수 없다.
 */
interface Row {
  key: string
  kind: 'code' | 'editor'
  title: string
  description: string
  path: string
  /** 미리보기(홈페이지에서 열기) 가능 여부 */
  previewable: boolean
  /** 에디터 페이지의 발행 여부. 코드 화면은 null(항상 공개) */
  published: boolean | null
  /** 상단 메뉴(GNB)에 링크가 있는지 */
  inGnb: boolean
  updatedAt: string | null
  /** 검색 대상 문자열 */
  haystack: string
  code?: SitePageInfo
  page?: PageListItem
}

/** 바이트를 KB 로 */
const kb = (n: number) => `${(n / 1024).toFixed(1)} KB`

/**
 * 페이지 관리 — 코드로 만들어진 실제 화면과 에디터로 작성한 페이지를 한 목록에서 본다.
 * 종류·상태로 거르고 제목·주소·파일로 찾는다. 코드 화면은 '수정'(소스 편집), 에디터 페이지는 수정·발행으로 관리한다.
 */
export default function PageListPage() {
  const navigate = useNavigate()

  const [codePages, setCodePages] = useState<SitePageInfo[]>([])
  const [editorPages, setEditorPages] = useState<PageListItem[]>([])
  const [layouts, setLayouts] = useState<SitePageLayoutMap>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // --- 조회 조건 (목록은 모두 받아 두고 화면에서 거른다) ---
  const [kind, setKind] = useState<Kind>('all')
  const [status, setStatus] = useState<Status>('all')
  const [sort, setSort] = useState<Sort>('default')
  const [keyword, setKeyword] = useState('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // --- 선택(에디터 페이지만) ---
  const [selected, setSelected] = useState<number[]>([])
  const [working, setWorking] = useState(false)

  const siteMenu = useSiteMenu()
  const gnbUrls = useMemo(() => {
    const gnb = pickMenu(siteMenu, 'gnb')
    return new Set(gnb.flatMap((m) => [m.url, ...m.children.map((c) => c.url)]))
  }, [siteMenu])

  const load = useCallback(() => {
    setLoading(true)
    setError('')

    /** 에디터 페이지는 한 번에 최대 100개씩 오므로 끝까지 이어 받는다. */
    const loadEditorPages = async (): Promise<PageListItem[]> => {
      const all: PageListItem[] = []
      for (let p = 1; p <= 20; p++) {
        const res = await api<Paginated<PageListItem>>(
          `/pages${qs({ page: p, pageSize: 100, sort: 'latest', includeDrafts: 1 })}`,
          { auth: true },
        )
        all.push(...res.items)
        if (p >= res.totalPages) break
      }
      return all
    }

    Promise.all([
      api<SitePageInfo[]>('/site-pages', { auth: true }),
      loadEditorPages(),
      api<SitePageLayoutMap>('/site-pages/layouts'),
    ])
      .then(([code, editor, layoutMap]) => {
        setCodePages(code)
        setEditorPages(editor)
        setLayouts(layoutMap)
        setSelected((prev) => prev.filter((id) => editor.some((p) => p.id === id)))
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(load, [load])

  const rows = useMemo<Row[]>(() => {
    const code: Row[] = codePages.map((c) => ({
      key: `code-${c.key}`,
      kind: 'code',
      title: c.label,
      description: c.description,
      path: c.path,
      previewable: c.kind !== 'layout' && !c.path.includes(':'),
      published: null,
      inGnb: gnbUrls.has(c.path),
      updatedAt: c.updatedAt,
      haystack: `${c.label} ${c.description} ${c.path} ${c.file}`.toLowerCase(),
      code: c,
    }))
    const editor: Row[] = editorPages.map((p) => ({
      key: `editor-${p.id}`,
      kind: 'editor',
      title: p.title,
      description: p.description ?? '',
      path: `/page/${p.slug}`,
      previewable: p.published,
      published: p.published,
      inGnb: gnbUrls.has(`/page/${p.slug}`),
      updatedAt: p.updatedAt,
      haystack: `${p.title} ${p.description ?? ''} /page/${p.slug} ${p.slug}`.toLowerCase(),
      page: p,
    }))
    return [...code, ...editor]
  }, [codePages, editorPages, gnbUrls])

  const filtered = useMemo(() => {
    const needle = q.toLowerCase()
    let list = rows.filter((r) => {
      if (kind !== 'all' && r.kind !== kind) return false
      if (status === 'published' && r.published === false) return false
      if (status === 'draft' && r.published !== false) return false
      if (needle && !r.haystack.includes(needle)) return false
      return true
    })
    if (sort === 'title') list = [...list].sort((a, b) => a.title.localeCompare(b.title, 'ko'))
    if (sort === 'updated') list = [...list].sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))
    return list
  }, [rows, kind, status, sort, q])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const current = Math.min(page, totalPages)
  const visible = filtered.slice((current - 1) * pageSize, current * pageSize)

  const visibleEditorIds = visible.flatMap((r) => (r.page ? [r.page.id] : []))
  const allChecked = visibleEditorIds.length > 0 && visibleEditorIds.every((id) => selected.includes(id))

  function toggle(id: number) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]))
  }

  /** 조회 조건을 바꾸면 항상 1페이지로 돌아간다. */
  function reset<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v)
      setPage(1)
    }
  }

  /** 선택한 에디터 페이지의 발행 상태를 한 번에 바꾼다. */
  async function handleBulk(published: boolean) {
    if (selected.length === 0) return
    if (!confirm(`선택한 ${selected.length}개 페이지를 ${published ? '발행' : '미발행'} 처리할까요?`)) return
    setWorking(true)
    try {
      await api('/pages/bulk', { method: 'PATCH', body: { ids: selected, published }, auth: true })
      setSelected([])
      load()
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setWorking(false)
    }
  }

  async function handleDelete(item: PageListItem) {
    if (!confirm(`'${item.title}' 페이지를 삭제할까요?\n버전 기록까지 함께 지워지며 복구할 수 없습니다.`)) return
    try {
      await api(`/pages/${item.id}`, { method: 'DELETE', auth: true })
      load()
    } catch (e) {
      alert((e as Error).message)
    }
  }

  /** 화면 레이아웃을 바꾼다 — 저장 즉시 열려 있는 사이트 화면에도 반영된다. */
  async function changeLayout(path: string, layout: PageLayoutType) {
    try {
      const next = await api<SitePageLayoutMap>('/site-pages/layouts', {
        method: 'PUT',
        body: { path, layout },
        auth: true,
      })
      setLayouts(next)
      invalidatePageLayouts()
    } catch (e) {
      alert((e as Error).message)
    }
  }

  const previewHref = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`
  const counts = {
    code: rows.filter((r) => r.kind === 'code').length,
    editor: rows.filter((r) => r.kind === 'editor').length,
  }

  return (
    <>
      <PageHeader
        title="페이지 관리"
        description="코드로 만들어진 실제 화면과 에디터로 작성한 페이지를 한 목록에서 관리합니다. 메뉴에 올리는 일은 메뉴 관리에서 합니다."
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={load}
              className="grid h-10 w-10 place-items-center rounded-lg border border-slate-300 text-slate-500 transition hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-700"
              aria-label="목록 새로고침"
              title="새로고침"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 4v5h5M20 20v-5h-5M20 9a8 8 0 00-14.9-2M4 15a8 8 0 0014.9 2"
                />
              </svg>
            </button>
            <Link to="/admin/pages/new" className="btn-primary">
              + 페이지 추가
            </Link>
          </div>
        }
      />

      {/* 검색 */}
      <div className="card mb-4 p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setQ(keyword.trim())
            setPage(1)
          }}
          className="flex flex-col gap-2 sm:flex-row"
        >
          <input
            type="search"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="제목 · 주소 · 파일 이름으로 검색..."
            className="input flex-1"
          />
          <button type="submit" className="btn-primary shrink-0">
            검색
          </button>
          {q && (
            <button
              type="button"
              onClick={() => {
                setKeyword('')
                setQ('')
                setPage(1)
              }}
              className="btn-secondary shrink-0"
            >
              초기화
            </button>
          )}
        </form>
      </div>

      {/* 종류 탭 · 필터 */}
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1">
          {(
            [
              ['all', '전체', rows.length],
              ['code', '코드 화면', counts.code],
              ['editor', '에디터 페이지', counts.editor],
            ] as const
          ).map(([k, label, n]) => (
            <button
              key={k}
              type="button"
              onClick={() => reset(setKind)(k)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                kind === k
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              {label} <span className="tabular-nums opacity-70">{n}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={status}
            onChange={(e) => reset(setStatus)(e.target.value as Status)}
            className="select w-auto"
            aria-label="발행 상태"
          >
            <option value="all">상태 전체</option>
            <option value="published">공개 · 발행</option>
            <option value="draft">미발행</option>
          </select>
          <select
            value={sort}
            onChange={(e) => reset(setSort)(e.target.value as Sort)}
            className="select w-auto"
            aria-label="정렬"
          >
            {(Object.keys(SORT_LABEL) as Sort[]).map((s) => (
              <option key={s} value={s}>
                {SORT_LABEL[s]}
              </option>
            ))}
          </select>
          <select
            value={pageSize}
            onChange={(e) => reset(setPageSize)(Number(e.target.value))}
            className="select w-auto"
            aria-label="페이지당 개수"
          >
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>
                {n}개
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 일괄 처리 — 에디터 페이지만 */}
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60">
        <span className="text-sm text-slate-600 dark:text-slate-400">
          에디터 페이지 <span className="font-semibold text-slate-900 dark:text-slate-100">{selected.length}</span>개 선택됨
        </span>
        <span className="text-sm text-slate-500 dark:text-slate-400">상태 변경:</span>
        <button
          type="button"
          onClick={() => handleBulk(true)}
          disabled={selected.length === 0 || working}
          className="btn bg-green-600 px-3 py-1.5 text-white hover:bg-green-700 focus:ring-green-500"
        >
          일괄 발행
        </button>
        <button
          type="button"
          onClick={() => handleBulk(false)}
          disabled={selected.length === 0 || working}
          className="btn bg-slate-500 px-3 py-1.5 text-white hover:bg-slate-600 focus:ring-slate-400"
        >
          일괄 미발행
        </button>
      </div>

      {error && (
        <div className="mb-4">
          <ErrorMessage message={error} />
        </div>
      )}

      <div className="card">
        {loading ? (
          <Loading />
        ) : visible.length === 0 ? (
          <EmptyState
            label={
              rows.length === 0
                ? "페이지가 없습니다. 오른쪽 위 '페이지 추가'로 첫 페이지를 만들어 보세요."
                : '조건에 맞는 페이지가 없습니다. 검색어나 종류·상태를 바꿔 보세요.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[68rem] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400">
                  <th className="w-12 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allChecked}
                      disabled={visibleEditorIds.length === 0}
                      onChange={(e) =>
                        setSelected(
                          e.target.checked
                            ? Array.from(new Set([...selected, ...visibleEditorIds]))
                            : selected.filter((id) => !visibleEditorIds.includes(id)),
                        )
                      }
                      className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                      aria-label="에디터 페이지 전체 선택"
                    />
                  </th>
                  <th className="px-4 py-3">페이지</th>
                  <th className="w-28 px-4 py-3">종류</th>
                  <th className="px-4 py-3">주소</th>
                  <th className="w-24 px-4 py-3">상태</th>
                  <th className="w-36 px-4 py-3">레이아웃</th>
                  <th className="w-16 px-4 py-3 text-center">GNB</th>
                  <th className="px-4 py-3">정보</th>
                  <th className="w-40 px-4 py-3">수정일</th>
                  <th className="w-44 px-4 py-3 text-right">작업</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {visible.map((row) => (
                  <tr key={row.key} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="px-4 py-3">
                      {row.page && (
                        <input
                          type="checkbox"
                          checked={selected.includes(row.page.id)}
                          onChange={() => toggle(row.page!.id)}
                          className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                          aria-label={`${row.title} 선택`}
                        />
                      )}
                    </td>
                    <td className="max-w-xs px-4 py-3">
                      {row.page ? (
                        <Link
                          to={`/admin/pages/${row.page.id}/detail`}
                          className="block truncate font-medium text-slate-900 hover:text-brand-600 dark:text-slate-100"
                        >
                          {row.title}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => row.code?.available && navigate(`/admin/pages/code/${row.code.key}`)}
                          className="block max-w-full truncate text-left font-medium text-slate-900 hover:text-brand-600 dark:text-slate-100"
                        >
                          {row.title}
                        </button>
                      )}
                      {row.description && (
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">{row.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {row.code?.kind === 'layout' ? (
                        <Badge tone="slate">레이아웃</Badge>
                      ) : row.kind === 'code' ? (
                        <Badge tone="blue">코드 화면</Badge>
                      ) : (
                        <Badge tone="amber">에디터 페이지</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-slate-600 dark:text-slate-400">{row.path || '—'}</td>
                    <td className="px-4 py-3">
                      {row.published === null ? (
                        <Badge tone="green">공개</Badge>
                      ) : row.published ? (
                        <Badge tone="green">발행</Badge>
                      ) : (
                        <Badge tone="slate">미발행</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {row.path === '/' || !row.path ? (
                        <span className="text-slate-300 dark:text-slate-600">—</span>
                      ) : (
                        <select
                          value={layouts[row.path] ?? 'basic'}
                          onChange={(e) => changeLayout(row.path, e.target.value as PageLayoutType)}
                          className="select w-auto py-1.5 text-xs"
                          aria-label={`${row.title} 레이아웃`}
                        >
                          {LAYOUTS.map((l) => (
                            <option key={l.key} value={l.key}>
                              {l.label}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {row.inGnb ? (
                        <span className="font-semibold text-green-600" title="상단 메뉴에 링크가 있습니다" aria-label="GNB 노출">
                          ✓
                        </span>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600" aria-label="GNB 미노출">
                          -
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                      {row.code &&
                        (row.code.available
                          ? `${row.code.file} · ${kb(row.code.size)} · ${row.code.lines}줄 · 백업 ${row.code.backups}개`
                          : `${row.code.file} · 데모에서는 읽을 수 없음`)}
                      {row.page && `v${row.page.version} · 조회 ${row.page.views} · 발행 ${formatStamp(row.page.publishedAt)}`}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-400">
                      {row.updatedAt ? formatStamp(row.updatedAt) : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {row.previewable ? (
                          <a
                            href={previewHref(row.path)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-secondary px-2.5 py-1 text-xs"
                          >
                            미리보기
                          </a>
                        ) : (
                          <span
                            className="btn-secondary cursor-not-allowed px-2.5 py-1 text-xs opacity-40"
                            title={
                              row.code?.kind === 'layout'
                                ? '레이아웃 틀은 단독 화면이 아니라 미리보기가 없습니다'
                                : row.kind === 'code'
                                  ? '항목을 골라야 열리는 상세 화면입니다'
                                  : '발행하면 미리보기가 열립니다'
                            }
                          >
                            미리보기
                          </span>
                        )}
                        {row.code && (
                          <button
                            type="button"
                            onClick={() => navigate(`/admin/pages/code/${row.code!.key}`)}
                            disabled={!row.code.available}
                            className="btn-primary px-2.5 py-1 text-xs"
                            title={row.code.available ? '이 화면의 실제 소스 코드를 고칩니다' : '데모 모드에서는 볼 수 없습니다'}
                          >
                            수정
                          </button>
                        )}
                        {row.page && (
                          <RowMenu
                            items={[
                              {
                                label: '상세보기',
                                icon: ICON.view,
                                onClick: () => navigate(`/admin/pages/${row.page!.id}/detail`),
                              },
                              { label: '수정', icon: ICON.edit, onClick: () => navigate(`/admin/pages/${row.page!.id}`) },
                              { label: '삭제', icon: ICON.trash, danger: true, onClick: () => handleDelete(row.page!) },
                            ]}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && filtered.length > 0 && <Pagination page={current} totalPages={totalPages} onChange={setPage} edges />}

      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
        코드 화면은 항상 공개이며 '수정'에서 실제 소스를 보고 고칠 수 있습니다(저장 전 원본은 백업으로 남습니다). GNB 표시는
        메뉴 관리에 같은 주소의 링크가 켜져 있는지를 뜻합니다.
      </p>

    </>
  )
}
