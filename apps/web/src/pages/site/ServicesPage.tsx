import { Link } from 'react-router-dom'
import PageHero from '../../components/PageHero'
import SectionHeading from '../../components/SectionHeading'
import Reveal from '../../components/Reveal'
import { usePageTitle } from '../../lib/seo'

/** 회사소개 묶음 안에서 오갈 수 있는 페이지 */
const TABS = [
  { to: '/about', label: '회사 소개' },
  { to: '/services', label: '사업분야' },
]

/** 위쪽 소개 — 작은 제목과 본문 두 묶음 */
const INTRO = [
  {
    title: '워드앤코드 서비스',
    body: '웹 서비스의 중요성이 나날이 커지고 있지만, 전문적인 교육을 받지 않고서는 직접 운영하기 어려운 것이 현실입니다. 워드앤코드는 담당자가 따로 배우지 않아도 손쉽게 웹과 친숙해질 수 있도록 돕는 웹 전용 스마트 서비스를 만듭니다. 사이트를 만든 뒤에는 편집기로 원하는 디자인을 직접 고르고 고칠 수 있어, 제작이나 관리에 대한 부담 없이 운영할 수 있습니다.',
  },
  {
    title: '워드앤코드 디자인 모티브',
    body: '화면은 보기 좋은 것보다 쓰기 쉬운 것이 먼저라고 생각합니다. 처음 보는 사람도 헤매지 않도록 흐름을 단순하게 정리하고, 자주 쓰는 기능일수록 손이 덜 가게 배치합니다. 홈페이지 기능 외에 일정 관리와 구성원 소개 같은 부가 기능을 더해, 사용자끼리 정보를 나누기 좋도록 구성했습니다.',
  },
]

/** 사업 인프라 카드 세 장 — 번호·제목·설명 아래에 이미지가 붙는다. */
const INFRA = [
  {
    no: '1',
    title: '사업영역',
    desc: '기업 홈페이지와 브랜드 사이트, 이커머스 플랫폼, 사내 업무 시스템까지 — 목적에 맞는 구조로 설계하고 개발합니다. 웹과 모바일을 가리지 않습니다.',
    gradient: 'linear-gradient(135deg, #cfe3e4 0%, #7dbbbd 100%)',
  },
  {
    no: '2',
    title: '사업형태',
    desc: '기획부터 디자인·개발·운영까지 한 팀이 책임지는 턴키 방식과, 필요한 단계만 맡는 부분 참여 방식을 모두 제공합니다. 규모와 일정에 맞춰 고를 수 있습니다.',
    gradient: 'linear-gradient(135deg, #d3dcea 0%, #6f8bb4 100%)',
  },
  {
    no: '3',
    title: '서비스영역',
    desc: '오픈 이후에도 모니터링과 개선을 이어갑니다. 클라우드 전환, 데이터 분석과 AI 도입처럼 운영 중에 필요한 일도 함께 준비합니다.',
    gradient: 'linear-gradient(135deg, #dcd8e8 0%, #8b7fae 100%)',
  },
]

export default function ServicesPage() {
  usePageTitle('사업분야')

  return (
    <>
      <PageHero title="사업분야" tabs={TABS} />

      {/* 소개 — 왼쪽 제목, 오른쪽에 작은 제목을 단 본문 두 묶음 */}
      <section className="py-24 sm:py-28">
        <div className="container-wnc grid gap-10 lg:grid-cols-[minmax(0,20rem)_1fr] lg:gap-16">
          <SectionHeading
            eyebrow="Web Service Company"
            title={['생활을', '디자인하는', '워드앤코드']}
            align="left"
          />

          <div className="space-y-12">
            {INTRO.map((item, i) => (
              <Reveal key={item.title} index={i}>
                <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-4 text-[0.95rem] leading-[1.9] text-slate-600">{item.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 사업 인프라 — 가운데 제목과 선, 그 아래 카드 세 장 */}
      <section className="border-t border-slate-200 pb-28 pt-24 sm:pt-28">
        <div className="container-wnc">
          <div className="text-center">
            <Reveal>
              <p className="text-[0.95rem] font-medium tracking-wide text-mint-400">Wordncode Business</p>
            </Reveal>
            <Reveal index={1}>
              <h2 className="mt-3 text-[1.75rem] font-bold leading-[1.4] tracking-tight text-slate-900 sm:text-[2rem]">
                워드앤코드 사업 인프라
              </h2>
            </Reveal>
            <Reveal index={2} className="mx-auto mt-7 h-px w-14 bg-slate-900" />
            <Reveal as="p" index={3} className="mx-auto mt-7 max-w-2xl text-[0.95rem] leading-[1.9] text-slate-600">
              뛰어난 내구성과 적은 유지비로 효율적인 가치를 만들어 내는 워드앤코드의 사업 구조입니다.
            </Reveal>
          </div>

          <div className="mt-16 grid gap-10 md:grid-cols-3 md:gap-8">
            {INFRA.map((card, i) => (
              <Reveal key={card.title} index={i}>
                <p className="font-mono text-2xl font-semibold text-mint-400">{card.no}</p>
                <h3 className="mt-3 text-lg font-bold text-slate-900">{card.title}</h3>
                <p className="mt-4 min-h-[6.5rem] text-[0.95rem] leading-[1.9] text-slate-600">{card.desc}</p>
                {/* 이미지 자리 — 외부 이미지 없이 그라데이션으로 그린다. */}
                <div className="mt-8 h-56 sm:h-64" style={{ background: card.gradient }} />
              </Reveal>
            ))}
          </div>

          <Reveal className="mt-20 text-center">
            <Link
              to="/contact"
              className="inline-flex bg-mint-400 px-8 py-3 text-sm font-semibold text-white transition hover:bg-mint-500"
            >
              프로젝트 상담 신청
            </Link>
          </Reveal>
        </div>
      </section>
    </>
  )
}
