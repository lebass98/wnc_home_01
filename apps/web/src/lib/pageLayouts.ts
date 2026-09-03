import { useEffect, useState } from 'react'
import type { PageLayoutType, SitePageLayoutMap } from '@wnc/shared'
import { api } from './api'

/**
 * 화면별 레이아웃 — 페이지 관리에서 고른 값을 홈페이지가 읽어 서브 틀을 바꾼다.
 * 메뉴와 같은 방식으로 한 번만 받아 두고 화면끼리 나눠 쓴다.
 */

let layoutPromise: Promise<SitePageLayoutMap> | null = null
const listeners = new Set<() => void>()

/** 관리자에서 레이아웃을 바꾼 뒤 부른다 — 열려 있는 사이트 화면이 다시 읽는다. */
export function invalidatePageLayouts() {
  layoutPromise = null
  for (const notify of listeners) notify()
}

function load(): Promise<SitePageLayoutMap> {
  layoutPromise ??= api<SitePageLayoutMap>('/site-pages/layouts').catch(() => ({}) as SitePageLayoutMap)
  return layoutPromise
}

export function usePageLayouts(): SitePageLayoutMap {
  const [map, setMap] = useState<SitePageLayoutMap>({})
  useEffect(() => {
    let alive = true
    const refresh = () => {
      load().then((m) => {
        if (alive) setMap(m)
      })
    }
    refresh()
    listeners.add(refresh)
    return () => {
      alive = false
      listeners.delete(refresh)
    }
  }, [])
  return map
}

/** '/board/:id' 같은 패턴이 실제 경로와 맞는지 — 조각 수가 같고 ':' 조각은 아무 값이나 받는다. */
function matchPattern(pattern: string, pathname: string): boolean {
  const ps = pattern.split('/')
  const cs = pathname.split('/')
  if (ps.length !== cs.length) return false
  return ps.every((seg, i) => seg.startsWith(':') || seg === cs[i])
}

/**
 * 지금 경로의 레이아웃. 정확히 일치하는 저장값이 먼저고,
 * 없으면 패턴 경로(/board/:id 등)를 맞춰 본다. 둘 다 없으면 기본 서브다.
 */
export function layoutFor(pathname: string, map: SitePageLayoutMap): PageLayoutType {
  const exact = map[pathname]
  if (exact) return exact
  for (const [pattern, layout] of Object.entries(map)) {
    if (pattern.includes(':') && matchPattern(pattern, pathname)) return layout
  }
  return 'basic'
}
