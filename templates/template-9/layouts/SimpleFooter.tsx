import { Link } from 'react-router-dom'
import MenuLink from '../components/MenuLink'
import { socialLinks } from '../lib/social'
import type { SiteFooterProps } from './index'

/**
 * 심플 푸터 — 어두운 바탕 한 단 구성.
 * 왼쪽에 로고와 회사 정보, 오른쪽에 1차 메뉴. 아래 줄에 약관과 저작권만 남긴 간결한 형태다.
 */
export default function SimpleFooter({ company, menu, onOpenSitemap }: SiteFooterProps) {
  const social = socialLinks(company)

  return (
    <footer className="bg-slate-900 text-slate-400">
      <div className="container-wnc py-12 sm:py-14">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
          {/* 로고 · 회사 정보 */}
          <div>
            <Link to="/" className="text-lg font-bold tracking-[0.3em] text-white">
              {company.companyNameEn || company.companyName}
            </Link>
            <p className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm">
              {company.address && (
                <span>
                  {company.zipCode && `[${company.zipCode}] `}
                  {company.address}
                </span>
              )}
              {company.tel && <span className="tabular-nums">T. {company.tel}</span>}
              {company.email && (
                <a href={`mailto:${company.email}`} className="transition hover:text-white">
                  M. {company.email}
                </a>
              )}
            </p>
            {(company.ceo || company.bizNo) && (
              <p className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-500">
                {company.ceo && <span>대표 {company.ceo}</span>}
                {company.bizNo && <span className="tabular-nums">사업자등록번호 {company.bizNo}</span>}
              </p>
            )}
          </div>

          {/* 1차 메뉴 · SNS */}
          <div className="lg:text-right">
            <nav className="flex flex-wrap gap-x-7 gap-y-2 text-sm font-semibold text-slate-300 lg:justify-end" aria-label="푸터 메뉴">
              {menu.map((item) => (
                <MenuLink key={item.id} item={item} className="transition hover:text-white">
                  {item.label}
                </MenuLink>
              ))}
            </nav>
            {social.length > 0 && (
              <ul className="mt-5 flex gap-3 lg:justify-end">
                {social.map((x) => (
                  <li key={x.name}>
                    <a
                      href={x.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={x.name}
                      title={x.name}
                      className="grid h-9 w-9 place-items-center rounded-full text-slate-400 transition hover:bg-white/10 hover:text-white"
                    >
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                        <path d={x.icon} />
                      </svg>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* 아래 줄 — 약관 · 저작권 */}
        <div className="mt-10 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-white/10 pt-6 text-xs">
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-2" aria-label="약관 및 정책">
            <Link to="/terms" className="transition hover:text-white">
              홈페이지 이용약관
            </Link>
            <span className="h-3 w-px bg-white/20" aria-hidden />
            <Link to="/privacy" className="font-semibold text-slate-300 transition hover:text-white">
              개인정보처리방침
            </Link>
            <span className="h-3 w-px bg-white/20" aria-hidden />
            <button type="button" onClick={onOpenSitemap} className="transition hover:text-white">
              사이트맵
            </button>
            <span className="h-3 w-px bg-white/20" aria-hidden />
            <Link to="/admin" className="transition hover:text-white">
              관리자
            </Link>
          </nav>
          <p className="tracking-wide text-slate-500">
            {company.since && `${company.since}-`}
            {new Date().getFullYear()} {company.copyright}
          </p>
        </div>
      </div>
    </footer>
  )
}
