import { componentImageUrl, useComponentSettings } from '../../lib/componentSettings'
import { useEffect, useRef, useState, type FormEvent, type PointerEvent } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import Reveal from '../../components/Reveal'

const asset = (path: string) => {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

/** 메인 비주얼을 관리자에서 비워 두었을 때 쓰는 기본 모습 */
const DEFAULT_HERO = { title: '워드앤코드 인테리어', image: '/images/interior/hero-main.png' }

/** 숫자로 보는 워드앤코드 */
const STATS = [
  { title: '다양한 분야의 프로젝트 수행 경험', value: '178' },
  { title: '축적된 설계 및 시공 노하우', value: '26' },
  { title: '고객 만족 중심의 프로젝트 관리', value: '93' },
]

/** 진행 과정 — 제목이 사진 위에 오는 칸과 아래에 오는 칸이 번갈아 선다. */
const PROCESS = [
  {
    title: '상담·실측',
    titleFirst: true,
    image: asset('/images/interior/main/process-01.png'),
    desc: ['좋은 공간은 취향을 묻는 대화에서 시작됩니다. 워드앤코드는 눈에 보이는 치수뿐 아니라', '가족의 생활 방식과 공간 속 불편까지 세심하게 읽어냅니다.'],
  },
  {
    title: '설계·견적',
    titleFirst: false,
    image: asset('/images/interior/main/process-02.png'),
    desc: ['보기 좋은 공간이 실제 생활에도 편안하도록 동선과 디자인, 자재와 예산을 균형 있게 조율합니다.', '막연했던 바람을 오래 머물고 싶은 공간의 설계로 구체화합니다.'],
  },
  {
    title: '시공·품질관리',
    titleFirst: true,
    image: asset('/images/interior/main/process-03.png'),
    desc: ['좋은 디자인의 완성은 보이지 않는 디테일에서 결정됩니다.', '도면의 의도가 현장에서 흐트러지지 않도록 공정마다 꼼꼼히 확인하며 완성도를 높입니다.'],
  },
  {
    title: '준공·사후관리',
    titleFirst: false,
    image: asset('/images/interior/main/process-04.png'),
    rounded: 'rounded-[40px]',
    desc: ['공사가 끝나는 순간은 새로운 일상이 시작되는 순간입니다. 완성된 공간을 함께 살피고,', '오래 편안하게 사용할 수 있도록 그 이후까지 세심하게 이어갑니다.'],
  },
]

/** 인테리어 스타일 — 넓은 화면에서는 칸마다 높이를 어긋나게 둔다. */
const STYLES = [
  { label: 'Warm Comfort', image: asset('/images/interior/main/style-01.png'), offset: 'xl:mt-[90px]' },
  { label: 'modern', image: asset('/images/interior/main/style-02.png'), offset: '', dim: true },
  { label: 'minimalist wood', image: asset('/images/interior/main/style-03.png'), offset: 'xl:mt-[279px]' },
  { label: 'smart practical', image: asset('/images/interior/main/style-04.png'), offset: '' },
]

/**
 * 포트폴리오 — 사진은 시안의 잘라 낸 영역을 그대로 따른다.
 * base 는 사진 뒤에 깔리는 바탕 사진(사진이 칸을 다 채우지 못할 때 드러나는 부분)이다.
 */
const PORTFOLIO = [
  {
    title: '도시의 풍경, 집 안의 여유',
    year: '2026',
    desc: '창 너머 도시의 풍경은 열어두고, 집 안에는 차분한 온기를 더한 모던 주거공간입니다. 아이보리 패브릭과 우드 마감, 부드러운 곡선의 가구가 어우러져 세련되면서도 편안한 분위기를 만듭니다. 바쁜 하루를 지나 돌아왔을 때, 자연스럽게 긴장이 풀리는 거실을 제안합니다.',
    location: '서울특별시 영등포구',
    size: '45py',
    keyword: 'Warm modern',
    image: asset('/images/interior/main/portfolio-01.png'),
    imageClass: 'h-[86.29%] left-[-16.86%] top-0 w-[118.77%]',
    base: false,
  },
  {
    title: '한강을 바라보는 느긋한 일상',
    year: '2026',
    desc: '한강의 풍경과 오후의 햇살이 일상의 배경이 되는 공간입니다. 낮은 가구와 절제된 소품으로 시야를 열고, 우드와 자연석의 풍부한 질감으로 편안함을 더했습니다. 풍경을 감상하는 순간부터 가족이 함께 머무는 시간까지, 집에서 보내는 하루에 여유를 담았습니다.',
    location: '서울특별시 용산구',
    size: '33py',
    keyword: 'Natural comfort',
    image: asset('/images/interior/main/portfolio-02.png'),
    imageClass: 'h-[152.93%] left-0 top-[-47.89%] w-full',
    base: true,
  },
  {
    title: '아이의 오늘과 내일을 함께 만들어 갈 곳',
    year: '2025',
    desc: '편안히 쉬고, 호기심을 펼치며, 스스로 정리하는 일상까지 생각한 아이방입니다. 침대와 책상, 수납을 각자의 쓰임에 맞게 배치하고 차분한 우드와 은은한 색감으로 안정감을 더했습니다. 과한 장식 대신 생활에 필요한 요소를 담아, 아이가 자라면서도 편안하게 사용할 수 있는 공간을 제안합니다.',
    location: '경기도 광명시',
    size: '24py',
    keyword: 'Kids minimal',
    image: asset('/images/interior/main/portfolio-03.png'),
    imageClass: 'h-[81.67%] left-[-6.21%] top-[-2.71%] w-[112.42%]',
    base: true,
  },
]

const SERVICE_TYPES = ['주거 공간', '상업 공간']

/** 줄바꿈 — 넓은 화면에서만 시안대로 끊고, 좁은 화면에서는 자연스럽게 흐르게 둔다. */
function Lines({ lines }: { lines: string[] }) {
  return (
    <>
      {lines.map((line) => (
        <span key={line} className="xl:block">
          {line}{' '}
        </span>
      ))}
    </>
  )
}

/* ---------- 메인 비주얼 ---------- */

/** 둥근 큰 사진 위에 로고와 제목. 관리자 [메인 비주얼]의 슬라이드가 둘 이상이면 천천히 바뀐다. */
function Hero() {
  const { mainVisual, header } = useComponentSettings()
  const section = useRef<HTMLElement>(null)
  const progress = useRef(0)
  const slides = mainVisual.slides.length
    ? mainVisual.slides.map((s) => ({ title: s.title, image: componentImageUrl(s.image || DEFAULT_HERO.image) }))
    : [{ title: DEFAULT_HERO.title, image: asset(DEFAULT_HERO.image) }]
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const element = section.current
    if (!element) return
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let frame = 0
    let previousTime = 0
    let rendered = 0
    let target = 0
    let sectionTop = 0
    let distance = 1
    let width = 0
    let height = 0
    const clamp = (value: number) => Math.max(0, Math.min(1, value))
    const render = (raw: number) => {
      const eased = raw * raw * (3 - 2 * raw)
      const padding = width < 640 ? 12 : width < 1280 ? 24 : 40
      const targetWidth = Math.min(852, width * (width < 768 ? 0.9 : 0.59))
      const targetHeight = Math.min(407, targetWidth * 407 / 852, height * 0.65)
      element.style.setProperty('--visual-width', `${width - 2 * padding + (targetWidth - width + 2 * padding) * eased}px`)
      element.style.setProperty('--visual-height', `${height - 2 * padding + (targetHeight - height + 2 * padding) * eased}px`)
      element.style.setProperty('--visual-radius', `${28 - 12 * eased}px`)
      element.style.setProperty('--color-opacity', String(clamp((raw - 0.08) / 0.7)))
      element.style.setProperty('--hero-opacity', String(1 - clamp(raw / 0.35)))
      element.style.setProperty('--slogan-opacity', String(clamp((raw - 0.5) / 0.35)))
      const gathering = clamp((raw - 0.45) / 0.55)
      const gathered = gathering * gathering * (3 - 2 * gathering)
      element.style.setProperty('--slogan-shift', `${(1 - gathered) * (width < 768 ? 32 : 60)}px`)
      element.style.setProperty('--slogan-image-width', `${targetWidth}px`)
      element.style.setProperty('--slogan-image-height', `${targetHeight}px`)
    }
    const animate = (time: number) => {
      frame = 0
      // 시간 기준 보간: 60/120Hz 모두 같은 속도로 부드럽게 따라간다.
      const elapsed = previousTime ? Math.min(time - previousTime, 64) : 1000 / 60
      previousTime = time
      rendered += (target - rendered) * (1 - Math.exp(-elapsed / 110))
      const settled = Math.abs(target - rendered) < 0.0001
      if (settled) rendered = target
      render(rendered)
      if (!settled) frame = window.requestAnimationFrame(animate)
      else previousTime = 0
    }
    const schedule = () => {
      // 마지막 20%는 완성된 컬러 화면을 유지한다.
      target = motion.matches ? 1 : clamp((window.scrollY - sectionTop) / distance)
      progress.current = target
      if (motion.matches) {
        window.cancelAnimationFrame(frame)
        frame = 0
        previousTime = 0
        rendered = target
        render(rendered)
      } else if (!frame) frame = window.requestAnimationFrame(animate)
    }
    const measure = () => {
      // 레이아웃 측정은 크기가 변할 때만 하고 애니메이션 프레임에서는 쓰기만 한다.
      const rect = element.getBoundingClientRect()
      height = (element.firstElementChild as HTMLElement).clientHeight
      width = element.clientWidth
      sectionTop = rect.top + window.scrollY
      distance = Math.max(1, (rect.height - height) / 1.2)
      schedule()
      render(rendered)
    }
    measure()
    rendered = target
    render(rendered)
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', measure)
    motion.addEventListener('change', measure)
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', measure)
      motion.removeEventListener('change', measure)
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    if (!mainVisual.autoplay || slides.length < 2) return
    const timer = window.setInterval(() => {
      if (progress.current < 0.01 && !document.hidden) setIndex((i) => (i + 1) % slides.length)
    }, Math.max(mainVisual.interval, 2000))
    return () => window.clearInterval(timer)
  }, [mainVisual.autoplay, mainVisual.interval, slides.length])

  const current = index % slides.length
  const logo = header.logoImage ? componentImageUrl(header.logoImage) : asset('/images/interior/main/logo.png')

  return (
    <section ref={section} className="interior-scroll-hero" aria-label="상상 속 공간을 실제로 구현하는 워드앤코드">
      <div className="interior-scroll-stage">
        <div className="interior-scroll-visual">
          {slides.map((slide, i) => (
            <img
              key={`${slide.image}-${i}`}
              src={slide.image}
              alt=""
              fetchPriority={i === 0 ? 'high' : 'auto'}
              className={`absolute inset-0 h-full w-full object-cover object-[36%_50%] transition-opacity duration-1000 ${i === current ? 'opacity-100' : 'opacity-0'}`}
            />
          ))}
          <img src={asset('/images/interior/main/slogan.png')} alt="햇살과 우드 톤이 어우러진 완성된 거실" className="interior-scroll-color" />
          <div className="interior-scroll-heading">
            <img src={logo} alt="워드앤코드" className="absolute bottom-3 left-0 h-auto w-40 object-cover gnb:bottom-auto gnb:top-0 gnb:h-[110px] gnb:w-[328px]" />
            <div className="absolute inset-0 flex items-center justify-center pb-[50px]">
              {slides.map((slide, i) => (
                <h1 key={`${slide.title}-${i}`} aria-hidden={i !== current} className={`font-serif-kr absolute whitespace-pre-line px-6 text-center text-[26px] text-[#171614] transition-opacity duration-1000 sm:text-[36px] ${i === current ? 'opacity-100' : 'opacity-0'}`}>
                  {slide.title}
                </h1>
              ))}
            </div>
          </div>
        </div>
        <h2 className="interior-scroll-slogan font-serif-kr">
          <span className="interior-scroll-slogan-first">상상 속 공간을</span>
          <span className="interior-scroll-slogan-last">실제로 구현하는</span>
        </h2>
      </div>
    </section>
  )
}

/* ---------- 숫자 ---------- */

function Stats() {
  return (
    <section className="px-5 pb-24 sm:px-10 xl:px-20 xl:pb-40">
      <ul className="mx-auto grid max-w-[1760px] gap-6 md:grid-cols-3 xl:gap-[60px]">
        {STATS.map((s, i) => (
          <Reveal as="li" key={s.title} index={i} className="flex flex-col rounded-2xl bg-white p-8 xl:h-[348px] xl:p-10">
            <h3 className="flex items-center gap-[15px] text-lg font-bold leading-normal tracking-[-0.55px] text-[#534639] xl:text-[22px]">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#534639]" aria-hidden />
              {s.title}
            </h3>
            <p className="flex items-center justify-center pb-[30px] pl-4 pt-10 font-normal leading-none text-[#7a6759]">
              <span className="text-[88px] xl:text-[120px]">{s.value}</span>
              <span className="text-[44px] xl:text-[60px]">+</span>
            </p>
            <p className="font-serif-kr text-[22px] font-extralight leading-normal text-[#7a6759]">{String(i + 1).padStart(2, '0')}</p>
          </Reveal>
        ))}
      </ul>
    </section>
  )
}

/* ---------- 진행 과정 ---------- */

/** 가로로 흐르는 진행 과정 — 휠·터치는 기본 스크롤, 마우스는 끌어서 넘긴다. */
function Process() {
  const track = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null)

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' || !track.current) return
    drag.current = { x: e.clientX, left: track.current.scrollLeft, moved: false }
  }
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag.current || !track.current) return
    const dx = e.clientX - drag.current.x
    if (Math.abs(dx) > 3) drag.current.moved = true
    track.current.scrollLeft = drag.current.left - dx
  }
  const onUp = () => {
    drag.current = null
  }

  return (
    <section className="bg-[#241d12] py-20 xl:py-[100px]">
      <div
        ref={track}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
        className="flex cursor-grab select-none items-start gap-10 overflow-x-auto px-5 [scrollbar-width:none] active:cursor-grabbing sm:px-10 xl:gap-[100px] xl:px-[168px] [&::-webkit-scrollbar]:hidden"
      >
        {PROCESS.map((p) => {
          const title = (
            <h3 className="font-serif-kr pt-5 text-2xl font-normal text-white xl:text-[32px]">{p.title}</h3>
          )
          return (
            <div key={p.title} className="flex w-[80vw] min-w-[260px] max-w-[620px] shrink-0 flex-col gap-6 xl:w-[614px]">
              {p.titleFirst && title}
              <div className={`aspect-[614/461] w-full overflow-hidden bg-[#d3d3d3] ${p.rounded ?? 'rounded-2xl'}`}>
                <img src={p.image} alt="" draggable={false} className="h-full w-full object-cover" loading="lazy" />
              </div>
              {!p.titleFirst && title}
              <p className="pb-2.5 text-base leading-normal tracking-[-0.4px] text-white opacity-90 xl:whitespace-nowrap">
                <Lines lines={p.desc} />
              </p>
            </div>
          )
        })}
      </div>
    </section>
  )
}

/* ---------- 인테리어 스타일 ---------- */

function Styles() {
  const heading = (
    <h2 className="font-serif-kr text-[26px] font-normal leading-normal text-[#241e12] xl:text-right xl:text-[32px]">
      나의 취향이 오롯이
      <br />
      드러나는 공간
    </h2>
  )
  const paragraph = (
    <p className="text-base leading-normal tracking-[-0.4px] text-[#6a6a6a]">
      워드앤코드 인테리어는
      <br />
      공간의 용도와 가족 구성원, 생활 니즈를 면밀히 파악하고,
      <br />
      고객의 취향이 세심하게 녹아든 공간을 디자인합니다.
    </p>
  )

  return (
    <section className="px-5 py-24 sm:px-10 xl:px-20 xl:py-32">
      {/* 좁은 화면 — 글을 먼저 두고 사진을 두 칸으로 */}
      <div className="mb-10 space-y-4 xl:hidden">
        {heading}
        {paragraph}
      </div>

      <ul className="mx-auto grid max-w-[1760px] grid-cols-2 items-start gap-4 xl:min-h-[879px] xl:grid-cols-4">
        {STYLES.map((s, i) => (
          <li key={s.label} className={`relative ${s.offset}`}>
            {/* 세 번째 칸 위에 걸치는 제목 */}
            {i === 2 && <div className="absolute bottom-full right-3 mb-[67px] hidden xl:block">{heading}</div>}
            <Reveal index={i} className="relative aspect-[428/600] overflow-hidden rounded-2xl">
              <img
                src={s.image}
                alt={`인테리어 스타일 — ${s.label}`}
                className="absolute left-0 top-[-4.54%] h-[110%] w-full object-cover opacity-[0.84]"
                loading="lazy"
              />
              <p
                className={`font-serif-kr absolute inset-x-0 bottom-10 text-center text-base text-white ${s.dim ? 'opacity-[0.66]' : ''}`}
              >
                {s.label}
              </p>
            </Reveal>
            {/* 두 번째 칸 아래의 설명 */}
            {i === 1 && <div className="mt-[90px] hidden pl-2 xl:block">{paragraph}</div>}
          </li>
        ))}
      </ul>
    </section>
  )
}

/* ---------- 포트폴리오 ---------- */

function Portfolio() {
  return (
    <section className="px-5 py-20 sm:px-10 xl:p-20">
      <div className="mx-auto max-w-[1760px]">
        <Reveal className="pb-16 text-center xl:pb-32">
          <h2 className="font-serif-kr text-[26px] font-normal text-[#241e12] xl:text-[32px]">일상을 읽고, 공간을 설계합니다.</h2>
          <p className="pt-4 text-base leading-normal tracking-[-0.4px] text-[#6a6a6a]">
            내 취향을 담은 나만의 공간을, 생활에 맞춰 편안하게.
          </p>
        </Reveal>

        <ul className="overflow-hidden rounded-[24px] bg-white xl:rounded-[32px]">
          {PORTFOLIO.map((p, i) => {
            const reverse = i % 2 === 1
            return (
              <li
                key={p.title}
                className={`flex flex-col gap-10 border-[#ebebeb] px-6 py-12 [&:not(:last-child)]:border-b sm:px-10 xl:flex-row xl:items-start xl:justify-between xl:gap-8 xl:px-[88px] xl:py-[92px] ${
                  reverse ? 'xl:flex-row-reverse' : ''
                }`}
              >
                <div className="flex flex-col justify-between gap-8 pt-2 xl:h-[369px] xl:w-[625px] xl:shrink-0">
                  <div>
                    <p className="text-base text-[#8f784b]">Portfolio {i + 1}</p>
                    <h3 className="font-serif-kr pt-5 text-[24px] font-medium text-[#1f1f1f] xl:text-[32px]">{p.title}</h3>
                    <p className="pt-6 text-base font-medium text-[#1f1f1f]">{p.year}</p>
                  </div>
                  <p className="text-base leading-[1.6] tracking-[-0.4px] text-[#6a6a6a]">{p.desc}</p>
                  <dl className="flex flex-wrap gap-x-20 gap-y-4">
                    {[
                      ['Location', p.location],
                      ['Size', p.size],
                      ['Keyword', p.keyword],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <dt className="text-base text-[#7a6759]">{k}</dt>
                        <dd className="pt-2 text-base font-medium text-[#1f1f1f]">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </div>

                <Reveal className="relative aspect-[872/369] w-full overflow-hidden rounded-2xl xl:aspect-auto xl:h-[369px] xl:w-[872px] xl:shrink-0">
                  {/* 시안은 872×480 사진 칸의 위쪽 369px 만 보여 준다 */}
                  <div className="absolute inset-x-0 top-0 aspect-[872/480] overflow-hidden rounded-[14px]">
                    {p.base && (
                      <img src={asset('/images/interior/main/portfolio-base.png')} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                    )}
                    <img src={p.image} alt={p.title} className={`absolute max-w-none ${p.imageClass}`} loading="lazy" />
                  </div>
                </Reveal>
              </li>
            )
          })}
        </ul>

        <div className="flex justify-center py-10">
          <Link
            to="/products"
            className="flex items-center gap-2 rounded-full bg-[#676057] px-[18px] py-3 text-[15px] font-light tracking-[-0.375px] text-white shadow-[3px_7px_10px_0px_rgba(48,41,34,0.15)] transition hover:bg-[#54493d]"
          >
            view more
            <span className="h-[5px] w-[5px] rounded-full bg-white" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  )
}

/* ---------- 빠른 상담 ---------- */

const EMPTY_FORM = { name: '', phone: ['', '', ''], address: '', type: '', agree: false }

/** 사진 위 반투명 상자에 담긴 빠른 상담 폼 — 관리자 [문의 관리]로 접수된다. */
function QuickContact() {
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const setPhone = (idx: number, value: string) =>
    setForm((f) => ({ ...f, phone: f.phone.map((p, i) => (i === idx ? value.replace(/\D/g, '').slice(0, 4) : p)) }))

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const phone = form.phone.filter(Boolean).join('-')
    const missing = [
      !form.name.trim() && '성함 혹은 업체명',
      form.phone.some((p) => !p) && '연락처',
      !form.address.trim() && '시공 예정 주소',
      !form.type && '서비스 유형',
    ].filter(Boolean)
    if (missing.length) return setMessage({ ok: false, text: `${missing.join(', ')}을(를) 입력해 주세요.` })
    if (!form.agree) return setMessage({ ok: false, text: '개인정보 수집·이용에 동의해 주셔야 문의를 보낼 수 있습니다.' })

    setSubmitting(true)
    setMessage(null)
    try {
      await api('/contacts', {
        method: 'POST',
        body: {
          name: form.name.trim(),
          phone,
          message: `[메인 빠른 상담]\n서비스 유형: ${form.type}\n시공 예정 주소: ${form.address.trim()}`,
        },
      })
      setForm(EMPTY_FORM)
      setMessage({ ok: true, text: '문의가 접수되었습니다. 남겨 주신 연락처로 곧 연락드리겠습니다.' })
    } catch (err) {
      setMessage({ ok: false, text: (err as Error).message })
    } finally {
      setSubmitting(false)
    }
  }

  const label = 'text-base font-medium leading-[25.6px] tracking-[-0.4px] text-white'
  const line = 'h-[30px] w-full border-0 border-b border-[#a99d93] bg-transparent px-0 text-white outline-none focus:border-white'

  return (
    <section className="relative flex flex-col justify-between gap-12 overflow-hidden px-5 py-20 sm:px-10 xl:h-[919px] xl:px-[168px] xl:py-[120px]">
      <img src={asset('/images/interior/contact-bg.png')} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
      <div
        className="absolute inset-0"
        style={{ backgroundImage: 'linear-gradient(25.58deg, rgba(0, 0, 0, 0.45) 0%, rgba(0, 0, 0, 0) 100%)' }}
        aria-hidden
      />

      <div className="relative pl-2">
        <h2 className="font-serif-kr text-[22px] font-normal text-white sm:text-[27.994px]">예산은 달라도, 완성도의 기준은 같습니다.</h2>
        <p className="pt-6 text-base leading-6 text-[#f7f4ef]">
          워드앤코드는 공간의 조건과 취향을 세심히 읽고,
          <br />
          주어진 예산 안에서 가장 좋은 설계의 답을 제안합니다.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        noValidate
        className="relative w-full max-w-[409px] rounded-[30px] border border-white bg-white/15 px-8 py-8 sm:px-10"
      >
        <div className="flex flex-col gap-4">
          <label className="block">
            <span className={label}>
              성함 혹은 업체명<span className="text-[#ab9f96]">*</span>
            </span>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={`${line} mt-1`} maxLength={50} />
          </label>

          <fieldset className="pt-[15px]">
            <legend className={label}>
              연락처<span className="text-[#ab9f96]">*</span>
            </legend>
            <div className="mt-1 flex items-end gap-[5px]">
              {form.phone.map((p, i) => (
                <span key={i} className="contents">
                  {i > 0 && <span className="leading-[25.6px] text-[#a99d93]">-</span>}
                  <input
                    value={p}
                    onChange={(e) => setPhone(i, e.target.value)}
                    inputMode="numeric"
                    aria-label={`연락처 ${i + 1}번째 자리`}
                    className={`${line} min-w-0 flex-1 text-center`}
                  />
                </span>
              ))}
            </div>
          </fieldset>

          <label className="block pt-[15px]">
            <span className={label}>
              시공 예정 주소<span className="text-[#ab9f96]">*</span>
            </span>
            <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={`${line} mt-1`} maxLength={200} />
          </label>

          <fieldset className="pt-5">
            <legend className={label}>
              서비스 유형<span className="text-[#ab9f96]">*</span>
            </legend>
            <div className="flex pt-1.5">
              {SERVICE_TYPES.map((t) => (
                <label key={t} className="flex w-[142px] cursor-pointer items-center gap-1.5">
                  <input
                    type="radio"
                    name="service-type"
                    checked={form.type === t}
                    onChange={() => setForm({ ...form, type: t })}
                    className="peer sr-only"
                  />
                  <span
                    className="h-4 w-4 rounded-full border-2 border-[#a99d93] peer-checked:border-[5px] peer-checked:border-white peer-focus-visible:ring-2 peer-focus-visible:ring-white/60"
                    aria-hidden
                  />
                  <span className="text-base tracking-[-0.4px] text-white">{t}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="pt-[22px]">
          <button
            type="submit"
            disabled={submitting}
            className="h-[47px] w-full rounded-md bg-[#676057]/80 text-lg font-bold text-white transition hover:bg-[#676057] disabled:opacity-60"
          >
            {submitting ? '보내는 중...' : '문의하기'}
          </button>
        </div>

        <div className="flex items-center justify-between pt-3 text-sm tracking-[-0.35px] text-[#ccc5bb]">
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={form.agree} onChange={(e) => setForm({ ...form, agree: e.target.checked })} className="peer sr-only" />
            <span
              className="grid h-4 w-4 place-items-center rounded-full border border-[#ccc5bb] bg-white/[0.17] peer-checked:bg-[#ccc5bb] peer-focus-visible:ring-2 peer-focus-visible:ring-white/60"
              aria-hidden
            />
            개인정보 수집/이용 동의
          </label>
          <Link to="/privacy" target="_blank" className="transition hover:text-white">
            [전문 보기]
          </Link>
        </div>

        {message && (
          <p role="status" className={`mt-3 text-sm ${message.ok ? 'text-white' : 'text-[#ffd9c2]'}`}>
            {message.text}
          </p>
        )}
      </form>
    </section>
  )
}

export default function HomePage() {
  return (
    <div className="bg-[#f7f4ef]">
      <Hero />
      <Stats />
      <Process />
      <Styles />
      <Portfolio />
      <QuickContact />
    </div>
  )
}
