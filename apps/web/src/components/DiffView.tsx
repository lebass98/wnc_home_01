import { useMemo } from 'react'
import { collapseDiff, diffLines, diffSummary } from '../lib/diff'

/**
 * 두 코드의 차이를 줄 단위로 보여 준다.
 * 바뀐 곳 주변만 보여 주고, 같은 부분이 길면 '… n줄 같음' 으로 접는다.
 */
export default function DiffView({
  before,
  after,
  beforeLabel = '지금 코드',
  afterLabel = '바뀔 코드',
}: {
  before: string
  after: string
  beforeLabel?: string
  afterLabel?: string
}) {
  const { chunks, summary, same } = useMemo(() => {
    const lines = diffLines(before, after)
    return { chunks: collapseDiff(lines), summary: diffSummary(lines), same: before === after }
  }, [before, after])

  if (same) {
    return (
      <p className="rounded-lg bg-slate-50 px-3 py-3 text-sm text-slate-600 dark:bg-slate-900/50 dark:text-slate-400">
        내용이 같습니다. 되돌려도 바뀌는 것이 없습니다.
      </p>
    )
  }

  return (
    <div>
      <p className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
        <span>
          {beforeLabel} → {afterLabel}
        </span>
        <span className="tabular-nums font-medium text-green-700 dark:text-green-400">+{summary.added}줄</span>
        <span className="tabular-nums font-medium text-red-600 dark:text-red-400">−{summary.removed}줄</span>
      </p>

      <div className="max-h-[26rem] overflow-auto rounded-lg border border-slate-200 bg-slate-950 text-[13px] leading-6 dark:border-slate-700">
        {chunks.map((chunk, ci) =>
          chunk.gap !== null ? (
            <p key={`gap-${ci}`} className="border-y border-white/10 bg-white/5 px-4 py-1 text-xs text-slate-400">
              … {chunk.gap}줄 같음
            </p>
          ) : (
            <div key={`chunk-${ci}`}>
              {chunk.lines.map((line, li) => (
                <div
                  key={`${ci}-${li}`}
                  className={`flex whitespace-pre ${
                    line.kind === 'added'
                      ? 'bg-green-500/15 text-green-200'
                      : line.kind === 'removed'
                        ? 'bg-red-500/15 text-red-200'
                        : 'text-slate-300'
                  }`}
                >
                  <span className="w-12 shrink-0 select-none px-2 text-right tabular-nums text-slate-500">
                    {line.oldNo ?? ''}
                  </span>
                  <span className="w-12 shrink-0 select-none px-2 text-right tabular-nums text-slate-500">
                    {line.newNo ?? ''}
                  </span>
                  <span className="w-5 shrink-0 select-none text-center text-slate-400">
                    {line.kind === 'added' ? '+' : line.kind === 'removed' ? '−' : ''}
                  </span>
                  <span className="flex-1 pr-4">{line.text || ' '}</span>
                </div>
              ))}
            </div>
          ),
        )}
      </div>
    </div>
  )
}
