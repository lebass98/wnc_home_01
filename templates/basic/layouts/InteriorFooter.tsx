import { Link } from 'react-router-dom'
import MenuLink from '../components/MenuLink'
import type { SiteFooterProps } from './index'

const asset = (path: string) => `${import.meta.env.BASE_URL.replace(/\/$/, '')}${path}`

/** 세로 구분선 */
function Bar() {
  return <span className="h-2 w-px bg-[#dddddd]" aria-hidden />
}

/** SNS 아이콘 — 둥근 사각 배경에 흰 그림 (인스타그램·페이스북·유튜브) */
function SnsIcon({ kind, href }: { kind: 'instagram' | 'facebook' | 'youtube'; href: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" aria-label={kind} className="transition hover:opacity-75">
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M17 2H7C5.67 2 4.4 2.53 3.46 3.46 2.53 4.4 2 5.67 2 7v10c0 1.33.53 2.6 1.46 3.54C4.4 21.47 5.67 22 7 22h10c1.33 0 2.6-.53 3.54-1.46C21.47 19.6 22 18.33 22 17V7c0-1.33-.53-2.6-1.46-3.54C19.6 2.53 18.33 2 17 2Z"
          fill="#676057"
        />
        {kind === 'instagram' && (
          <>
            <circle cx="12" cy="12" r="3.75" stroke="white" />
            <circle cx="17" cy="7" r="1.25" fill="white" />
          </>
        )}
        {kind === 'facebook' && (
          <path
            d="M14.02 7.74c-.77 0-1 .34-1 1.1v1.25h2.07l-.21 2.02h-1.86v6.14h-2.48v-6.14H8.88v-2.02h1.67V8.87c0-2.04.83-3.12 3.13-3.12.5 0 1.09.03 1.45.08v1.91"
            fill="white"
          />
        )}
        {kind === 'youtube' && <path d="M10.44 9.29 15.13 12l-4.69 2.71.01-5.42Z" fill="white" stroke="white" />}
      </svg>
    </a>
  )
}

/**
 * 인테리어 푸터 — 세 단 구성.
 * ① 밝은 고객센터 줄(전화·운영시간·바로가기·SNS) ② 갈색 본단(메뉴·회사 정보·로고) ③ 저작권 줄.
 */
export default function InteriorFooter({ company, menu, onOpenSitemap }: SiteFooterProps) {
  const sns = [
    { kind: 'instagram' as const, href: company.snsInstagram },
    { kind: 'facebook' as const, href: company.snsFacebook },
    { kind: 'youtube' as const, href: company.snsYoutube },
  ].filter((s) => s.href)

  return (
    <footer>
      {/* ① 고객센터 줄 */}
      <div className="border-t border-[#dddddd] bg-[#f7f4ef] px-5 py-3 sm:px-10 lg:px-20">
        <div className="mx-auto flex max-w-[1760px] flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <div className="flex items-center gap-3 text-sm">
            <span className="font-bold text-[#676057]">(유료){company.tel || '1644-0000'}</span>
            <span className="text-[#676057]">평일 09:00~18:00</span>
          </div>
          <div className="hidden items-center gap-[26px] text-sm text-[#20201f] sm:flex">
            <Link to="/contact" className="transition hover:opacity-70">고객센터</Link>
            <Link to="/board" className="transition hover:opacity-70">공지사항</Link>
            <Link to="/contact/faq" className="transition hover:opacity-70">자주 묻는 질문</Link>
            <button type="button" onClick={onOpenSitemap} className="transition hover:opacity-70">사이트맵</button>
          </div>
          {sns.length > 0 && (
            <div className="flex items-center gap-3">
              {sns.map((s) => (
                <SnsIcon key={s.kind} kind={s.kind} href={s.href!} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ② 본단 */}
      <div className="bg-[#676057] px-5 py-10 sm:px-10 lg:px-20">
        <div className="mx-auto flex max-w-[1760px] flex-col-reverse items-start justify-between gap-8 lg:flex-row lg:items-end">
          <div className="space-y-3.5">
            {/* 메뉴 한 줄 — 약관 묶음은 굵게 강조한다 */}
            <nav aria-label="푸터 메뉴" className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-[#1f1f1e]">
              {menu.map((item) => (
                <MenuLink key={item.id} item={item} className="transition hover:opacity-70">
                  {item.label}
                </MenuLink>
              ))}
              <Link to="/privacy" className="font-bold transition hover:opacity-70">개인정보처리방침</Link>
              <Link to="/terms" className="transition hover:opacity-70">이용약관</Link>
            </nav>

            <div className="space-y-2 text-xs leading-[1.3] text-[#f7f4ef]">
              <p className="flex flex-wrap items-center gap-2">
                <span>{company.address}</span>
                <Bar />
                <span>대표이사 {company.ceo}</span>
                <Bar />
                <span>사업자등록번호 {company.bizNo}</span>
              </p>
              <p className="flex flex-wrap items-center gap-2">
                <span>고객센터(유료) {company.tel}</span>
                <Bar />
                <span>이메일 {company.email}</span>
              </p>
              <p className="flex flex-wrap items-center gap-2 opacity-90">
                <span className="inline-flex items-center gap-0.5">
                  사업자정보확인
                  <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" aria-hidden>
                    <path d="M4 3L8 6L4 9" stroke="#F7F4EF" strokeLinecap="square" />
                  </svg>
                </span>
                <span className="inline-flex items-center gap-0.5">
                  에스크로서비스가입확인
                  <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" aria-hidden>
                    <path d="M4 3L8 6L4 9" stroke="#F7F4EF" strokeLinecap="square" />
                  </svg>
                </span>
              </p>
            </div>
          </div>

          <img src={asset('/images/interior/logo-footer.png')} alt={company.companyName} className="h-[33px] w-auto" />
        </div>
      </div>

      {/* ③ 저작권 줄 */}
      <div className="border-t border-[#d8cfc6] bg-[#676057] px-5 py-2 sm:px-10 lg:px-20">
        <p className="mx-auto max-w-[1760px] text-sm font-extralight text-[#f7f4ef]">
          COPYRIGHT {new Date().getFullYear()}. {(company.companyNameEn || company.companyName).toUpperCase()} ⓒ ALL RIGHTS RESERVED.
        </p>
      </div>
    </footer>
  )
}
