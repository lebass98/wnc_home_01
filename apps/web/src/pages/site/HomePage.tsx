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

/**
 * 의료진 — 가운데 칸이 대표 자리다. 좌우 단추로 돌린다.
 * centerCrop 은 가운데 칸에서 사진을 자르는 방법 — 시안의 큰 사진(682×1023)은 최지원 원장 사진에 맞춘 값이라
 * 다른 원장님은 기본값(상반신이 보이게)을 쓴다.
 */
const DOCTOR_CENTER_CROP = 'top-[7%] h-[93%] w-[86%] object-top'
/** 옆 칸에서 사진을 자르는 방법 — 카드 아래쪽에 작게 */
const DOCTOR_SIDE_CROP = 'top-[21.5%] h-[78.2%] w-[82.3%] object-top'
const DOCTORS: { name: string; role?: string; image: string; centerCrop?: string }[] = [
  { name: '최지원', role: '대표원장', image: '/images/dental/doctor-choi.png', centerCrop: 'top-[4.8%] h-[195.2%] w-[152.2%] object-center' },
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
  const [cycle, setCycle] = useState(0)
  const duration = Math.max(mainVisual.interval, 3000)
  const current = mod(index, slides.length)
  const select = (next: number) => {
    setIndex(next)
    setCycle((value) => value + 1)
  }
  const go = (step: number) => select(mod(index + step, slides.length))

  useEffect(() => {
    if (!mainVisual.autoplay || slides.length < 2) return
    const timer = window.setInterval(() => setIndex((i) => i + 1), duration)
    return () => window.clearInterval(timer)
  }, [mainVisual.autoplay, duration, slides.length, index, cycle])

  return (
    <section className="mx-auto w-full max-w-[1600px] px-5 sm:px-10 2xl:px-0">
      <div className="relative h-[520px] overflow-hidden rounded-[24px] bg-[#d9d9d9] sm:h-[600px]">
        {slides.map((s, i) => (
          <img
            key={`${s.image}-${i}`}
            src={componentImageUrl(s.image || DEFAULT_SLIDE.image)}
            alt=""
            className={`absolute inset-0 h-full w-full object-cover object-right transition-opacity duration-[1200ms] ease-in-out motion-reduce:transition-none ${i === current ? 'opacity-100' : 'opacity-0'}`}
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
                    className={`dental-hero-copy flex flex-col gap-4 transition-opacity duration-700 ${i === current ? 'dental-hero-copy-active relative opacity-100' : 'pointer-events-none absolute inset-x-0 top-0 opacity-0'}`}
                  >
                    <h1 className="text-[34px] leading-[1.5] tracking-[-1.2px] text-[#111] sm:text-[48px]">
                      <span className="dental-hero-title-first inline-block font-medium">{first}</span>
                      {rest.length > 0 && (
                        <>
                          <br />
                          <span className="dental-hero-title-rest inline-block font-bold">{rest.join('\n')}</span>
                        </>
                      )}
                    </h1>
                    <p className="dental-hero-description whitespace-pre-line text-[17px] leading-[1.6] tracking-[-0.425px] text-[#464648]">{s.description}</p>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex items-center gap-[50px]">
            <div className="relative flex items-center gap-5 text-base leading-[1.6] tracking-[-0.4px]">
              {slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => select(i)}
                  aria-label={`${i + 1}번째 슬라이드`}
                  aria-current={i === current}
                  className={i === current ? 'font-semibold text-[#111]' : 'text-[#999] hover:text-[#545456]'}
                >
                  {String(i + 1).padStart(2, '0')}
                </button>
              ))}
              <div className="absolute inset-x-0 -bottom-3 h-[2px] overflow-hidden bg-black/15" aria-hidden>
                <span
                  key={`${index}-${cycle}-${duration}-${mainVisual.autoplay}`}
                  className={`block h-full origin-left bg-[#111] ${mainVisual.autoplay && slides.length > 1 ? 'dental-hero-progress' : ''}`}
                  style={{ animationDuration: `${duration}ms` }}
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => go(-1)} aria-label="이전 슬라이드" className="grid h-10 w-10 place-items-center rounded-full border border-[#111] transition hover:bg-black/5">
                <svg width="30" height="30" viewBox="0 0 30 30" fill="none" aria-hidden><path d="M17 9L12 15L17 21" stroke="#111" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              <button type="button" onClick={() => go(1)} aria-label="다음 슬라이드" className="grid h-10 w-10 place-items-center rounded-full border border-[#111] transition hover:bg-black/5">
                <svg width="30" height="30" viewBox="0 0 30 30" fill="none" aria-hidden><path d="M13 9L18 15L13 21" stroke="#111" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------- 진료 프로그램 ---------- */

/** 옆 카드 크기 — 시안의 옆 카드(581×364)는 가운데 카드(718×450)와 비율이 같아 확대·축소로 표현한다. */
const SIDE_SCALE = 581 / 718
/** 카드 중심 사이 거리 — 가운데 카드 폭의 배수 (시안: 중심에서 845.5px) */
const STEP = 845.5 / 718

/** 가운데 칸으로부터 몇 칸 떨어졌는지 — 다섯 장이 고리처럼 돌아 -2…2 로 맞춘다. */
const offsetOf = (i: number, index: number, n: number) => {
  const d = mod(i - index, n)
  return d > n / 2 ? d - n : d
}

/**
 * 진료 프로그램 — 다섯 장을 한 줄에 깔고 실제로 옆으로 미끄러진다.
 * 가운데로 오는 카드는 커지고 밀려나는 카드는 작아지며, 안의 그림 비율과 바탕색도 함께 바뀐다.
 * 카드 폭은 --w 로 정하고 위치·크기는 모두 그 배수로 계산한다 (좁은 화면에서도 같은 움직임).
 */
function Programs() {
  const [index, setIndex] = useState(0)
  const n = PROGRAMS.length
  const active = mod(index, n)
  // 고리 반대편으로 넘어가는 카드는 화면을 가로지르지 않게 그 순간만 애니메이션을 끈다.
  const { offsets, jumps } = useRing(n, index)

  /** 탭은 가까운 쪽으로 돌린다 — 0 → 4 는 한 칸 뒤로 */
  const goTo = (target: number) => setIndex((i) => i + offsetOf(target, mod(i, n), n))

  return (
    <section className="flex flex-col items-center gap-12 overflow-hidden">
      <div className="flex w-full max-w-[758px] flex-col items-center gap-12 px-5 sm:gap-20">
        <SectionTitle title="진료 프로그램" eyebrow="DENTAL CARE DESIGNED AROUND YOUR NEEDS" />
        <Tabs items={PROGRAMS.map((p) => p.name)} active={active} onChange={goTo} />
      </div>

      <div className="relative w-full [--w:calc(100vw-168px)] sm:[--w:min(718px,calc(100vw-272px))]">
        {/* 카드 줄 — 모든 카드가 가운데 칸 크기로 겹쳐 있고 위치·크기만 바뀐다 */}
        <div className="relative mx-auto aspect-[718/450] w-[var(--w)]">
          {PROGRAMS.map((p, i) => {
            const d = offsets[i]
            const center = d === 0
            const far = Math.abs(d) > 1
            return (
              <button
                key={p.name}
                type="button"
                tabIndex={Math.abs(d) === 1 ? 0 : -1}
                aria-hidden={!center && far}
                aria-label={center ? p.name : `${p.name} 보기`}
                onClick={() => !center && setIndex((x) => x + d)}
                style={{
                  transform: `translateX(calc(var(--w) * ${STEP * d})) scale(${center ? 1 : SIDE_SCALE})`,
                  zIndex: center ? 2 : 1,
                }}
                className={`absolute inset-0 overflow-hidden rounded-[20px] ${center ? 'cursor-default bg-[#fcfdfc]' : 'cursor-pointer bg-[#ebf4fd]'} ${
                  far ? 'pointer-events-none opacity-0' : 'opacity-100'
                } ${jumps[i] ? '' : `transition-[transform,opacity,background-color] ${SLIDE_EASE}`}`}
              >
                <img
                  src={asset('/images/dental/program-bg.png')}
                  alt=""
                  className="absolute left-1/2 top-1/2 h-[108%] w-[135%] max-w-none -translate-x-1/2 -translate-y-1/2 object-cover"
                />
                {/* 그림도 칸 안에서의 비율이 시안대로 바뀐다 — 가운데 528×396, 옆 464×348 */}
                <img
                  src={asset(p.image)}
                  alt=""
                  className={`absolute left-1/2 top-1/2 max-w-none -translate-x-1/2 -translate-y-1/2 object-cover ${
                    jumps[i] ? '' : `transition-[width,height,margin] ${SLIDE_EASE}`
                  } ${center ? 'mt-1 h-[88%] w-[73.5%]' : 'mt-0 h-[95.6%] w-[79.9%]'}`}
                />
              </button>
            )
          })}
        </div>

        {/* 좌우 단추 — 가운데 카드 양옆 48px */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex aspect-auto justify-center">
          <div className="flex items-center gap-4 sm:gap-12" style={{ height: 'calc(var(--w) * 450 / 718)' }}>
            <span className="pointer-events-auto">
              <RoundButton dir="prev" onClick={() => setIndex((i) => i - 1)} />
            </span>
            <span className="w-[var(--w)]" aria-hidden />
            <span className="pointer-events-auto">
              <RoundButton dir="next" onClick={() => setIndex((i) => i + 1)} />
            </span>
          </div>
        </div>

        {/* 설명 — 바뀔 때 살짝 떠오르며 바뀐다 */}
        <div className="relative mx-auto mt-7 w-full max-w-[718px] px-5 sm:px-4">
          {PROGRAMS.map((p, i) => (
            <div
              key={p.name}
              aria-hidden={i !== active}
              className={`flex flex-col gap-3 text-[#111] transition-[opacity,transform] duration-500 sm:flex-row sm:items-center sm:gap-10 ${
                i === active ? 'relative translate-y-0 opacity-100 delay-200' : 'pointer-events-none absolute inset-x-5 top-0 translate-y-2 opacity-0 sm:inset-x-4'
              }`}
            >
              <p className="whitespace-nowrap text-[24px] font-semibold leading-[1.5] tracking-[-0.7px] sm:text-[28px]">{p.name}</p>
              <p className="flex-1 text-[17px] leading-[1.6] tracking-[-0.425px]">
                {p.desc[0]}
                <br className="hidden sm:block" /> {p.desc[1]}
              </p>
            </div>
          ))}
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

/* ---------- 미끄러지는 카드 줄 공통 ---------- */

/** 카드 움직임 — 진료 프로그램·의료진·병원 소개가 같은 속도와 곡선으로 움직인다. */
const SLIDE_EASE = 'duration-700 ease-[cubic-bezier(0.65,0,0.35,1)]'

/**
 * 고리처럼 도는 카드 줄의 칸 위치 — 각 카드가 가운데에서 몇 칸 떨어졌는지와,
 * 고리 반대편으로 넘어가 애니메이션을 꺼야 하는 카드(jumps)를 돌려준다.
 */
function useRing(count: number, index: number) {
  const offsets = Array.from({ length: count }, (_, i) => offsetOf(i, index, count))
  const prev = useRef({ index, offsets })
  // 줄 전체가 index 변화만큼 밀리는데, 그만큼이 아니라 반대편으로 넘어간 카드만 애니메이션 없이 옮긴다.
  const step = index - prev.current.index
  const jumps = offsets.map((d, i) => d !== prev.current.offsets[i] - step)
  useEffect(() => {
    prev.current = { index, offsets }
  })
  return { offsets, jumps }
}

/* ---------- 의료진 ---------- */

/**
 * 의료진 줄 — 다섯 분을 두 번 이어 붙여 고리를 만든다.
 * 화면 밖(±3칸 이상)에서 고리를 넘기 때문에 카드가 화면을 가로질러 튀지 않는다.
 */
const DOCTOR_RING = [...DOCTORS, ...DOCTORS]
/** 가운데 카드(448×524) 대비 옆 카드(362×424) 크기 */
const DOCTOR_SIDE_SCALE = 362 / 448
/** 가운데에서 떨어진 칸별 카드 중심 위치 — 가운데 카드 폭의 배수 (시안: 469px, 861px) */
const DOCTOR_X = [0, 469 / 448, 861 / 448, 1253 / 448]

function Doctors() {
  const [index, setIndex] = useState(0)
  const n = DOCTOR_RING.length
  const { offsets, jumps } = useRing(n, index)
  const lead = mod(index, DOCTORS.length)

  return (
    <section className="flex flex-col items-center gap-7 overflow-hidden [--w:min(448px,calc(100vw-40px))]">
      <div className="flex w-full flex-col items-center gap-12">
        {/* 대표 칸 위의 이름 — 바뀔 때 살짝 떠오른다 */}
        <div className="relative h-[47px] w-full">
          {DOCTORS.map((doc, i) => (
            <p
              key={doc.name}
              aria-hidden={i !== lead}
              className={`absolute inset-x-0 top-0 flex items-end justify-center gap-5 text-[#111] transition-[opacity,transform] duration-500 ${
                i === lead ? 'translate-y-0 opacity-100 delay-200' : 'translate-y-2 opacity-0'
              }`}
            >
              {doc.role && <span className="text-[15px] leading-[1.6] tracking-[1.2px]">{doc.role}</span>}
              <span className="flex items-end gap-2.5 leading-[1.5]">
                <span className="text-[36px] font-bold leading-[47px] tracking-[-0.9px]">{doc.name}</span>
                <span className="text-base font-medium tracking-[-0.4px]">원장</span>
              </span>
            </p>
          ))}
        </div>

        {/* 카드 줄 — 모든 카드가 대표 칸 크기로 겹쳐 있고, 아래를 기준으로 줄었다 커진다 */}
        <div className="relative aspect-[448/524] w-[var(--w)]">
          {DOCTOR_RING.map((doc, i) => {
            const d = offsets[i]
            const center = d === 0
            const hidden = Math.abs(d) > 2
            const x = Math.sign(d) * DOCTOR_X[Math.min(Math.abs(d), 3)]
            return (
              <div
                key={`${doc.name}-${i}`}
                aria-hidden={!center}
                style={{
                  transform: `translateX(calc(var(--w) * ${x})) scale(${center ? 1 : DOCTOR_SIDE_SCALE})`,
                  zIndex: center ? 2 : 1,
                }}
                className={`absolute inset-0 origin-bottom overflow-hidden rounded-[20px] border border-[#eee] bg-white [container-type:inline-size] ${
                  hidden ? 'pointer-events-none opacity-0' : 'opacity-100'
                } ${jumps[i] ? '' : `transition-[transform,opacity] ${SLIDE_EASE}`}`}
              >
                {/*
                  사진은 한 장 — 옆 칸 크롭(아래쪽에 작게)에서 대표 칸 크롭(상반신 크게)으로
                  위치·크기·초점이 함께 움직여 실제로 확대되듯 바뀐다.
                */}
                <img
                  src={asset(doc.image)}
                  alt={center ? `${doc.name} 원장` : ''}
                  className={`absolute left-1/2 max-w-none -translate-x-1/2 object-cover ${center ? doc.centerCrop ?? DOCTOR_CENTER_CROP : DOCTOR_SIDE_CROP} ${
                    jumps[i] ? '' : `transition-[top,width,height,object-position] ${SLIDE_EASE}`
                  }`}
                  loading="lazy"
                />
                {/* 옆 칸 이름 — 카드 안 왼쪽 위. 대표 칸이 되면 위의 큰 이름이 대신한다. */}
                <p
                  className={`absolute left-[10.7%] top-[5.4%] flex items-end gap-[2.76cqw] leading-[1.5] text-[#111] transition-opacity duration-500 ${
                    center ? 'opacity-0' : 'opacity-100 delay-200'
                  }`}
                >
                  <span className="text-[7.74cqw] font-bold tracking-[-0.7px]">{doc.name}</span>
                  <span className="text-[4.42cqw] font-medium tracking-[-0.4px]">원장</span>
                </p>
                {/* 옆 칸을 누르면 그 원장님이 가운데로 온다 */}
                {!center && !hidden && (
                  <button type="button" onClick={() => setIndex((x) => x + d)} aria-label={`${doc.name} 원장 보기`} className="absolute inset-0" />
                )}
              </div>
            )
          })}
          {/* 예약 단추 — 대표 칸 오른쪽 위에 걸친다. 카드가 바뀌어도 자리를 지킨다. */}
          <Link
            to="/contact"
            className="absolute right-3 top-3 z-10 flex h-[88px] w-[88px] flex-col items-center justify-center gap-[7px] rounded-full bg-[#1e3342] text-white transition hover:bg-[#2c4a5f]"
          >
            <img src={asset('/images/dental/svg/calendar.svg')} alt="" width={18} height={18} />
            <span className="text-[17px] font-bold leading-[1.5] tracking-[-0.425px]">예약하기</span>
          </Link>
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

const SPACE_RING = [...SPACES, ...SPACES]
/**
 * 칸별 크기·위치 — 가운데 칸 폭(--w, 시안 740px)의 배수.
 * 가운데 740×462, 옆 306×416. 비율이 달라 폭·높이를 각각 바꾸고 사진은 채워 자른다.
 */
const SPACE_CENTER = { w: 1, h: 462 / 740 }
const SPACE_SIDE = { w: 306 / 740, h: 416 / 740 }
/** 가운데에서 떨어진 칸별 카드 중심 위치 (시안: 571px, 925px) */
const SPACE_X = [0, 571 / 740, 925 / 740, 1279 / 740]
/** 자동으로 다음 칸으로 넘어가는 간격 */
const SPACE_AUTOPLAY_MS = 4000

function Spaces() {
  const [index, setIndex] = useState(0)
  const n = SPACE_RING.length
  const { offsets, jumps } = useRing(n, index)
  const current = mod(index, SPACES.length)
  // 마우스를 올려 두거나 키보드로 들어와 있는 동안에는 멈춘다.
  const [hovering, setHovering] = useState(false)
  const [focused, setFocused] = useState(false)
  const paused = hovering || focused

  // 4초마다 다음 칸으로 — 직접 넘기면 index 가 바뀌어 4초를 처음부터 다시 센다.
  useEffect(() => {
    if (paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timer = window.setTimeout(() => setIndex((i) => i + 1), SPACE_AUTOPLAY_MS)
    return () => window.clearTimeout(timer)
  }, [index, paused])

  return (
    <section className="flex flex-col items-center gap-12 overflow-hidden [--w:min(740px,calc(100vw-40px))] sm:gap-20">
      <SectionTitle title="병원을 소개합니다" eyebrow="A SPACE DESIGNED FOR YOUR COMFORT" />
      <div className="flex w-full flex-col items-center gap-12">
        <div
          className="relative w-full"
          style={{ height: `calc(var(--w) * ${SPACE_CENTER.h})` }}
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
          // 마우스로 누른 단추에 남는 포커스로는 멈추지 않는다 — 키보드로 들어왔을 때만.
          onFocus={(e) => e.target.matches(':focus-visible') && setFocused(true)}
          onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setFocused(false)}
        >
          {SPACE_RING.map((space, i) => {
            const d = offsets[i]
            const center = d === 0
            const hidden = Math.abs(d) > 2
            const size = center ? SPACE_CENTER : SPACE_SIDE
            const x = Math.sign(d) * SPACE_X[Math.min(Math.abs(d), 3)]
            return (
              <button
                key={`${space.name}-${i}`}
                type="button"
                tabIndex={center || hidden ? -1 : 0}
                aria-hidden={hidden}
                aria-label={center ? space.name : `${space.name} 크게 보기`}
                onClick={() => !center && setIndex((v) => v + d)}
                style={{
                  left: `calc(50% + var(--w) * ${x - size.w / 2})`,
                  top: `calc(var(--w) * ${(SPACE_CENTER.h - size.h) / 2})`,
                  width: `calc(var(--w) * ${size.w})`,
                  height: `calc(var(--w) * ${size.h})`,
                  zIndex: center ? 2 : 1,
                }}
                className={`absolute overflow-hidden rounded-[20px] bg-[#d9d9d9] ${center ? 'cursor-default' : 'cursor-pointer hover:opacity-90'} ${
                  hidden ? 'pointer-events-none opacity-0' : 'opacity-100'
                } ${jumps[i] ? '' : `transition-[left,top,width,height,opacity] ${SLIDE_EASE}`}`}
              >
                <SpacePhoto space={space} />
                <span
                  className={`absolute left-5 top-5 rounded-lg bg-[#1e3342] px-4 py-2 text-[15px] font-bold leading-[1.6] text-white backdrop-blur-[4px] transition-opacity duration-500 ${
                    center ? 'opacity-100 delay-300' : 'opacity-0'
                  }`}
                >
                  {mod(i, SPACES.length) + 1}. {space.name}
                </span>
              </button>
            )
          })}
          {/* 좁은 화면에서는 옆 칸이 작게 걸쳐 보여 단추로도 넘긴다 */}
          <div className="pointer-events-none absolute inset-0 z-10 mx-auto flex w-[var(--w)] items-end justify-between p-3 xl:hidden">
            <span className="pointer-events-auto">
              <RoundButton dir="prev" size={40} onClick={() => setIndex((i) => i - 1)} />
            </span>
            <span className="pointer-events-auto">
              <RoundButton dir="next" size={40} onClick={() => setIndex((i) => i + 1)} />
            </span>
          </div>
        </div>
        {/* 지금 칸의 위치 막대 */}
        <div className="relative h-1.5 w-[var(--w)] rounded-full bg-[#dde3e8]" aria-hidden>
          <div
            className={`absolute inset-y-0 rounded-full bg-[#434a50] transition-[left] ${SLIDE_EASE}`}
            style={{ width: `${100 / SPACES.length}%`, left: `${(current * 100) / SPACES.length}%` }}
          />
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
