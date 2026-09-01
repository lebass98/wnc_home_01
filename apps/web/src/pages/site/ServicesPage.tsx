import { Link } from 'react-router-dom'
import PageHero from '../../components/PageHero'
import { usePageTitle } from '../../lib/seo'

const SERVICES = [
  {
    title: '웹 서비스 개발',
    desc: '반응형 웹사이트부터 대규모 플랫폼까지, 목적에 맞는 최적의 구조로 설계하고 개발합니다.',
    items: ['기업 홈페이지 / 브랜드 사이트', '이커머스 플랫폼', '사내 업무 시스템(그룹웨어, ERP)', '관리자 대시보드'],
  },
  {
    title: '모바일 앱 개발',
    desc: 'iOS와 Android를 아우르는 앱을 개발하고, 출시 이후 운영까지 함께합니다.',
    items: ['React Native 크로스플랫폼 앱', '네이티브 앱 개발', '앱 리뉴얼 및 성능 개선', '스토어 등록 및 운영 지원'],
  },
  {
    title: '클라우드 전환',
    desc: '온프레미스 환경을 클라우드로 이전하고, 운영 비용과 장애 위험을 함께 줄입니다.',
    items: ['AWS / GCP 인프라 설계', '컨테이너 기반 배포 환경 구축', 'CI/CD 파이프라인 자동화', '모니터링 및 장애 대응 체계'],
  },
  {
    title: '데이터 분석 · AI',
    desc: '흩어져 있는 데이터를 모아 의사결정에 바로 쓸 수 있는 형태로 만들어 드립니다.',
    items: ['데이터 파이프라인 구축', 'BI 대시보드 개발', '추천·예측 모델 도입', 'LLM 기반 업무 자동화'],
  },
]

const PROCESS = [
  { step: '01', title: '상담 및 요구사항 분석', desc: '해결하려는 문제와 목표를 함께 정리합니다.' },
  { step: '02', title: '기획 및 설계', desc: '화면 설계와 기술 구조를 확정하고 일정을 산정합니다.' },
  { step: '03', title: '디자인 및 개발', desc: '2주 단위로 진행 상황을 공유하며 개발합니다.' },
  { step: '04', title: '검수 및 오픈', desc: '테스트와 안정화를 거쳐 서비스를 오픈합니다.' },
  { step: '05', title: '운영 및 고도화', desc: '오픈 이후 모니터링과 개선을 지속합니다.' },
]

export default function ServicesPage() {
  usePageTitle('사업분야')
  return (
    <>
      <PageHero
        title="사업분야"
        description="워드앤코드는 웹·모바일 개발부터 클라우드 전환, 데이터 분석까지 폭넓은 영역의 서비스를 제공합니다."
      />

      <section className="py-20">
        <div className="container-wnc grid gap-6 md:grid-cols-2">
          {SERVICES.map((s) => (
            <div key={s.title} className="card p-8">
              <h2 className="text-xl font-bold text-slate-900">{s.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{s.desc}</p>
              <ul className="mt-6 space-y-2.5">
                {s.items.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-slate-700">
                    <svg
                      className="mt-0.5 h-4 w-4 shrink-0 text-brand-600"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.5}
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-slate-200 bg-slate-50 py-20">
        <div className="container-wnc">
          <h2 className="text-center text-2xl font-bold text-slate-900">진행 프로세스</h2>
          <p className="mt-3 text-center text-slate-600">
            투명한 절차로 진행 상황을 언제든 확인하실 수 있습니다.
          </p>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {PROCESS.map((p) => (
              <div key={p.step} className="card p-6">
                <span className="text-2xl font-bold text-brand-200">{p.step}</span>
                <h3 className="mt-2 font-semibold text-slate-900">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{p.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link to="/contact" className="btn-primary px-6 py-3">
              프로젝트 상담 신청
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
