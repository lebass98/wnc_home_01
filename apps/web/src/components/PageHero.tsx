import { useLocation, NavLink } from 'react-router-dom'
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

export interface PageHeroProps {
  title: string
  description?: string
  /** 같은 묶음에 속한 페이지들로 넘어가는 작은 탭 */
  tabs?: PageHeroTab[]
  /** 제목 위에 놓는 길 안내 */
  breadcrumb?: PageHeroCrumb[]
  /** 직접 지정하는 서브 비주얼 배경 이미지 (미지정 시 경로별 자동 선택) */
  bgImage?: string
  /** 영문 소제목 (미지정 시 경로별 자동 선택) */
  eyebrow?: string
}

interface SubVisualMeta {
  image: string
  eyebrow: string
}

const baseUrl = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '')
const asset = (path: string) => `${baseUrl}${path}`

/**
 * 경로에 따라 어울리는 서브 비주얼 이미지와 영문 소제목을 매핑한다.
 */
export function resolveSubVisual(pathname: string): SubVisualMeta {
  if (pathname === '/about/directions') {
    return { image: asset('/images/subvisual/subvisual_about.jpg'), eyebrow: 'LOCATION & DIRECTIONS' }
  }
  if (pathname === '/about' || pathname.startsWith('/about/')) {
    return { image: asset('/images/subvisual/subvisual_about.jpg'), eyebrow: 'ABOUT US' }
  }
  if (pathname === '/services' || pathname.startsWith('/services/')) {
    return { image: asset('/images/subvisual/subvisual_services.jpg'), eyebrow: 'SERVICES & SOLUTIONS' }
  }
  if (pathname === '/products' || pathname.startsWith('/products/')) {
    return { image: asset('/images/subvisual/subvisual_products.jpg'), eyebrow: 'PRODUCTS & LINEUP' }
  }
  if (pathname === '/board' || pathname.startsWith('/board/')) {
    return { image: asset('/images/subvisual/subvisual_board.jpg'), eyebrow: 'NEWS & NOTICE' }
  }
  if (pathname === '/contact/faq') {
    return { image: asset('/images/subvisual/subvisual_contact.jpg'), eyebrow: 'FREQUENTLY ASKED QUESTIONS' }
  }
  if (pathname === '/contact' || pathname.startsWith('/contact/')) {
    return { image: asset('/images/subvisual/subvisual_contact.jpg'), eyebrow: 'CONTACT & SUPPORT' }
  }
  if (pathname === '/terms') {
    return { image: asset('/images/subvisual/subvisual_policy.jpg'), eyebrow: 'TERMS OF SERVICE' }
  }
  if (pathname === '/privacy') {
    return { image: asset('/images/subvisual/subvisual_policy.jpg'), eyebrow: 'PRIVACY POLICY' }
  }
  if (pathname.startsWith('/page/')) {
    return { image: asset('/images/subvisual/subvisual_policy.jpg'), eyebrow: 'CUSTOMER SERVICE' }
  }
  return { image: asset('/images/subvisual/subvisual_about.jpg'), eyebrow: 'WORD & CODE' }
}

/**
 * 서브 페이지 상단 공통 히어로.
 * 각 서브페이지에 어울리는 고해상도 비주얼 배경과 반투명 오버레이를 얹고,
 * 헤더가 이 위에 투명하게 얹히므로 위쪽 여백을 넉넉히 둔다.
 */
export default function PageHero({
  title,
  description,
  tabs,
  breadcrumb,
  bgImage,
  eyebrow,
}: PageHeroProps) {
  const { pathname } = useLocation()
  const autoMeta = resolveSubVisual(pathname)
  const currentBgImage = bgImage || autoMeta.image
  const currentEyebrow = eyebrow !== undefined ? eyebrow : autoMeta.eyebrow

  return (
    <section className="relative z-20 min-h-[320px] overflow-hidden bg-slate-950 sm:min-h-[360px]">
      {/* 서브 비주얼 배경 이미지 및 다층 오버레이 — 어떤 해상도에서도 화면 폭에 꽉 차게 비율 유지 */}
      <div className="absolute inset-0 z-0">
        <img
          src={currentBgImage}
          alt=""
          className="h-full w-full object-cover object-center select-none pointer-events-none"
          loading="eager"
          decoding="async"
        />
        {/* 가독성을 위한 다층 그라데이션 오버레이: 상단 GNB 투명 헤더 영역 암막 + 중앙 텍스트 선명도 + 하단 전환 */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(10, 16, 26, 0.76) 0%, rgba(15, 23, 42, 0.62) 40%, rgba(10, 16, 26, 0.84) 100%)',
          }}
          aria-hidden
        />
        {/* 하단 미세한 경계 하이라이트 */}
        <div className="absolute inset-x-0 bottom-0 h-px bg-white/10" aria-hidden />
      </div>

      {/* 내용 영역 */}
      <div
        className={`container-wnc relative z-10 pt-36 text-center sm:pt-40 ${
          breadcrumb && breadcrumb.length > 0 ? 'pb-12 sm:pb-14' : 'pb-16 sm:pb-20'
        }`}
      >
        {currentEyebrow && (
          <Reveal>
            <p className="mb-2.5 text-xs font-semibold uppercase tracking-[0.22em] text-mint-400 drop-shadow-sm sm:text-[0.8rem]">
              {currentEyebrow}
            </p>
          </Reveal>
        )}
        <Reveal index={1}>
          <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-md sm:text-[2.25rem]">{title}</h1>
        </Reveal>
        {description && (
          <Reveal index={2}>
            <p className="mx-auto mt-4 max-w-3xl text-sm leading-[1.9] text-white/85 drop-shadow-sm">{description}</p>
          </Reveal>
        )}

        {/* 묶음 탭 — 길 안내 풀다운과 같은 목록이므로, 길 안내가 있으면 그리지 않는다 */}
        {tabs && tabs.length > 0 && !(breadcrumb && breadcrumb.length > 0) && (
          <Reveal as="nav" index={3} aria-label="묶음 이동" className="mt-8 flex justify-center gap-7">
            {tabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end
                className={({ isActive }) =>
                  `text-sm transition ${
                    (tab.active ?? isActive) ? 'font-semibold text-white' : 'text-white/70 hover:text-white'
                  }`
                }
              >
                {tab.label}
              </NavLink>
            ))}
          </Reveal>
        )}

        {/* 길 안내 — 히어로 맨 아래 가운데에 막대로 붙인다 */}
        {breadcrumb && breadcrumb.length > 0 && (
          <Reveal index={3} className="mt-12 sm:mt-14">
            <PageBreadcrumb crumbs={breadcrumb} />
          </Reveal>
        )}
      </div>
    </section>
  )
}
