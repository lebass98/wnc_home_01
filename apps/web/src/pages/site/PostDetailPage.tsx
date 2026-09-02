import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { Paginated, Post, PostListItem } from '@wnc/shared'
import { boardName, useBoards } from '../../lib/boards'
import { api, qs } from '../../lib/api'
import { formatDate } from '../../lib/format'
import PageHero from '../../components/PageHero'
import Reveal from '../../components/Reveal'
import { ErrorMessage, Loading } from '../../components/ui'
import { useBoardSeo } from '../../lib/seo'

/** 이전·다음 글을 찾을 때 한 번에 받아 올 최대 건수 */
const NEIGHBOR_LIMIT = 100

/**
 * 소식 상세 — 목록과 같은 문법으로 짠다.
 * 상단 배너의 탭으로 게시판을 오가고, 영문 소제목·제목·짧은 선 아래에 작성자·등록일·조회를 둔다.
 * 본문 아래에는 같은 게시판의 이전·다음 글과 목록 버튼이 온다.
 */
export default function PostDetailPage() {
  const boards = useBoards()
  const { id } = useParams<{ id: string }>()
  const [post, setPost] = useState<Post | null>(null)
  const [neighbors, setNeighbors] = useState<{ prev: PostListItem | null; next: PostListItem | null }>({
    prev: null,
    next: null,
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  useBoardSeo('post', {
    board_name: post ? boardName(boards, post.category) : undefined,
    post_title: post?.title,
  })

  useEffect(() => {
    setLoading(true)
    setError('')
    api<Post>(`/posts/${id}`)
      .then(setPost)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
    window.scrollTo(0, 0)
  }, [id])

  // 같은 게시판의 목록(최신순)에서 바로 앞·뒤 글을 찾는다.
  useEffect(() => {
    if (!post) return
    api<Paginated<PostListItem>>(`/posts${qs({ category: post.category, pageSize: NEIGHBOR_LIMIT })}`)
      .then((res) => {
        const i = res.items.findIndex((p) => p.id === post.id)
        setNeighbors({
          // 최신순이므로 앞쪽이 더 새 글(다음), 뒤쪽이 더 오래된 글(이전)이다.
          next: i > 0 ? res.items[i - 1] : null,
          prev: i >= 0 && i < res.items.length - 1 ? res.items[i + 1] : null,
        })
      })
      .catch(() => setNeighbors({ prev: null, next: null }))
  }, [post])

  const tabs = [
    { to: '/board', label: '전체', active: false },
    ...boards.map((b) => ({
      to: `/board?category=${b.slug}`,
      label: b.name,
      active: post?.category === b.slug,
    })),
  ]

  const board = post ? boardName(boards, post.category) : ''
  const listTo = post ? `/board?category=${post.category}` : '/board'

  return (
    <>
      <PageHero title="소식" tabs={tabs} />

      <section className="pb-24 pt-24 sm:pt-28">
        <div className="container-wnc">
          {error && <ErrorMessage message={error} />}
          {loading && <Loading />}

          {post && (
            <article>
              {/* 제목 블록 — 게시판 이름, 제목, 짧은 선, 글 정보 */}
              <header>
                <Reveal>
                  <p className="text-[0.95rem] font-medium tracking-wide text-mint-400">{board}</p>
                </Reveal>
                <Reveal index={1}>
                  <h1 className="mt-3 max-w-4xl text-[1.75rem] font-bold leading-[1.4] tracking-tight text-slate-900 sm:text-[2rem]">
                    {post.title}
                  </h1>
                </Reveal>
                <Reveal index={2} className="mt-7 h-px w-14 bg-slate-900" />
                <Reveal index={3} className="mt-7 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-500">
                  <span>
                    작성자 <span className="ml-1 text-slate-900">{post.authorName}</span>
                  </span>
                  <span>
                    등록일 <span className="ml-1 font-mono text-slate-900">{formatDate(post.createdAt)}</span>
                  </span>
                  <span>
                    조회 <span className="ml-1 font-mono text-slate-900">{post.views}</span>
                  </span>
                </Reveal>
              </header>

              {/* 본문 — 서버에서 평문으로 저장하므로 줄바꿈만 유지해 보여 준다. */}
              <Reveal
                index={4}
                className="mt-12 whitespace-pre-wrap border-t border-slate-900 py-12 text-[0.95rem] leading-[1.9] text-slate-700 sm:py-14"
              >
                {post.content}
              </Reveal>

              {/* 이전·다음 글 — 목록의 표와 같은 선 문법 */}
              <ul className="border-t border-slate-900">
                {(
                  [
                    { label: '다음글', item: neighbors.next },
                    { label: '이전글', item: neighbors.prev },
                  ] as const
                ).map(({ label, item }) => (
                  <li
                    key={label}
                    className="flex h-16 items-center gap-6 border-b border-slate-200 text-[0.95rem]"
                  >
                    <span className="w-16 shrink-0 text-sm font-medium text-slate-900">{label}</span>
                    {item ? (
                      <Link
                        to={`/board/${item.id}`}
                        className="flex min-w-0 flex-1 items-center justify-between gap-6 text-slate-700 transition hover:text-mint-700"
                      >
                        <span className="line-clamp-1">{item.title}</span>
                        <span className="hidden shrink-0 font-mono text-sm text-slate-400 sm:inline">
                          {formatDate(item.createdAt)}
                        </span>
                      </Link>
                    ) : (
                      <span className="text-slate-400">{label === '다음글' ? '다음 글이 없습니다.' : '이전 글이 없습니다.'}</span>
                    )}
                  </li>
                ))}
              </ul>

              {/* 목록 버튼 — 참고 템플릿처럼 검정 바탕의 작은 버튼 */}
              <div className="mt-10 flex justify-end">
                <Link
                  to={listTo}
                  className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-mint-600"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                  목록
                </Link>
              </div>
            </article>
          )}
        </div>
      </section>
    </>
  )
}
