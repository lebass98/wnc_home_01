import { useEffect, useState } from 'react'
import DatePicker from './DatePicker'

/**
 * 예약 발행 — '공개'일 때 즉시 공개할지, 정한 시각에 공개할지 고른다.
 * 값은 ISO 시각 문자열(서버가 받는 그대로)이고, 화면에서는 이 컴퓨터의 시각대로 보여 준다.
 * 예약 시각이 지나야 홈페이지에 보이며, 그 전에는 관리자 목록에 '예약'으로 표시된다.
 */

const pad = (n: number) => String(n).padStart(2, '0')

/** ISO → DatePicker 값(yyyy-MM-ddTHH:mm, 이 컴퓨터 시각) */
function toLocal(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** DatePicker 값 → ISO. 'yyyy-MM-ddTHH:mm' 은 이 컴퓨터 시각으로 읽힌다. */
function fromLocal(local: string): string | null {
  if (!local) return null
  const d = new Date(local)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

/** 지금부터 얼마 뒤인지 — '3시간 뒤', '2일 뒤' */
function fromNow(iso: string): string {
  const diff = Date.parse(iso) - Date.now()
  const min = Math.round(diff / 60000)
  if (min < 60) return `${Math.max(1, min)}분 뒤`
  const hour = Math.round(min / 60)
  if (hour < 48) return `${hour}시간 뒤`
  return `${Math.round(hour / 24)}일 뒤`
}

/** 기본 예약 시각 — 다음 정시에서 한 시간 뒤 */
function defaultTime(): string {
  const d = new Date()
  d.setHours(d.getHours() + 2, 0, 0, 0)
  return d.toISOString()
}

export default function PublishSchedule({
  published,
  publishAt,
  onChange,
}: {
  published: boolean
  publishAt: string | null | undefined
  onChange: (publishAt: string | null) => void
}) {
  const [mode, setMode] = useState<'now' | 'later'>(publishAt ? 'later' : 'now')
  // 불러온 값이 늦게 들어오는 수정 화면도 맞춰 준다.
  useEffect(() => {
    if (publishAt) setMode('later')
  }, [publishAt])

  if (!published) return null
  const past = !!publishAt && Date.parse(publishAt) <= Date.now()

  return (
    <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">공개 시점</p>
      <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-2" role="radiogroup" aria-label="공개 시점">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input
            type="radio"
            name="publish-when"
            checked={mode === 'now'}
            onChange={() => {
              setMode('now')
              onChange(null)
            }}
            className="accent-blue-600"
          />
          저장하면 바로 공개
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input
            type="radio"
            name="publish-when"
            checked={mode === 'later'}
            onChange={() => {
              setMode('later')
              onChange(publishAt || defaultTime())
            }}
            className="accent-blue-600"
          />
          예약 공개
        </label>
      </div>

      {mode === 'later' && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <DatePicker
            value={toLocal(publishAt)}
            onChange={(v) => onChange(fromLocal(v))}
            withTime
            ariaLabel="공개 예약 시각"
            className="w-60"
          />
          {publishAt && (
            <p className={`text-xs ${past ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'}`}>
              {past
                ? '이미 지난 시각이라 저장하면 바로 공개됩니다.'
                : `${fromNow(publishAt)} 홈페이지에 공개됩니다. 그 전에는 관리자만 볼 수 있습니다.`}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
