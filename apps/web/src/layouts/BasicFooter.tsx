import { Link } from 'react-router-dom'
import BrandLogo from '../components/BrandLogo'
import MenuLink from '../components/MenuLink'
import { socialLinks } from '../lib/social'
import type { SiteFooterProps } from './index'

/** 묶음 사이를 가르는 옅은 세로선 — 목록 구분자로 쓴다. */
function Divider() {
  return <span className="h-[10px] w-px bg-[#9e9e9e]/30" aria-hidden />
}

/**
 * 기본 푸터 — 검정 바탕에 왼쪽 정렬. (피그마 시안)
 * 윗줄(SNS + 상담 신청) → 메뉴 네 열 → 로고·약관 → 회사 정보.
 * 메뉴와 회사 정보는 모두 관리자에서 넣은 값을 그대로 쓴다.
 */
export default function BasicFooter({ company, menu, onOpenSitemap }: SiteFooterProps) {
  const social = socialLinks(company)

  return (
    <footer className="bg-[#111] text-white">
      {/* 윗줄 — 왼쪽 SNS, 오른쪽 상담 권유 */}
      <div className="border-b border-[#333]">
        <div className="container-wnc flex min-h-[91px] flex-wrap items-center justify-between gap-4 py-5">
          <ul className="flex items-center gap-3">
            {social.map((x) => (
              <li key={x.name}>
                <a
                  href={x.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={x.name}
                  title={x.name}
                  className="grid h-6 w-6 place-items-center text-[#9e9e9e] transition hover:text-white"
                >
                  <svg className="h-[22px] w-[22px]" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d={x.icon} />
                  </svg>
                </a>
              </li>
            ))}
          </ul>

          <div className="flex flex-1 items-center justify-end gap-4">
            <p className="break-keep text-[14px] text-white sm:text-[16px]">어디서부터 뭘 어떻게 시작할지 모르겠다면</p>
            <Link
              to="/contact"
              className="grid h-[40px] shrink-0 place-items-center rounded-[6px] border border-[#707070] px-6 text-[15px] font-semibold text-white transition hover:border-white hover:bg-white/10"
            >
              1:1 상담 신청
            </Link>
          </div>
        </div>
      </div>

      {/* 메뉴 — 1차 메뉴를 열 제목으로, 2차 메뉴를 그 아래로 */}
      {menu.length > 0 && (
        <div className="border-b border-[#333]">
          {/* 열 수는 1차 메뉴 개수를 따른다 — 넷이든 다섯이든 한 줄에 고르게 선다. */}
          <div className="container-wnc flex flex-wrap gap-x-8 gap-y-10 py-8">
            {menu.map((item) => (
              <div key={item.id} className="min-w-[160px] flex-1 basis-[calc(50%-1rem)] sm:basis-[calc(33.333%-1.5rem)] lg:basis-0">
                <MenuLink item={item} className="text-[16px] font-semibold leading-4 text-white transition hover:text-white/80">
                  {item.label}
                </MenuLink>
                {item.children.length > 0 && (
                  <ul className="mt-4 space-y-2">
                    {item.children.map((child) => (
                      <li key={child.id}>
                        <MenuLink
                          item={child}
                          className="text-[14px] leading-[23.94px] text-[#9e9e9e] transition hover:text-white"
                        >
                          {child.label}
                        </MenuLink>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 아랫줄 — 로고·약관, 그 아래 회사 정보 */}
      <div className="container-wnc py-[30px]">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <Link to="/" aria-label={`${company.companyName} 홈으로`} className="text-white">
            {/* 검은 바탕이라 심볼까지 흰 한 색으로 깐다. */}
            <BrandLogo mono className="h-[18px]" />
          </Link>
          <nav className="flex flex-wrap items-center gap-x-[10px] gap-y-2 text-[12px]" aria-label="약관 및 정책">
            <Link to="/terms" className="text-[#9e9e9e] transition hover:text-white">
              홈페이지 이용약관
            </Link>
            <Divider />
            <Link to="/privacy" className="font-semibold text-white transition hover:text-white/80">
              개인정보처리방침
            </Link>
            <Divider />
            <button type="button" onClick={onOpenSitemap} className="text-[#9e9e9e] transition hover:text-white">
              사이트맵
            </button>
            <Divider />
            <Link to="/admin" className="text-[#9e9e9e] transition hover:text-white">
              관리자
            </Link>
          </nav>
        </div>

        <div className="mt-[18px] text-[12px] leading-[18px] text-[#707070]">
          <p className="flex flex-wrap items-center gap-x-[10px] gap-y-1">
            {company.ceo && <span>대표: {company.ceo}</span>}
            {company.ceo && company.bizNo && <Divider />}
            {company.bizNo && <span className="tabular-nums">사업자등록번호: {company.bizNo}</span>}
            {(company.ceo || company.bizNo) && company.tel && <Divider />}
            {company.tel && <span className="tabular-nums">{company.tel}</span>}
            {company.email && <Divider />}
            {company.email && (
              <a href={`mailto:${company.email}`} className="transition hover:text-white">
                {company.email}
              </a>
            )}
          </p>
          {company.address && (
            <p>
              {company.address}
              {company.zipCode && `, ${company.zipCode}`}
            </p>
          )}
          <p>
            {company.since && `${company.since}-`}
            {new Date().getFullYear()} {company.copyright}
          </p>
        </div>
      </div>
    </footer>
  )
}
