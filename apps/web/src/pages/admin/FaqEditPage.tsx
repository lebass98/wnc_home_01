import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { Faq, FaqCategory, FaqInput } from '@wnc/shared'
import { api } from '../../lib/api'
import { ErrorMessage, Loading, PageHeader, ToggleSwitch } from '../../components/ui'

const EMPTY: FaqInput = { category: '', question: '', answer: '', published: true }

/** 라벨 + 설명 + 입력을 한 줄로 묶는다. 팝업 관리 화면과 같은 형태다. */
function Row({ label, description, children }: { label: string; description?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 border-b border-slate-100 py-4 last:border-0 sm:flex-row sm:items-start dark:border-slate-700">
      <div className="sm:w-56 sm:shrink-0 sm:pt-2">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
        {description && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{description}</p>}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  )
}

export default function FaqEditPage() {
  const { id } = useParams<{ id: string }>()
  const isNew = !id
  const navigate = useNavigate()

  const [form, setForm] = useState<FaqInput>(EMPTY)
  const [categories, setCategories] = useState<FaqCategory[]>([])
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // 분류는 목록 화면의 [분류 관리]에서 등록한 것 중에서만 고른다.
  useEffect(() => {
    api<FaqCategory[]>('/faqs/categories')
      .then(setCategories)
      .catch(() => setCategories([]))
  }, [])

  useEffect(() => {
    if (isNew) return
    api<Faq>(`/faqs/${id}`, { auth: true })
      .then((f) =>
        setForm({
          category: f.category,
          question: f.question,
          answer: f.answer,
          published: f.published,
          sortOrder: f.sortOrder,
        }),
      )
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id, isNew])

  function set<K extends keyof FaqInput>(key: K, value: FaqInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.question.trim()) {
      setError('질문을 입력하세요. 홈페이지 목록에 그대로 보입니다.')
      return
    }
    if (!form.answer.trim()) {
      setError('답변을 입력하세요. 질문을 누르면 펼쳐지는 내용입니다.')
      return
    }

    setSaving(true)
    setError('')
    try {
      const body: FaqInput = {
        ...form,
        category: form.category?.trim() ?? '',
        question: form.question.trim(),
        answer: form.answer.trim(),
      }
      if (isNew) {
        await api('/faqs', { method: 'POST', body, auth: true })
      } else {
        await api(`/faqs/${id}`, { method: 'PUT', body, auth: true })
      }
      navigate('/admin/faqs')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Loading />

  return (
    <>
      <PageHeader
        title={isNew ? '질문 등록' : '질문 수정'}
        description="홈페이지 자주 묻는 질문에 보여 줄 질문과 답변을 작성합니다."
      />

      {error && (
        <div className="mb-4">
          <ErrorMessage message={error} />
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="card px-6 py-2">
          <Row label="공개 여부" description="끄면 홈페이지에서 감춥니다. 작성 중인 질문은 꺼 두세요.">
            <div className="flex items-center gap-3">
              <ToggleSwitch checked={form.published} onChange={(v) => set('published', v)} label="공개 여부" />
              <span className="text-sm text-slate-600 dark:text-slate-400">{form.published ? '공개' : '비공개'}</span>
            </div>
          </Row>

          <Row label="분류" description="홈페이지 탭과 질문 앞의 작은 표시에 쓰입니다. 분류는 목록 화면의 [분류 관리]에서 등록합니다.">
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={form.category ?? ''}
                onChange={(e) => set('category', e.target.value)}
                className="select max-w-xs"
                aria-label="분류"
              >
                <option value="">분류 없음</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
                {/* 지워진 분류를 아직 쓰고 있는 질문이면 그 값을 잃지 않도록 남겨 둔다. */}
                {form.category && !categories.some((c) => c.name === form.category) && (
                  <option value={form.category}>{form.category} (삭제된 분류)</option>
                )}
              </select>
              <Link to="/admin/faqs" className="text-xs text-brand-600 hover:underline">
                분류 관리로 이동
              </Link>
            </div>
          </Row>

          <Row label="질문" description="방문자가 목록에서 보는 한 줄입니다.">
            <input
              value={form.question}
              onChange={(e) => set('question', e.target.value)}
              className="input"
              placeholder="예: 개발 기간은 얼마나 걸리나요?"
              maxLength={200}
              required
            />
          </Row>

          <Row label="답변" description="줄바꿈은 그대로 보입니다.">
            <textarea
              value={form.answer}
              onChange={(e) => set('answer', e.target.value)}
              className="input min-h-[12rem] resize-y"
              placeholder="질문을 누르면 펼쳐지는 답변을 적어 주세요."
              maxLength={5000}
              required
            />
          </Row>

          <Row label="순서" description="작을수록 위에 옵니다. 비워 두면 맨 뒤에 붙습니다.">
            <input
              type="number"
              min={0}
              max={9999}
              value={form.sortOrder ?? ''}
              onChange={(e) => set('sortOrder', e.target.value === '' ? undefined : Number(e.target.value))}
              className="input w-28"
              placeholder="자동"
            />
          </Row>
        </div>

        <div className="flex justify-end gap-2">
          <Link to="/admin/faqs" className="btn-secondary">
            취소
          </Link>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? '저장 중...' : isNew ? '등록' : '저장'}
          </button>
        </div>
      </form>
    </>
  )
}
