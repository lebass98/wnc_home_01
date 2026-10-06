import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { MediaItem } from '@wnc/shared'
import { api, IS_DEMO } from '../../lib/api'
import { formatStamp } from '../../lib/format'
import { invalidateMediaAlts, uploadMediaFile } from '../../lib/media'
import { Badge, EmptyState, ErrorMessage, Loading, PageHeader } from '../../components/ui'

/**
 * 미디어 라이브러리 — 관리자가 올린 그림·문서를 한곳에서 본다.
 * 대체 텍스트를 적어 두면 홈페이지 본문 그림의 alt 가 비어 있을 때 채워진다(검색·화면 읽기 프로그램용).
 * 어디에 쓰였는지 보여 주고, 아무 데도 안 쓰인 파일은 골라 정리할 수 있다.
 */

type KindFilter = 'all' | 'image' | 'doc'
type UseFilter = 'all' | 'used' | 'unused'
/** 정렬 기준 — 올린 날짜·이름·용량 */
type SortKey = 'new' | 'old' | 'name' | 'name-desc' | 'big' | 'small'
/** 보기 방식 — 썸네일 카드 / 썸네일이 붙은 목록 */
type ViewMode = 'grid' | 'list'

const SORT_LABEL: Record<SortKey, string> = {
  new: '최근에 올린 순',
  old: '먼저 올린 순',
  name: '이름 (ㄱ-ㅎ, A-Z)',
  'name-desc': '이름 (역순)',
  big: '용량 큰 순',
  small: '용량 작은 순',
}

function formatSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)}MB`
  return `${Math.max(1, Math.round(bytes / 1024))}KB`
}

/** 그림의 가로×세로 — 알 수 없는 형식(AVIF 등)이면 '—' */
function formatDimension(m: MediaItem) {
  return m.width && m.height ? `${m.width} × ${m.height}` : '—'
}

const KIND_LABEL: Record<MediaItem['kind'], string> = { image: '그림', video: '영상', pdf: 'PDF', zip: 'ZIP', file: '파일' }

/** 파일 확장자 — 올릴 때 이름이 바뀌어도 확장자는 그대로라 저장 이름에서 읽는다. 없으면 빈 문자열. */
function extOf(m: MediaItem): string {
  const name = m.originalName || m.name
  const i = name.lastIndexOf('.')
  return i > 0 ? name.slice(i + 1).toLowerCase() : ''
}

const extLabel = (ext: string) => (ext ? ext.toUpperCase() : '확장자 없음')

/** 화면에 쓰는 아이콘 — 프로젝트 방식대로 인라인 SVG 로 그린다. */
const ICON: Record<'grid' | 'list' | 'trash' | 'upload' | 'image' | 'video' | 'pdf' | 'zip' | 'file' | 'zoom' | 'close' | 'external' | 'prev' | 'next', string> = {
  grid: 'M4 5h6v6H4V5zm10 0h6v6h-6V5zM4 13h6v6H4v-6zm10 0h6v6h-6v-6z',
  list: 'M4 6h16M4 12h16M4 18h16',
  trash: 'M6 7h12M9 7V5h6v2m-7 0 .6 12a1 1 0 001 1h4.8a1 1 0 001-1L16 7',
  upload: 'M12 16V4m0 0L8 8m4-4 4 4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2',
  image: 'M4 5h16v14H4V5zm0 10 4-4 4 4 3-3 5 5M9 9.5a1 1 0 11-2 0 1 1 0 012 0z',
  video: 'M4 6h11v12H4V6zm11 4 5-3v10l-5-3',
  pdf: 'M7 3h7l5 5v13H7V3zm7 0v5h5M9 13h6M9 17h4',
  zip: 'M7 3h10v18H7V3zm5 0v4m0 2v2m0 2v2',
  file: 'M7 3h7l5 5v13H7V3zm7 0v5h5',
  zoom: 'M10 4a6 6 0 104.5 10.5L20 20M8 10h4M10 8v4',
  close: 'M6 18L18 6M6 6l12 12',
  external: 'M14 4h6v6m0-6-8 8M18 14v4a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2h4',
  prev: 'M15 19l-7-7 7-7',
  next: 'M9 5l7 7-7 7',
}

function Icon({ name, className = 'h-4 w-4' }: { name: keyof typeof ICON; className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d={ICON[name]} />
    </svg>
  )
}

/** 목록·카드에 쓰는 작은 미리보기 — 그림이 아니면 종류 글자를 보여 준다. */
function Thumb({ item, className = '' }: { item: MediaItem; className?: string }) {
  if (item.kind === 'image')
    return <img src={item.url} alt={item.alt} loading="lazy" className={`bg-slate-100 object-cover dark:bg-slate-900 ${className}`} />
  return (
    <span className={`grid place-items-center gap-0.5 bg-slate-100 text-[10px] font-bold text-slate-400 dark:bg-slate-900 ${className}`}>
      <Icon name={item.kind} className="h-1/3 max-h-8 min-h-4 w-auto" />
    </span>
  )
}

/** 미리보기 좌우 끝의 이동 화살표 — 그림 세로 가운데에 걸린다. */
function NavArrow({ dir, disabled, onClick }: { dir: 'prev' | 'next'; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === 'prev' ? '이전 파일' : '다음 파일'}
      title={dir === 'prev' ? '이전 파일 (←)' : '다음 파일 (→)'}
      className={`absolute top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-slate-900/70 text-white ring-1 ring-white/25 transition hover:bg-slate-900 disabled:pointer-events-none disabled:opacity-0 ${
        dir === 'prev' ? 'left-2' : 'right-2'
      }`}
    >
      <Icon name={dir} className="h-5 w-5" />
    </button>
  )
}

/**
 * 파일 창 — 목록에서 고른 파일을 큰 모달로 띄운다.
 * 왼쪽은 미리보기(화면에 맞춤 / 원본 크기 1:1), 오른쪽은 파일 정보·대체 텍스트·쓰인 곳·삭제.
 * 정보는 평상시에는 보이지 않고 이 창에서만 본다. ESC·바깥 클릭으로 닫는다.
 */
function MediaModal({
  item,
  onClose,
  onSaved,
  onDeleted,
  onMove,
  position,
  total,
}: {
  item: MediaItem
  onClose: () => void
  onSaved: (alt: string, title: string) => void
  onDeleted: () => void
  /** 목록에서 앞·뒤 파일로 옮긴다. 끝에 닿으면 아무 일도 하지 않는다. */
  onMove: (step: -1 | 1) => void
  /** 지금 보고 있는 순서(1부터)와 전체 개수 — 목록에서 걸러 낸 것만 센다. */
  position: number
  total: number
}) {
  /** fit = 화면에 맞춤, real = 원본 픽셀 크기 */
  const [zoom, setZoom] = useState<'fit' | 'real'>('fit')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      // 입력칸에 글을 쓰는 중이면 화살표는 글자 이동에 쓰도록 둔다.
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 'ArrowLeft') onMove(-1)
      if (e.key === 'ArrowRight') onMove(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, onMove])

  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col p-3 sm:p-6"
      role="dialog"
      aria-modal
      aria-label={`${item.originalName || item.name} 자세히 보기`}
    >
      <div className="fixed inset-0 bg-slate-950/80" onClick={onClose} aria-hidden />

      <div className="relative mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 text-white">
          <p className="min-w-0 flex-1 truncate text-sm font-semibold" title={item.originalName || item.name}>
            {item.originalName || item.name}
          </p>
          <p className="text-xs text-white/70">
            {total > 1 && `${position} / ${total} · `}
            {KIND_LABEL[item.kind]}
            {extOf(item) && ` · ${extLabel(extOf(item))}`}
            {item.kind === 'image' && ` · ${formatDimension(item)}`} · {formatSize(item.size)}
          </p>
          {item.kind === 'image' && (
            <button
              type="button"
              onClick={() => setZoom(zoom === 'fit' ? 'real' : 'fit')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/30 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/10"
            >
              <Icon name="zoom" />
              {zoom === 'fit' ? '원본 크기로' : '화면에 맞추기'}
            </button>
          )}
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/30 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/10"
          >
            <Icon name="external" />
            새 탭에서 열기
          </a>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="rounded-lg border border-white/30 p-1.5 text-white transition hover:bg-white/10"
          >
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row">
          {/* 미리보기 — 원본 크기에서는 그림이 상자보다 커질 수 있어 가로·세로로 스크롤한다. */}
          <div className="relative min-h-0 flex-1">
            {total > 1 && (
              <>
                <NavArrow dir="prev" disabled={position <= 1} onClick={() => onMove(-1)} />
                <NavArrow dir="next" disabled={position >= total} onClick={() => onMove(1)} />
              </>
            )}
            <div
              className={`h-full rounded-xl bg-slate-900/60 ${
                item.kind === 'image' && zoom === 'real' ? 'overflow-auto' : 'grid place-items-center overflow-hidden'
              }`}
            >
            {item.kind === 'image' ? (
              <img
                src={item.url}
                alt={item.alt}
                className={zoom === 'real' ? 'max-w-none' : 'max-h-full max-w-full object-contain'}
                {...(zoom === 'real' && item.width ? { width: item.width, height: item.height } : {})}
              />
            ) : (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="grid place-items-center gap-2 p-10 text-sm font-medium text-white/80 transition hover:text-white"
              >
                <Icon name={item.kind} className="h-12 w-12" />
                {KIND_LABEL[item.kind]} 파일 열기 ↗
              </a>
              )}
            </div>
          </div>

          {/* 정보 패널 — 평상시에는 숨어 있고 이 창에서만 보인다. */}
          <aside className="card min-h-0 w-full shrink-0 overflow-y-auto p-4 lg:w-[22rem]">
            <MediaDetail key={item.name} item={item} onSaved={onSaved} onDeleted={onDeleted} />
          </aside>
        </div>
      </div>
    </div>
  )
}

export default function MediaLibraryPage() {
  const [items, setItems] = useState<MediaItem[] | null>(null)
  const [error, setError] = useState('')
  const [kind, setKind] = useState<KindFilter>('all')
  const [use, setUse] = useState<UseFilter>('all')
  const [sort, setSort] = useState<SortKey>('new')
  /** 체크한 확장자만 보여 준다. 빈 배열이면 모든 확장자. */
  const [exts, setExts] = useState<string[]>([])
  const [view, setView] = useState<ViewMode>('grid')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  /** 체크해 둔 파일 이름 — 선택 삭제가 쓴다. */
  const [picked, setPicked] = useState<string[]>([])
  const [uploading, setUploading] = useState('')
  const [removing, setRemoving] = useState('')
  /** 파일을 끌어다 올리는 중인지 — 목록 테두리를 밝혀 둘 곳을 알려 준다. */
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function load() {
    api<MediaItem[]>('/media', { auth: true })
      .then((list) => {
        setItems(list)
        setError('')
      })
      .catch((e: Error) => setError(e.message))
  }
  useEffect(load, [])

  const shown = useMemo(() => {
    if (!items) return []
    const q = query.trim().toLowerCase()
    const filtered = items.filter((m) => {
      if (kind === 'image' && m.kind !== 'image') return false
      if (kind === 'doc' && m.kind === 'image') return false
      if (use === 'used' && m.usages.length === 0) return false
      if (use === 'unused' && m.usages.length > 0) return false
      if (exts.length > 0 && !exts.includes(extOf(m))) return false
      return !q || [m.name, m.originalName, m.alt, m.title].some((v) => v.toLowerCase().includes(q))
    })
    const nameOf = (m: MediaItem) => (m.originalName || m.name).toLowerCase()
    const byName = (a: MediaItem, b: MediaItem) => nameOf(a).localeCompare(nameOf(b), 'ko')
    const sorters: Record<SortKey, (a: MediaItem, b: MediaItem) => number> = {
      new: (a, b) => b.createdAt.localeCompare(a.createdAt),
      old: (a, b) => a.createdAt.localeCompare(b.createdAt),
      name: byName,
      'name-desc': (a, b) => byName(b, a),
      big: (a, b) => b.size - a.size,
      small: (a, b) => a.size - b.size,
    }
    return [...filtered].sort(sorters[sort])
  }, [items, kind, use, query, sort, exts])

  /** 올라와 있는 확장자와 개수 — 많은 것부터 보여 준다. */
  const extGroups = useMemo(() => {
    const count = new Map<string, number>()
    for (const m of items ?? []) {
      const e = extOf(m)
      count.set(e, (count.get(e) ?? 0) + 1)
    }
    return [...count.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  }, [items])

  const toggleExt = (ext: string) => setExts((prev) => (prev.includes(ext) ? prev.filter((e) => e !== ext) : [...prev, ext]))

  const current = items?.find((m) => m.name === selected) ?? null
  /** 창에서 앞·뒤로 옮길 때 쓰는 자리 — 지금 걸러 보고 있는 목록 기준이다. */
  const shownIndex = shown.findIndex((m) => m.name === selected)
  /** 화면에 보이는 것 중 체크된 것만 센다 — 조건을 바꿔 숨은 파일이 몰래 지워지지 않게. */
  const pickedShown = shown.filter((m) => picked.includes(m.name))
  const allPicked = shown.length > 0 && pickedShown.length === shown.length

  const toggle = (name: string) =>
    setPicked((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]))
  const toggleAll = () => setPicked(allPicked ? [] : shown.map((m) => m.name))

  async function upload(files: FileList) {
    const list = [...files]
    const failed: string[] = []
    for (const [i, file] of list.entries()) {
      setUploading(`올리는 중 ${i + 1}/${list.length}`)
      try {
        await uploadMediaFile(file)
      } catch (e) {
        failed.push((e as Error).message)
      }
    }
    setUploading('')
    load()
    if (failed.length) alert(`올리지 못한 파일이 있습니다.\n\n${failed.join('\n')}`)
  }

  /** 끌어다 놓기 — 창 밖에서 들어온 파일만 받는다(목록 안 요소를 끄는 것과 구분). */
  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    if (IS_DEMO || uploading) return
    const files = e.dataTransfer?.files
    if (files?.length) upload(files)
  }

  function onDragOver(e: React.DragEvent) {
    if (!e.dataTransfer?.types.includes('Files')) return
    e.preventDefault()
    if (!IS_DEMO && !uploading) setDragging(true)
  }

  /** 체크한 파일을 지운다 — 쓰이는 곳이 있는 파일은 몇 개인지 알려 주고 한 번 더 묻는다. */
  async function removePicked() {
    const targets = pickedShown
    if (targets.length === 0) return
    const used = targets.filter((m) => m.usages.length > 0)
    const total = targets.reduce((sum, m) => sum + m.size, 0)
    const warn = used.length
      ? `\n\n이 중 ${used.length}개는 홈페이지에서 쓰이고 있습니다. 지우면 그곳의 그림·첨부가 깨집니다.`
      : ''
    if (!confirm(`고른 파일 ${targets.length}개(${formatSize(total)})를 지울까요?${warn}\n되돌릴 수 없습니다.`)) return

    const failed: string[] = []
    for (const [i, m] of targets.entries()) {
      setRemoving(`지우는 중 ${i + 1}/${targets.length}`)
      try {
        await api(`/media/${m.name}${m.usages.length ? '?force=1' : ''}`, { method: 'DELETE', auth: true })
      } catch (e) {
        failed.push(`${m.originalName || m.name}: ${(e as Error).message}`)
      }
    }
    setRemoving('')
    setPicked([])
    setSelected(null)
    load()
    if (failed.length) alert(`지우지 못한 파일이 있습니다.\n\n${failed.join('\n')}`)
  }

  return (
    <>
      <PageHeader
        title="미디어 라이브러리"
        description="파일을 목록으로 끌어다 놓아 올리고, 대체 텍스트를 적고, 고른 파일을 한꺼번에 지웁니다."
        action={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={removePicked}
              disabled={IS_DEMO || pickedShown.length === 0 || !!removing}
              className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:hover:bg-red-950/40"
            >
              <Icon name="trash" />
              {removing || `선택 삭제${pickedShown.length > 0 ? ` (${pickedShown.length})` : ''}`}
            </button>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,application/zip,.zip"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) upload(e.target.files)
                e.target.value = ''
              }}
            />
            <button type="button" onClick={() => fileRef.current?.click()} disabled={IS_DEMO || !!uploading} className="btn-primary disabled:opacity-50">
              <Icon name="upload" />
              {uploading || '파일 올리기'}
            </button>
          </div>
        }
      />

      {IS_DEMO && (
        <p className="mb-4 rounded-lg bg-amber-50 p-3.5 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          GitHub Pages 데모에는 업로드 서버가 없어 미디어 라이브러리가 비어 있습니다. 로컬 개발 서버에서 이용하세요.
        </p>
      )}

      <div className="card mb-4 flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-center">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="파일 이름·대체 텍스트로 찾기" className="input sm:max-w-xs" />
        <select value={kind} onChange={(e) => setKind(e.target.value as KindFilter)} className="select sm:w-36" aria-label="종류">
          <option value="all">모든 종류</option>
          <option value="image">그림</option>
          <option value="doc">문서·기타</option>
        </select>
        <select value={use} onChange={(e) => setUse(e.target.value as UseFilter)} className="select sm:w-36" aria-label="쓰임">
          <option value="all">전체</option>
          <option value="used">쓰이는 파일</option>
          <option value="unused">미사용 파일</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="select sm:w-44" aria-label="정렬">
          {Object.entries(SORT_LABEL).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <div className="flex overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700" role="group" aria-label="보기 방식">
          {([
            ['grid', '썸네일형'],
            ['list', '목록형'],
          ] as [ViewMode, string][]).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              onClick={() => setView(mode)}
              aria-pressed={view === mode}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-medium transition ${
                view === mode ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              <Icon name={mode} />
              {label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <input type="checkbox" checked={allPicked} onChange={toggleAll} disabled={shown.length === 0} className="h-4 w-4 rounded border-slate-300" />
          전체 선택
        </label>
        <p className="text-sm text-slate-500 sm:ml-auto dark:text-slate-400">
          {items ? `${shown.length}개 · 전체 ${items.length}개${pickedShown.length ? ` · ${pickedShown.length}개 선택` : ''}` : ''}
        </p>
      </div>

      {extGroups.length > 0 && (
        <div className="card mb-4 flex flex-wrap items-center gap-2 p-4">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">확장자</span>
          <span className="text-xs text-slate-400">{exts.length === 0 ? '전체 보는 중 — 체크하면 그 확장자만 보입니다' : `${exts.length}종 선택`}</span>
          {extGroups.map(([ext, count]) => {
            const on = exts.includes(ext)
            return (
              <label
                key={ext || 'none'}
                className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${
                  on
                    ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-200'
                    : 'border-slate-200 text-slate-600 hover:border-slate-400 dark:border-slate-700 dark:text-slate-300'
                }`}
              >
                <input type="checkbox" checked={on} onChange={() => toggleExt(ext)} className="h-3.5 w-3.5 rounded border-slate-300" />
                {extLabel(ext)} ({count})
              </label>
            )
          })}
          {exts.length > 0 && (
            <button type="button" onClick={() => setExts([])} className="text-xs font-medium text-slate-500 underline hover:text-slate-700 dark:text-slate-400">
              확장자 선택 해제
            </button>
          )}
        </div>
      )}

      {error && <ErrorMessage message={error} />}

      <div>
        <div
          onDragOver={onDragOver}
          onDragEnter={onDragOver}
          onDragLeave={(e) => {
            // 안쪽 요소를 지날 때도 leave 가 오므로, 영역을 정말 벗어났을 때만 끈다.
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false)
          }}
          onDrop={onDrop}
          className={`card relative p-4 transition ${dragging ? 'ring-2 ring-brand-500 ring-offset-2 dark:ring-offset-slate-900' : ''}`}
        >
          {dragging && (
            <p className="pointer-events-none absolute inset-0 z-10 grid place-content-center justify-items-center gap-2 rounded-xl bg-brand-50/90 text-sm font-semibold text-brand-700 dark:bg-brand-950/80 dark:text-brand-200">
              <Icon name="upload" className="h-7 w-7" />
              여기에 놓으면 파일이 올라갑니다
            </p>
          )}
          {!items ? (
            <Loading />
          ) : shown.length === 0 ? (
            <EmptyState label={items.length === 0 ? '올린 파일이 없습니다. 파일을 이곳으로 끌어다 놓아 보세요.' : '조건에 맞는 파일이 없습니다.'} />
          ) : view === 'grid' ? (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
              {shown.map((m) => (
                <li key={m.name} className="group relative">
                  <button
                    type="button"
                    onClick={() => setSelected(m.name)}
                    aria-pressed={selected === m.name}
                    className={`group block w-full overflow-hidden rounded-lg border text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                      selected === m.name ? 'border-brand-500 ring-2 ring-brand-500/40' : 'border-slate-200 hover:border-slate-400 dark:border-slate-700'
                    }`}
                  >
                    <div className="relative aspect-square">
                      <Thumb item={m} className="h-full w-full" />
                      {m.usages.length === 0 && (
                        <span className="absolute left-1.5 top-1.5 rounded bg-slate-900/70 px-1.5 py-0.5 text-[10px] font-medium text-white">미사용</span>
                      )}
                    </div>
                    <p className="truncate px-2 pt-1.5 text-xs font-medium text-slate-700 dark:text-slate-200">{m.originalName || m.name}</p>
                    <p className="px-2 text-[11px] text-slate-400">
                      {extLabel(extOf(m))} · {formatSize(m.size)}
                      {m.kind === 'image' && m.width ? ` · ${formatDimension(m)}` : ''}
                    </p>
                    <p className="px-2 pb-1.5 text-[11px] tabular-nums text-slate-400">{formatStamp(m.createdAt).slice(0, 10)}</p>
                  </button>
                  <label
                    className="absolute right-1.5 top-1.5 cursor-pointer rounded bg-white/90 p-1 shadow-sm dark:bg-slate-900/90"
                    title="선택"
                  >
                    <input type="checkbox" checked={picked.includes(m.name)} onChange={() => toggle(m.name)} className="h-4 w-4 rounded border-slate-300" />
                    <span className="sr-only">{m.originalName || m.name} 선택</span>
                  </label>
                </li>
              ))}
            </ul>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 text-left text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  <tr>
                    <th className="w-9 py-2">
                      <input
                        type="checkbox"
                        checked={allPicked}
                        onChange={toggleAll}
                        className="h-4 w-4 rounded border-slate-300"
                        aria-label="목록 전체 선택"
                      />
                    </th>
                    <th className="py-2 font-medium">파일</th>
                    <th className="py-2 font-medium">종류</th>
                    <th className="py-2 font-medium">이미지 크기</th>
                    <th className="py-2 font-medium">용량</th>
                    <th className="py-2 font-medium">올린 날</th>
                    <th className="py-2 font-medium">쓰임</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {shown.map((m) => (
                    <tr
                      key={m.name}
                      className={`align-middle ${selected === m.name ? 'bg-brand-50 dark:bg-brand-950/30' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                    >
                      <td className="py-2">
                        <input
                          type="checkbox"
                          checked={picked.includes(m.name)}
                          onChange={() => toggle(m.name)}
                          className="h-4 w-4 rounded border-slate-300"
                          aria-label={`${m.originalName || m.name} 선택`}
                        />
                      </td>
                      <td className="py-2">
                        <div className="flex items-center gap-2.5">
                          {m.kind === 'image' ? (
                            <button
                              type="button"
                              onClick={() => setSelected(m.name)}
                              title="자세히 보기"
                              className="shrink-0 rounded border border-slate-200 transition hover:ring-2 hover:ring-brand-400 dark:border-slate-700"
                            >
                              <Thumb item={m} className="h-10 w-10 rounded" />
                              <span className="sr-only">{m.originalName || m.name} 자세히 보기</span>
                            </button>
                          ) : (
                            <Thumb item={m} className="h-10 w-10 shrink-0 rounded border border-slate-200 dark:border-slate-700" />
                          )}
                          <button type="button" onClick={() => setSelected(m.name)} className="min-w-0 text-left">
                            <span className="block max-w-[18rem] truncate font-medium text-slate-700 dark:text-slate-200">
                              {m.originalName || m.name}
                            </span>
                            <span className="block max-w-[18rem] truncate text-[11px] text-slate-400">{m.alt || m.title || m.url}</span>
                          </button>
                        </div>
                      </td>
                      <td className="py-2 whitespace-nowrap text-slate-500 dark:text-slate-400">
                        {KIND_LABEL[m.kind]}
                        {extOf(m) && <span className="ml-1 text-[11px] text-slate-400">{extLabel(extOf(m))}</span>}
                      </td>
                      <td className="py-2 tabular-nums text-slate-500 dark:text-slate-400">{m.kind === 'image' ? formatDimension(m) : '—'}</td>
                      <td className="py-2 tabular-nums text-slate-500 dark:text-slate-400">{formatSize(m.size)}</td>
                      <td className="py-2 whitespace-nowrap tabular-nums text-slate-500 dark:text-slate-400">{formatStamp(m.createdAt)}</td>
                      <td className="py-2 text-slate-500 dark:text-slate-400">
                        {m.usages.length === 0 ? <span className="text-slate-400">미사용</span> : `${m.usages.length}곳`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {current && (
        <MediaModal
          item={current}
          position={shownIndex + 1}
          total={shownIndex < 0 ? 1 : shown.length}
          onMove={(step) => {
            const next = shown[shownIndex + step]
            if (next) setSelected(next.name)
          }}
          onClose={() => setSelected(null)}
          onSaved={(alt, title) => setItems((prev) => prev?.map((m) => (m.name === current.name ? { ...m, alt, title } : m)) ?? null)}
          onDeleted={() => {
            setSelected(null)
            setPicked((prev) => prev.filter((n) => n !== current.name))
            load()
          }}
        />
      )}
    </>
  )
}

/** 파일 창의 정보 패널 — 주소 복사·대체 텍스트·쓰인 곳·삭제 (미리보기는 창 왼쪽에 있다) */
function MediaDetail({
  item,
  onSaved,
  onDeleted,
}: {
  item: MediaItem
  onSaved: (alt: string, title: string) => void
  onDeleted: () => void
}) {
  const [alt, setAlt] = useState(item.alt)
  const [title, setTitle] = useState(item.title)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const dirty = alt !== item.alt || title !== item.title

  async function save() {
    setSaving(true)
    try {
      await api(`/media/${item.name}`, { method: 'PUT', body: { alt, title }, auth: true })
      invalidateMediaAlts()
      onSaved(alt.trim(), title.trim())
      setNotice('저장했습니다.')
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function copy() {
    const url = `${window.location.origin}${item.url}`
    try {
      await navigator.clipboard.writeText(url)
      setNotice('주소를 복사했습니다.')
    } catch {
      prompt('주소를 복사하세요.', url)
    }
  }

  async function remove() {
    const used = item.usages.length
    const message = used
      ? `이 파일은 ${used}곳에서 쓰이고 있습니다. 지우면 그곳의 그림·첨부가 깨집니다.\n그래도 지울까요? 되돌릴 수 없습니다.`
      : `'${item.originalName || item.name}' 을(를) 지울까요?\n되돌릴 수 없습니다.`
    if (!confirm(message)) return
    try {
      await api(`/media/${item.name}${used ? '?force=1' : ''}`, { method: 'DELETE', auth: true })
      onDeleted()
    } catch (e) {
      alert((e as Error).message)
    }
  }

  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-[4.5rem_1fr] gap-y-1.5 text-xs">
        <dt className="text-slate-400">원래 이름</dt>
        <dd className="break-all text-slate-700 dark:text-slate-200">{item.originalName || '—'}</dd>
        <dt className="text-slate-400">파일</dt>
        <dd className="break-all font-mono text-[11px] text-slate-600 dark:text-slate-300">{item.url}</dd>
        <dt className="text-slate-400">용량</dt>
        <dd className="text-slate-700 dark:text-slate-200">{formatSize(item.size)}</dd>
        <dt className="text-slate-400">종류</dt>
        <dd className="text-slate-700 dark:text-slate-200">
          {KIND_LABEL[item.kind]}
          {extOf(item) && ` · ${extLabel(extOf(item))}`}
        </dd>
        {item.kind === 'image' && (
          <>
            <dt className="text-slate-400">이미지 크기</dt>
            <dd className="tabular-nums text-slate-700 dark:text-slate-200">{formatDimension(item)}</dd>
          </>
        )}
        <dt className="text-slate-400">올린 날</dt>
        <dd className="tabular-nums text-slate-700 dark:text-slate-200">{formatStamp(item.createdAt)}</dd>
      </dl>

      <button type="button" onClick={copy} className="btn-secondary w-full">
        주소 복사
      </button>

      <div className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-700">
        <div>
          <label htmlFor="media-alt" className="label">
            대체 텍스트
          </label>
          <input id="media-alt" value={alt} maxLength={300} onChange={(e) => setAlt(e.target.value)} className="input" placeholder="그림을 설명하는 한 문장" />
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            검색 엔진과 화면 읽기 프로그램이 읽습니다. 본문 그림의 대체 텍스트가 비어 있으면 이 값이 쓰입니다.
          </p>
        </div>
        <div>
          <label htmlFor="media-title" className="label">
            제목
          </label>
          <input id="media-title" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} className="input" placeholder="관리용 이름 (찾기에 쓰입니다)" />
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={save} disabled={saving || !dirty} className="btn-primary disabled:opacity-50">
            {saving ? '저장 중…' : '저장'}
          </button>
          {notice && <span className="text-xs text-green-600">{notice}</span>}
        </div>
      </div>

      <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
        <p className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-300">쓰인 곳 {item.usages.length}곳</p>
        {item.usages.length === 0 ? (
          <p className="text-xs text-slate-400">아무 데도 쓰이지 않습니다.</p>
        ) : (
          <ul className="space-y-1.5">
            {item.usages.map((u, i) => (
              <li key={`${u.link}-${i}`} className="flex items-center gap-2 text-xs">
                <Badge>{u.kind}</Badge>
                <Link to={u.link} className="truncate text-slate-700 hover:text-brand-600 dark:text-slate-200">
                  {u.label}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button type="button" onClick={remove} className="w-full rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:hover:bg-red-950/40">
        파일 삭제
      </button>
    </div>
  )
}
