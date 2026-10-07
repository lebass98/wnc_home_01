import { lazy, Suspense, useEffect, useState, type ComponentType, type ReactNode } from 'react'
import { api } from '../lib/api'
import { getPreview, previewQuery } from '../lib/preview'

// 실제 적용 시 복사되는 페이지 소스를 그대로 빌드한다.
const pages = import.meta.glob<{ default: ComponentType<Record<string, unknown>> }>(['../../../../templates/*/pages/*.tsx', '../../../../templates/*/layouts/*.tsx'])
const cache = new Map<string, ReturnType<typeof lazy>>()

export default function TemplatePreviewPage({ name, children, pageProps = {}, folder = 'pages' }: {
  name: string
  folder?: 'pages' | 'layouts'
  children: ReactNode
  pageProps?: Record<string, unknown>
}) {
  const preview = getPreview()
  const [slug, setSlug] = useState<string | null | undefined>(undefined)
  useEffect(() => {
    if (!preview) return
    let alive = true
    api<{ slug?: string; preview?: boolean }>(`/design${previewQuery()}`).then((design) => {
      if (alive) setSlug(design.preview ? design.slug ?? '' : null)
    }).catch(() => { if (alive) setSlug('') })
    return () => { alive = false }
  }, [preview?.id])
  if (!preview || slug === null) return children
  if (slug === undefined) return <div className="min-h-screen" aria-busy="true" />
  const key = `../../../../templates/${slug}/${folder}/${name}.tsx`
  const load = pages[key]
  if (!load) return <div className="p-20 text-center" role="alert">이 템플릿의 페이지 프리뷰를 불러올 수 없습니다. 원본 파일을 확인해 주세요.</div>
  if (!cache.has(key)) cache.set(key, lazy(load))
  const Page = cache.get(key)!
  return <Suspense fallback={<div className="min-h-screen" aria-busy="true" />}><Page {...pageProps} /></Suspense>
}
