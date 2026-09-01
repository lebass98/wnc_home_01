import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { Post } from '@wnc/shared'
import { boardName, useBoards } from '../../lib/boards'
import { api } from '../../lib/api'
import { formatDate } from '../../lib/format'
import { Badge, ErrorMessage, Loading } from '../../components/ui'
import { useBoardSeo } from '../../lib/seo'

export default function PostDetailPage() {
  const boards = useBoards()
  const { id } = useParams<{ id: string }>()
  const [post, setPost] = useState<Post | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  useBoardSeo('post', {
    board_name: post ? boardName(boards, post.category) : undefined,
    post_title: post?.title,
  })

  useEffect(() => {
    setLoading(true)
    api<Post>(`/posts/${id}`)
      .then(setPost)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <Loading />

  return (
    <section className="py-14">
      <div className="container-wnc max-w-3xl">
        {error && <ErrorMessage message={error} />}

        {post && (
          <article>
            <header className="border-b border-slate-200 pb-6">
              <Badge tone="blue">{boardName(boards, post.category)}</Badge>
              <h1 className="mt-4 text-3xl font-bold leading-snug tracking-tight text-slate-900">
                {post.title}
              </h1>
              <div className="mt-4 flex gap-4 text-sm text-slate-500">
                <span>{post.authorName}</span>
                <span>{formatDate(post.createdAt)}</span>
                <span>조회 {post.views}</span>
              </div>
            </header>

            {/* 서버에서 평문으로 저장하므로 줄바꿈만 유지해 렌더링한다. */}
            <div className="whitespace-pre-wrap py-10 leading-relaxed text-slate-700">
              {post.content}
            </div>
          </article>
        )}

        <div className="border-t border-slate-200 pt-6">
          <Link to="/board" className="btn-secondary">
            목록으로
          </Link>
        </div>
      </div>
    </section>
  )
}
