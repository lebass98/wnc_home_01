import { useEffect, useState } from 'react'
import type { BoardSetting, SiteSetting } from '@wnc/shared'
import { DEFAULT_GENERATOR, fillTemplate } from '@wnc/shared'
import { api } from './api'

/**
 * 문서 제목은 두 곳에서 정해진다.
 * - 기본 제목·접미사: 환경설정 > SEO (사이트 전체 공통)
 * - 페이지 제목: 각 화면이 usePageTitle 로 알려준다.
 * 설정은 비동기로 늦게 오므로 값을 모듈에 들고 있다가 도착하면 다시 그린다.
 */
let baseTitle = ''
let titleSuffix = ''
let pageTitle: string | null = null

function renderTitle() {
  const head = pageTitle?.trim() || baseTitle
  if (!head && !titleSuffix) return
  document.title = `${head}${titleSuffix}`
}

/** 화면별 제목을 지정한다. 뒤에는 설정한 접미사가 자동으로 붙는다. */
export function usePageTitle(title: string | null | undefined) {
  useEffect(() => {
    pageTitle = title ?? null
    renderTitle()
    return () => {
      pageTitle = null
    }
  }, [title])
}

/** 사이트 설정은 화면마다 다시 받지 않도록 한 번만 불러 온다. */
let sitePromise: Promise<SiteSetting> | null = null

function loadSiteSetting(): Promise<SiteSetting> {
  sitePromise ??= api<SiteSetting>('/settings')
  return sitePromise
}

/** 관리자에서 설정을 저장한 뒤 부른다 — 다음 화면부터 새 값을 읽는다. */
export function invalidateSiteSetting() {
  sitePromise = null
}

/**
 * 사이트 설정(회사 정보 등)을 화면에서 쓴다. 받기 전에는 null 이므로
 * 호출하는 쪽에서 DEFAULT_COMPANY 같은 기본값으로 대신 그린다.
 */
export function useSiteSetting(): SiteSetting | null {
  const [setting, setSetting] = useState<SiteSetting | null>(null)
  useEffect(() => {
    let alive = true
    loadSiteSetting()
      .then((s) => alive && setSetting(s))
      .catch(() => {
        // 설정을 못 읽어도 화면은 기본값으로 그려진다.
      })
    return () => {
      alive = false
    }
  }, [])
  return setting
}

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

/**
 * 화면별 검색 설명·공유 제목·공유 이미지. 화면을 떠나면 환경설정 값으로 되돌린다.
 * 비어 있는 항목은 건드리지 않는다.
 */
export function usePageMeta(meta: {
  title?: string | null
  description?: string | null
  image?: string | null
  /** 화면별 검색 키워드 — 비우면 환경설정의 기본 키워드를 그대로 둔다. */
  keywords?: string | null
}) {
  const { title, description, image, keywords } = meta
  useEffect(() => {
    if (!title && !description && !image && !keywords) return
    if (title) upsertMeta('property', 'og:title', title)
    if (description) {
      upsertMeta('name', 'description', description)
      upsertMeta('property', 'og:description', description)
    }
    if (image) upsertMeta('property', 'og:image', image)
    if (keywords) upsertMeta('name', 'keywords', keywords)

    return () => {
      loadSiteSetting()
        .then((s) => {
          const d = s.metaDescription?.trim() || s.description
          upsertMeta('name', 'description', d)
          upsertMeta('name', 'keywords', s.metaKeywords)
          upsertMeta('property', 'og:title', s.ogEnabled ? s.ogTitle?.trim() || s.metaTitle?.trim() || s.siteName : null)
          upsertMeta('property', 'og:description', s.ogEnabled ? s.ogDescription?.trim() || d : null)
          upsertMeta('property', 'og:image', s.ogEnabled ? s.ogImage : null)
        })
        .catch(() => {})
    }
  }, [title, description, image, keywords])
}

/** 환경설정 > SEO 에 저장한 값을 공개 사이트의 <head> 에 반영한다. */
export function useSiteSeo() {
  useEffect(() => {
    let alive = true

    loadSiteSetting()
      .then((s) => {
        if (!alive) return

        baseTitle = s.metaTitle?.trim() || s.siteName
        titleSuffix = s.titleSuffix ?? ''
        renderTitle()

        const description = s.metaDescription?.trim() || s.description
        upsertMeta('name', 'description', description)
        upsertMeta('name', 'keywords', s.metaKeywords)
        upsertMeta('name', 'robots', s.allowIndexing ? 'index, follow' : 'noindex, nofollow')
        upsertMeta('name', 'generator', s.generatorEnabled ? s.generatorContent?.trim() || DEFAULT_GENERATOR : null)

        // OG 태그를 끄면 아예 내보내지 않는다.
        const og = s.ogEnabled
        upsertMeta('property', 'og:type', og ? s.ogType || 'website' : null)
        upsertMeta('property', 'og:site_name', og ? s.ogSiteName?.trim() || s.siteName : null)
        upsertMeta('property', 'og:locale', og ? s.ogLocale || 'ko_KR' : null)
        upsertMeta('property', 'og:title', og ? s.ogTitle?.trim() || baseTitle : null)
        upsertMeta('property', 'og:description', og ? s.ogDescription?.trim() || description : null)
        upsertMeta('property', 'og:image', og ? s.ogImage : null)
        upsertMeta('property', 'og:image:alt', og ? s.ogImageAlt : null)
        upsertMeta('property', 'og:url', og ? s.siteUrl : null)

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

/* --------------------------- 게시판 메타 템플릿 --------------------------- */

/** 게시판 설정은 화면마다 다시 받지 않도록 한 번만 불러 온다. */
let boardSettingPromise: Promise<BoardSetting> | null = null

export function loadBoardSetting(): Promise<BoardSetting> {
  boardSettingPromise ??= api<BoardSetting>('/board-settings')
  return boardSettingPromise
}

type BoardPageKind = 'list' | 'board' | 'post'

/**
 * 게시판 화면의 제목·설명을 환경설정의 템플릿으로 채운다.
 * 'SEO 를 제공할 페이지' 에서 꺼 둔 유형은 아무것도 건드리지 않는다.
 */
export function useBoardSeo(kind: BoardPageKind, vars: Record<string, string | undefined>) {
  // 객체를 그대로 의존성에 쓰면 매 렌더마다 바뀌므로 값만 비교한다.
  const key = JSON.stringify(vars)

  useEffect(() => {
    let alive = true

    Promise.all([loadBoardSetting(), loadSiteSetting()])
      .then(([s, site]) => {
        if (!alive) return
        const serve = { list: s.seoServeList, board: s.seoServeBoard, post: s.seoServePost }[kind]
        if (!serve) return

        const titleTemplate = { list: s.seoListTitle, board: s.seoBoardTitle, post: s.seoPostTitle }[kind]
        const descTemplate = {
          list: s.seoListDescription,
          board: s.seoBoardDescription,
          post: s.seoPostDescription,
        }[kind]

        // {site_name} 은 사이트 설정에서 채운다.
        const parsed = { site_name: site.siteName, ...(JSON.parse(key) as Record<string, string | undefined>) }
        const title = fillTemplate(titleTemplate, parsed)
        const description = fillTemplate(descTemplate, parsed)

        pageTitle = title || null
        renderTitle()
        if (description) upsertMeta('name', 'description', description)
      })
      .catch(() => {
        // 설정을 못 읽어도 화면은 그대로 보여 준다.
      })

    return () => {
      alive = false
    }
  }, [kind, key])
}

/**
 * 게시판 환경설정 — 홈페이지 게시판 목록이 한 쪽에 몇 건을 보일지,
 * 'NEW' 를 며칠까지 붙일지 같은 값을 읽는다. 한 번 받아 두고 화면끼리 나눠 쓴다.
 */
export function useBoardSetting(): BoardSetting | null {
  const [setting, setSetting] = useState<BoardSetting | null>(null)
  useEffect(() => {
    let alive = true
    loadBoardSetting()
      .then((s) => alive && setSetting(s))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])
  return setting
}
