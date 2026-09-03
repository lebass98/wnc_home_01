import { Suspense, lazy, useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { BoardCategory, Post, PostInput } from '@wnc/shared'
import { useBoards } from '../../lib/boards'
import { api } from '../../lib/api'
import ThumbnailInput from '../../components/ThumbnailInput'
import { ErrorMessage, Loading, PageHeader } from '../../components/ui'

// 편집기는 무거우므로 필요할 때 내려받는다 (제품·페이지·팝업 편집과 같은 방식).
const RichEditor = lazy(() => import('../../components/RichEditor'))

const EMPTY: PostInput = { category: '', title: '', content: '', thumbnail: null, subCategory: null, published: true }

export default function PostEditPage() {
  const boards = useBoards(true)
  const { id } = useParams<{ id: string }>()
  const isNew = !id
  const navigate = useNavigate()

  const [form, setForm] = useState<PostInput>(EMPTY)
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isNew) return
    api<Post>(`/posts/${id}`, { auth: true })
      .then((post) =>
        setForm({
          category: post.category,
          title: post.title,
          content: post.content,
          thumbnail: post.thumbnail,
          subCategory: post.subCategory,
          published: post.published,
        }),
      )
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id, isNew])

  function set<K extends keyof PostInput>(key: K, value: PostInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  /** 지금 고른 게시판에 정해 둔 글 분류 — 없으면 분류 칸을 그리지 않는다. */
  const subCategories = boards.find((b) => b.slug === form.category)?.categories ?? []

  /** 게시판을 바꾸면 그 게시판에 없는 분류는 비운다. */
  function setBoard(slug: string) {
    const next = boards.find((b) => b.slug === slug)?.categories ?? []
    setForm((prev) => ({
      ...prev,
      category: slug as BoardCategory,
      subCategory: prev.subCategory && next.includes(prev.subCategory) ? prev.subCategory : null,
    }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    // 편집기는 비어 있어도 <p></p> 를 내놓으므로, 태그를 걷어내고 내용이 있는지 본다.
    const plain = form.content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
    if (!plain && !form.content.includes('<img')) {
      setError('내용을 입력하세요.')
      return
    }
    setSaving(true)
    setError('')
    try {
      if (isNew) {
        await api('/posts', { method: 'POST', body: form, auth: true })
      } else {
        await api(`/posts/${id}`, { method: 'PUT', body: form, auth: true })
      }
      navigate('/admin/posts')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Loading />

  return (
    <>
      <PageHeader
        title={isNew ? '새 글 작성' : '게시글 수정'}
        description="공개 상태로 저장하면 홈페이지 소식 페이지에 바로 노출됩니다."
      />

      <form onSubmit={handleSubmit} className="card max-w-3xl p-6 sm:p-8">
        <div className="space-y-5">
          {error && <ErrorMessage message={error} />}

          <div className="grid gap-5 sm:grid-cols-[12rem_1fr]">
            <div>
              <label htmlFor="category" className="label">
                게시판 <span className="text-red-500">*</span>
              </label>
              <select
                id="category"
                required
                value={form.category}
                onChange={(e) => setBoard(e.target.value)}
                className="select"
              >
                <option value="">게시판 선택</option>
                {boards.map((b) => (
                  <option key={b.id} value={b.slug}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="title" className="label">
                제목 <span className="text-red-500">*</span>
              </label>
              <input
                id="title"
                required
                maxLength={200}
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                className="input"
                placeholder="제목을 입력하세요"
              />
            </div>
          </div>

          {/* 글 분류 — [게시판 관리]에서 그 게시판에 분류를 정해 둔 경우에만 나온다. */}
          {subCategories.length > 0 && (
            <div className="sm:max-w-[12rem]">
              <label htmlFor="subCategory" className="label">
                분류
              </label>
              <select
                id="subCategory"
                value={form.subCategory ?? ''}
                onChange={(e) => set('subCategory', e.target.value || null)}
                className="select"
              >
                <option value="">분류 없음</option>
                {subCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 대표 이미지 — 카드형·갤러리형 게시판 목록에 그림으로 걸린다. */}
          <ThumbnailInput
            value={form.thumbnail}
            onChange={(url) => set('thumbnail', url)}
            label="대표 이미지"
            hint="뉴스·보도자료처럼 카드형·갤러리형 게시판의 목록에 걸리는 그림입니다. 비우면 기본 배경이 대신 쓰입니다."
          />

          <div>
            <span className="label">
              내용 <span className="text-red-500">*</span>
            </span>
            <Suspense fallback={<Loading />}>
              <RichEditor value={form.content} onChange={(html) => set('content', html)} />
            </Suspense>
          </div>

          <label className="flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              checked={form.published}
              onChange={(e) => set('published', e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">
              공개 — 체크를 해제하면 임시저장 상태로 홈페이지에 노출되지 않습니다.
            </span>
          </label>
        </div>

        <div className="mt-8 flex gap-3 border-t border-slate-200 pt-6 dark:border-slate-700">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? '저장 중...' : '저장'}
          </button>
          <button type="button" onClick={() => navigate('/admin/posts')} className="btn-secondary">
            취소
          </button>
        </div>
      </form>
    </>
  )
}
