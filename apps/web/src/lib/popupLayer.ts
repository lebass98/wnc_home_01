import { useSyncExternalStore } from 'react'

/**
 * 팝업 레이어와 상단 메뉴가 주고받는 아주 작은 저장소.
 * - 레이어는 지금 화면에 해당하는 팝업 건수를 알려 주고,
 * - 상단 메뉴의 POPUP 버튼은 닫힌 팝업을 다시 열어 달라고 요청한다.
 */
let count = 0
/** 열기 요청 횟수 — 값이 바뀌는 것 자체가 신호다. */
let openSeq = 0
const listeners = new Set<() => void>()

function emit() {
  for (const fn of listeners) fn()
}

function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

/** 팝업 레이어가 현재 화면의 팝업 건수를 알린다. */
export function setPopupCount(n: number) {
  if (n === count) return
  count = n
  emit()
}

/** 상단 메뉴에서 팝업을 다시 열어 달라고 요청한다. */
export function requestOpenPopups() {
  openSeq += 1
  emit()
}

export function usePopupCount(): number {
  return useSyncExternalStore(subscribe, () => count)
}

export function usePopupOpenSeq(): number {
  return useSyncExternalStore(subscribe, () => openSeq)
}
