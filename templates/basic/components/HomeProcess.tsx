import Reveal from './Reveal'

const asset = (path: string) => {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

type Step = {
  /** 영문 단계 이름 — 칸마다 색이 다르다. */
  step: string
  stepColor: string
  title: string
  desc: string[]
  image: string
  /** 배경 그림을 위아래로 뒤집어 깐다 */
  flip?: boolean
}

const STEPS: Step[] = [
  {
    step: 'STEP 01. Design Selection',
    stepColor: '#073989',
    title: '디자인 선택',
    desc: ['카테고리별 디자인 샘플을 둘러보고', '브랜드와 적합한 스타일을 선택하세요!'],
    image: '/images/home/step-01.jpg',
    flip: true,
  },
  {
    step: 'STEP 02. Content Submission',
    stepColor: '#00154c',
    title: '자료전달',
    desc: ['로고와 이미지, 페이지에 들어갈 문구 등', '홈페이지 제작에 필요한 자료를 전달해 주세요.'],
    image: '/images/home/step-02.jpg',
  },
  {
    step: 'STEP 03. Production & Review',
    stepColor: '#7ba4df',
    title: '제작·확인',
    desc: ['선택한 디자인에 전달해 주신 자료를 반영합니다.', '완성된 시안을 확인하고 수정 의견을 알려주세요.'],
    image: '/images/home/step-03.jpg',
    flip: true,
  },
  {
    step: 'STEP 04. Launch',
    stepColor: '#5698f6',
    title: '홈페이지 오픈',
    desc: ['최종 시안과 기능을 꼼꼼하게 점검한 뒤,', '우리 브랜드의 홈페이지를 정식으로 오픈합니다.'],
    image: '/images/home/step-04.jpg',
  },
]

/** 제작 네 단계 — 파란 그러데이션 칸 네 개가 나란히 선다. */
export default function HomeProcess() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {STEPS.map((step, index) => (
        <Reveal key={step.title} rise index={index} step={160} className="group/step">
          <div className="relative flex h-[240px] flex-col justify-end overflow-hidden rounded-[16px] sm:h-[280px] lg:h-[328px] border border-white/10 bg-[#92c7fe] px-[26px] py-[32px] transition duration-500 ease-out group-hover/step:-translate-y-2 group-hover/step:shadow-[0_22px_45px_-20px_rgba(12,33,164,0.55)]">
            {/* 뒤집기는 바깥 칸이 맡고, 안쪽 그림은 마우스를 올렸을 때만 천천히 커진다. */}
            <div className={`absolute inset-0 ${step.flip ? '-scale-y-100' : ''}`} aria-hidden>
              <img
                src={asset(step.image)}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-[900ms] ease-out group-hover/step:scale-110"
              />
            </div>
            <div className="relative">
              <p className="text-[13px] font-bold leading-[22.4px] sm:text-[14px]" style={{ color: step.stepColor }}>
                {step.step}
              </p>
              <p className="break-keep pt-[10px] text-[20px] font-bold leading-[1.5] tracking-[-0.575px] text-white sm:text-[23px]">
                {step.title}
              </p>
              <p className="break-keep pt-[14px] text-[14px] font-medium leading-[1.55] tracking-[-0.3625px] text-white sm:text-[14.5px]">
                {step.desc[0]}
                {/* 넓은 화면에서만 시안대로 두 줄로 끊는다 */}
                <br className="hidden lg:inline" />{' '}
                {step.desc[1]}
              </p>
            </div>
          </div>
        </Reveal>
      ))}
    </div>
  )
}
