import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import type { Page } from '@wnc/shared'
import { api } from '../../lib/api'
import SubPage from '../../components/SubPage'
import RichText from '../../components/RichText'
import { ErrorMessage, Loading } from '../../components/ui'
import { usePageMeta, usePageTitle } from '../../lib/seo'

/**
 * 관리자가 만든 일반 페이지 — /page/:slug
 * ?preview=1 로 열면 로그인한 관리자에게는 미발행 페이지도 보인다. (관리자 화면의 '실제 화면 미리보기')
 */
export default function CustomPage() {
  const { slug } = useParams<{ slug: string }>()
  const [params] = useSearchParams()
  const preview = params.get('preview') === '1'
  const [page, setPage] = useState<Page | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // 검색 노출 설정이 있으면 그것을, 없으면 제목·한 줄 설명을 쓴다.
  usePageTitle(page ? page.metaTitle || page.title : undefined)
  usePageMeta({
    title: page ? page.metaTitle || page.title : null,
    description: page ? page.metaDescription || page.description : null,
    image: page?.ogImage ?? null,
  })

  useEffect(() => {
    setLoading(true)
    setError('')
    api<Page>(`/pages/slug/${slug}`, preview ? { auth: true } : undefined)
      .then(setPage)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [slug, preview])

  if (loading) return <Loading />

  if (error || !page) {
    return (
      <div className="container-wnc py-20">
        <ErrorMessage message={error || '페이지를 찾을 수 없습니다.'} />
        <p className="mt-4 text-sm text-slate-600">
          주소가 바뀌었거나 아직 발행되지 않은 페이지일 수 있습니다.{' '}
          <Link to="/" className="font-medium text-brand-700 hover:underline">
            홈으로 가기
          </Link>
        </p>
      </div>
    )
  }

  return (
    <>
      {preview && !page.published && (
        <div className="bg-amber-500 px-4 py-2 text-center text-sm font-medium text-white">
          미리보기 — 아직 발행되지 않아 방문자에게는 보이지 않습니다.
        </div>
      )}
      <SubPage title={page.title} description={page.description ?? ''}>
      <section className="container-wnc py-14 sm:py-16">
        <div className="max-w-3xl">
          <RichText html={page.content} />
        </div>
      </section>
      </SubPage>
    </>
  )
}
