import { lazy, Suspense, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type {
  Popup,
  PopupHidePeriod,
  PopupInput,
  PopupPlacement,
  PopupScrollbar,
  PopupWindowType,
} from '@wnc/shared'
import {
  POPUP_HIDE_PERIOD_LABEL,
  POPUP_HIDE_PERIODS,
  POPUP_PLACEMENT_LABEL,
  POPUP_PLACEMENTS,
  POPUP_SCROLLBAR_LABEL,
  POPUP_SCROLLBARS,
  POPUP_WINDOW_LABEL,
  POPUP_WINDOW_TYPES,
} from '@wnc/shared'
import { api } from '../../lib/api'
// 편집기(TipTap)는 용량이 커서 관리자가 이 화면에 들어올 때만 불러온다.
const RichEditor = lazy(() => import('../../components/RichEditor'))
import ThumbnailInput from '../../components/ThumbnailInput'
import { DateRangePicker } from '../../components/DatePicker'
import { ErrorMessage, Loading, PageHeader, ToggleSwitch } from '../../components/ui'

/** yyyy-MM-ddTHH:mm — <input type="datetime-local"> 이 요구하는 형식 */
function toLocalInput(iso: string): string {
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

/** 오늘 0시 ~ 일주일 뒤 23시를 기본 게시기간으로 잡는다. */
function defaultRange(): { startAt: string; endAt: string } {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(start.getDate() + 7)
  end.setHours(23, 0, 0, 0)
  return { startAt: toLocalInput(start.toISOString()), endAt: toLocalInput(end.toISOString()) }
}

const EMPTY: PopupInput = {
  name: '',
  placement: 'main',
  placementPath: '',
  windowType: 'fixed',
  scrollbar: 'none',
  content: '',
  image: null,
  linkUrl: '',
  linkNewTab: false,
  ...defaultRange(),
  enabled: true,
  positionTop: 120,
  positionLeft: 120,
  width: 400,
  height: 500,
  hidePeriod: 'day',
}

/** 라벨 + 설명 + 입력을 한 줄로 묶는다. 게시판 설정 화면과 같은 형태다. */
function Row({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-slate-100 py-4 last:border-0 sm:flex-row sm:items-start dark:border-slate-700">
      <div className="sm:w-56 sm:shrink-0 sm:pt-2">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
        {description && (
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{description}</p>
        )}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  )
}

/** 라디오 버튼 묶음 — 선택지가 적은 설정에 쓴다. */
function RadioGroup<T extends string>({
  name,
  value,
  options,
  labels,
  onChange,
}: {
  name: string
  value: T
  options: readonly T[]
  labels: Record<T, string>
  onChange: (v: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2">
      {options.map((opt) => (
        <label
          key={opt}
          className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-300"
        >
          <input
            type="radio"
            name={name}
            checked={value === opt}
            onChange={() => onChange(opt)}
            className="h-4 w-4 border-slate-300 text-brand-600 focus:ring-brand-500"
          />
          {labels[opt]}
        </label>
      ))}
    </div>
  )
}

export default function PopupEditPage() {
  const { id } = useParams<{ id: string }>()
  const isNew = !id
  const navigate = useNavigate()

  const [form, setForm] = useState<PopupInput>(EMPTY)
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isNew) return
    api<Popup>(`/popups/${id}`, { auth: true })
      .then((p) =>
        setForm({
          name: p.name,
          placement: p.placement,
          placementPath: p.placementPath ?? '',
          windowType: p.windowType,
          scrollbar: p.scrollbar,
          content: p.content,
          image: p.image,
          linkUrl: p.linkUrl ?? '',
          linkNewTab: p.linkNewTab,
          startAt: toLocalInput(p.startAt),
          endAt: toLocalInput(p.endAt),
          enabled: p.enabled,
          positionTop: p.positionTop,
          positionLeft: p.positionLeft,
          width: p.width,
          height: p.height,
          hidePeriod: p.hidePeriod,
          sortOrder: p.sortOrder,
        }),
      )
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id, isNew])

  function set<K extends keyof PopupInput>(key: K, value: PopupInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('팝업 이름을 입력하세요. 관리자 목록에서 팝업을 구분할 때 씁니다.')
      return
    }
    if (form.placement === 'path' && !form.placementPath?.trim()) {
      setError('특정페이지를 고르면 노출할 페이지 주소를 입력해야 합니다. (예: /products)')
      return
    }
    if (new Date(form.startAt) > new Date(form.endAt)) {
      setError('게시 종료일이 시작일보다 빠릅니다. 기간을 다시 확인하세요.')
      return
    }

    setSaving(true)
    setError('')
    try {
      const body: PopupInput = {
        ...form,
        name: form.name.trim(),
        placementPath: form.placementPath?.trim() || null,
        linkUrl: form.linkUrl?.trim() || null,
        // datetime-local 값은 시간대가 없으므로 브라우저 기준으로 해석해 보낸다.
        startAt: new Date(form.startAt).toISOString(),
        endAt: new Date(form.endAt).toISOString(),
      }
      if (isNew) {
        await api('/popups', { method: 'POST', body, auth: true })
      } else {
        await api(`/popups/${id}`, { method: 'PUT', body, auth: true })
      }
      navigate('/admin/popups')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Loading />

  // 일반 윈도우 팝업은 브라우저 창으로 열려 화면 안 위치를 우리가 정하지 않는다.
  const usesPosition = form.windowType !== 'window'

  return (
    <>
      <PageHeader
        title={isNew ? '팝업 등록' : '팝업 수정'}
        description="홈페이지 방문자에게 보여줄 팝업의 내용과 게시기간을 설정합니다."
      />

      {error && (
        <div className="mb-4">
          <ErrorMessage message={error} />
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 기본 설정 */}
        <div className="card px-6 py-2">
          <Row label="팝업이름" description="관리자 목록에서만 쓰입니다. 방문자에게는 보이지 않습니다.">
            <input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              className="input max-w-md"
              placeholder="예: 2026 설 연휴 배송 안내"
              maxLength={60}
              required
            />
          </Row>

          <Row label="사용여부" description="끄면 게시기간 안이어도 홈페이지에 뜨지 않습니다.">
            <div className="flex items-center gap-3">
              <ToggleSwitch checked={form.enabled} onChange={(v) => set('enabled', v)} label="사용여부" />
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {form.enabled ? '사용' : '사용안함(중지)'}
              </span>
            </div>
          </Row>

          <Row label="팝업위치" description="이 팝업을 어느 화면에서 띄울지 정합니다.">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              {POPUP_PLACEMENTS.map((placement) => (
                <label
                  key={placement}
                  className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-300"
                >
                  <input
                    type="radio"
                    name="placement"
                    checked={form.placement === placement}
                    onChange={() => set('placement', placement as PopupPlacement)}
                    className="h-4 w-4 border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  {POPUP_PLACEMENT_LABEL[placement]}
                </label>
              ))}
              <input
                value={form.placementPath ?? ''}
                onChange={(e) => set('placementPath', e.target.value)}
                onFocus={() => set('placement', 'path')}
                className="input max-w-sm"
                placeholder="/products 처럼 사이트 안 주소를 입력하세요"
                maxLength={500}
                disabled={form.placement !== 'path'}
              />
            </div>
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
              주소가 이 값으로 시작하는 화면에서 팝업이 뜹니다.
            </p>
          </Row>

          <Row label="게시기간" description="이 기간 안에서만 팝업이 노출됩니다.">
            <DateRangePicker
              start={form.startAt}
              end={form.endAt}
              onChange={(startAt, endAt) => setForm((prev) => ({ ...prev, startAt, endAt }))}
              withTime
              startLabel="게시 시작일시"
              endLabel="게시 종료일시"
              className="max-w-2xl"
            />
          </Row>

          <Row label="팝업창 크기">
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <span>가로</span>
              <input
                type="number"
                value={form.width}
                onChange={(e) => set('width', Number(e.target.value))}
                className="input w-28"
                min={100}
                max={2000}
                aria-label="가로 크기"
              />
              <span>픽셀 X 세로</span>
              <input
                type="number"
                value={form.height}
                onChange={(e) => set('height', Number(e.target.value))}
                className="input w-28"
                min={100}
                max={2000}
                aria-label="세로 크기"
              />
              <span>픽셀</span>
            </div>
          </Row>

          <Row label="팝업창 위치">
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <span>상단에서</span>
              <input
                type="number"
                value={form.positionTop}
                onChange={(e) => set('positionTop', Number(e.target.value))}
                className="input w-28"
                min={0}
                disabled={!usesPosition}
                aria-label="상단에서의 거리"
              />
              <span>픽셀 / 좌측에서</span>
              <input
                type="number"
                value={form.positionLeft}
                onChange={(e) => set('positionLeft', Number(e.target.value))}
                className="input w-28"
                min={0}
                disabled={!usesPosition}
                aria-label="좌측에서의 거리"
              />
              <span>픽셀</span>
            </div>
            {!usesPosition && (
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                일반 윈도우 팝업창은 브라우저가 위치를 정하므로 이 값은 쓰이지 않습니다.
              </p>
            )}
          </Row>

          <Row label="팝업창 링크" description="팝업을 누르면 이동할 주소입니다. 비우면 링크를 걸지 않습니다.">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <input
                  type="radio"
                  name="linkTarget"
                  checked={!form.linkNewTab}
                  onChange={() => set('linkNewTab', false)}
                  className="h-4 w-4 border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                현재창 링크
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <input
                  type="radio"
                  name="linkTarget"
                  checked={form.linkNewTab}
                  onChange={() => set('linkNewTab', true)}
                  className="h-4 w-4 border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                새창 링크
              </label>
              <input
                value={form.linkUrl ?? ''}
                onChange={(e) => set('linkUrl', e.target.value)}
                className="input max-w-md"
                placeholder="https://example.com 또는 /products/1"
                maxLength={500}
              />
            </div>
          </Row>

          <Row label="팝업창 스크롤바" description="내용이 팝업창보다 길 때 스크롤바를 어떻게 할지 정합니다.">
            <RadioGroup
              name="scrollbar"
              value={form.scrollbar}
              options={POPUP_SCROLLBARS}
              labels={POPUP_SCROLLBAR_LABEL}
              onChange={(v) => set('scrollbar', v as PopupScrollbar)}
            />
          </Row>

          <Row label="팝업창 형태" description="고정 레이어는 제자리에, 이동 가능한 레이어는 방문자가 끌어 옮길 수 있습니다.">
            <RadioGroup
              name="windowType"
              value={form.windowType}
              options={POPUP_WINDOW_TYPES}
              labels={POPUP_WINDOW_LABEL}
              onChange={(v) => set('windowType', v as PopupWindowType)}
            />
          </Row>

          <Row label="팝업창 표시기간" description="방문자가 '다시 보지 않기'를 고르면 얼마 동안 감출지 정합니다.">
            <RadioGroup
              name="hidePeriod"
              value={form.hidePeriod}
              options={POPUP_HIDE_PERIODS}
              labels={POPUP_HIDE_PERIOD_LABEL}
              onChange={(v) => set('hidePeriod', v as PopupHidePeriod)}
            />
          </Row>

          <Row label="노출 순서" description="여러 개가 동시에 뜰 때 작은 값이 먼저 나옵니다.">
            <input
              type="number"
              value={form.sortOrder ?? 0}
              onChange={(e) => set('sortOrder', Number(e.target.value))}
              className="input w-28"
              min={0}
            />
          </Row>
        </div>

        {/* 팝업창 디자인 */}
        <div className="card p-6">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">팝업창 디자인</h2>
          <p className="mb-5 mt-1 text-sm text-slate-500 dark:text-slate-400">
            이미지를 넣으면 내용 위에 표시됩니다. 이미지 없이 내용만 써도 됩니다.
          </p>

          <ThumbnailInput value={form.image ?? null} onChange={(url) => set('image', url)} />

          <div className="mt-6">
            <span className="label">내용</span>
            <Suspense
              fallback={
                <div className="rounded-lg border border-slate-300 p-6 text-sm text-slate-500 dark:text-slate-400">
                  편집기 불러오는 중...
                </div>
              }
            >
              <RichEditor value={form.content} onChange={(html) => set('content', html)} />
            </Suspense>
          </div>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? '저장 중...' : '확인'}
          </button>
          <button type="button" onClick={() => navigate('/admin/popups')} className="btn-secondary">
            취소
          </button>
        </div>
      </form>
    </>
  )
}
