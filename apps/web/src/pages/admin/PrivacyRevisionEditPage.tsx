import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { PrivacyRevision, PrivacyRevisionInput } from '@wnc/shared'
import { api } from '../../lib/api'
import DatePicker from '../../components/DatePicker'
import { toDateValue } from '../../lib/date'
import { ErrorMessage, Loading, PageHeader } from '../../components/ui'

const EMPTY: PrivacyRevisionInput = {
  title: '',
  effectiveAt: toDateValue(new Date()),
  summary: '',
  content: '',
}

/** 라벨 + 설명 + 입력을 한 줄로 묶는다. 다른 관리 화면과 같은 형태다. */
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

export default function PrivacyRevisionEditPage() {
  const { id } = useParams<{ id: string }>()
  const isNew = !id
  const navigate = useNavigate()

  const [form, setForm] = useState<PrivacyRevisionInput>(EMPTY)
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isNew) return
    api<PrivacyRevision>(`/privacy-revisions/${id}`)
      .then((r) =>
        setForm({
          title: r.title,
          effectiveAt: toDateValue(new Date(r.effectiveAt)),
          summary: r.summary,
          content: r.content,
        }),
      )
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id, isNew])

  function set<K extends keyof PrivacyRevisionInput>(key: K, value: PrivacyRevisionInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) {
      setError('제목을 입력하세요. 홈페이지 개정이력 표에 그대로 보입니다. (예: 개인정보처리방침 v1.3)')
      return
    }
    if (!form.effectiveAt) {
      setError('시행일을 선택하세요. 이력은 시행일 순으로 정렬됩니다.')
      return
    }
    if (!form.content.trim()) {
      setError('당시 방침 본문을 입력하세요. 자세히보기를 누르면 보이는 내용입니다.')
      return
    }

    setSaving(true)
    setError('')
    try {
      const body: PrivacyRevisionInput = {
        title: form.title.trim(),
        // 날짜만 고르므로 그날 0시(브라우저 기준)로 보낸다.
        effectiveAt: new Date(`${form.effectiveAt}T00:00:00`).toISOString(),
        summary: form.summary?.trim() ?? '',
        content: form.content.trim(),
      }
      if (isNew) {
        await api('/privacy-revisions', { method: 'POST', body, auth: true })
      } else {
        await api(`/privacy-revisions/${id}`, { method: 'PUT', body, auth: true })
      }
      navigate('/admin/privacy-revisions')
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
        title={isNew ? '개정 이력 등록' : '개정 이력 수정'}
        description="개인정보처리방침이 바뀔 때마다 이전 본문을 이력으로 남겨 둡니다."
      />

      {error && (
        <div className="mb-4">
          <ErrorMessage message={error} />
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="card px-6 py-2">
          <Row label="제목" description="개정이력 표에 보이는 이름입니다.">
            <input
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              className="input max-w-md"
              placeholder="예: 개인정보처리방침 v1.3"
              maxLength={100}
              required
            />
          </Row>

          <Row label="시행일" description="이 방침이 적용되기 시작한 날입니다. 최신 시행일이 표의 맨 위에 옵니다.">
            <DatePicker
              value={form.effectiveAt}
              onChange={(v) => set('effectiveAt', v)}
              ariaLabel="시행일"
              className="w-56"
            />
          </Row>

          <Row label="변경 요약" description="무엇이 바뀌었는지 한 줄로. 표의 제목 아래 작게 보입니다. 비워 둘 수 있습니다.">
            <input
              value={form.summary ?? ''}
              onChange={(e) => set('summary', e.target.value)}
              className="input"
              placeholder="예: 처리 위탁 항목 추가, 보유 기간을 3년으로 변경"
              maxLength={300}
            />
          </Row>

          <Row label="당시 방침 본문" description="자세히보기를 누르면 보이는 내용입니다. 줄바꿈은 그대로 보입니다.">
            <textarea
              value={form.content}
              onChange={(e) => set('content', e.target.value)}
              className="input min-h-[20rem] resize-y"
              placeholder="당시 시행하던 개인정보처리방침 전문을 붙여 넣으세요."
              maxLength={50000}
              required
            />
          </Row>
        </div>

        <div className="flex justify-end gap-2">
          <Link to="/admin/privacy-revisions" className="btn-secondary">
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
