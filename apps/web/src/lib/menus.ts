import { useEffect, useState } from 'react'
import type { CategoryNode, MenuItem, PageListItem } from '@wnc/shared'
import { api } from './api'
import { useBoards } from './boards'

/**
 * 홈페이지 메뉴 — 관리자 [메뉴 관리]에서 등록한 표를 GNB·푸터·사이트맵이 함께 쓴다.
 * '제품 대분류 자동 추가'·'게시판 자동 추가'로 둔 1차 메뉴는 서버 데이터로 2차 메뉴를 채운다.
 */

export interface SiteMenuLink {
  /** 화면 key 용 — 자동으로 붙인 항목은 'auto-…' */
  id: string
  label: string
  url: string
  newTab: boolean
  showInGnb: boolean
  showInFooter: boolean
  showInSitemap: boolean
  children: SiteMenuLink[]
}

export type MenuPlace = 'gnb' | 'footer' | 'sitemap'

const FLAG: Record<MenuPlace, keyof Pick<SiteMenuLink, 'showInGnb' | 'showInFooter' | 'showInSitemap'>> = {
  gnb: 'showInGnb',
  footer: 'showInFooter',
  sitemap: 'showInSitemap',
}

/** 어느 자리에 보일지로 1차·2차를 함께 거른다. */
export function pickMenu(menu: SiteMenuLink[], place: MenuPlace): SiteMenuLink[] {
  const flag = FLAG[place]
  return menu.filter((m) => m[flag]).map((m) => ({ ...m, children: m.children.filter((c) => c[flag]) }))
}

/** 외부 주소인지 — 외부면 <a target> 로, 아니면 라우터 링크로 연다. */
export function isExternalUrl(url: string): boolean {
  return /^https?:\/\//.test(url)
}

let menuPromise: Promise<MenuItem[]> | null = null
let categoryPromise: Promise<CategoryNode[]> | null = null
let navPagePromise: Promise<PageListItem[]> | null = null
const listeners = new Set<() => void>()

/** 관리자에서 메뉴·분류·페이지를 고친 뒤 부른다 — 사이트 메뉴가 바로 다시 그려진다. */
export function invalidateSiteMenu() {
  menuPromise = null
  categoryPromise = null
  navPagePromise = null
  for (const notify of listeners) notify()
}

function loadAll() {
  menuPromise ??= api<MenuItem[]>('/menus')
  categoryPromise ??= api<CategoryNode[]>('/categories').catch(() => [] as CategoryNode[])
  navPagePromise ??= api<PageListItem[]>('/pages/nav').catch(() => [] as PageListItem[])
  return Promise.all([menuPromise, categoryPromise, navPagePromise])
}

function toLink(item: MenuItem): SiteMenuLink {
  return {
    id: String(item.id),
    label: item.label,
    url: item.url,
    newTab: item.newTab,
    showInGnb: item.showInGnb,
    showInFooter: item.showInFooter,
    showInSitemap: item.showInSitemap,
    children: item.children.map(toLink),
  }
}

/** 자동으로 붙는 2차 메뉴는 부모의 노출 설정을 따른다. */
function autoChild(parent: SiteMenuLink, id: string, label: string, url: string): SiteMenuLink {
  return {
    id,
    label,
    url,
    newTab: false,
    showInGnb: parent.showInGnb,
    showInFooter: parent.showInFooter,
    showInSitemap: parent.showInSitemap,
    children: [],
  }
}

/**
 * 완성된 메뉴 트리를 준다. 받기 전에는 빈 배열이다.
 * '상단 메뉴에 표시'로 발행한 관리자 페이지는 메뉴에 같은 주소가 없을 때만 맨 뒤에 덧붙인다.
 */
export function useSiteMenu(): SiteMenuLink[] {
  const boards = useBoards()
  const [data, setData] = useState<{ items: MenuItem[]; categories: CategoryNode[]; navPages: PageListItem[] } | null>(
    null,
  )

  useEffect(() => {
    let alive = true
    const fetchAll = () => {
      loadAll()
        .then(([items, categories, navPages]) => alive && setData({ items, categories, navPages }))
        .catch(() => alive && setData({ items: [], categories: [], navPages: [] }))
    }
    fetchAll()
    listeners.add(fetchAll)
    return () => {
      alive = false
      listeners.delete(fetchAll)
    }
  }, [])

  if (!data) return []

  const menu = data.items.map((item) => {
    const link = toLink(item)
    if (item.autoChildren === 'categories') {
      link.children.push(
        ...data.categories.map((c) => autoChild(link, `auto-category-${c.id}`, c.name, `/products?category=${c.id}`)),
      )
    } else if (item.autoChildren === 'boards') {
      link.children.push(...boards.map((b) => autoChild(link, `auto-board-${b.slug}`, b.name, `/board?category=${b.slug}`)))
    }
    return link
  })

  const known = new Set(menu.flatMap((m) => [m.url, ...m.children.map((c) => c.url)]))
  for (const p of data.navPages) {
    const url = `/page/${p.slug}`
    if (known.has(url)) continue
    menu.push({
      id: `page-${p.id}`,
      label: p.title,
      url,
      newTab: false,
      showInGnb: true,
      showInFooter: true,
      showInSitemap: true,
      children: [],
    })
  }
  return menu
}
