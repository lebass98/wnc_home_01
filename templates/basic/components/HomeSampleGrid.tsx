import { useState } from 'react'
import { Link } from 'react-router-dom'
import Reveal from './Reveal'

const asset = (path: string) => {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

type Sample = {
  id: string
  /** HomeCategoryNav 의 업종 열쇠말 */
  category: string
  image: string
  title: string
  desc: string
  tags: string[]
}

const SAMPLES: Sample[] = [
  {
    id: 'sample-01',
    category: 'hospital',
    image: '/images/home/sample-01.jpg',
    title: '진료 과정을 보여주는 병원형',
    desc: '진료 안내·시술 사례·예약에 적합',
    tags: ['Clean', 'Trustworthy'],
  },
  {
    id: 'sample-02',
    category: 'food',
    image: '/images/home/sample-02.jpg',
    title: '메뉴가 돋보이는 디저트형',
    desc: '메뉴 소개·주문·매장 안내에 적합',
    tags: ['Warm', 'Delicious'],
  },
  {
    id: 'sample-03',
    category: 'wedding',
    image: '/images/home/sample-03.jpg',
    title: '감성을 담은 웨딩·스튜디오형',
    desc: '포트폴리오·촬영 상담·예약에 적합',
    tags: ['Elegant', 'Romantic'],
  },
  {
    id: 'sample-04',
    category: 'interior',
    image: '/images/home/sample-04.jpg',
    title: '시공 사례 중심 인테리어형',
    desc: '시공 사례·견적 문의·상담에 적합',
    tags: ['Modern', 'Calm'],
  },
  {
    id: 'sample-05',
    category: 'business',
    image: '/images/home/sample-05.jpg',
    title: '신뢰감을 강조한 기업 소개형',
    desc: '회사 소개·사업 분야·문의에 적합',
    tags: ['simple', 'Sophisticated'],
  },
  {
    id: 'sample-06',
    category: 'stay',
    image: '/images/home/sample-06.jpg',
    title: '편안함을 앞세운 숙소형',
    desc: '객실 안내·이용 안내·예약에 적합',
    tags: ['Cozy', 'Soft'],
  },
]

/** 샘플 한 장 — 미리보기 그림 위에 PC·모바일 보기를 골라 볼 수 있다. */
function SampleCard({ sample, index }: { sample: Sample; index: number }) {
  const [view, setView] = useState<'desktop' | 'mobile'>('desktop')

  // 한 줄 안에서 왼쪽부터 차례로 떠오른다.
  return (
    <Reveal rise index={index % 3} step={150} className="group/card h-full">
      <article className="flex h-full flex-col overflow-hidden rounded-[16px] border border-[#e1e1e1] bg-white transition duration-500 ease-out group-hover/card:-translate-y-2 group-hover/card:border-[#c7d6f5] group-hover/card:shadow-[0_18px_40px_-18px_rgba(4,74,207,0.35)]">
        {/* 마우스를 올리면 미리보기가 천천히 위로 밀려 아랫부분이 드러난다. */}
        <Link
          to="/products"
          className="relative block aspect-[446/523] w-full overflow-hidden border-b border-[#e1e1e1] bg-[#f5f5f5]"
          aria-label={`${sample.title} 샘플 보기`}
        >
          <img
            src={asset(sample.image)}
            alt=""
            loading="lazy"
            className={`absolute top-0 max-w-none transition-all duration-700 ease-out group-hover/card:-translate-y-[14%] ${
              view === 'mobile' ? 'left-1/2 w-[46%] -translate-x-1/2 shadow-lg' : 'left-0 w-full'
            }`}
          />
        </Link>

        <div className="flex items-center py-[15px] pb-[10px] pl-[20px] pr-[16px]">
          <p className="min-w-0 flex-1 truncate text-[18px] font-bold text-[#111] transition-colors duration-300 group-hover/card:text-[#044acf]">
            {sample.title}
          </p>
          <div className="ml-3 flex shrink-0 gap-[6px]">
            <button
              type="button"
              onClick={() => setView('desktop')}
              aria-label="PC 화면으로 보기"
              aria-pressed={view === 'desktop'}
              className={`grid h-[32px] w-[32px] place-items-center rounded-[4px] transition ${
                view === 'desktop' ? 'bg-[#dbe6ff]' : 'bg-[#f5f5f5] hover:bg-[#ececec]'
              }`}
            >
              <img src={asset('/images/home/view-desktop.svg')} alt="" width={16} height={24} />
            </button>
            <button
              type="button"
              onClick={() => setView('mobile')}
              aria-label="모바일 화면으로 보기"
              aria-pressed={view === 'mobile'}
              className={`grid h-[32px] w-[32px] place-items-center rounded-[4px] transition ${
                view === 'mobile' ? 'bg-[#dbe6ff]' : 'bg-[#f5f5f5] hover:bg-[#ececec]'
              }`}
            >
              <img src={asset('/images/home/view-mobile.svg')} alt="" width={16} height={24} />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-[12px] pb-[20px] pl-[20px] pr-[16px]">
          <p className="text-[15px] font-medium leading-[1.5] text-[#999]">{sample.desc}</p>
          <div className="flex flex-wrap gap-[4px]">
            {sample.tags.map((tag) => (
              <span
                key={tag}
                className="grid h-[22px] place-items-center rounded-[20px] bg-[#f8f8f8] px-[11px] text-[12px] font-semibold leading-[22px] text-[#747478]"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </article>
    </Reveal>
  )
}

/**
 * 디자인 샘플을 세 칸씩 늘어놓는다.
 * 위 띠에서 고른 업종만 보여 주고, 'all' 이면 전부 보여 준다.
 */
export default function HomeSampleGrid({ category = 'all' }: { category?: string }) {
  const shown = category === 'all' ? SAMPLES : SAMPLES.filter((s) => s.category === category)

  if (shown.length === 0) {
    return (
      <div className="rounded-[16px] border border-dashed border-[#e1e1e1] bg-[#fafafa] py-20 text-center">
        <p className="text-[17px] font-semibold text-[#111]">이 업종의 디자인 샘플을 준비하고 있어요.</p>
        <p className="mt-2 text-[15px] text-[#999]">필요하신 모습이 있다면 맞춤 제작으로 만들어 드립니다.</p>
        <Link
          to="/contact"
          className="mt-6 inline-flex h-[42px] items-center rounded-[8px] bg-[#044acf] px-6 text-[15px] font-semibold text-white transition hover:bg-[#0340b4]"
        >
          맞춤 제작 상담하기
        </Link>
      </div>
    )
  }

  return (
    <div className="grid gap-x-12 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
      {shown.map((sample, index) => (
        // 업종을 바꾸면 카드가 새로 등장하도록 열쇠에 업종을 섞는다.
        <SampleCard key={`${category}-${sample.id}`} sample={sample} index={index} />
      ))}
    </div>
  )
}
