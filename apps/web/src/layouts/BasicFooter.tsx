import { Link } from 'react-router-dom'
import MenuLink from '../components/MenuLink'
import { socialLinks } from '../lib/social'
import type { SiteFooterProps } from './index'

/**
 * 기본 푸터 — 베이지 바탕 가운데 정렬. (참고 디자인 THEME015)
 * 로고 → 메뉴 다섯 열 → SNS → 약관 → 회사 정보 → 맨 위로.
 */
export default function BasicFooter({ company, menu, onOpenSitemap }: SiteFooterProps) {
  const social = socialLinks(company)

  return (
    <footer className="bg-[#b8aa96] text-white">
      <div className="container-wnc py-16 text-center sm:py-20">
        <Link to="/" className="inline-block text-xl font-bold tracking-[0.35em]">
          {company.companyNameEn || company.companyName}
        </Link>

        {/* 메뉴 — 1차 메뉴 아래 2차 메뉴를 세로로. 열 사이에 옅은 세로선 */}
        <div className="mx-auto mt-14 grid max-w-6xl grid-cols-2 gap-y-10 text-left sm:grid-cols-3 lg:grid-cols-5 lg:divide-x lg:divide-white/30">
          {menu.map((item) => (
            <div key={item.id} className="px-4 lg:px-8">
              <MenuLink item={item} className="text-base font-bold transition hover:text-white/80">
                {item.label}
              </MenuLink>
              {item.children.length > 0 && (
                <ul className="mt-4 space-y-2">
                  {item.children.map((child) => (
                    <li key={child.id}>
                      <MenuLink item={child} className="text-sm text-white/70 transition hover:text-white">
                        {child.label}
                      </MenuLink>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        {/* SNS — 주소가 있는 것만 보인다 */}
        {social.length > 0 && (
          <ul className="mt-14 flex justify-center gap-4">
            {social.map((x) => (
              <li key={x.name}>
                <a
                  href={x.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={x.name}
                  title={x.name}
                  className="grid h-10 w-10 place-items-center rounded-full text-white transition hover:bg-white/15"
                >
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d={x.icon} />
                  </svg>
                </a>
              </li>
            ))}
          </ul>
        )}

        {/* 약관·방침·사이트맵 */}
        <nav className="mt-10 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm" aria-label="약관 및 정책">
          <Link to="/terms" className="transition hover:text-white/80">
            홈페이지 이용약관
          </Link>
          <span className="h-3 w-px bg-white/40" aria-hidden />
          <Link to="/privacy" className="font-semibold transition hover:text-white/80">
            개인정보처리방침
          </Link>
          <span className="h-3 w-px bg-white/40" aria-hidden />
          <button type="button" onClick={onOpenSitemap} className="transition hover:text-white/80">
            사이트맵
          </button>
          <span className="h-3 w-px bg-white/40" aria-hidden />
          <Link to="/admin" className="transition hover:text-white/80">
            관리자
          </Link>
        </nav>

        {/* 회사 정보 */}
        <p className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-sm text-white/90">
          {company.address && (
            <span>
              {company.zipCode && `[${company.zipCode}] `}
              {company.address}
            </span>
          )}
          {company.tel && <span className="tabular-nums">T. {company.tel}</span>}
          {company.fax && <span className="tabular-nums">F. {company.fax}</span>}
          {company.email && (
            <a href={`mailto:${company.email}`} className="transition hover:text-white">
              M. {company.email}
            </a>
          )}
        </p>
        {(company.ceo || company.bizNo) && (
          <p className="mt-2 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-sm text-white/80">
            {company.ceo && <span>대표 {company.ceo}</span>}
            {company.bizNo && <span className="tabular-nums">사업자등록번호 {company.bizNo}</span>}
          </p>
        )}
        <p className="mt-3 text-xs tracking-wide text-white/60">
          {company.since && `${company.since}-`}
          {new Date().getFullYear()} {company.copyright}
        </p>

        {/* 맨 위로 */}
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="맨 위로"
          className="mt-10 inline-grid h-10 w-10 place-items-center text-white/80 transition hover:text-white"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
        </button>
      </div>
    </footer>
  )
}
