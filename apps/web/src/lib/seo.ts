import { useEffect } from 'react'
import type { SiteSetting } from '@wnc/shared'
import { api } from './api'

/** 같은 이름의 메타 태그가 있으면 내용만 바꾸고, 없으면 새로 넣는다. */
function upsertMeta(key: 'name' | 'property', value: string, content: string | null | undefined) {
  const found = document.head.querySelector<HTMLMetaElement>(`meta[${key}="${value}"]`)
  if (!content) {
    found?.remove()
    return
  }
  const el = found ?? document.head.appendChild(document.createElement('meta'))
  el.setAttribute(key, value)
  el.setAttribute('content', content)
}

/**
 * Google Analytics 스크립트를 한 번만 넣는다.
 * 측정 ID 는 인라인 스크립트에 그대로 들어가므로 허용 문자만 통과시킨다.
 */
function loadAnalytics(gaId: string | null) {
  if (!gaId || !/^[A-Za-z0-9_-]+$/.test(gaId)) return
  if (document.getElementById('ga-script')) return

  const loader = document.createElement('script')
  loader.id = 'ga-script'
  loader.async = true
  loader.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`
  document.head.appendChild(loader)

  const init = document.createElement('script')
  init.textContent =
    `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)};` +
    `gtag('js',new Date());gtag('config','${gaId}');`
  document.head.appendChild(init)
}

/** 환경설정 > SEO 에 저장한 값을 공개 사이트의 <head> 에 반영한다. */
export function useSiteSeo() {
  useEffect(() => {
    let alive = true

    api<SiteSetting>('/settings')
      .then((s) => {
        if (!alive) return

        const title = s.metaTitle?.trim() || s.siteName
        const description = s.metaDescription?.trim() || s.description

        if (title) document.title = title
        upsertMeta('name', 'description', description)
        upsertMeta('name', 'keywords', s.metaKeywords)
        upsertMeta('name', 'robots', s.allowIndexing ? 'index, follow' : 'noindex, nofollow')

        upsertMeta('property', 'og:type', 'website')
        upsertMeta('property', 'og:title', s.ogTitle?.trim() || title)
        upsertMeta('property', 'og:description', s.ogDescription?.trim() || description)
        upsertMeta('property', 'og:image', s.ogImage)
        upsertMeta('property', 'og:url', s.siteUrl)

        upsertMeta('name', 'google-site-verification', s.googleVerification)
        upsertMeta('name', 'naver-site-verification', s.naverVerification)

        loadAnalytics(s.gaId)
      })
      .catch(() => {
        // 설정을 못 읽어도 사이트는 그대로 동작해야 한다.
      })

    return () => {
      alive = false
    }
  }, [])
}
