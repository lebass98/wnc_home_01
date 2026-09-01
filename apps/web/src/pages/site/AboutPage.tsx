import PageHero from '../../components/PageHero'

const HISTORY = [
  { year: '2026', items: ['클라우드 협업 솔루션 정식 출시', '해외 파트너십 체결'] },
  { year: '2024', items: ['올해의 IT 혁신기업 선정', '누적 프로젝트 100건 돌파'] },
  { year: '2021', items: ['기업부설연구소 설립', '벤처기업 인증 취득'] },
  { year: '2014', items: ['워드앤코드 설립'] },
]

const VALUES = [
  { title: '정직한 기술', desc: '과장 없이 할 수 있는 것과 없는 것을 분명히 말합니다.' },
  { title: '끝까지 책임', desc: '납품이 끝이 아니라 안정적으로 운영될 때까지 함께합니다.' },
  { title: '함께 성장', desc: '고객의 성장이 곧 우리의 성장이라고 믿습니다.' },
]

export default function AboutPage() {
  return (
    <>
      <PageHero
        title="회사소개"
        description="워드앤코드는 2014년 설립 이래 12년간 고객의 디지털 전환을 함께해 온 IT 솔루션 기업입니다."
      />

      <section className="py-20">
        <div className="container-wnc grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">기술로 문제를 해결합니다</h2>
            <div className="mt-6 space-y-4 leading-relaxed text-slate-600">
              <p>
                좋은 소프트웨어는 화려한 기술이 아니라 문제를 정확히 이해하는 데서 시작한다고
                생각합니다. 워드앤코드는 고객의 업무를 먼저 이해하고, 그다음에 기술을 선택합니다.
              </p>
              <p>
                기획·디자인·개발·운영을 한 팀에서 담당하기 때문에 커뮤니케이션 비용이 적고, 프로젝트
                중간에 방향이 바뀌어도 빠르게 대응할 수 있습니다.
              </p>
              <p>
                지금까지 150건이 넘는 프로젝트를 수행했고, 고객사의 98%가 다시 저희를 찾아주셨습니다.
              </p>
            </div>
          </div>

          <div className="card divide-y divide-slate-200">
            {[
              ['회사명', '주식회사 워드앤코드'],
              ['설립일', '2014년 3월 2일'],
              ['대표이사', '홍길동'],
              ['임직원', '45명'],
              ['주소', '서울특별시 강남구 테헤란로 123'],
              ['사업분야', '소프트웨어 개발 및 공급'],
            ].map(([k, v]) => (
              <div key={k} className="flex gap-4 px-6 py-4">
                <dt className="w-24 shrink-0 text-sm font-medium text-slate-500">{k}</dt>
                <dd className="text-sm text-slate-900">{v}</dd>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-slate-50 py-20">
        <div className="container-wnc">
          <h2 className="text-center text-2xl font-bold text-slate-900">핵심 가치</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {VALUES.map((v, i) => (
              <div key={v.title} className="card p-8">
                <span className="text-sm font-bold text-brand-600">0{i + 1}</span>
                <h3 className="mt-3 text-lg font-semibold text-slate-900">{v.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container-wnc">
          <h2 className="text-2xl font-bold text-slate-900">연혁</h2>
          <div className="mt-10 space-y-8">
            {HISTORY.map((h) => (
              <div key={h.year} className="flex flex-col gap-3 sm:flex-row sm:gap-10">
                <div className="w-20 shrink-0 text-xl font-bold text-brand-600">{h.year}</div>
                <ul className="flex-1 space-y-2.5 border-l border-slate-200 pl-6">
                  {h.items.map((item) => (
                    <li key={item} className="relative text-slate-700">
                      <span className="absolute -left-[1.9rem] top-2 h-2 w-2 rounded-full bg-brand-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
