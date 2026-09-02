import PageHero from '../../components/PageHero'
import Reveal from '../../components/Reveal'
import { DEFAULT_COMPANY } from '@wnc/shared'
import { usePageTitle, useSiteSetting } from '../../lib/seo'
import { ABOUT_TABS } from './AboutPage'

/**
 * 찾아오시는 길 — 참고 템플릿(THEME004 direction-info)과 같은 구성.
 * 제목 → 지도 → 본사(왼쪽 제목, 오른쪽 큰 전화번호·주소·안내) → 지점 목록.
 */
export default function DirectionsPage() {
  usePageTitle('찾아오시는 길')
  // 본사 연락처·주소·안내·지점은 환경설정 > 회사 정보에서 읽는다.
  const company = useSiteSetting() ?? DEFAULT_COMPANY
  const mapQuery = company.mapQuery || company.address
  const branches = company.branches

  return (
    <>
      <PageHero title="회사소개" tabs={ABOUT_TABS} />

      {/* 제목 — 영문 소제목, 두 줄 제목 */}
      <section className="pt-24 sm:pt-28">
        <div className="container-wnc">
          <Reveal>
            <p className="text-[0.95rem] font-medium tracking-wide text-mint-400">Contact Us</p>
          </Reveal>
          <h2 className="mt-3 text-[1.75rem] font-bold leading-[1.4] tracking-tight text-slate-900 sm:text-[2rem]">
            {['언제든 찾아오실 수 있는', `${company.companyName} 위치안내`].map((line, i) => (
              <Reveal key={line} as="span" index={i + 1} className="block">
                {line}
              </Reveal>
            ))}
          </h2>
        </div>
      </section>

      {/* 지도 */}
      <section className="pt-12 sm:pt-16">
        <div className="container-wnc">
          <Reveal className="overflow-hidden bg-slate-100">
            <iframe
              title="워드앤코드 본사 위치"
              src={`https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=16&output=embed`}
              className="h-[22rem] w-full border-0 sm:h-[28rem]"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </Reveal>
        </div>
      </section>

      {/* 본사 — 왼쪽 제목, 오른쪽 큰 전화번호·주소·안내 */}
      <section className="py-20 sm:py-24">
        <div className="container-wnc grid gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-4">
            <h3 className="text-[1.6rem] font-bold leading-[1.45] tracking-tight text-slate-900 sm:text-[1.75rem]">
              {['혁신을 주도하는', `${company.companyName} 본사`].map((line, i) => (
                <Reveal key={line} as="span" index={i} className="block">
                  {line}
                </Reveal>
              ))}
            </h3>
          </div>

          <div className="lg:col-span-8">
            <Reveal>
              <p className="tabular-nums text-[1.75rem] font-semibold tracking-tight text-mint-500 sm:text-[2rem]">
                {company.tel}
              </p>
            </Reveal>
            <Reveal index={1} className="mt-5 flex gap-4 text-[0.95rem]">
              <span className="shrink-0 font-medium text-mint-500">주소</span>
              <span className="text-slate-900">
                {company.zipCode && `[${company.zipCode}] `}
                {company.address}
              </span>
            </Reveal>
            {company.directionsGuide && (
              <Reveal as="p" index={2} className="mt-6 text-[0.95rem] leading-[1.9] text-slate-600">
                {company.directionsGuide}
              </Reveal>
            )}
          </div>
        </div>
      </section>

      {/* 지점 — 오른쪽 8칸에 이름·연락처·이메일·주소를 한 줄씩. 등록된 지점이 없으면 구역을 감춘다. */}
      <section className="pb-24 sm:pb-28">
        <div className="container-wnc lg:grid lg:grid-cols-12 lg:gap-16">
          {branches.length > 0 && (
          <ul className="border-t border-slate-900 lg:col-span-8 lg:col-start-5">
            {branches.map((b, i) => (
              <Reveal as="li" key={`${b.name}-${i}`} index={i} className="grid gap-4 border-b border-slate-200 py-8 sm:grid-cols-2">
                <h4 className="text-lg font-bold text-slate-900">{b.name}</h4>
                <dl className="space-y-2.5 text-[0.95rem]">
                  {(
                    [
                      ['연락처', b.phone],
                      ['이메일', b.email],
                      ['주소', b.address],
                    ] as const
                  )
                    .filter(([, value]) => value)
                    .map(([label, value]) => (
                      <div key={label} className="flex gap-4">
                        <dt className="w-12 shrink-0 font-medium text-mint-500">{label}</dt>
                        <dd className="tabular-nums text-slate-700">{value}</dd>
                      </div>
                    ))}
                </dl>
              </Reveal>
            ))}
          </ul>
          )}
        </div>
      </section>
    </>
  )
}
