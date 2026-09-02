import PageHero from '../../components/PageHero'
import Reveal from '../../components/Reveal'
import { usePageTitle } from '../../lib/seo'
import { ABOUT_TABS } from './AboutPage'

/** 본사 */
const HEAD_OFFICE = {
  phone: '02-1234-5678',
  address: '서울특별시 강남구 테헤란로 123, 8층',
  desc: '2호선 강남역 11번 출구에서 도보 5분 거리입니다. 건물 지하 주차장을 이용하실 수 있으며, 방문 전 연락 주시면 주차권을 준비해 드립니다. 대중교통 이용 시 강남역·역삼역 어느 쪽에서도 걸어오실 수 있습니다.',
}

/** 지도에 표시할 위치 — 구글 지도 검색어 */
const MAP_QUERY = '서울특별시 강남구 테헤란로 123'

/** 지점 — 참고 템플릿처럼 이름 · 연락처 · 이메일 · 주소를 한 줄씩 */
const BRANCHES = [
  {
    name: '워드앤코드 판교 지점',
    phone: '031-123-4567',
    email: 'pangyo@wnc.co.kr',
    address: '경기도 성남시 분당구 판교역로 166',
  },
  {
    name: '워드앤코드 대전 지점',
    phone: '042-123-4567',
    email: 'daejeon@wnc.co.kr',
    address: '대전광역시 유성구 대학로 99',
  },
  {
    name: '워드앤코드 부산 지점',
    phone: '051-123-4567',
    email: 'busan@wnc.co.kr',
    address: '부산광역시 해운대구 센텀중앙로 79',
  },
]

/**
 * 찾아오시는 길 — 참고 템플릿(THEME004 direction-info)과 같은 구성.
 * 제목 → 지도 → 본사(왼쪽 제목, 오른쪽 큰 전화번호·주소·안내) → 지점 목록.
 */
export default function DirectionsPage() {
  usePageTitle('찾아오시는 길')

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
            {['언제든 찾아오실 수 있는', '워드앤코드 위치안내'].map((line, i) => (
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
              src={`https://www.google.com/maps?q=${encodeURIComponent(MAP_QUERY)}&z=16&output=embed`}
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
              {['혁신을 주도하는', '워드앤코드 본사'].map((line, i) => (
                <Reveal key={line} as="span" index={i} className="block">
                  {line}
                </Reveal>
              ))}
            </h3>
          </div>

          <div className="lg:col-span-8">
            <Reveal>
              <p className="font-mono text-[1.75rem] font-semibold tracking-tight text-mint-500 sm:text-[2rem]">
                {HEAD_OFFICE.phone}
              </p>
            </Reveal>
            <Reveal index={1} className="mt-5 flex gap-4 text-[0.95rem]">
              <span className="shrink-0 font-medium text-mint-500">주소</span>
              <span className="text-slate-900">{HEAD_OFFICE.address}</span>
            </Reveal>
            <Reveal as="p" index={2} className="mt-6 text-[0.95rem] leading-[1.9] text-slate-600">
              {HEAD_OFFICE.desc}
            </Reveal>
          </div>
        </div>
      </section>

      {/* 지점 — 오른쪽 8칸에 이름·연락처·이메일·주소를 한 줄씩 */}
      <section className="pb-24 sm:pb-28">
        <div className="container-wnc lg:grid lg:grid-cols-12 lg:gap-16">
          <ul className="border-t border-slate-900 lg:col-span-8 lg:col-start-5">
            {BRANCHES.map((b, i) => (
              <Reveal as="li" key={b.name} index={i} className="grid gap-4 border-b border-slate-200 py-8 sm:grid-cols-2">
                <h4 className="text-lg font-bold text-slate-900">{b.name}</h4>
                <dl className="space-y-2.5 text-[0.95rem]">
                  {(
                    [
                      ['연락처', b.phone],
                      ['이메일', b.email],
                      ['주소', b.address],
                    ] as const
                  ).map(([label, value]) => (
                    <div key={label} className="flex gap-4">
                      <dt className="w-12 shrink-0 font-medium text-mint-500">{label}</dt>
                      <dd className="font-mono text-slate-700">{value}</dd>
                    </div>
                  ))}
                </dl>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>
    </>
  )
}
