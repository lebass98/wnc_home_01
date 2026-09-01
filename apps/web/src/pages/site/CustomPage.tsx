import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { Page } from '@wnc/shared'
import { api } from '../../lib/api'
import PageHero from '../../components/PageHero'
import RichText from '../../components/RichText'
import { ErrorMessage, Loading } from '../../components/ui'
import { usePageTitle } from '../../lib/seo'

/** 관리자가 만든 일반 페이지 — /page/:slug */
export default function CustomPage() {
  const { slug } = useParams<{ slug: string }>()
  const [page, setPage] = useState<Page | null>(null)
  const [loading, setLoading] = useState(true)
  usePageTitle(page?.title)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    api<Page>(`/pages/slug/${slug}`)
      .then(setPage)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [slug])

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
      <PageHero title={page.title} description={page.description ?? ''} />
      <section className="container-wnc py-14 sm:py-16">
        <div className="max-w-3xl">
          <RichText html={page.content} />
        </div>
      </section>
    </>
  )
}
