import PageHero from '../../components/PageHero'
import SectionHeading from '../../components/SectionHeading'
import Reveal from '../../components/Reveal'
import { usePageTitle } from '../../lib/seo'

/** 회사소개 묶음 안에서 오갈 수 있는 페이지 */
/** 회사소개 묶음 안에서 오갈 수 있는 페이지 — 사업분야·찾아오시는 길에서도 같은 탭을 쓴다. */
export const ABOUT_TABS = [
  { to: '/about', label: '회사 소개' },
  { to: '/services', label: '사업분야' },
  { to: '/about/directions', label: '찾아오시는 길' },
]

/** 서비스 철학 — 두 갈래로 나눠 설명한다. */
const PHILOSOPHY = [
  {
    title: '누구나 편리하게 쓸 수 있는 서비스',
    body: '화면을 만드는 사람과 쓰는 사람이 다르다는 것을 늘 염두에 둡니다. 담당자가 따로 교육을 받지 않아도 필요한 기능을 스스로 찾아 쓸 수 있도록, 흐름을 단순하게 정리하고 헷갈릴 만한 곳에는 설명을 함께 둡니다.',
  },
  {
    title: '만족할 때까지 함께하는 서비스',
    body: '납품으로 끝내지 않습니다. 실제로 쓰이기 시작한 뒤에야 드러나는 문제들이 있고, 그때 함께 있어야 제대로 고칠 수 있다고 생각합니다. 운영 중에 나오는 이야기를 듣고 다음 개선으로 이어갑니다.',
  },
]

/** 아래쪽 카드 세 장 */
const STRENGTHS = [
  {
    title: '충분한 정보 제공',
    desc: '무엇을 어떻게 하고 있는지 숨기지 않습니다. 진행 상황과 남은 일정을 정리해 공유합니다.',
    gradient: 'linear-gradient(135deg, #cfe3e4 0%, #7dbbbd 100%)',
  },
  {
    title: '편리한 서비스',
    desc: '자주 하는 일일수록 손이 덜 가게 만듭니다. 반복되는 작업은 자동으로 처리합니다.',
    gradient: 'linear-gradient(135deg, #d3dcea 0%, #6f8bb4 100%)',
  },
  {
    title: '사용자 의견 반영',
    desc: '쓰는 사람의 이야기를 모아 다음 개선에 반영합니다. 작은 불편도 그냥 넘기지 않습니다.',
    gradient: 'linear-gradient(135deg, #dcd8e8 0%, #8b7fae 100%)',
  },
]

export default function AboutPage() {
  usePageTitle('회사소개')

  return (
    <>
      <PageHero title="회사소개" tabs={ABOUT_TABS} />

      {/* 소개 — 왼쪽 제목, 오른쪽 본문 */}
      <section className="py-24 sm:py-28">
        <div className="container-wnc grid gap-10 lg:grid-cols-[minmax(0,20rem)_1fr] lg:gap-16">
          <SectionHeading
            eyebrow="Web Service Company"
            title={['고객과 함께', '성장하는', '워드앤코드']}
            align="left"
          />

          <div className="space-y-7 text-[0.95rem] leading-[1.9] text-slate-600">
            <Reveal as="p">
              웹 서비스의 중요성이 나날이 커지고 있지만, 전문적인 교육을 받지 않고서는 직접 운영하기
              어려운 것이 현실입니다. 워드앤코드는 담당자가 따로 배우지 않아도 손쉽게 웹과 친숙해질 수
              있도록 돕는 웹 전용 스마트 서비스를 만듭니다. 사이트를 만든 뒤에는 편집기로 원하는
              디자인을 직접 고르고 고칠 수 있어, 제작이나 관리에 대한 부담 없이 운영할 수 있습니다.
            </Reveal>
            <Reveal as="p" index={1}>
              공지사항과 멀티미디어 게시판을 기본으로 갖추고 있으며, 회원 관리와 권한 설정도 화면에서
              바로 다룰 수 있습니다. 별도의 유지관리 지원 없이도 메뉴를 새로 만들거나 페이지를 고치는
              일을 담당자가 직접 처리할 수 있습니다. 홈페이지 기능 외에 일정 관리와 구성원 소개 같은
              기능을 더해, 사용자끼리 정보를 나누기 좋도록 구성했습니다.
            </Reveal>
          </div>
        </div>

        {/* 이미지 두 장 — 오른쪽이 더 넓다. */}
        <div className="container-wnc mt-16 grid gap-6 md:grid-cols-[2fr_3fr]">
          <Reveal
            className="h-64 sm:h-80"
            style={{ background: 'linear-gradient(135deg, #dfe7ec 0%, #93aab8 100%)' }}
          />
          <Reveal
            index={1}
            className="h-64 sm:h-80"
            style={{ background: 'linear-gradient(135deg, #1f2a33 0%, #3a5560 60%, #6f9aa0 100%)' }}
          />
        </div>
      </section>

      {/* 영상 */}
      <section className="pb-24 sm:pb-28">
        <div className="container-wnc grid gap-10 lg:grid-cols-[minmax(0,20rem)_1fr] lg:gap-16">
          <SectionHeading
            eyebrow="Media Video"
            title={['워드앤코드가 만든', '서비스 홍보영상']}
            align="left"
          />
          <Reveal as="p" className="text-[0.95rem] leading-[1.9] text-slate-600">
            말로 설명하기 어려운 부분은 화면으로 보여 드리는 편이 빠릅니다. 실제로 어떤 흐름으로
            동작하는지, 담당자가 무엇을 직접 할 수 있는지를 짧게 담았습니다. 도입을 검토하고 계시다면
            먼저 훑어보시길 권해 드립니다.
          </Reveal>
        </div>

        <div className="container-wnc mt-14">
          <Reveal
            className="grid h-[22rem] place-items-center sm:h-[30rem]"
            style={{ background: 'linear-gradient(135deg, #24333a 0%, #3b5a5e 55%, #7fa39f 100%)' }}
          >
            <div className="grid h-16 w-16 place-items-center rounded-full bg-white/25 transition hover:bg-white/35">
              <svg className="ml-1 h-7 w-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 서비스 철학 */}
      <section className="pb-28">
        <div className="container-wnc">
          <SectionHeading
            eyebrow="Service Philosophy"
            title={['좋은 서비스로 이어지는', '워드앤코드의 생각']}
            align="left"
          />

          <div className="mt-14 grid gap-10 md:grid-cols-2 md:gap-14">
            {PHILOSOPHY.map((p, i) => (
              <Reveal
                key={p.title}
                index={i}
                className={i === 0 ? 'md:border-r md:border-slate-200 md:pr-14' : ''}
              >
                <h3 className="font-semibold text-slate-900">{p.title}</h3>
                <p className="mt-5 text-[0.95rem] leading-[1.9] text-slate-600">{p.body}</p>
              </Reveal>
            ))}
          </div>

          {/* 강점 카드 세 장 */}
          <div className="mt-20 grid gap-8 md:grid-cols-3">
            {STRENGTHS.map((s, i) => (
              <Reveal key={s.title} index={i}>
                <div className="h-72 w-full" style={{ background: s.gradient }} />
                <h3 className="mt-6 font-semibold text-slate-900">{s.title}</h3>
                <p className="mt-3 text-sm leading-[1.9] text-slate-600">{s.desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
