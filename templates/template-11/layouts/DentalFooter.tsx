import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import type { SiteFooterProps } from './index'

const asset = (path: string) => `${import.meta.env.BASE_URL.replace(/\/$/, '')}${path}`

/** 아래 줄의 바로가기 — 시안 순서대로 */
const LINKS = [
  { label: '개인정보처리방침', to: '/privacy' },
  { label: '이용약관', to: '/terms' },
  { label: '1:1 상담', to: '/contact' },
  { label: '오시는길', to: '/about/directions' },
]

/** SNS 동그라미 — 흰 원 안에 각 서비스의 그림 */
function SnsCircle({ href, label, external = true, children }: { href: string; label: string; external?: boolean; children: React.ReactNode }) {
  const className = 'relative grid h-12 w-12 place-items-center rounded-full bg-white transition hover:opacity-80'
  return external ? (
    <a href={href} target="_blank" rel="noreferrer" aria-label={label} className={className}>
      {children}
    </a>
  ) : (
    <Link to={href} aria-label={label} className={className}>
      {children}
    </Link>
  )
}

/**
 * 치과 푸터 — 짙은 회청색 한 단. 왼쪽에 로고·바로가기·주소·저작권, 오른쪽에 SNS.
 * 주소·회사 이름·SNS 주소는 관리자 [사이트 설정]의 회사 정보를 읽는다.
 */
export default function DentalFooter({ company }: SiteFooterProps) {
  return (
    <footer className="bg-[#2a333a]">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-10 px-5 pb-12 pt-10 sm:px-10 md:flex-row md:items-end md:justify-between xl:px-0">
        <div className="flex flex-col gap-12">
          <span className="relative block h-9 w-[148px] overflow-hidden">
            <img
              src={asset('/images/dental/logo-footer.png')}
              alt={company.companyName}
              className="absolute left-[-27px] top-[-37px] h-[111px] w-[196px] max-w-none object-cover"
            />
          </span>

          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-6">
              <nav aria-label="푸터 바로가기" className="flex flex-wrap items-center gap-3 text-[17px] font-semibold leading-[1.6] tracking-[-0.425px] text-white">
                {LINKS.map((l, i) => (
                  <Fragment key={l.to}>
                    {i > 0 && <span className="h-3 w-px bg-white" aria-hidden />}
                    <Link to={l.to} className="transition hover:opacity-75">
                      {l.label}
                    </Link>
                  </Fragment>
                ))}
              </nav>
              <p className="text-[17px] leading-[1.6] tracking-[-0.425px] text-white">{company.address}</p>
            </div>
            <p className="text-base leading-[1.6] tracking-[-0.4px] text-[#dce1e4]">
              © {new Date().getFullYear()} {company.companyName}. All Rights reserved.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* 카카오톡 — 회사 정보에 따로 넣는 칸이 없어 1:1 상담으로 잇는다. */}
          <SnsCircle href="/contact" label="카카오톡 상담" external={false}>
            <span className="relative block h-[26px] w-7">
              <img src={asset('/images/dental/svg/sns-kakao-bubble.svg')} alt="" className="absolute inset-0 h-full w-full" />
              <img src={asset('/images/dental/svg/sns-kakao-t.svg')} alt="" className="absolute inset-[29.74%_66.84%_43.94%_12.85%]" />
              <img src={asset('/images/dental/svg/sns-kakao-a.svg')} alt="" className="absolute inset-[29.85%_49.68%_43.8%_29.02%]" />
              <img src={asset('/images/dental/svg/sns-kakao-l.svg')} alt="" className="absolute inset-[29.85%_33.81%_43.88%_51.98%]" />
              <img src={asset('/images/dental/svg/sns-kakao-k.svg')} alt="" className="absolute inset-[29.86%_14.41%_43.77%_67.38%]" />
            </span>
          </SnsCircle>
          {company.snsYoutube && (
            <SnsCircle href={company.snsYoutube} label="유튜브">
              <img src={asset('/images/dental/svg/sns-youtube.svg')} alt="" className="absolute inset-[29.17%_21.67%_31.25%_22.23%]" />
            </SnsCircle>
          )}
          {company.snsInstagram && (
            <SnsCircle href={company.snsInstagram} label="인스타그램">
              {/* 인스타그램 글리프 모양으로 그라데이션 사진을 오려 낸다 */}
              <span
                className="block h-6 w-6 bg-cover bg-center"
                style={{
                  backgroundImage: `url(${asset('/images/dental/sns-instagram-fill.png')})`,
                  WebkitMaskImage: `url(${asset('/images/dental/svg/sns-instagram-mask.svg')})`,
                  maskImage: `url(${asset('/images/dental/svg/sns-instagram-mask.svg')})`,
                  WebkitMaskSize: '100% 100%',
                  maskSize: '100% 100%',
                }}
                aria-hidden
              />
            </SnsCircle>
          )}
        </div>
      </div>
    </footer>
  )
}
