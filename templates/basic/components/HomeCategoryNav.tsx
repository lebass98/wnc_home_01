import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

const asset = (path: string) => {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

/**
 * 업종 하나.
 * box 는 50px 아이콘 칸 안에서 그림이 놓이는 자리다 — 피그마에서 아이콘마다 여백이 달라
 * 칸 기준 좌표를 그대로 옮겨 적었다. box 가 없으면 50px 칸을 꽉 채운다.
 */
export type Category = {
  /** 샘플을 고르는 열쇠말 */
  key: string
  label: string
  icon: string
  box?: { left: number; top: number; width: number; height: number }
  /** 아이콘 위에 걸치는 작은 꼬리표 */
  badge?: string
  /** 좌우로 뒤집어 그린다 */
  flip?: boolean
}

/** 전체보기를 뺀 업종 목록. 늘어나도 띠가 알아서 돌아간다. */
export const CATEGORIES: Category[] = [
  { key: 'business', label: 'Business', icon: '/images/home/cat-business.svg' },
  { key: 'stay', label: '숙소 시설', icon: '/images/home/cat-stay.svg', badge: '예약기능' },
  { key: 'interior', label: '인테리어', icon: '/images/home/cat-interior.svg', badge: '상담기능' },
  {
    key: 'food',
    label: '푸드',
    icon: '/images/home/cat-food.svg',
    box: { left: 4.7, top: 13.2, width: 41.6, height: 30.6 },
  },
  {
    key: 'hospital',
    label: '병원',
    icon: '/images/home/cat-hospital.svg',
    box: { left: 4.7, top: 9.2, width: 41.6, height: 31.6 },
    badge: '예약기능',
  },
  {
    key: 'wedding',
    label: '웨딩/스튜디오',
    icon: '/images/home/cat-wedding.svg',
    box: { left: 6.7, top: 11.2, width: 36.6, height: 34.6 },
  },
  {
    key: 'delivery',
    label: '운송/업체',
    icon: '/images/home/cat-delivery.svg',
    box: { left: 3.25, top: 14.65, width: 43.5, height: 30.64 },
    flip: true,
  },
]

/**
 * 아이콘 칸 하나 — 켜지면 파란 바탕에 흰 아이콘이 된다.
 * 마우스를 올렸을 때의 반응은 두지 않는다. 고른 것만 눈에 띄면 된다.
 */
function CategoryTab({
  label,
  active,
  onClick,
  children,
}: {
  label: string
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className="flex w-[92px] shrink-0 flex-col items-center">
      <span
        className={`relative flex h-[80px] w-[80px] items-start justify-center rounded-[24px] transition-colors duration-300 ${
          active ? 'bg-[#044acf]' : 'bg-[#f5f7f6]'
        }`}
      >
        {children}
      </span>
      <span
        className={`mt-[15px] text-center text-[15px] font-semibold transition-colors duration-300 ${
          active ? 'text-[#044acf]' : 'text-[#111]'
        }`}
      >
        {label}
      </span>
    </button>
  )
}

/** 50px 칸에 아이콘 하나를 피그마 좌표대로 올린다. */
function CategoryIcon({ category, active }: { category: Category; active: boolean }) {
  const { icon, box, flip } = category
  // 아이콘은 회색 선 그림이라, 파란 칸 위에서는 흰색으로 반전해 쓴다.
  const tone = active ? 'brightness-0 invert' : ''
  return (
    <span className={`relative mt-[10px] block h-[50px] w-[50px] overflow-hidden ${flip ? '-scale-x-100' : ''}`}>
      {box ? (
        <img
          src={asset(icon)}
          alt=""
          className={`absolute max-w-none ${tone}`}
          style={{ left: box.left, top: box.top, width: box.width, height: box.height }}
        />
      ) : (
        <img src={asset(icon)} alt="" width={50} height={50} className={`absolute inset-0 max-w-none ${tone}`} />
      )}
    </span>
  )
}

/**
 * 업종 고르기 띠.
 * 왼쪽 [전체보기]는 붙박이로 두고, 그 오른쪽 업종만 화살표로 좌우로 돌린다.
 * 목록을 세 벌 이어 붙이고 끝에 닿으면 가운데 벌로 몰래 되돌려 놓아,
 * 업종이 늘어나도 한쪽으로 계속 돌릴 수 있다.
 */
export default function HomeCategoryNav({
  active,
  onChange,
}: {
  /** 'all' 이면 전체보기 */
  active: string
  onChange: (key: string) => void
}) {
  const count = CATEGORIES.length
  const trackRef = useRef<HTMLDivElement>(null)
  // 가운데 벌에서 시작한다 — 양쪽으로 똑같이 돌 수 있다.
  const [index, setIndex] = useState(count)
  const [sliding, setSliding] = useState(true)
  const [step, setStep] = useState(108)

  // 칸 하나가 차지하는 너비(칸 + 사이 간격)를 실제 자리에서 잰다. 화면 폭이 바뀌면 다시 잰다.
  useEffect(() => {
    const measure = () => {
      const track = trackRef.current
      if (!track || track.children.length < 2) return
      const first = track.children[0] as HTMLElement
      const second = track.children[1] as HTMLElement
      const gap = second.offsetLeft - first.offsetLeft
      if (gap > 0) setStep(gap)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  // 몰래 되돌려 놓은 다음 프레임에 다시 미끄러짐을 켠다.
  useEffect(() => {
    if (sliding) return
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setSliding(true)))
    return () => cancelAnimationFrame(id)
  }, [sliding])

  const slide = useCallback((direction: -1 | 1) => {
    setSliding(true)
    setIndex((current) => current + direction)
  }, [])

  // 바깥 벌까지 갔으면 눈에 띄지 않게 가운데 벌의 같은 자리로 옮긴다.
  const settle = () => {
    if (index >= count * 2) {
      setSliding(false)
      setIndex(index - count)
    } else if (index < count) {
      setSliding(false)
      setIndex(index + count)
    }
  }

  // 세 벌 — 왼쪽으로도 오른쪽으로도 빈자리 없이 이어진다.
  const loop = [...CATEGORIES, ...CATEGORIES, ...CATEGORIES]

  return (
    <div className="flex items-start justify-center gap-4 sm:gap-10">
      <button
        type="button"
        onClick={() => slide(-1)}
        aria-label="이전 업종 보기"
        className="mt-[19px] hidden h-[42px] w-[42px] shrink-0 place-items-center rounded-[12px] bg-[#e9e9e9] transition hover:bg-[#dcdcdc] sm:grid"
      >
        <img src={asset('/images/home/arrow-prev.svg')} alt="" width={24} height={24} />
      </button>

      {/* 전체보기 — 돌아가지 않는 붙박이 자리 */}
      <CategoryTab label="전체보기" active={active === 'all'} onClick={() => onChange('all')}>
        <span className="relative mt-[15px] block h-[50px] w-[50px] overflow-hidden">
          <img
            src={asset('/images/home/cat-all.svg')}
            alt=""
            className={`absolute max-w-none ${active === 'all' ? '' : 'opacity-45 brightness-0'}`}
            style={{ left: 9.1, top: 8.5, width: 32.8, height: 32.8 }}
          />
        </span>
      </CategoryTab>

      {/* 전체보기와 업종을 가르는 세로선 — 가로 선 그림을 세워 쓴다. */}
      <div className="flex h-[108px] w-0 shrink-0 items-center justify-center" aria-hidden>
        <div className="rotate-90">
          <img src={asset('/images/home/divider.svg')} alt="" width={108} height={1} className="block max-w-none" />
        </div>
      </div>

      {/* 돌아가는 업종 띠 */}
      <div className="min-w-0 flex-1 overflow-hidden sm:max-w-[756px]">
        <div
          ref={trackRef}
          onTransitionEnd={settle}
          className={`flex gap-4 sm:gap-[16px] ${sliding ? 'transition-transform duration-500 ease-out' : ''}`}
          style={{ transform: `translateX(-${index * step}px)` }}
        >
          {loop.map((category, i) => (
            <CategoryTab
              key={`${category.key}-${i}`}
              label={category.label}
              active={active === category.key}
              onClick={() => onChange(category.key)}
            >
              <CategoryIcon category={category} active={active === category.key} />
              {category.badge && (
                <span className="absolute left-[8.5px] top-[64px] grid h-[22px] w-[63px] place-items-center rounded-[20px] bg-[#8592a4] text-[12px] font-semibold leading-[22px] text-white">
                  {category.badge}
                </span>
              )}
            </CategoryTab>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => slide(1)}
        aria-label="다음 업종 보기"
        className="mt-[19px] hidden h-[42px] w-[42px] shrink-0 place-items-center rounded-[12px] bg-[#bbb] transition hover:bg-[#a8a8a8] sm:grid"
      >
        <img src={asset('/images/home/arrow-next.svg')} alt="" width={24} height={24} />
      </button>
    </div>
  )
}
