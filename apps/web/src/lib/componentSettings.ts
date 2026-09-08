import { useEffect, useSyncExternalStore } from 'react'
import { defaultComponentResponse, type ComponentSettingsResponse } from '@wnc/shared'
import { api } from './api'

let snapshot = defaultComponentResponse()
let pending: Promise<ComponentSettingsResponse> | null = null
const listeners = new Set<() => void>()
const CHANGE_KEY = 'wnc_component_settings_changed'
let generation = 0

export function loadComponentSettings() {
  const current = generation
  pending ??= api<ComponentSettingsResponse>('/components').then((value) => {
    if (current === generation) {
      snapshot = value
      for (const listener of listeners) listener()
    }
    return value
  }).catch((error) => {
    if (current === generation) pending = null
    throw error
  })
  return pending
}

function refresh() {
  generation++
  pending = null
  void loadComponentSettings().catch(() => {})
}

/** 같은 화면뿐 아니라 이미 열려 있는 홈페이지 탭에도 저장을 알린다. */
export function invalidateComponentSettings() {
  refresh()
  localStorage.setItem(CHANGE_KEY, String(Date.now()))
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
window.addEventListener('storage', (event) => {
  if (event.key === CHANGE_KEY || event.key === 'wnc_demo_db') refresh()
})
window.addEventListener('focus', refresh)

export function useComponentSettings() {
  const value = useSyncExternalStore(subscribe, () => snapshot)
  useEffect(() => { void loadComponentSettings().catch(() => {}) }, [])
  return value.settings
}

/** 기본 정적 이미지는 GitHub Pages의 하위 경로를 적용하고 업로드·외부 주소는 그대로 쓴다. */
export function componentImageUrl(value: string) {
  const url = value.startsWith('/images/') ? `${import.meta.env.BASE_URL.replace(/\/$/, '')}${value}` : value
  // 기본 서브비주얼 교체 후 기존 브라우저 캐시를 갱신한다.
  const builtInSubVisual = /\/images\/subvisual\/subvisual_(about|directions|services|products|board|faq|contact|terms|privacy|policy)\.jpg$/
  return !/^https?:\/\//.test(url) && builtInSubVisual.test(url) ? `${url}?v=20260908-hd` : url
}
