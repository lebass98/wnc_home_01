import { useEffect, useState } from 'react'
import { DEFAULT_SITE_DESIGN, type SiteDesign } from '@wnc/shared'
import { api } from './api'

/**
 * 사이트 전역 디자인 — [디자인 설정]에서 고른 헤더·푸터를 홈페이지가 읽어 틀을 바꾼다.
 * 메뉴·레이아웃과 같은 방식으로 한 번만 받아 두고 화면끼리 나눠 쓴다.
 */

let designPromise: Promise<SiteDesign> | null = null
const listeners = new Set<() => void>()

/** 관리자에서 디자인을 바꾼 뒤 부른다 — 열려 있는 사이트 화면이 다시 읽는다. */
export function invalidateSiteDesign() {
  designPromise = null
  for (const notify of listeners) notify()
}

function load(): Promise<SiteDesign> {
  designPromise ??= api<SiteDesign>('/design').catch(() => DEFAULT_SITE_DESIGN)
  return designPromise
}

export function useSiteDesign(): SiteDesign {
  const [design, setDesign] = useState<SiteDesign>(DEFAULT_SITE_DESIGN)
  useEffect(() => {
    let alive = true
    const refresh = () => {
      load().then((d) => {
        if (alive) setDesign(d)
      })
    }
    refresh()
    listeners.add(refresh)
    return () => {
      alive = false
      listeners.delete(refresh)
    }
  }, [])
  return design
}
