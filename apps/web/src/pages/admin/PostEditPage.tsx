import { Suspense, lazy, useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { BoardCategory, Post, PostInput } from '@wnc/shared'
import { useBoards } from '../../lib/boards'
import { api } from '../../lib/api'
import ThumbnailInput from '../../components/ThumbnailInput'
import PublishSchedule from '../../components/PublishSchedule'
import SeoPreview from '../../components/SeoPreview'
import { boardUsesImage, postImage } from '../../lib/postImages'
import { ErrorMessage, Loading, PageHeader } from '../../components/ui'

// 편집기는 무거우므로 필요할 때 내려받는다 (제품·페이지·팝업 편집과 같은 방식).
const RichEditor = lazy(() => import('../../components/RichEditor'))

const EMPTY: PostInput = {
  category: '',
  title: '',
  content: '',
  thumbnail: null,
  subCategory: null,
  published: true,
  publishAt: null,
  metaTitle: '',
  metaDescription: '',
  ogImage: '',
}

/** 본문 앞부분 — 검색 설명을 비워 두면 홈페이지가 대신 쓰는 요약 */
function summaryOf(html: string, max = 120) {
  const text = html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
  return text.length > max ? `${text.slice(0, max)}…` : text
}

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
          publishAt: post.publishAt,
          metaTitle: post.metaTitle ?? '',
          metaDescription: post.metaDescription ?? '',
          ogImage: post.ogImage ?? '',
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

          {/* 대표 이미지 — 그림을 쓰는 게시판에서만 나온다.
              공지사항처럼 제목만 훑어보는 게시판에는 칸 자체를 두지 않는다. */}
          {boardUsesImage(form.category) && (
            <ThumbnailInput
              value={form.thumbnail}
              onChange={(url) => set('thumbnail', url)}
              label="대표 이미지"
              hint="게시판 목록과 글 상단에 걸리는 그림입니다. 비워 두면 홈페이지가 글 주제에 맞는 기본 표지를 대신 겁니다."
              fallback={postImage({ category: form.category, title: form.title, thumbnail: null })}
            />
          )}

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

          <PublishSchedule published={form.published} publishAt={form.publishAt} onChange={(v) => set('publishAt', v)} />

          {/* 검색 노출 — 비워 두면 제목·본문 요약·대표 이미지를 대신 쓴다 */}
          <details className="group rounded-xl border border-slate-200 dark:border-slate-700" open={Boolean(form.metaTitle || form.metaDescription || form.ogImage)}>
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium text-slate-800 dark:text-slate-200">
              검색 노출(SEO)·SNS 공유
              <span className="text-xs font-normal text-slate-400 group-open:hidden">비워 두면 제목·본문 요약을 씁니다 ▾</span>
            </summary>
            <div className="grid gap-5 border-t border-slate-200 p-4 lg:grid-cols-2 dark:border-slate-700">
              <div className="space-y-4">
                <div>
                  <label htmlFor="metaTitle" className="label">
                    검색 제목
                  </label>
                  <input
                    id="metaTitle"
                    maxLength={120}
                    value={form.metaTitle ?? ''}
                    onChange={(e) => set('metaTitle', e.target.value)}
                    className="input"
                    placeholder={form.title || '비우면 글 제목'}
                  />
                </div>
                <div>
                  <label htmlFor="metaDescription" className="label">
                    검색 설명
                  </label>
                  <textarea
                    id="metaDescription"
                    rows={3}
                    maxLength={400}
                    value={form.metaDescription ?? ''}
                    onChange={(e) => set('metaDescription', e.target.value)}
                    className="input"
                    placeholder="비우면 본문 앞부분을 씁니다"
                  />
                </div>
                <ThumbnailInput
                  value={form.ogImage || null}
                  onChange={(url) => set('ogImage', url ?? '')}
                  label="공유 이미지"
                  hint="카카오톡·페이스북 등에 링크를 붙였을 때 보이는 그림입니다. 비우면 대표 이미지를 씁니다. (1200×630 권장)"
                />
              </div>
              <SeoPreview
                title={form.metaTitle?.trim() || form.title || '제목 없음'}
                description={form.metaDescription?.trim() || summaryOf(form.content)}
                path={isNew ? '/board/새-글' : `/board/${id}`}
                image={form.ogImage || form.thumbnail}
              />
            </div>
          </details>
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
