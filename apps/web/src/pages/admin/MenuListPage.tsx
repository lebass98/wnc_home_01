import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import type { CategoryNode, MenuAutoChildren, MenuItem, MenuItemInput, PageListItem, Paginated } from '@wnc/shared'
import { MENU_AUTO_CHILDREN, MENU_AUTO_CHILDREN_LABEL, SITE_PAGES } from '@wnc/shared'
import { api, qs } from '../../lib/api'
import { useBoards } from '../../lib/boards'
import { invalidateSiteMenu } from '../../lib/menus'
import { Badge, EmptyState, ErrorMessage, Loading, Modal, PageHeader, RowMenu, ToggleSwitch } from '../../components/ui'

const ICON = {
  edit: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.586-9.414a2 2 0 112.828 2.828L11.828 15.9 8 16.9l1-3.828 8.414-8.486z',
  plus: 'M12 4v16m8-8H4',
  trash: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M4 7h16M10 4h4a1 1 0 011 1v2H9V5a1 1 0 011-1z',
}

const EMPTY: MenuItemInput = {
  parentId: null,
  label: '',
  url: '',
  newTab: false,
  autoChildren: 'none',
  published: true,
  showInGnb: true,
  showInFooter: true,
  showInSitemap: true,
}

/** 연결할 곳 고르기 — 직접 입력 외에 사이트 화면·게시판·제품 분류·관리자 페이지를 목록에서 고른다. */
interface LinkOption {
  group: string
  label: string
  url: string
}

/**
 * 홈페이지 메뉴 관리 — 여기서 정한 메뉴가 GNB(상단 메뉴)·푸터·사이트맵에 그대로 보인다.
 * 1차 메뉴 아래 2차 메뉴까지 두 단계이며, 항목마다 어디에 보일지 스위치로 정한다.
 */
export default function MenuListPage() {
  const [tree, setTree] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  /** 편집 창 — 새 항목이면 id 없이 parentId 만, 수정이면 item 을 넣는다. */
  const [editing, setEditing] = useState<{ item?: MenuItem; parentId: number | null } | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    api<MenuItem[]>('/menus/admin', { auth: true })
      .then(setTree)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(load, [load])

  /** 서버는 바뀐 뒤의 전체 트리를 돌려주므로 그대로 갈아 끼우고, 홈페이지 메뉴 캐시도 비운다. */
  async function run(request: () => Promise<MenuItem[]>) {
    setBusy(true)
    setError('')
    try {
      setTree(await request())
      invalidateSiteMenu()
      return true
    } catch (e) {
      setError((e as Error).message)
      return false
    } finally {
      setBusy(false)
    }
  }

  function handleFlag(item: MenuItem, key: 'published' | 'showInGnb' | 'showInFooter' | 'showInSitemap', value: boolean) {
    run(() => api<MenuItem[]>(`/menus/${item.id}/flags`, { method: 'PATCH', body: { [key]: value }, auth: true }))
  }

  function handleMove(siblings: MenuItem[], index: number, dir: -1 | 1, parentId: number | null) {
    const target = index + dir
    if (target < 0 || target >= siblings.length) return
    const ids = siblings.map((s) => s.id)
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    run(() => api<MenuItem[]>('/menus/reorder', { method: 'PUT', body: { parentId, ids }, auth: true }))
  }

  function handleDelete(item: MenuItem) {
    const extra = item.children.length > 0 ? `\n아래 2차 메뉴 ${item.children.length}개도 함께 지워집니다.` : ''
    if (!confirm(`'${item.label}' 메뉴를 삭제할까요?${extra}\n삭제하면 되돌릴 수 없습니다.`)) return
    run(() => api<MenuItem[]>(`/menus/${item.id}`, { method: 'DELETE', auth: true }))
  }

  const parents = tree.map((t) => ({ id: t.id, label: t.label }))

  return (
    <>
      <PageHeader
        title="메뉴 관리"
        description="홈페이지 상단 메뉴(GNB)·푸터·사이트맵에 보이는 메뉴를 관리합니다. 순서를 바꾸거나 숨기고, 연결할 곳을 정할 수 있습니다."
        action={
          <button type="button" onClick={() => setEditing({ parentId: null })} className="btn-primary">
            + 1차 메뉴 추가
          </button>
        }
      />

      {error && (
        <div className="mb-4">
          <ErrorMessage message={error} />
        </div>
      )}

      <div className="card">
        {loading ? (
          <Loading />
        ) : tree.length === 0 ? (
          <EmptyState label="등록된 메뉴가 없습니다. 오른쪽 위 '1차 메뉴 추가'로 첫 메뉴를 만들어 보세요." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[64rem] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400">
                  <th className="px-4 py-3">메뉴</th>
                  <th className="px-4 py-3">연결</th>
                  <th className="w-24 px-3 py-3 text-center">GNB</th>
                  <th className="w-24 px-3 py-3 text-center">푸터</th>
                  <th className="w-24 px-3 py-3 text-center">사이트맵</th>
                  <th className="w-20 px-3 py-3 text-center">사용</th>
                  <th className="w-24 px-3 py-3 text-center">순서</th>
                  <th className="w-16 px-4 py-3 text-right">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {tree.map((item, i) => (
                  <MenuRows
                    key={item.id}
                    item={item}
                    index={i}
                    siblings={tree}
                    busy={busy}
                    onFlag={handleFlag}
                    onMove={handleMove}
                    onEdit={(target) => setEditing({ item: target, parentId: target.parentId })}
                    onAddChild={(parent) => setEditing({ parentId: parent.id })}
                    onDelete={handleDelete}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
        '사용'을 끄면 어디에도 보이지 않습니다. 1차 메뉴를 숨기면 그 아래 2차 메뉴도 함께 숨겨집니다. 자동 추가로 둔 2차
        메뉴(제품 대분류·게시판)는 1차 메뉴의 노출 설정을 따릅니다.
      </p>

      {editing && (
        <MenuEditModal
          item={editing.item}
          parentId={editing.parentId}
          parents={parents}
          onClose={() => setEditing(null)}
          onSave={async (input) => {
            const ok = await run(() =>
              editing.item
                ? api<MenuItem[]>(`/menus/${editing.item.id}`, { method: 'PUT', body: input, auth: true })
                : api<MenuItem[]>('/menus', { method: 'POST', body: input, auth: true }),
            )
            if (ok) setEditing(null)
            return ok
          }}
        />
      )}
    </>
  )
}

/** 1차 메뉴 한 줄과 그 아래 2차 메뉴 줄들 */
function MenuRows({
  item,
  index,
  siblings,
  busy,
  onFlag,
  onMove,
  onEdit,
  onAddChild,
  onDelete,
}: {
  item: MenuItem
  index: number
  siblings: MenuItem[]
  busy: boolean
  onFlag: (item: MenuItem, key: 'published' | 'showInGnb' | 'showInFooter' | 'showInSitemap', value: boolean) => void
  onMove: (siblings: MenuItem[], index: number, dir: -1 | 1, parentId: number | null) => void
  onEdit: (item: MenuItem) => void
  onAddChild: (parent: MenuItem) => void
  onDelete: (item: MenuItem) => void
}) {
  const auto = item.autoChildren !== 'none'
  return (
    <>
      <MenuRow
        item={item}
        depth={1}
        index={index}
        count={siblings.length}
        busy={busy}
        onFlag={onFlag}
        onMove={(dir) => onMove(siblings, index, dir, null)}
        menu={[
          { label: '수정', icon: ICON.edit, onClick: () => onEdit(item) },
          { label: '2차 메뉴 추가', icon: ICON.plus, onClick: () => onAddChild(item) },
          { label: '삭제', icon: ICON.trash, danger: true, onClick: () => onDelete(item) },
        ]}
      />
      {item.children.map((child, j) => (
        <MenuRow
          key={child.id}
          item={child}
          depth={2}
          index={j}
          count={item.children.length}
          busy={busy}
          parentOff={!item.published}
          onFlag={onFlag}
          onMove={(dir) => onMove(item.children, j, dir, item.id)}
          menu={[
            { label: '수정', icon: ICON.edit, onClick: () => onEdit(child) },
            { label: '삭제', icon: ICON.trash, danger: true, onClick: () => onDelete(child) },
          ]}
        />
      ))}
      {auto && (
        <tr className="bg-slate-50/60 dark:bg-slate-900/30">
          <td className="px-4 py-2 pl-10 text-xs text-slate-500 dark:text-slate-400" colSpan={8}>
            ↳ {MENU_AUTO_CHILDREN_LABEL[item.autoChildren]} — 홈페이지에서는 직접 등록한 2차 메뉴 뒤에 자동으로 붙습니다.
          </td>
        </tr>
      )}
    </>
  )
}

function MenuRow({
  item,
  depth,
  index,
  count,
  busy,
  parentOff = false,
  onFlag,
  onMove,
  menu,
}: {
  item: MenuItem
  depth: 1 | 2
  index: number
  count: number
  busy: boolean
  /** 1차 메뉴가 꺼져 있어 이 2차 메뉴도 보이지 않는 상태 */
  parentOff?: boolean
  onFlag: (item: MenuItem, key: 'published' | 'showInGnb' | 'showInFooter' | 'showInSitemap', value: boolean) => void
  onMove: (dir: -1 | 1) => void
  menu: { label: string; icon: string; onClick: () => void; danger?: boolean }[]
}) {
  const dim = !item.published || parentOff
  const external = /^https?:\/\//.test(item.url)
  return (
    <tr className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 ${dim ? 'text-slate-400' : ''}`}>
      <td className={`px-4 py-3 ${depth === 2 ? 'pl-10' : ''}`}>
        <div className="flex items-center gap-2">
          {depth === 2 && <span className="text-slate-300 dark:text-slate-600">↳</span>}
          <span className={`${depth === 1 ? 'font-semibold' : ''} ${dim ? '' : 'text-slate-900 dark:text-slate-100'}`}>
            {item.label}
          </span>
          {parentOff && <Badge tone="amber">1차 메뉴 꺼짐</Badge>}
        </div>
      </td>
      <td className="max-w-xs px-4 py-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="truncate tabular-nums text-slate-600 dark:text-slate-400">{item.url || '(연결 없음)'}</span>
          {external && <Badge tone="blue">외부</Badge>}
          {item.newTab && <Badge>새 창</Badge>}
        </div>
      </td>
      {(['showInGnb', 'showInFooter', 'showInSitemap', 'published'] as const).map((key) => (
        <td key={key} className="px-3 py-3 text-center">
          <div className="inline-flex">
            <ToggleSwitch
              checked={item[key]}
              onChange={(v) => !busy && onFlag(item, key, v)}
              label={`${item.label} ${
                key === 'published' ? '사용' : key === 'showInGnb' ? 'GNB 노출' : key === 'showInFooter' ? '푸터 노출' : '사이트맵 노출'
              }`}
            />
          </div>
        </td>
      ))}
      <td className="px-3 py-3 text-center">
        <div className="inline-flex gap-1">
          <button
            type="button"
            onClick={() => onMove(-1)}
            disabled={busy || index === 0}
            className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-700"
            aria-label="위로"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            disabled={busy || index === count - 1}
            className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-700"
            aria-label="아래로"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <RowMenu items={menu} />
      </td>
    </tr>
  )
}

/* ------------------------------ 편집 창 ------------------------------ */

function MenuEditModal({
  item,
  parentId,
  parents,
  onClose,
  onSave,
}: {
  item?: MenuItem
  parentId: number | null
  parents: { id: number; label: string }[]
  onClose: () => void
  onSave: (input: MenuItemInput) => Promise<boolean>
}) {
  const isNew = !item
  const [form, setForm] = useState<MenuItemInput>(
    item
      ? {
          parentId: item.parentId,
          label: item.label,
          url: item.url,
          newTab: item.newTab,
          autoChildren: item.autoChildren,
          published: item.published,
          showInGnb: item.showInGnb,
          showInFooter: item.showInFooter,
          showInSitemap: item.showInSitemap,
        }
      : { ...EMPTY, parentId },
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // 연결할 곳 목록 — 사이트 화면 · 게시판 · 제품 대분류 · 관리자 페이지
  const boards = useBoards(true)
  const [categories, setCategories] = useState<CategoryNode[]>([])
  const [pages, setPages] = useState<PageListItem[]>([])
  useEffect(() => {
    api<CategoryNode[]>('/categories')
      .then(setCategories)
      .catch(() => setCategories([]))
    api<Paginated<PageListItem>>(`/pages${qs({ page: 1, pageSize: 100, includeDrafts: 1 })}`, { auth: true })
      .then((r) => setPages(r.items))
      .catch(() => setPages([]))
  }, [])

  const options = useMemo<LinkOption[]>(
    () => [
      ...SITE_PAGES.filter((p) => !p.path.includes(':')).map((p) => ({ group: '사이트 화면', label: p.label, url: p.path })),
      ...boards.map((b) => ({ group: '게시판', label: b.name, url: `/board?category=${b.slug}` })),
      ...categories.map((c) => ({ group: '제품 대분류', label: c.name, url: `/products?category=${c.id}` })),
      ...pages.map((p) => ({ group: '관리자 페이지', label: `${p.title}${p.published ? '' : ' (미발행)'}`, url: `/page/${p.slug}` })),
    ],
    [boards, categories, pages],
  )
  const groups = Array.from(new Set(options.map((o) => o.group)))
  const picked = options.some((o) => o.url === form.url) ? form.url : ''

  function set<K extends keyof MenuItemInput>(key: K, value: MenuItemInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  /** 자식이 있는 1차 메뉴는 2차로 내릴 수 없다 — 서버도 막지만 선택지에서 미리 뺀다. */
  const hasChildren = (item?.children.length ?? 0) > 0
  const parentChoices = parents.filter((p) => p.id !== item?.id)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.label.trim()) {
      setError('메뉴 이름을 입력하세요. 홈페이지 메뉴에 그대로 보입니다.')
      return
    }
    const url = form.url.trim()
    if (url && !url.startsWith('/') && !/^https?:\/\//.test(url)) {
      setError('주소는 / 로 시작하는 사이트 안 경로이거나 http:// 또는 https:// 로 시작하는 외부 주소여야 합니다.')
      return
    }
    setSaving(true)
    setError('')
    const ok = await onSave({ ...form, label: form.label.trim(), url })
    setSaving(false)
    if (!ok) setError('저장하지 못했습니다. 목록 위의 오류 내용을 확인하세요.')
  }

  const isChild = form.parentId !== null && form.parentId !== undefined

  return (
    <Modal
      title={isNew ? (parentId ? '2차 메뉴 추가' : '1차 메뉴 추가') : '메뉴 수정'}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            취소
          </button>
          <button type="submit" form="menu-edit-form" disabled={saving} className="btn-primary">
            {saving ? '저장 중...' : isNew ? '추가' : '저장'}
          </button>
        </div>
      }
    >
      <form id="menu-edit-form" onSubmit={handleSubmit} className="space-y-4">
        {error && <ErrorMessage message={error} />}

        <div>
          <label htmlFor="menu-parent" className="label">
            상위 메뉴
          </label>
          <select
            id="menu-parent"
            value={form.parentId ?? ''}
            onChange={(e) => set('parentId', e.target.value ? Number(e.target.value) : null)}
            className="input"
            disabled={hasChildren}
          >
            <option value="">(없음 — 1차 메뉴)</option>
            {parentChoices.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
          {hasChildren && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              2차 메뉴가 달려 있어 다른 메뉴 아래로 옮길 수 없습니다.
            </p>
          )}
        </div>

        <div>
          <label htmlFor="menu-label" className="label">
            메뉴 이름 <span className="text-red-500">*</span>
          </label>
          <input
            id="menu-label"
            value={form.label}
            onChange={(e) => set('label', e.target.value)}
            className="input"
            maxLength={50}
            placeholder="예: 회사소개"
            required
          />
        </div>

        <div>
          <label htmlFor="menu-pick" className="label">
            연결할 곳
          </label>
          <select
            id="menu-pick"
            value={picked}
            onChange={(e) => e.target.value && set('url', e.target.value)}
            className="input"
          >
            <option value="">목록에서 고르거나 아래에 직접 입력</option>
            {groups.map((g) => (
              <optgroup key={g} label={g}>
                {options
                  .filter((o) => o.group === g)
                  .map((o) => (
                    <option key={o.url} value={o.url}>
                      {o.label}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
          <input
            value={form.url}
            onChange={(e) => set('url', e.target.value)}
            className="input mt-2 tabular-nums"
            maxLength={500}
            placeholder="/about 또는 https://example.com — 비우면 글자만 보입니다"
            aria-label="주소"
          />
          <label className="mt-2 flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <input type="checkbox" checked={form.newTab} onChange={(e) => set('newTab', e.target.checked)} />새 창으로 열기
          </label>
        </div>

        {!isChild && (
          <div>
            <label htmlFor="menu-auto" className="label">
              2차 메뉴 자동 추가
            </label>
            <select
              id="menu-auto"
              value={form.autoChildren}
              onChange={(e) => set('autoChildren', e.target.value as MenuAutoChildren)}
              className="input"
            >
              {MENU_AUTO_CHILDREN.map((v) => (
                <option key={v} value={v}>
                  {MENU_AUTO_CHILDREN_LABEL[v]}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              제품 분류나 게시판이 늘어나면 메뉴를 따로 고치지 않아도 2차 메뉴가 같이 늘어납니다.
            </p>
          </div>
        )}

        <fieldset className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
          <legend className="px-1 text-xs font-medium text-slate-500 dark:text-slate-400">어디에 보일지</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ['published', '사용', '끄면 어디에도 보이지 않습니다.'],
                ['showInGnb', '상단 메뉴(GNB)', '헤더의 1차·2차 메뉴'],
                ['showInFooter', '푸터', '페이지 맨 아래 메뉴 열'],
                ['showInSitemap', '사이트맵', '전체 화면 사이트맵'],
              ] as const
            ).map(([key, title, desc]) => (
              <div key={key} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-900/50">
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{desc}</p>
                </div>
                <ToggleSwitch checked={form[key]} onChange={(v) => set(key, v)} label={title} />
              </div>
            ))}
          </div>
        </fieldset>
      </form>
    </Modal>
  )
}
