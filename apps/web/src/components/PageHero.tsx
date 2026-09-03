import { NavLink } from 'react-router-dom'
import Reveal from './Reveal'
import PageBreadcrumb, { type Crumb } from './PageBreadcrumb'

export interface PageHeroTab {
  to: string
  label: string
  /** 주소의 ?query 로 구분되는 탭처럼, 경로만으로 활성 여부를 알 수 없을 때 직접 넘긴다. */
  active?: boolean
}

/** 지금 화면이 어디에 있는지 알려 주는 길 안내 — 홈 · 묶음 · 현재 화면 */
export type PageHeroCrumb = Crumb

/**
 * 서브 페이지 상단 공통 히어로.
 * 헤더가 이 위에 투명하게 얹히므로 위쪽 여백을 넉넉히 둔다.
 */
export default function PageHero({
  title,
  description,
  tabs,
  breadcrumb,
}: {
  title: string
  description?: string
  /** 같은 묶음에 속한 페이지들로 넘어가는 작은 탭 */
  tabs?: PageHeroTab[]
  /** 제목 위에 놓는 길 안내 */
  breadcrumb?: PageHeroCrumb[]
}) {
  return (
    <section
      className="relative"
      style={{ background: 'linear-gradient(135deg, #1f2d3a 0%, #2b4750 55%, #3d6e71 100%)' }}
    >
      <div className="container-wnc pb-16 pt-36 text-center sm:pb-20 sm:pt-40">
        <Reveal>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-[2.25rem]">{title}</h1>
        </Reveal>
        {description && (
          <Reveal index={1}>
            <p className="mx-auto mt-5 max-w-3xl text-sm leading-[1.9] text-white/75">{description}</p>
          </Reveal>
        )}

        {tabs && tabs.length > 0 && (
          <Reveal as="nav" index={2} aria-label="묶음 이동" className="mt-8 flex justify-center gap-7">
            {tabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end
                className={({ isActive }) =>
                  `text-sm transition ${
                    (tab.active ?? isActive) ? 'font-semibold text-white' : 'text-white/60 hover:text-white/90'
                  }`
                }
              >
                {tab.label}
              </NavLink>
            ))}
          </Reveal>
        )}

        {breadcrumb && breadcrumb.length > 0 && (
          <Reveal index={3} className="mt-10">
            <PageBreadcrumb crumbs={breadcrumb} />
          </Reveal>
        )}
      </div>
    </section>
  )
}
