import { useEffect, useState, type ReactNode } from 'react'
import { type SiteDesign } from '@wnc/shared'
import { api } from '../../lib/api'
import { invalidateSiteDesign } from '../../lib/siteDesign'
import { FOOTERS, HEADERS } from '../../layouts'
import { ErrorMessage, Loading, PageHeader } from '../../components/ui'

/**
 * 디자인 설정 — 사이트 전체에 하나씩 적용되는 헤더·푸터 레이아웃을 고른다.
 * 선택지는 src/layouts 등록부(HEADERS·FOOTERS)에서 온다. 고르면 바로 저장·적용된다.
 */

/** 선택 카드 안의 미니어처 — 레이아웃 생김새를 도형으로 어림해 보여 준다. */
const SKETCHES: Record<string, ReactNode> = {
  'header:basic': (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-slate-200 px-2 py-1.5 dark:border-slate-600">
        <span className="h-2 w-9 rounded-sm bg-slate-700 dark:bg-slate-200" />
        <span className="flex gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="h-1.5 w-5 rounded-sm bg-slate-300 dark:bg-slate-500" />
          ))}
        </span>
      </div>
      <div className="flex-1 bg-slate-100 dark:bg-slate-700/40" />
    </div>
  ),
  'header:center': (
    <div className="flex h-full flex-col">
      <div className="grid place-items-center border-b border-slate-100 py-1 dark:border-slate-700">
        <span className="h-2 w-10 rounded-sm bg-slate-700 dark:bg-slate-200" />
      </div>
      <div className="flex justify-center gap-1.5 border-b border-slate-200 py-1 dark:border-slate-600">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="h-1.5 w-5 rounded-sm bg-slate-300 dark:bg-slate-500" />
        ))}
      </div>
      <div className="flex-1 bg-slate-100 dark:bg-slate-700/40" />
    </div>
  ),
  'footer:basic': (
    <div className="flex h-full flex-col">
      <div className="flex-1 bg-slate-100 dark:bg-slate-700/40" />
      <div className="flex h-12 flex-col items-center justify-center gap-1 bg-[#b8aa96]">
        <span className="h-1.5 w-10 rounded-sm bg-white/85" />
        <span className="flex gap-1.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className="h-1 w-4 rounded-sm bg-white/55" />
          ))}
        </span>
        <span className="h-1 w-16 rounded-sm bg-white/40" />
      </div>
    </div>
  ),
  'footer:simple': (
    <div className="flex h-full flex-col">
      <div className="flex-1 bg-slate-100 dark:bg-slate-700/40" />
      <div className="flex h-8 items-center justify-between bg-slate-800 px-2">
        <span className="flex flex-col gap-1">
          <span className="h-1.5 w-9 rounded-sm bg-white/85" />
          <span className="h-1 w-14 rounded-sm bg-white/35" />
        </span>
        <span className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className="h-1 w-4 rounded-sm bg-white/55" />
          ))}
        </span>
      </div>
    </div>
  ),
}

export default function DesignPage() {
  const [design, setDesign] = useState<SiteDesign | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api<SiteDesign>('/design')
      .then(setDesign)
      .catch((e) => setError((e as Error).message))
  }, [])

  /** 고르면 바로 저장한다 — 실패하면 이전 선택으로 되돌린다. */
  async function choose(part: 'header' | 'footer', key: string) {
    if (!design || saving || design[part] === key) return
    const prev = design
    setDesign({ ...design, [part]: key })
    setSaving(true)
    try {
      const next = await api<SiteDesign>('/design', { method: 'PUT', body: { [part]: key }, auth: true })
      setDesign(next)
      invalidateSiteDesign()
    } catch (e) {
      setDesign(prev)
      alert((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  if (error) return <ErrorMessage message={error} />
  if (!design) return <Loading />

  const sections: {
    part: 'header' | 'footer'
    title: string
    hint: string
    defs: { key: string; label: string; description: string }[]
  }[] = [
    { part: 'header', title: '헤더', hint: '사이트 전체 상단에 하나로 적용됩니다.', defs: HEADERS },
    { part: 'footer', title: '푸터', hint: '사이트 전체 하단에 하나로 적용됩니다.', defs: FOOTERS },
  ]

  return (
    <div>
      <PageHeader
        title="디자인 설정"
        description="사이트 전체에 적용되는 틀을 고릅니다. 고르면 바로 저장되고, 열려 있는 홈페이지에도 즉시 반영됩니다."
        action={
          <a
            href={import.meta.env.BASE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
          >
            홈페이지에서 확인
          </a>
        }
      />

      <div className="space-y-8">
        {sections.map(({ part, title, hint, defs }) => (
          <section key={part} className="card p-5">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{hint}</p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {defs.map((def) => {
                const active = design[part] === def.key
                return (
                  <button
                    key={def.key}
                    type="button"
                    onClick={() => choose(part, def.key)}
                    aria-pressed={active}
                    className={`rounded-xl border p-4 text-left transition ${
                      active
                        ? 'border-brand-500 bg-brand-50/60 ring-1 ring-brand-500 dark:border-brand-400 dark:bg-brand-900/20 dark:ring-brand-400'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:border-slate-500 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    {/* 미니어처 */}
                    <div className="h-20 overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-900">
                      {SKETCHES[`${part}:${def.key}`] ?? (
                        <div className="grid h-full place-items-center text-xs text-slate-400">미리보기 없음</div>
                      )}
                    </div>
                    <p className="mt-3 flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
                      {def.label}
                      {active && (
                        <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[11px] font-medium text-white dark:bg-brand-500">
                          사용 중
                        </span>
                      )}
                    </p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{def.description}</p>
                  </button>
                )
              })}
            </div>
          </section>
        ))}

        <p className="text-sm text-slate-500 dark:text-slate-400">
          새 헤더·푸터를 만들려면 <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs dark:bg-slate-800">apps/web/src/layouts</code> 에 파일을 만들고
          등록부(index.ts)에 한 줄 등록하면 이 목록에 나타납니다. 기존 레이아웃 파일은 [페이지 관리]의 코드 편집기로 고칠 수 있습니다.
        </p>
      </div>
    </div>
  )
}
