import { NavLink } from 'react-router-dom'

export interface PageHeroTab {
  to: string
  label: string
}

/**
 * 서브 페이지 상단 공통 히어로.
 * 헤더가 이 위에 투명하게 얹히므로 위쪽 여백을 넉넉히 둔다.
 */
export default function PageHero({
  title,
  description,
  tabs,
}: {
  title: string
  description?: string
  /** 같은 묶음에 속한 페이지들로 넘어가는 작은 탭 */
  tabs?: PageHeroTab[]
}) {
  return (
    <section
      className="relative"
      style={{ background: 'linear-gradient(135deg, #1f2d3a 0%, #2b4750 55%, #3d6e71 100%)' }}
    >
      <div className="container-wnc pb-16 pt-36 text-center sm:pb-20 sm:pt-40">
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-[2.25rem]">{title}</h1>
        {description && (
          <p className="mx-auto mt-5 max-w-3xl text-sm leading-[1.9] text-white/75">{description}</p>
        )}

        {tabs && tabs.length > 0 && (
          <nav className="mt-8 flex justify-center gap-7">
            {tabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end
                className={({ isActive }) =>
                  `text-sm transition ${
                    isActive ? 'font-semibold text-white' : 'text-white/60 hover:text-white/90'
                  }`
                }
              >
                {tab.label}
              </NavLink>
            ))}
          </nav>
        )}
      </div>
    </section>
  )
}
