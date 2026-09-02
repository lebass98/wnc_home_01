/**
 * 달력·날짜 입력에서 함께 쓰는 날짜 계산 도구.
 * 브라우저의 시간대를 그대로 따르며, 날짜만 다룰 때는 시각을 0시로 맞춘다.
 */

export const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const

const pad = (n: number) => String(n).padStart(2, '0')

/** yyyy-MM-dd */
export function toDateValue(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** yyyy-MM-ddTHH:mm — datetime 값으로 쓴다. */
export function toDateTimeValue(d: Date): string {
  return `${toDateValue(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** 화면에 보여주는 표기 — 2026.09.02 */
export function formatDisplay(value: string): string {
  const d = parseValue(value)
  return d ? `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}` : ''
}

/**
 * yyyy-MM-dd 또는 yyyy-MM-ddTHH:mm 을 Date 로 바꾼다.
 * 형식이 어긋나거나 실제로 없는 날짜(2월 30일 등)면 null 을 준다.
 */
export function parseValue(value: string | null | undefined): Date | null {
  if (!value) return null
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/)
  if (!m) return null

  const [, y, mo, day, hh, mm] = m
  const year = Number(y)
  const month = Number(mo)
  const date = Number(day)
  const d = new Date(year, month - 1, date, Number(hh ?? 0), Number(mm ?? 0), 0, 0)
  // 2026-02-30 처럼 넘치는 값은 Date 가 다음 달로 넘겨 버리므로 되돌려 확인한다.
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== date) return null
  return d
}

/** 그 달의 1일 */
export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

/** 두 날짜가 같은 날인지 (시각은 무시) */
export function isSameDay(a: Date | null, b: Date | null): boolean {
  if (!a || !b) return false
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  )
}

/**
 * 달력 한 판에 그릴 42칸(6주)을 만든다.
 * 앞뒤로 이전·다음 달 날짜가 섞여 들어오며, current 로 이번 달인지 구분한다.
 */
export function buildCalendarGrid(year: number, month: number): { date: Date; current: boolean }[] {
  const first = new Date(year, month, 1)
  // 그 주의 일요일부터 시작한다.
  const start = new Date(first)
  start.setDate(first.getDate() - first.getDay())

  return Array.from({ length: 42 }, (_, i) => {
    const date = new Date(start)
    date.setDate(start.getDate() + i)
    return { date, current: date.getMonth() === month }
  })
}

/** 연도 선택에 쓸 범위 — 기준 연도 앞뒤로 넉넉히 잡는다. */
export function yearRange(base: number, back = 10, forward = 10): number[] {
  return Array.from({ length: back + forward + 1 }, (_, i) => base - back + i)
}
