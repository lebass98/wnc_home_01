import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import type { SiteTemplateInfo } from '@wnc/shared'
import { api } from '../lib/api'

/** [템플릿 관리] 안의 화면들 — 컴포넌트·메인 비주얼 값은 켜진 템플릿에 딸려 있어 한곳에 모은다. */
const SECTIONS = [
  { to: '/admin/templates', label: '템플릿 목록', end: true },
  { to: '/admin/templates/components', label: '컴포넌트 관리', end: false },
  { to: '/admin/templates/main-visual', label: '메인 비주얼', end: false },
] as const

/**
 * [템플릿 관리] 상단 탭.
 * 컴포넌트·메인 비주얼 탭에서는 지금 어느 템플릿의 값을 고치는지 함께 보여 준다 —
 * 템플릿을 바꾸면 그 템플릿에 담아 둔 값으로 덮이므로, 모르고 고치다 잃는 일이 없게 한다.
 */
export default function TemplateSectionTabs({ showActive = false }: { showActive?: boolean }) {
  const [active, setActive] = useState<SiteTemplateInfo | null>(null)

  useEffect(() => {
    if (!showActive) return
    let alive = true
    api<SiteTemplateInfo[]>('/templates', { auth: true })
      .then((rows) => { if (alive) setActive(rows.find((row) => row.active) ?? null) })
      .catch(() => {})
    return () => { alive = false }
  }, [showActive])

  return (
    <div className="mb-6">
      <nav aria-label="템플릿 관리 메뉴" className="flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-700">
        {SECTIONS.map((section) => (
          <NavLink
            key={section.to}
            to={section.to}
            end={section.end}
            className={({ isActive }) =>
              `-mb-px whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition ${
                isActive
                  ? 'border-brand-600 text-brand-700 dark:text-brand-300'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`
            }
          >
            {section.label}
          </NavLink>
        ))}
      </nav>
      {showActive && active && (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm leading-6 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
          현재 적용 템플릿 <strong className="font-semibold">{active.name}</strong> 의 값을 고칩니다. 다른 템플릿을 켜면 그 템플릿에 담아 둔 값으로 바뀝니다 —
          지금 값을 이 템플릿에 남기려면 [템플릿 목록]에서 <strong className="font-semibold">현재 사이트 담기</strong>를 하세요.
        </p>
      )}
    </div>
  )
}
