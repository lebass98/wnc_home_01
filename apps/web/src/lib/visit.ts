import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { api } from './api'

/**
 * 방문 기록 — 홈페이지 화면이 바뀔 때마다 한 건씩 남긴다. 관리자 [통계]가 이 값을 모아 본다.
 *
 * 개인을 알아볼 수 있는 값은 보내지 않는다. 브라우저에 임의의 표시(visitorId)를 하나 만들어 두고
 * '같은 사람인지'만 구분한다. 기기·브라우저·운영체제는 서버가 요청 헤더에서 읽는다.
 */

const VISITOR_KEY = 'wnc_visitor'

/** 이 브라우저의 방문자 표시 — 없으면 만들어 저장한다. */
function visitorId(): string {
  try {
    const saved = localStorage.getItem(VISITOR_KEY)
    if (saved) return saved
    const made = crypto.randomUUID?.() ?? `v-${Date.now()}-${Math.random().toString(36).slice(2)}`
    localStorage.setItem(VISITOR_KEY, made)
    return made
  } catch {
    // 저장소를 못 쓰는 환경(프라이빗 모드 등)에서는 방문자 구분 없이 조회수만 센다.
    return ''
  }
}

export function useVisitLog() {
  const { pathname } = useLocation()

  useEffect(() => {
    // 관리자 화면은 세지 않는다.
    if (pathname.startsWith('/admin')) return

    api('/stats/visits', {
      method: 'POST',
      body: { path: pathname, visitorId: visitorId(), referrer: document.referrer },
    }).catch(() => {
      // 통계는 부가 기능이라 실패해도 화면에는 지장이 없다.
    })
  }, [pathname])
}
