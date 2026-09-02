import { useEffect, useId, useMemo, useRef, useState } from 'react'
import {
  buildCalendarGrid,
  formatDisplay,
  isSameDay,
  parseValue,
  startOfMonth,
  toDateTimeValue,
  toDateValue,
  WEEKDAY_LABELS,
  yearRange,
} from '../lib/date'

/**
 * KRDS 형태의 날짜 선택기.
 * 브라우저마다 생김새가 제각각인 <input type="date"> 대신 쓰며,
 * 값은 그대로 yyyy-MM-dd (withTime 이면 yyyy-MM-ddTHH:mm) 문자열로 주고받는다.
 *
 * - DatePicker      날짜 하나
 * - DateRangePicker 시작~종료 두 날짜를 달력 하나에서 고른다
 */

const CELL = 'grid h-9 w-full place-items-center text-sm transition disabled:cursor-default'

/** 달력 위쪽 이동 버튼 */
function ArrowButton({
  onClick,
  label,
  direction,
}: {
  onClick: () => void
  label: string
  direction: 'prev' | 'next'
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
    >
      <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d={direction === 'prev' ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'}
        />
      </svg>
    </button>
  )
}

/** 시·분 선택 — 분은 5분 간격으로만 고르게 해 목록을 짧게 유지한다. */
function TimeSelect({
  hour,
  minute,
  onChange,
  label,
}: {
  hour: number
  minute: number
  onChange: (hour: number, minute: number) => void
  label: string
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-slate-600 dark:text-slate-400">{label}</span>
      <select
        value={hour}
        onChange={(e) => onChange(Number(e.target.value), minute)}
        aria-label={`${label} 시 선택`}
        className="select w-auto py-1.5 pr-8 text-sm"
      >
        {Array.from({ length: 24 }, (_, i) => (
          <option key={i} value={i}>
            {String(i).padStart(2, '0')}시
          </option>
        ))}
      </select>
      <select
        value={minute}
        onChange={(e) => onChange(hour, Number(e.target.value))}
        aria-label={`${label} 분 선택`}
        className="select w-auto py-1.5 pr-8 text-sm"
      >
        {Array.from({ length: 60 }, (_, i) => i)
          .filter((i) => i % 5 === 0 || i === minute)
          .map((i) => (
            <option key={i} value={i}>
              {String(i).padStart(2, '0')}분
            </option>
          ))}
      </select>
    </div>
  )
}

/** 하루를 가리키는 시각 0시 기준 Date — 날짜끼리만 비교할 때 쓴다. */
function dayOnly(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

/**
 * 달력 한 판. 단일 선택과 기간 선택이 같은 화면을 쓴다.
 * start 만 주면 단일, start·end 를 주면 사이 날짜를 이어서 칠한다.
 */
function CalendarPanel({
  view,
  setView,
  start,
  end,
  onPick,
  isDisabled,
  footer,
  children,
}: {
  view: Date
  setView: (d: Date) => void
  start: Date | null
  end: Date | null
  onPick: (d: Date) => void
  isDisabled: (d: Date) => boolean
  footer: React.ReactNode
  /** 달력과 버튼 줄 사이에 끼워 넣을 것 (시각 선택 등) */
  children?: React.ReactNode
}) {
  const grid = useMemo(() => buildCalendarGrid(view.getFullYear(), view.getMonth()), [view])
  const years = useMemo(() => yearRange(new Date().getFullYear()), [])
  const today = new Date()

  const startTime = start ? dayOnly(start) : null
  const endTime = end ? dayOnly(end) : null

  return (
    <>
      {/* 연·월 이동 */}
      <div className="flex items-center justify-between gap-2 bg-slate-50 px-4 py-3 dark:bg-slate-900/40">
        <ArrowButton
          direction="prev"
          label="이전 달"
          onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}
        />
        <div className="flex items-center gap-2">
          <select
            value={view.getFullYear()}
            onChange={(e) => setView(new Date(Number(e.target.value), view.getMonth(), 1))}
            aria-label="연도 선택"
            className="select w-auto py-1.5 pr-8 text-sm font-semibold"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}년
              </option>
            ))}
          </select>
          <select
            value={view.getMonth()}
            onChange={(e) => setView(new Date(view.getFullYear(), Number(e.target.value), 1))}
            aria-label="월 선택"
            className="select w-auto py-1.5 pr-8 text-sm font-semibold"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i} value={i}>
                {String(i + 1).padStart(2, '0')}월
              </option>
            ))}
          </select>
        </div>
        <ArrowButton
          direction="next"
          label="다음 달"
          onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}
        />
      </div>

      <div className="bg-slate-50 px-4 pb-3 dark:bg-slate-900/40">
        {/* 요일 */}
        <div className="grid grid-cols-7">
          {WEEKDAY_LABELS.map((w, i) => (
            <div
              key={w}
              className={`grid h-8 place-items-center text-xs font-medium ${
                i === 0 ? 'text-red-500' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {w}
            </div>
          ))}
        </div>

        <p className="py-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
          {view.getFullYear()}년 {view.getMonth() + 1}월
        </p>

        {/* 날짜 */}
        <div className="grid grid-cols-7">
          {grid.map(({ date, current }) => {
            const time = dayOnly(date)
            const disabled = isDisabled(date)
            const isStart = startTime !== null && time === startTime
            const isEnd = endTime !== null && time === endTime
            const inRange =
              startTime !== null && endTime !== null && time > startTime && time < endTime
            const isToday = isSameDay(date, today)
            const sunday = date.getDay() === 0

            // 기간의 양 끝과 사이 구간을 이어 붙여 하나의 띠처럼 보이게 한다.
            const bandClass =
              inRange || (isStart && endTime !== null) || (isEnd && startTime !== null)
                ? `bg-brand-50 dark:bg-brand-900/30 ${
                    isStart && endTime !== null && startTime !== endTime
                      ? 'rounded-l-full'
                      : isEnd && startTime !== null && startTime !== endTime
                        ? 'rounded-r-full'
                        : startTime === endTime
                          ? 'rounded-full'
                          : ''
                  }`
                : ''

            return (
              <div key={date.toISOString()} className={`relative ${bandClass}`}>
                <button
                  type="button"
                  onClick={() => onPick(date)}
                  disabled={disabled}
                  aria-current={isToday ? 'date' : undefined}
                  aria-label={`${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`}
                  className={`${CELL} relative rounded-full ${
                    isStart || isEnd
                      ? 'bg-brand-800 font-semibold text-white dark:bg-brand-600'
                      : disabled
                        ? 'text-slate-300 dark:text-slate-600'
                        : !current
                          ? 'text-slate-300 hover:bg-slate-200 dark:text-slate-600 dark:hover:bg-slate-700'
                          : sunday
                            ? 'text-red-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                            : 'text-slate-700 hover:bg-slate-200 dark:text-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {date.getDate()}
                  {/* 오늘은 아래 점으로 표시한다. */}
                  {isToday && !isStart && !isEnd && (
                    <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-red-500" />
                  )}
                </button>
              </div>
            )
          })}
        </div>

        {children}
      </div>

      {footer}
    </>
  )
}

/** 아래쪽 오늘 / 취소·확인 줄 */
function PanelFooter({
  onToday,
  onCancel,
  onConfirm,
}: {
  onToday: () => void
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
      <button
        type="button"
        onClick={onToday}
        className="text-sm text-slate-600 transition hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
      >
        오늘
      </button>
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="btn-secondary px-3 py-1.5 text-sm">
          취소
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="btn-primary border border-transparent px-3 py-1.5 text-sm"
        >
          확인
        </button>
      </div>
    </div>
  )
}

/** 달력이 떠 있는 껍데기 — 테두리와 그림자를 맡는다. */
function Popover({
  id,
  className = '',
  children,
}: {
  id: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      id={id}
      role="dialog"
      aria-label="날짜 선택"
      className={`absolute left-0 z-50 mt-2 overflow-hidden rounded-xl border-2 border-brand-500 bg-white shadow-xl dark:bg-slate-800 ${className}`}
    >
      {children}
    </div>
  )
}

/** 달력 아이콘 버튼이 달린 텍스트 입력 */
function DateField({
  display,
  placeholder,
  ariaLabel,
  disabled,
  expanded,
  controls,
  onFocus,
  onToggle,
  onType,
  showIcon = true,
  className = '',
}: {
  display: string
  placeholder: string
  ariaLabel?: string
  disabled?: boolean
  expanded: boolean
  controls?: string
  onFocus: () => void
  onToggle: () => void
  onType: (raw: string) => void
  showIcon?: boolean
  className?: string
}) {
  return (
    <div className={`relative ${className}`}>
      <input
        type="text"
        value={display}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-expanded={expanded}
        aria-controls={controls}
        placeholder={placeholder}
        onChange={(e) => onType(e.target.value)}
        onFocus={onFocus}
        className={`input ${showIcon ? 'pr-10' : ''}`}
      />
      {showIcon && (
        <button
          type="button"
          onClick={onToggle}
          disabled={disabled}
          aria-label="달력 열기"
          className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50 dark:hover:bg-slate-700"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </button>
      )}
    </div>
  )
}

/** 바깥 클릭·ESC 로 닫는다. */
function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) close()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, close])
  return ref
}

/**
 * 타자로 친 날짜를 값으로 바꾼다.
 * 2026.09.02 / 2026-9-2 / 20260902 모두 알아듣고, 형식이 안 맞으면 null 을 준다.
 */
function parseTyped(raw: string): string | null {
  const t = raw.trim().replace(/[./]/g, '-')
  const digits = t.replace(/\D/g, '')
  if (/^\d{8}$/.test(digits) && !t.includes('-')) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`
  }
  const m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (!m) return null
  const next = `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
  return parseValue(next) ? next : null
}

/* ------------------------------------------------------------------ *
 *  날짜 하나
 * ------------------------------------------------------------------ */

export default function DatePicker({
  value,
  onChange,
  withTime = false,
  min,
  max,
  disabled = false,
  placeholder,
  ariaLabel,
  className = '',
}: {
  /** yyyy-MM-dd 또는 yyyy-MM-ddTHH:mm. 빈 문자열이면 미선택 상태다. */
  value: string
  onChange: (value: string) => void
  /** 시각(시·분)까지 고르게 한다. */
  withTime?: boolean
  /** 고를 수 있는 최소·최대 날짜 (yyyy-MM-dd) */
  min?: string
  max?: string
  disabled?: boolean
  placeholder?: string
  ariaLabel?: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const dialogId = useId()
  const wrapRef = useDismiss(open, () => setOpen(false))

  const selected = parseValue(value)
  // 달력이 펼쳐 보여줄 달. 값이 없으면 오늘이 있는 달부터 시작한다.
  const [view, setView] = useState(() => startOfMonth(selected ?? new Date()))
  const [hour, setHour] = useState(() => selected?.getHours() ?? 0)
  const [minute, setMinute] = useState(() => selected?.getMinutes() ?? 0)

  const minDate = parseValue(min)
  const maxDate = parseValue(max)

  // 바깥의 값이 바뀌면 달력과 시각도 맞춘다.
  useEffect(() => {
    const d = parseValue(value)
    if (!d) return
    setView(startOfMonth(d))
    setHour(d.getHours())
    setMinute(d.getMinutes())
  }, [value])

  function outOfRange(d: Date): boolean {
    const t = dayOnly(d)
    if (minDate && t < dayOnly(minDate)) return true
    if (maxDate && t > dayOnly(maxDate)) return true
    return false
  }

  function pick(d: Date) {
    if (outOfRange(d)) return
    if (withTime) {
      onChange(toDateTimeValue(new Date(d.getFullYear(), d.getMonth(), d.getDate(), hour, minute)))
    } else {
      onChange(toDateValue(d))
      setOpen(false)
    }
  }

  /** 시·분만 바꾼다. 날짜를 아직 고르지 않았으면 오늘로 잡는다. */
  function changeTime(h: number, m: number) {
    setHour(h)
    setMinute(m)
    const base = selected ?? new Date()
    onChange(toDateTimeValue(new Date(base.getFullYear(), base.getMonth(), base.getDate(), h, m)))
  }

  const display = value
    ? withTime
      ? `${formatDisplay(value)} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
      : formatDisplay(value)
    : ''

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <DateField
        display={display}
        placeholder={placeholder ?? (withTime ? 'YYYY.MM.DD HH:MM' : 'YYYY.MM.DD')}
        ariaLabel={ariaLabel}
        disabled={disabled}
        expanded={open}
        controls={open ? dialogId : undefined}
        onFocus={() => setOpen(true)}
        onToggle={() => !disabled && setOpen((v) => !v)}
        onType={(raw) => {
          if (raw.trim() === '') return onChange('')
          // 시각이 붙어 있으면 떼어 내고 날짜만 해석한다.
          const [datePart, timePart] = raw.trim().split(/\s+/)
          const next = parseTyped(datePart)
          if (!next) return
          const parsed = parseValue(next)
          if (!parsed || outOfRange(parsed)) return
          if (!withTime) return onChange(next)
          const tm = timePart?.match(/^(\d{1,2}):(\d{2})$/)
          const h = tm ? Math.min(23, Number(tm[1])) : hour
          const mi = tm ? Math.min(59, Number(tm[2])) : minute
          setHour(h)
          setMinute(mi)
          onChange(`${next}T${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}`)
        }}
      />

      {open && !disabled && (
        <Popover id={dialogId} className="w-[22rem]">
          <CalendarPanel
            view={view}
            setView={setView}
            start={selected}
            end={null}
            onPick={pick}
            isDisabled={outOfRange}
            footer={
              <PanelFooter
                onToday={() => {
                  const now = new Date()
                  setView(startOfMonth(now))
                  pick(now)
                }}
                onCancel={() => setOpen(false)}
                onConfirm={() => setOpen(false)}
              />
            }
          >
            {withTime && (
              <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-700">
                <TimeSelect hour={hour} minute={minute} onChange={changeTime} label="시각" />
              </div>
            )}
          </CalendarPanel>
        </Popover>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ *
 *  시작 ~ 종료
 * ------------------------------------------------------------------ */

export function DateRangePicker({
  start,
  end,
  onChange,
  withTime = false,
  disabled = false,
  startLabel = '시작일',
  endLabel = '종료일',
  className = '',
}: {
  /** yyyy-MM-dd 또는 yyyy-MM-ddTHH:mm */
  start: string
  end: string
  onChange: (start: string, end: string) => void
  withTime?: boolean
  disabled?: boolean
  startLabel?: string
  endLabel?: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const dialogId = useId()
  const wrapRef = useDismiss(open, () => setOpen(false))

  const startDate = parseValue(start)
  const endDate = parseValue(end)

  const [view, setView] = useState(() => startOfMonth(startDate ?? new Date()))
  // 다음에 고를 쪽 — 시작을 고르면 종료로 넘어간다.
  const [picking, setPicking] = useState<'start' | 'end'>('start')

  const [startTime, setStartTime] = useState(() => ({
    h: startDate?.getHours() ?? 0,
    m: startDate?.getMinutes() ?? 0,
  }))
  const [endTime, setEndTime] = useState(() => ({
    h: endDate?.getHours() ?? 23,
    m: endDate?.getMinutes() ?? 0,
  }))

  useEffect(() => {
    const s = parseValue(start)
    if (s) {
      setView(startOfMonth(s))
      setStartTime({ h: s.getHours(), m: s.getMinutes() })
    }
    const e = parseValue(end)
    if (e) setEndTime({ h: e.getHours(), m: e.getMinutes() })
  }, [start, end])

  /** 날짜 하나를 값 문자열로 만든다. */
  const compose = (d: Date, t: { h: number; m: number }) =>
    withTime
      ? toDateTimeValue(new Date(d.getFullYear(), d.getMonth(), d.getDate(), t.h, t.m))
      : toDateValue(d)

  /**
   * 달력에서 날짜를 고른다.
   * 시작을 고르면 종료를 비우고 다음 클릭을 기다리며,
   * 시작보다 앞선 날짜를 고르면 그것을 새 시작으로 삼는다.
   */
  function pick(d: Date) {
    if (picking === 'start' || !startDate) {
      onChange(compose(d, startTime), '')
      setPicking('end')
      return
    }
    if (dayOnly(d) < dayOnly(startDate)) {
      onChange(compose(d, startTime), '')
      return
    }
    onChange(start, compose(d, endTime))
    setPicking('start')
    if (!withTime) setOpen(false)
  }

  function changeStartTime(h: number, m: number) {
    setStartTime({ h, m })
    if (startDate) onChange(compose(startDate, { h, m }), end)
  }

  function changeEndTime(h: number, m: number) {
    setEndTime({ h, m })
    if (endDate) onChange(start, compose(endDate, { h, m }))
  }

  /** 입력 칸에 직접 친 날짜를 반영한다. */
  function typed(which: 'start' | 'end', raw: string) {
    if (raw.trim() === '') {
      return which === 'start' ? onChange('', end) : onChange(start, '')
    }
    const next = parseTyped(raw.trim().split(/\s+/)[0])
    if (!next) return
    const parsed = parseValue(next)
    if (!parsed) return
    if (which === 'start') {
      onChange(compose(parsed, startTime), end)
      setView(startOfMonth(parsed))
    } else {
      onChange(start, compose(parsed, endTime))
    }
  }

  const show = (value: string, t: { h: number; m: number }) =>
    value
      ? withTime
        ? `${formatDisplay(value)} ${String(t.h).padStart(2, '0')}:${String(t.m).padStart(2, '0')}`
        : formatDisplay(value)
      : ''

  const placeholder = withTime ? 'YYYY.MM.DD HH:MM' : 'YYYY.MM.DD'

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <div className="flex items-center gap-2">
        <DateField
          display={show(start, startTime)}
          placeholder={placeholder}
          ariaLabel={startLabel}
          disabled={disabled}
          expanded={open}
          controls={open ? dialogId : undefined}
          showIcon={false}
          className="flex-1"
          onFocus={() => {
            setPicking('start')
            setOpen(true)
          }}
          onToggle={() => setOpen((v) => !v)}
          onType={(raw) => typed('start', raw)}
        />
        <span className="shrink-0 text-slate-400">-</span>
        <DateField
          display={show(end, endTime)}
          placeholder={placeholder}
          ariaLabel={endLabel}
          disabled={disabled}
          expanded={open}
          controls={open ? dialogId : undefined}
          className="flex-1"
          onFocus={() => {
            setPicking('end')
            setOpen(true)
          }}
          onToggle={() => !disabled && setOpen((v) => !v)}
          onType={(raw) => typed('end', raw)}
        />
      </div>

      {open && !disabled && (
        <Popover id={dialogId} className="w-[22rem]">
          <CalendarPanel
            view={view}
            setView={setView}
            start={startDate}
            end={endDate}
            onPick={pick}
            isDisabled={() => false}
            footer={
              <PanelFooter
                onToday={() => {
                  const now = new Date()
                  setView(startOfMonth(now))
                  pick(now)
                }}
                onCancel={() => setOpen(false)}
                onConfirm={() => setOpen(false)}
              />
            }
          >
            {withTime && (
              <div className="mt-3 space-y-2 border-t border-slate-200 pt-3 dark:border-slate-700">
                <TimeSelect
                  hour={startTime.h}
                  minute={startTime.m}
                  onChange={changeStartTime}
                  label="시작"
                />
                <TimeSelect hour={endTime.h} minute={endTime.m} onChange={changeEndTime} label="종료" />
              </div>
            )}
          </CalendarPanel>
        </Popover>
      )}
    </div>
  )
}
