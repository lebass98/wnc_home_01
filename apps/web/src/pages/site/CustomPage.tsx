import { useEffect, useState, type ReactNode } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import type { PageHeroTab } from '../../components/PageHero'
import { useTranslation } from 'react-i18next'
import type { Page } from '@wnc/shared'
import { api } from '../../lib/api'
import { pickLocalized } from '../../lib/i18n'
import SubPage from '../../components/SubPage'
import RichText from '../../components/RichText'
import { ErrorMessage, Loading } from '../../components/ui'
import { usePageMeta, usePageTitle } from '../../lib/seo'

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)}MB`
  return `${Math.max(1, Math.round(bytes / 1024))}KB`
}

/**
 * 관리자가 만든 일반 페이지 — /page/:slug
 * 제목·본문은 언어 선택에 따라 바뀌고, 없는 언어는 한국어로 보여 준다.
 * ?preview=1 로 열면 로그인한 관리자에게는 미발행 페이지도 보인다. (관리자 화면의 '실제 화면 미리보기')
 */
export default function CustomPage({
  slug: slugProp,
  tabs,
  appendix,
}: {
  /** 라우트 파라미터 대신 고정 슬러그로 열 때 (/terms, /privacy 등 고정 주소) */
  slug?: string
  /** 히어로 아래 작은 탭 */
  tabs?: PageHeroTab[]
  /** 본문 아래 덧붙일 내용 (개인정보 개정이력 등) */
  appendix?: ReactNode
}) {
  const { slug: slugParam } = useParams<{ slug: string }>()
  const slug = slugProp ?? slugParam
  const [params] = useSearchParams()
  const preview = params.get('preview') === '1'
  const [page, setPage] = useState<Page | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  // 언어를 바꾸면 다시 그려 그 언어의 제목·본문을 고른다.
  useTranslation()

  const title = page ? pickLocalized(page.titleI18n, page.title) : ''
  const content = page ? pickLocalized(page.contentI18n, page.content) : ''

  // 검색 노출 설정이 있으면 그것을, 없으면 제목·한 줄 설명을 쓴다.
  usePageTitle(page ? page.metaTitle || title : undefined)
  usePageMeta({
    title: page ? page.metaTitle || title : null,
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
      <SubPage title={title} description={page.description ?? ''} tabs={tabs}>
      <section className="container-wnc py-14 sm:py-16">
        <div className="max-w-3xl">
          <RichText html={content} />

          {/* 첨부파일 — 페이지 수정에서 올린 파일 */}
          {page.attachments.length > 0 && (
            <div className="mt-10 rounded-xl border border-slate-200 p-5">
              <p className="mb-3 text-sm font-semibold text-slate-900">첨부파일</p>
              <ul className="space-y-2">
                {page.attachments.map((file, i) => (
                  <li key={`${file.url}-${i}`}>
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={file.name}
                      className="inline-flex max-w-full items-center gap-2 text-sm text-slate-700 transition hover:text-brand-700"
                    >
                      <svg className="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15.2 7.1l-6.9 6.9a2 2 0 102.8 2.8l6.9-6.9a4 4 0 10-5.6-5.6l-6.9 6.9a6 6 0 108.4 8.4l6-6"
                        />
                      </svg>
                      <span className="truncate">{file.name}</span>
                      <span className="shrink-0 text-xs text-slate-400">({formatSize(file.size)})</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {appendix}
        </div>
      </section>
      </SubPage>
    </>
  )
}
