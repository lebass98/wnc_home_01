import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { loadRedirects, reportRedirectHit, resolveRedirect } from '../lib/redirects'

/**
 * 리디렉션 문지기 — 지금 주소가 [리디렉션]에 등록된 옛 주소면 새 주소로 넘긴다.
 *
 * - 사이트 레이아웃 안에 두면, 있는 화면의 주소를 바꿨을 때(예: /about → /company) 넘긴다.
 * - fallback 으로 쓰면 없는 주소(*)에서 먼저 규칙을 보고, 맞는 규칙이 없을 때만 홈으로 보낸다.
 */
export default function RedirectGate({ fallback = false }: { fallback?: boolean }) {
  const { pathname, search, hash } = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    let alive = true
    loadRedirects().then((rules) => {
      if (!alive) return
      const hit = resolveRedirect(pathname, rules)
      if (hit) {
        reportRedirectHit(hit.first.fromPath)
        if (/^https?:\/\//i.test(hit.to)) {
          window.location.replace(hit.to)
          return
        }
        // 새 주소에 따로 쿼리가 없으면 원래 쿼리·#을 이어 붙인다.
        navigate(hit.to.includes('?') || hit.to.includes('#') ? hit.to : `${hit.to}${search}${hash}`, { replace: true })
        return
      }
      if (fallback) navigate('/', { replace: true })
    })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  // 그리는 것은 없다 — 없는 주소에서는 규칙을 확인하는 동안 빈 화면이다.
  return null
}
