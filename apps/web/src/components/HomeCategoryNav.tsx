import { useRef } from 'react'
import { Link } from 'react-router-dom'

const asset = (path: string) => {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

/**
 * 50px 아이콘 칸 안에서 그림이 놓이는 자리.
 * 피그마에서 아이콘마다 여백이 달라, 칸 기준 좌표를 그대로 옮겨 적는다.
 * box 가 없으면 50px 칸을 꽉 채운다.
 */
type Category = {
  label: string
  icon: string
  box?: { left: number; top: number; width: number; height: number }
  /** 아이콘 위에 걸치는 작은 꼬리표 */
  badge?: string
  /** 좌우로 뒤집어 그린다 */
  flip?: boolean
  to: string
}

const CATEGORIES: Category[] = [
  { label: 'Business', icon: '/images/home/cat-business.svg', to: '/products?category=business' },
  { label: '숙소 시설', icon: '/images/home/cat-stay.svg', badge: '예약기능', to: '/products?category=stay' },
  { label: '인테리어', icon: '/images/home/cat-interior.svg', badge: '상담기능', to: '/products?category=interior' },
  {
    label: '푸드',
    icon: '/images/home/cat-food.svg',
    box: { left: 4.7, top: 13.2, width: 41.6, height: 30.6 },
    to: '/products?category=food',
  },
  {
    label: '병원',
    icon: '/images/home/cat-hospital.svg',
    box: { left: 4.7, top: 9.2, width: 41.6, height: 31.6 },
    badge: '예약기능',
    to: '/products?category=hospital',
  },
  {
    label: '웨딩/스튜디오',
    icon: '/images/home/cat-wedding.svg',
    box: { left: 6.7, top: 11.2, width: 36.6, height: 34.6 },
    to: '/products?category=wedding',
  },
  {
    label: '운송/업체',
    icon: '/images/home/cat-delivery.svg',
    box: { left: 3.25, top: 14.65, width: 43.5, height: 30.64 },
    flip: true,
    to: '/products?category=delivery',
  },
]

/** 50px 칸에 아이콘 하나를 피그마 좌표대로 올린다. */
function CategoryIcon({ category }: { category: Category }) {
  const { icon, box, flip, label } = category
  return (
    <div className={`relative h-[50px] w-[50px] overflow-hidden ${flip ? '-scale-x-100' : ''}`}>
      {box ? (
        <img
          src={asset(icon)}
          alt=""
          width={box.width}
          height={box.height}
          className="absolute max-w-none"
          style={{ left: box.left, top: box.top, width: box.width, height: box.height }}
        />
      ) : (
        <img src={asset(icon)} alt="" width={50} height={50} className="absolute inset-0 max-w-none" />
      )}
      <span className="sr-only">{label}</span>
    </div>
  )
}

/**
 * 업종 고르기 띠 — 왼쪽에 [전체보기], 구분선 뒤로 업종 아이콘이 늘어선다.
 * 화면이 좁으면 가로로 밀어 볼 수 있고, 양옆 화살표가 그 자리를 대신 밀어 준다.
 */
export default function HomeCategoryNav() {
  const trackRef = useRef<HTMLDivElement>(null)

  const scrollBy = (direction: -1 | 1) => {
    const track = trackRef.current
    if (!track) return
    track.scrollBy({ left: direction * 324, behavior: 'smooth' })
  }

  return (
    <div className="flex items-center justify-center gap-4 sm:gap-10">
      <button
        type="button"
        onClick={() => scrollBy(-1)}
        aria-label="이전 업종 보기"
        className="hidden h-[42px] w-[42px] shrink-0 place-items-center rounded-[12px] bg-[#e9e9e9] transition hover:bg-[#dcdcdc] sm:grid"
      >
        <img src={asset('/images/home/arrow-prev.svg')} alt="" width={24} height={24} />
      </button>

      <div
        ref={trackRef}
        className="flex items-start gap-6 overflow-x-auto scroll-smooth px-1 sm:gap-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {/* 전체보기 — 늘 켜져 있는 자리라 파란 칸으로 둔다. */}
        <Link to="/products" className="group flex shrink-0 flex-col items-center">
          <div className="grid h-[80px] w-[80px] place-items-center rounded-[24px] bg-[#044acf] transition group-hover:bg-[#0340b4]">
            <div className="relative h-[50px] w-[50px] overflow-hidden">
              <img
                src={asset('/images/home/cat-all.svg')}
                alt=""
                width={32.8}
                height={32.8}
                className="absolute max-w-none"
                style={{ left: 9.1, top: 8.5, width: 32.8, height: 32.8 }}
              />
            </div>
          </div>
          <span className="mt-[15px] text-center text-[15px] font-semibold text-[#111]">전체보기</span>
        </Link>

        {/* 전체보기와 업종을 가르는 세로선 — 가로 선 그림을 세워 쓴다. */}
        <div className="flex h-[108px] w-0 shrink-0 items-center justify-center self-start" aria-hidden>
          <div className="rotate-90">
            <img src={asset('/images/home/divider.svg')} alt="" width={108} height={1} className="block max-w-none" />
          </div>
        </div>

        {CATEGORIES.map((category) => (
          <Link key={category.label} to={category.to} className="group flex w-[92px] shrink-0 flex-col items-center">
            <div className="relative flex h-[80px] w-[80px] items-start justify-center rounded-[24px] bg-[#f5f7f6] pt-[10px] transition group-hover:bg-[#e9edeb]">
              <CategoryIcon category={category} />
              {category.badge && (
                <span className="absolute left-[8.5px] top-[64px] grid h-[22px] w-[63px] place-items-center rounded-[20px] bg-[#8592a4] text-[12px] font-semibold leading-[22px] text-white">
                  {category.badge}
                </span>
              )}
            </div>
            <span className="mt-[15px] text-center text-[15px] font-semibold text-[#111]">{category.label}</span>
          </Link>
        ))}
      </div>

      <button
        type="button"
        onClick={() => scrollBy(1)}
        aria-label="다음 업종 보기"
        className="hidden h-[42px] w-[42px] shrink-0 place-items-center rounded-[12px] bg-[#bbb] transition hover:bg-[#a8a8a8] sm:grid"
      >
        <img src={asset('/images/home/arrow-next.svg')} alt="" width={24} height={24} />
      </button>
    </div>
  )
}
