import { componentImageUrl, useComponentSettings } from '../../lib/componentSettings'
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Link } from 'react-router-dom'
import { DEFAULT_COMPANY } from '@wnc/shared'
import { useSiteSetting } from '../../lib/seo'

const asset = (path: string) => {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

/** 메인 비주얼을 관리자에서 비워 두었을 때 쓰는 기본 모습 */
const DEFAULT_SLIDE = {
  title: '편안함을\n먼저 생각하는 진료',
  description: '치료의 순간까지 세심하게 살피며,\n환자 한 분 한 분의 편안함을 생각합니다.',
  image: '/images/dental/hero-01.png',
}

/** 진료 프로그램 — 탭과 가운데 카드가 함께 움직인다. */
const PROGRAMS = [
  { name: '임플란트', image: '/images/dental/program-implant.png', desc: ['치아를 상실한 부위에 인공치아를 식립하여', '자연스러운 기능과 편안한 사용감을 회복할 수 있도록 돕습니다.'] },
  { name: '치아교정', image: '/images/dental/program-ortho.png', desc: ['고르지 못한 치열과 맞물림을 바로잡아', '보기 좋고 건강한 미소를 되찾을 수 있도록 돕습니다.'] },
  { name: '심미치료', image: '/images/dental/program-aesthetic.png', desc: ['치아의 색과 모양을 자연스럽게 다듬어', '웃는 얼굴에 자신감을 더할 수 있도록 돕습니다.'] },
  { name: '일반진료', image: '/images/dental/program-general.png', desc: ['충치·신경치료·잇몸치료까지 꼼꼼히 진단하여', '치아를 오래 건강하게 지킬 수 있도록 돕습니다.'] },
  { name: '예방·관리', image: '/images/dental/program-prevent.png', desc: ['정기 검진과 스케일링, 올바른 관리 습관으로', '치아 질환을 미리 막을 수 있도록 돕습니다.'] },
]

/**
 * 치료 사례 — 분류별 다섯 건. 시안의 전후 사진은 한 쌍이라 모든 사례가 같은 사진을 쓰고,
 * 목록의 작은 사진과 제목·설명만 사례마다 다르다.
 */
const CASE_THUMBS = ['/images/dental/case-thumb-01.png', '/images/dental/case-thumb-02.png', '/images/dental/case-thumb-03.png', '/images/dental/case-thumb-04.png', '/images/dental/case-thumb-01.png']
const CASES: Record<string, { title: string; desc: string }[]> = {
  치아교정: [
    { title: '덧니·총생\n교정 치료 사례', desc: '겹쳐 난 치아를 가지런히 정돈해 씹는 기능과 미소의 균형을 함께 개선한 사례입니다.' },
    { title: '치아 사이 공간\n교정 치료 사례', desc: '벌어진 치아 사이를 자연스럽게 모아 깔끔한 치열을 만든 사례입니다.' },
    { title: '앞니 배열\n교정 치료 사례', desc: '고르지 못한 앞니의 위치와 배열을 정돈해 전체적인 치열의 균형을 개선한 사례입니다.' },
    { title: '돌출입\n교정 치료 사례', desc: '앞으로 나온 입매를 안쪽으로 정돈해 옆모습까지 편안해진 사례입니다.' },
    { title: '과개교합\n교정 치료 사례', desc: '깊게 덮이던 윗니의 맞물림을 바로잡아 턱 관절 부담을 줄인 사례입니다.' },
  ],
  임플란트: [
    { title: '앞니 단일\n임플란트 사례', desc: '빠진 앞니 한 개를 자연치아와 어울리는 임플란트로 회복한 사례입니다.' },
    { title: '어금니\n임플란트 사례', desc: '씹는 힘이 큰 어금니 자리를 단단한 임플란트로 채운 사례입니다.' },
    { title: '다수 치아\n임플란트 사례', desc: '여러 개의 빈자리를 계획적으로 회복해 씹는 기능을 되찾은 사례입니다.' },
    { title: '뼈이식 동반\n임플란트 사례', desc: '부족한 잇몸뼈를 보강한 뒤 안정적으로 식립한 사례입니다.' },
    { title: '틀니 대체\n임플란트 사례', desc: '불편한 틀니 대신 고정된 임플란트로 일상을 편하게 바꾼 사례입니다.' },
  ],
  심미치료: [
    { title: '라미네이트\n치료 사례', desc: '얇은 세라믹으로 치아의 모양과 색을 자연스럽게 다듬은 사례입니다.' },
    { title: '치아미백\n치료 사례', desc: '누렇게 변한 치아를 밝고 자연스러운 색으로 되돌린 사례입니다.' },
    { title: '앞니 레진\n치료 사례', desc: '깨지고 벌어진 앞니를 레진으로 간단히 보완한 사례입니다.' },
    { title: '잇몸 성형\n치료 사례', desc: '드러나는 잇몸 라인을 정돈해 웃는 모습을 개선한 사례입니다.' },
    { title: '올세라믹\n치료 사례', desc: '금속 없는 크라운으로 자연스러운 앞니를 만든 사례입니다.' },
  ],
}
const CASE_TABS = Object.keys(CASES)

/** 의료진 — 가운데 칸이 대표 자리다. 좌우 단추로 돌린다. */
const DOCTORS: { name: string; role?: string; image: string }[] = [
  { name: '최지원', role: '대표원장', image: '/images/dental/doctor-choi.png' },
  { name: '공예린', image: '/images/dental/doctor-gong.png' },
  { name: '도예준', image: '/images/dental/doctor-do.png' },
  { name: '김정원', image: '/images/dental/doctor-kim.png' },
  { name: '이백도', image: '/images/dental/doctor-lee.png' },
]

/** 병원 공간 — 가운데 큰 칸에 이름표가 붙는다. base 는 사진 아래에 깔리는 바탕 사진이다. */
const SPACES: { name: string; image: string; base?: string }[] = [
  { name: '병원내부', image: '/images/dental/space-reception.png' },
  { name: '대기실', image: '/images/dental/space-waiting.png', base: '/images/dental/space-consultation.png' },
  { name: '복도', image: '/images/dental/space-corridor.png' },
  { name: '진료실', image: '/images/dental/space-treatment.png' },
  { name: '개별 진료실', image: '/images/dental/space-treatment-2.png', base: '/images/dental/space-treatment-2-base.png' },
]

const mod = (n: number, m: number) => ((n % m) + m) % m

/** 영문 소제목 */
function Eyebrow({ children, className = '' }: { children: string; className?: string }) {
  return <p className={`font-['Roboto',sans-serif] text-[15px] leading-[1.6] tracking-[1.2px] text-[#111] ${className}`}>{children}</p>
}

/** 섹션 제목 — 굵은 한글 제목과 영문 소제목 */
function SectionTitle({ title, eyebrow, align = 'center' }: { title: string; eyebrow: string; align?: 'center' | 'left' }) {
  return (
    <div className={`flex flex-col gap-4 ${align === 'center' ? 'items-center text-center' : 'items-start'}`}>
      <h2 className="text-[28px] font-bold leading-[1.5] tracking-[-0.9px] text-[#111] sm:text-[36px]">{title}</h2>
      <Eyebrow>{eyebrow}</Eyebrow>
    </div>
  )
}

/** 밑줄이 미끄러지는 탭 */
function Tabs({ items, active, onChange, itemWidth }: { items: string[]; active: number; onChange: (i: number) => void; itemWidth?: number }) {
  return (
    <div className="relative w-full" role="tablist">
      <div className="flex">
        {items.map((t, i) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={i === active}
            onClick={() => onChange(i)}
            style={itemWidth ? { width: itemWidth } : undefined}
            className={`pb-4 text-base font-semibold leading-[1.5] tracking-[-0.5px] transition sm:text-[20px] ${itemWidth ? 'shrink-0' : 'flex-1'} ${
              i === active ? 'text-[#111]' : 'text-[#999] hover:text-[#545456]'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="h-[3px] rounded-full bg-[#d9d9d9]" />
      <div
        className="absolute bottom-0 left-0 h-[3px] rounded-full bg-[#1e3342] transition-transform duration-300"
        style={
          itemWidth
            ? { width: itemWidth, transform: `translateX(${active * itemWidth}px)` }
            : { width: `${100 / items.length}%`, transform: `translateX(${active * 100}%)` }
        }
      />
    </div>
  )
}

/** 원 안의 꺾쇠 단추 — 회청색 바탕 */
function RoundButton({ dir, onClick, size = 48 }: { dir: 'prev' | 'next'; onClick: () => void; size?: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dir === 'prev' ? '이전' : '다음'}
      style={{ width: size, height: size }}
      className="grid shrink-0 place-items-center rounded-full bg-[#627381] transition hover:bg-[#4f5f6c]"
    >
      <img src={dir === 'prev' ? asset('/images/dental/svg/chevron-left-white.svg') : asset('/images/dental/svg/chevron-right-white.svg')} alt="" width={24} height={24} />
    </button>
  )
}

/* ---------- 메인 비주얼 ---------- */

/** 관리자 [메인 비주얼]의 슬라이드를 읽는다. 제목 첫 줄은 보통 굵기, 둘째 줄부터 굵게. */
function Hero() {
  const { mainVisual } = useComponentSettings()
  const slides = mainVisual.slides.length ? mainVisual.slides : [DEFAULT_SLIDE]
  const [index, setIndex] = useState(0)
  const current = mod(index, slides.length)
  const go = (step: number) => setIndex((i) => mod(i + step, slides.length))

  useEffect(() => {
    if (!mainVisual.autoplay || slides.length < 2) return
    const timer = window.setInterval(() => setIndex((i) => i + 1), Math.max(mainVisual.interval, 3000))
    return () => window.clearInterval(timer)
  }, [mainVisual.autoplay, mainVisual.interval, slides.length, index])

  return (
    <section className="mx-auto w-full max-w-[1600px] px-5 sm:px-10 2xl:px-0">
      <div className="relative h-[520px] overflow-hidden rounded-[24px] bg-[#d9d9d9] sm:h-[600px]">
        {slides.map((s, i) => (
          <img
            key={`${s.image}-${i}`}
            src={componentImageUrl(s.image || DEFAULT_SLIDE.image)}
            alt=""
            className={`absolute inset-0 h-full w-full object-cover object-right transition-opacity duration-700 ${i === current ? 'opacity-100' : 'opacity-0'}`}
          />
        ))}
        {/* 글이 읽히도록 왼쪽을 하얗게 덮는다 */}
        <div className="absolute inset-y-[-4px] left-0 w-full bg-gradient-to-r from-white from-[62%] to-transparent to-[100%] lg:w-[1024px] lg:from-[37.6%] lg:to-[75.5%]" aria-hidden />

        <div className="relative flex h-full max-w-[436px] flex-col justify-between gap-10 p-8 sm:box-content sm:p-20 sm:pr-0 lg:justify-start lg:gap-[74px]">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4">
              <Eyebrow>A MORE COMFORTABLE DENTAL EXPERIENCE</Eyebrow>
              <span className="h-0.5 w-[50px] bg-[#111]" aria-hidden />
            </div>
            <div className="relative">
              {slides.map((s, i) => {
                const [first, ...rest] = s.title.split('\n')
                return (
                  <div
                    key={`${s.title}-${i}`}
                    aria-hidden={i !== current}
                    className={`flex flex-col gap-4 transition-opacity duration-700 ${i === current ? 'relative opacity-100' : 'pointer-events-none absolute inset-x-0 top-0 opacity-0'}`}
                  >
                    <h1 className="text-[34px] leading-[1.5] tracking-[-1.2px] text-[#111] sm:text-[48px]">
                      <span className="font-medium">{first}</span>
                      {rest.length > 0 && (
                        <>
                          <br />
                          <span className="font-bold">{rest.join('\n')}</span>
                        </>
                      )}
                    </h1>
                    <p className="whitespace-pre-line text-[17px] leading-[1.6] tracking-[-0.425px] text-[#464648]">{s.description}</p>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex items-center gap-[50px]">
            <div className="flex items-center gap-5 text-base leading-[1.6] tracking-[-0.4px]">
              {slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`${i + 1}번째 슬라이드`}
                  aria-current={i === current}
                  className={i === current ? 'font-semibold text-[#111]' : 'text-[#999] hover:text-[#545456]'}
                >
                  {String(i + 1).padStart(2, '0')}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => go(-1)} aria-label="이전 슬라이드" className="grid h-10 w-10 place-items-center rounded-full border border-[#ddd] transition hover:border-[#111]">
                <img src={asset('/images/dental/svg/hero-prev.svg')} alt="" width={30} height={30} />
              </button>
              <button type="button" onClick={() => go(1)} aria-label="다음 슬라이드" className="grid h-10 w-10 place-items-center rounded-full border border-[#111]">
                <img src={asset('/images/dental/svg/hero-next.svg')} alt="" width={30} height={30} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------- 진료 프로그램 ---------- */

/** 카드 안 — 빛 번지는 배경 위에 진료 그림 */
function ProgramCard({ image, active }: { image: string; active?: boolean }) {
  return (
    <>
      <img src={asset('/images/dental/program-bg.png')} alt="" className="absolute left-1/2 top-1/2 h-[108%] w-[135%] max-w-none -translate-x-1/2 -translate-y-1/2 object-cover" />
      <img
        src={asset(image)}
        alt=""
        className={`absolute left-1/2 top-1/2 max-w-none -translate-x-1/2 -translate-y-1/2 object-cover ${active ? 'mt-1 h-[88%] w-[73.5%]' : 'h-[95.6%] w-[79.9%]'}`}
      />
    </>
  )
}

function Programs() {
  const [index, setIndex] = useState(0)
  const n = PROGRAMS.length
  const cur = PROGRAMS[mod(index, n)]
  const prev = PROGRAMS[mod(index - 1, n)]
  const next = PROGRAMS[mod(index + 1, n)]

  return (
    <section className="flex flex-col items-center gap-12 overflow-hidden">
      <div className="flex w-full max-w-[758px] flex-col items-center gap-12 px-5 sm:gap-20">
        <SectionTitle title="진료 프로그램" eyebrow="DENTAL CARE DESIGNED AROUND YOUR NEEDS" />
        <Tabs items={PROGRAMS.map((p) => p.name)} active={mod(index, n)} onChange={setIndex} />
      </div>

      <div className="relative w-full">
        {/* 좌우로 반쯤 걸친 앞뒤 카드 — 넓은 화면에서만 */}
        <button
          type="button"
          onClick={() => setIndex((i) => i - 1)}
          aria-label={`${prev.name} 보기`}
          className="absolute right-[calc(50%+455px)] top-[43px] hidden h-[364px] w-[581px] overflow-hidden rounded-[20px] bg-[#f6f9fd] xl:block"
        >
          <ProgramCard image={prev.image} />
        </button>
        <button
          type="button"
          onClick={() => setIndex((i) => i + 1)}
          aria-label={`${next.name} 보기`}
          className="absolute left-[calc(50%+555px)] top-[43px] hidden h-[364px] w-[581px] overflow-hidden rounded-[20px] bg-[#ebf4fd] xl:block"
        >
          <ProgramCard image={next.image} />
        </button>

        <div className="relative mx-auto flex w-full max-w-[950px] flex-col items-center gap-7 px-5">
          <div className="flex w-full items-center gap-4 sm:gap-12">
            <RoundButton dir="prev" onClick={() => setIndex((i) => i - 1)} />
            <div key={cur.name} className="relative aspect-[718/450] flex-1 overflow-hidden rounded-[20px] bg-[#fcfdfc]">
              <ProgramCard image={cur.image} active />
            </div>
            <RoundButton dir="next" onClick={() => setIndex((i) => i + 1)} />
          </div>
          <div className="flex w-full max-w-[718px] flex-col gap-3 px-4 text-[#111] sm:flex-row sm:items-center sm:gap-10">
            <p className="whitespace-nowrap text-[24px] font-semibold leading-[1.5] tracking-[-0.7px] sm:text-[28px]">{cur.name}</p>
            <p className="flex-1 text-[17px] leading-[1.6] tracking-[-0.425px]">
              {cur.desc[0]}
              <br className="hidden sm:block" /> {cur.desc[1]}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------- 치료 전후 ---------- */

/** 가운데 손잡이를 끌어 전후를 비교한다. */
function Compare() {
  const box = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState(50)
  const dragging = useRef(false)

  const move = (clientX: number) => {
    const rect = box.current?.getBoundingClientRect()
    if (!rect) return
    setPos(Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100)))
  }
  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    dragging.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
    move(e.clientX)
  }

  return (
    <div
      ref={box}
      onPointerDown={onDown}
      onPointerMove={(e) => dragging.current && move(e.clientX)}
      onPointerUp={() => (dragging.current = false)}
      onPointerCancel={() => (dragging.current = false)}
      className="relative aspect-[1200/524] w-full cursor-ew-resize touch-pan-y select-none overflow-hidden rounded-[24px]"
    >
      {/* 치료 후 — 전체에 깔고, 손잡이 오른쪽만 어둡게 덮는다 */}
      <img src={asset('/images/dental/case-after.png')} alt="치료 후" draggable={false} className="absolute left-1/2 top-1/2 h-[120.8%] w-[120.8%] max-w-none -translate-x-1/2 -translate-y-1/2 object-cover" />
      <div className="absolute inset-y-0 right-0 bg-[rgba(13,13,13,0.4)]" style={{ left: `${pos}%` }} aria-hidden />
      <span className="absolute right-6 top-6 rounded-lg bg-[#1e3342] px-4 py-2 font-['Roboto',sans-serif] text-[15px] font-bold leading-[1.6] text-white">AFTER</span>

      {/* 치료 전 — 손잡이 왼쪽만 보인다 */}
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        <img src={asset('/images/dental/case-before.png')} alt="치료 전" draggable={false} className="absolute left-1/2 top-1/2 h-[123.5%] w-[123.5%] max-w-none -translate-x-1/2 -translate-y-1/2 object-cover" />
        <span className="absolute left-6 top-6 flex h-10 items-center rounded-lg bg-white/[0.24] px-4 font-['Roboto',sans-serif] text-[15px] font-bold leading-[1.6] text-white backdrop-blur-[4px]">
          Before
        </span>
      </div>

      <div
        role="slider"
        tabIndex={0}
        aria-label="치료 전후 비교"
        aria-valuenow={Math.round(pos)}
        aria-valuemin={0}
        aria-valuemax={100}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') setPos((p) => Math.max(0, p - 5))
          if (e.key === 'ArrowRight') setPos((p) => Math.min(100, p + 5))
        }}
        style={{ left: `${pos}%` }}
        className="absolute top-1/2 grid h-[52px] w-[52px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.18)] sm:h-[70px] sm:w-[70px]"
      >
        <img src={asset('/images/dental/svg/compare-handle.svg')} alt="" width={22} height={14} />
      </div>
    </div>
  )
}

function Cases() {
  const [tab, setTab] = useState(0)
  const [selected, setSelected] = useState(2)
  const list = CASES[CASE_TABS[tab]]
  const current = list[selected]

  return (
    <section className="mx-auto flex w-full max-w-[1600px] flex-col gap-12 px-5 sm:px-10 2xl:px-0">
      <div className="flex w-full max-w-[462px] flex-col gap-12">
        <SectionTitle title="치료의 변화, 결과로 보여드립니다" eyebrow="SEE THE DIFFERENCE" align="left" />
        <div className="w-full max-w-[429px] overflow-hidden">
          <Tabs
            items={CASE_TABS}
            active={tab}
            onChange={(i) => {
              setTab(i)
              setSelected(0)
            }}
            itemWidth={143}
          />
        </div>
      </div>

      <div className="flex flex-col gap-10 xl:flex-row xl:items-start xl:gap-20">
        <div className="flex w-full flex-col gap-7 xl:w-[1200px] xl:shrink-0">
          <Compare />
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-2">
            <div className="flex flex-1 flex-col gap-2">
              <h3 className="text-[24px] font-bold leading-[1.5] tracking-[-0.7px] text-[#111] sm:text-[28px]">{current.title.replace('\n', ' ')}</h3>
              <p className="text-[17px] leading-[1.6] tracking-[-0.425px] text-[#545456]">{current.desc}</p>
            </div>
            <Link to="/board" className="flex items-center gap-2.5 whitespace-nowrap text-[20px] font-medium leading-[1.5] tracking-[-0.5px] text-[#111] transition hover:opacity-70">
              더보기
              <img src={asset('/images/dental/svg/arrow-long.svg')} alt="" width={24} height={24} />
            </Link>
          </div>
        </div>

        {/* 사례 목록 — 넘치면 세로로 넘기고, 오른쪽 막대가 선택한 사례의 자리를 가리킨다 */}
        <div className="flex min-w-0 gap-8 xl:h-[629px]">
          <ul
            className="flex flex-1 gap-5 overflow-auto [scrollbar-width:none] xl:w-[280px] xl:flex-col [&::-webkit-scrollbar]:hidden"
          >
            {list.map((c, i) => (
              <li key={c.title} className="shrink-0">
                <button
                  type="button"
                  onClick={() => setSelected(i)}
                  aria-current={i === selected}
                  className={`flex items-center gap-5 text-left text-[#111] transition ${i === selected ? 'opacity-100' : 'opacity-30 hover:opacity-60'}`}
                >
                  <span className="relative h-[110px] w-[110px] shrink-0 overflow-hidden rounded-[10px] bg-[#d9d9d9]">
                    <img src={asset(CASE_THUMBS[i])} alt="" className="absolute left-1/2 top-1/2 h-[116%] w-[116%] max-w-none -translate-x-1/2 -translate-y-1/2 object-cover" loading="lazy" />
                  </span>
                  <span className="flex flex-col gap-1">
                    <span className="text-base font-bold leading-[1.6] tracking-[-0.4px]">{String(i + 1).padStart(2, '0')}</span>
                    <span className="whitespace-pre-line text-[17px] font-medium leading-[1.5] tracking-[-0.425px]">{c.title}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <div className="relative hidden w-2 shrink-0 rounded-full bg-[#dde3e8] xl:block" aria-hidden>
            {/* 선택한 사례의 자리를 가리킨다 — 사진 한 칸(110px) 높이 */}
            <div
              className="absolute inset-x-0 h-[110px] rounded-full bg-[#434a50] transition-[top] duration-300"
              style={{ top: `calc((100% - 110px) * ${selected / Math.max(1, list.length - 1)})` }}
            />
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------- 의료진 ---------- */

function DoctorCard({ doctor }: { doctor: (typeof DOCTORS)[number] }) {
  return (
    <div className="relative h-[424px] w-[362px] shrink-0 overflow-hidden rounded-[20px] border border-[#eee] bg-white">
      <p className="absolute left-[39px] top-[23px] flex items-end gap-2.5 leading-[1.5] text-[#111]">
        <span className="text-[28px] font-bold tracking-[-0.7px]">{doctor.name}</span>
        <span className="text-base font-medium tracking-[-0.4px]">원장</span>
      </p>
      <img src={asset(doctor.image)} alt={`${doctor.name} 원장`} className="absolute left-1/2 top-[91px] h-[331px] w-[298px] -translate-x-1/2 object-cover object-top" loading="lazy" />
    </div>
  )
}

function Doctors() {
  const [index, setIndex] = useState(0)
  const n = DOCTORS.length
  const at = (offset: number) => DOCTORS[mod(index + offset, n)]
  const lead = at(0)

  return (
    <section className="flex flex-col items-center gap-7 overflow-hidden">
      <div className="flex items-end justify-center gap-[64px]">
        <div className="hidden items-center gap-[30px] xl:flex">
          <DoctorCard doctor={at(-2)} />
          <DoctorCard doctor={at(-1)} />
        </div>

        <div className="flex flex-col items-center gap-12">
          <p className="flex items-end gap-5 text-[#111]">
            {lead.role && <span className="text-[15px] leading-[1.6] tracking-[1.2px]">{lead.role}</span>}
            <span className="flex items-end gap-2.5 leading-[1.5]">
              <span className="text-[36px] font-bold leading-[47px] tracking-[-0.9px]">{lead.name}</span>
              <span className="text-base font-medium tracking-[-0.4px]">원장</span>
            </span>
          </p>
          <div className="relative h-[524px] w-[min(448px,calc(100vw-40px))] overflow-hidden rounded-[20px] border border-[#eee] bg-white">
            <img key={lead.name} src={asset(lead.image)} alt={`${lead.name} 원장`} className="absolute left-1/2 top-[25px] h-[1023px] w-[682px] max-w-none -translate-x-1/2 object-cover" />
            {/* 예약 단추 — 대표 칸 오른쪽 위에 걸친다 */}
            <Link
              to="/contact"
              className="absolute right-3 top-3 flex h-[88px] w-[88px] flex-col items-center justify-center gap-[7px] rounded-full bg-[#1e3342] text-white transition hover:bg-[#2c4a5f]"
            >
              <img src={asset('/images/dental/svg/calendar.svg')} alt="" width={18} height={18} />
              <span className="text-[17px] font-bold leading-[1.5] tracking-[-0.425px]">예약하기</span>
            </Link>
          </div>
        </div>

        <div className="hidden items-center gap-[30px] xl:flex">
          <DoctorCard doctor={at(1)} />
          <DoctorCard doctor={at(2)} />
        </div>
      </div>

      <div className="flex gap-3">
        <RoundButton dir="prev" size={56} onClick={() => setIndex((i) => i - 1)} />
        <RoundButton dir="next" size={56} onClick={() => setIndex((i) => i + 1)} />
      </div>
    </section>
  )
}

/* ---------- 병원 소개 ---------- */

function SpacePhoto({ space }: { space: (typeof SPACES)[number] }) {
  return (
    <>
      {space.base && <img src={asset(space.base)} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />}
      <img src={asset(space.image)} alt={space.name} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
    </>
  )
}

function Spaces() {
  const [index, setIndex] = useState(0)
  const n = SPACES.length
  const at = (offset: number) => mod(index + offset, n)
  const side = (offset: number) => (
    <button
      key={offset}
      type="button"
      onClick={() => setIndex((i) => i + offset)}
      aria-label={`${SPACES[at(offset)].name} 크게 보기`}
      className="relative h-[416px] w-[306px] shrink-0 overflow-hidden rounded-[20px] bg-[#d9d9d9] transition hover:opacity-90"
    >
      <SpacePhoto space={SPACES[at(offset)]} />
    </button>
  )

  return (
    <section className="flex flex-col items-center gap-12 overflow-hidden sm:gap-20">
      <SectionTitle title="병원을 소개합니다" eyebrow="A SPACE DESIGNED FOR YOUR COMFORT" />
      <div className="flex w-full flex-col items-center gap-12">
        <div className="flex items-center justify-center gap-12">
          <div className="hidden items-center gap-12 xl:flex">
            {side(-2)}
            {side(-1)}
          </div>
          <div className="relative aspect-[740/462] w-[min(740px,calc(100vw-40px))] shrink-0 overflow-hidden rounded-[20px] bg-[#d9d9d9]">
            <SpacePhoto key={index} space={SPACES[at(0)]} />
            <span className="absolute left-5 top-5 rounded-lg bg-[#1e3342] px-4 py-2 text-[15px] font-bold leading-[1.6] text-white backdrop-blur-[4px]">
              {at(0) + 1}. {SPACES[at(0)].name}
            </span>
            {/* 좁은 화면에서는 좌우 칸 대신 단추로 넘긴다 */}
            <div className="absolute inset-x-3 bottom-3 flex justify-between xl:hidden">
              <RoundButton dir="prev" size={40} onClick={() => setIndex((i) => i - 1)} />
              <RoundButton dir="next" size={40} onClick={() => setIndex((i) => i + 1)} />
            </div>
          </div>
          <div className="hidden items-center gap-12 xl:flex">
            {side(1)}
            {side(2)}
          </div>
        </div>
        {/* 지금 칸의 위치 막대 */}
        <div className="relative h-1.5 w-[min(740px,calc(100vw-40px))] rounded-full bg-[#dde3e8]" aria-hidden>
          <div className="absolute inset-y-0 rounded-full bg-[#434a50] transition-[left] duration-300" style={{ width: `${100 / n}%`, left: `${(at(0) * 100) / n}%` }} />
        </div>
      </div>
    </section>
  )
}

/* ---------- 오시는 길 ---------- */

/** 업무시간 한 줄을 '이름 : 시간' 으로 나눈다 — 관리자 [사이트 설정]의 업무시간을 읽는다. */
function splitHours(line: string) {
  const colon = line.indexOf(' : ')
  if (colon > 0) return [line.slice(0, colon).trim(), line.slice(colon + 3).trim()]
  const space = line.search(/\s/)
  return space > 0 ? [line.slice(0, space), line.slice(space + 1).trim()] : [line, '']
}

function Location() {
  const company = useSiteSetting() ?? DEFAULT_COMPANY
  const query = encodeURIComponent(company.mapQuery || company.address)
  const hours = (company.hours || '').split('\n').map((l) => l.trim()).filter(Boolean)
  const maps = [
    {
      label: '네이버 길찾기',
      href: `https://map.naver.com/p/search/${query}`,
      icon: (
        <span className="relative block h-7 w-7 overflow-hidden bg-[#ff6e6e]">
          <img src={asset('/images/dental/map-naver.png')} alt="" className="absolute left-[-1px] top-[-1px] h-[30px] w-[30px] max-w-none object-cover" />
        </span>
      ),
    },
    {
      label: '구글 길찾기',
      href: `https://www.google.com/maps/search/?api=1&query=${query}`,
      icon: (
        <span className="grid h-7 w-7 place-items-center">
          <img src={asset('/images/dental/map-google.png')} alt="" className="h-[21px] w-5 object-cover" />
        </span>
      ),
    },
    {
      label: '카카오 길찾기',
      href: `https://map.kakao.com/?q=${query}`,
      icon: (
        <span className="grid h-7 w-7 place-items-center">
          <img src={asset('/images/dental/svg/map-kakao.svg')} alt="" width={24} height={24} />
        </span>
      ),
    },
  ]

  return (
    <section className="mx-auto flex w-full max-w-[1600px] flex-col gap-12 px-5 sm:px-10 lg:flex-row lg:items-center lg:gap-[120px] 2xl:px-0">
      <div className="relative aspect-[740/560] w-full overflow-hidden rounded-[24px] bg-[#d9d9d9] lg:w-[740px] lg:shrink-0">
        <img src={asset('/images/dental/location.png')} alt={`${company.companyName} 외관`} className="absolute left-[-8.32%] top-0 h-full w-[113.5%] max-w-none object-cover" loading="lazy" />
      </div>

      <div className="flex flex-col gap-12 lg:w-[525px]">
        <div className="flex flex-col gap-8">
          <SectionTitle title={`${company.companyName}로 오시는 길`} eyebrow={`YOUR WAY TO ${(company.companyNameEn || company.companyName).toUpperCase()}`} align="left" />
          <p className="text-[20px] font-medium leading-[1.5] tracking-[-0.5px] text-[#111]">{company.address}</p>
          <div className="flex flex-wrap gap-3">
            {maps.map((m) => (
              <a
                key={m.label}
                href={m.href}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 rounded-[10px] border border-[#eee] bg-white px-4 py-2 text-[17px] font-semibold leading-[1.5] tracking-[-0.425px] text-[#111] transition hover:border-[#1e3342]"
              >
                {m.icon}
                {m.label}
              </a>
            ))}
          </div>
        </div>

        {hours.length > 0 && (
          <div className="flex flex-col gap-4 leading-[1.5] text-[#111]">
            <h3 className="text-[24px] font-semibold tracking-[-0.6px]">진료시간</h3>
            {hours.map((line) => {
              const [label, value] = splitHours(line)
              return (
                <p key={line} className="flex gap-4 text-[17px]">
                  <span className="whitespace-pre font-medium tracking-[-0.425px]">{label} :</span>
                  <span>{value}</span>
                </p>
              )
            })}
          </div>
        )}

        {company.tel && (
          <p className="flex flex-wrap items-center gap-5 leading-[1.5]">
            <span className="text-[24px] font-medium tracking-[-0.6px] text-[#111]">상담문의</span>
            <a href={`tel:${company.tel}`} className="font-['Roboto',sans-serif] text-[38px] font-bold text-[#1e3342] sm:text-[46px]">
              {company.tel}
            </a>
          </p>
        )}
      </div>
    </section>
  )
}

export default function HomePage() {
  return (
    <div className="flex flex-col gap-24 overflow-x-clip bg-[#faf9f6] pb-24 pt-6 sm:gap-[120px] sm:pb-[100px] sm:pt-12">
      <Hero />
      <Programs />
      <Cases />
      <Doctors />
      <Spaces />
      <Location />
    </div>
  )
}
