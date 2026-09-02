import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { BoardCategory, Post, PostInput } from '@wnc/shared'
import { useBoards } from '../../lib/boards'
import { api } from '../../lib/api'
import { ErrorMessage, Loading, PageHeader } from '../../components/ui'

const EMPTY: PostInput = { category: '', title: '', content: '', published: true }

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
          published: post.published,
        }),
      )
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id, isNew])

  function set<K extends keyof PostInput>(key: K, value: PostInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
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
                onChange={(e) => set('category', e.target.value as BoardCategory)}
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

          <div>
            <label htmlFor="content" className="label">
              내용 <span className="text-red-500">*</span>
            </label>
            <textarea
              id="content"
              required
              rows={16}
              value={form.content}
              onChange={(e) => set('content', e.target.value)}
              className="input resize-y tabular-nums text-sm leading-relaxed"
              placeholder="내용을 입력하세요"
            />
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
