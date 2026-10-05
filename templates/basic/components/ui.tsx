import { useEffect, useRef, useState, type ReactNode } from 'react'

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function Badge({
  children,
  tone = 'slate',
}: {
  children: ReactNode
  tone?: 'slate' | 'blue' | 'green' | 'amber' | 'red'
}) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700',
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-green-100 text-green-700',
    amber: 'bg-amber-100 text-amber-700',
    red: 'bg-red-100 text-red-700',
  }
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  )
}

export function Loading({ label = '불러오는 중...' }: { label?: string }) {
  return <div className="py-16 text-center text-sm text-slate-500 dark:text-slate-400">{label}</div>
}

export function EmptyState({ label }: { label: string }) {
  return (
    <div className="py-16 text-center">
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  )
}

export function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {message}
    </div>
  )
}

/**
 * 목록 하단 페이지네이션 — 모든 어드민 목록이 같은 모습을 쓴다.
 * 화살표(‹ ›)와 쪽 번호를 두고, 총건수를 알면 아래에 '총 n개 중 a-b개 표시' 를 함께 보여 준다.
 */
export function Pagination({
  page,
  totalPages,
  onChange,
  total,
  pageSize,
}: {
  page: number
  totalPages: number
  onChange: (page: number) => void
  /** 전체 건수 — 주면 아래 줄에 몇 개 중 몇 개를 보고 있는지 적는다. */
  total?: number
  /** 한 쪽에 보여 주는 개수 — total 과 함께 준다. */
  pageSize?: number
}) {
  const showCount = typeof total === 'number' && typeof pageSize === 'number'
  // 한 쪽뿐이고 건수도 모르면 보여 줄 것이 없다.
  if (totalPages <= 1 && !showCount) return null

  // 현재 쪽 주변 최대 5개만 노출한다.
  const start = Math.max(1, Math.min(page - 2, totalPages - 4))
  const end = Math.min(totalPages, start + 4)
  const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i)

  const box =
    'grid h-9 w-9 place-items-center rounded-md border text-sm transition disabled:cursor-not-allowed disabled:opacity-40'
  const idle =
    'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'

  return (
    <div className="py-5">
      <nav className="flex items-center justify-center gap-1.5" aria-label="쪽 이동">
        <button
          type="button"
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          aria-label="이전 쪽"
          className={`${box} ${idle}`}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {pages.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            aria-current={p === page ? 'page' : undefined}
            className={`${box} font-medium ${
              p === page ? 'border-brand-600 bg-brand-600 text-white' : idle
            }`}
          >
            {p}
          </button>
        ))}

        <button
          type="button"
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="다음 쪽"
          className={`${box} ${idle}`}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </nav>

      {showCount && (
        <p className="mt-3 text-center text-sm text-slate-500 dark:text-slate-400">
          총 {total}개 중 {total === 0 ? 0 : (page - 1) * pageSize + 1}-{Math.min(total, page * pageSize)}개 표시
        </p>
      )}
    </div>
  )
}

/** 가운데 뜨는 대화상자. 바깥 클릭과 ESC 로 닫는다. */
export function Modal({
  title,
  onClose,
  children,
  footer,
  wide = false,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto p-4 sm:p-8">
      <div className="fixed inset-0 bg-slate-900/50" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal
        className={`relative my-auto w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} card overflow-hidden`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700"
            aria-label="닫기"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-700">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

export interface RowMenuItem {
  label: string
  onClick: () => void
  /** 삭제처럼 되돌릴 수 없는 항목은 빨갛게 보여준다. */
  danger?: boolean
  icon: string
}

/** 표 오른쪽 끝의 ⋯ 버튼 — 행별 작업 메뉴를 연다. */
export function RowMenu({ items }: { items: RowMenuItem[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  return (
    <div ref={ref} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="작업 메뉴"
        aria-expanded={open}
        className={`grid h-8 w-8 place-items-center rounded-lg border text-slate-500 transition ${
          open
            ? 'border-brand-500 bg-brand-50 text-brand-600 dark:bg-slate-700'
            : 'border-slate-200 hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-700'
        }`}
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
          <circle cx="4" cy="10" r="1.6" />
          <circle cx="10" cy="10" r="1.6" />
          <circle cx="16" cy="10" r="1.6" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-1 w-40 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-600 dark:bg-slate-800">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                setOpen(false)
                item.onClick()
              }}
              className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition ${
                item.danger
                  ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40'
                  : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** on/off 스위치 — 설정 화면에서 켬·끔을 한눈에 보여준다. */
export function ToggleSwitch({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  /** 화면에 글자가 따로 있을 때 스크린리더용으로 쓴다. */
  label: string
  /** 아직 쓸 수 없는 설정을 잠가 둘 때 */
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${
        checked ? 'bg-brand-600' : 'bg-slate-300 dark:bg-slate-600'
      } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
          checked ? 'left-[1.375rem]' : 'left-0.5'
        }`}
      />
    </button>
  )
}
