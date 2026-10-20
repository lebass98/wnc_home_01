import { useState } from 'react'
import { Link } from 'react-router-dom'
import Reveal from './Reveal'

const asset = (path: string) => {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

type Sample = {
  id: string
  image: string
  title: string
  desc: string
  tags: string[]
}

const SAMPLES: Sample[] = [
  {
    id: 'sample-01',
    image: '/images/home/sample-01.jpg',
    title: '신뢰감을 강조한 기업 소개형',
    desc: '회사 소개·사업 분야·문의에 적합',
    tags: ['simple', 'Sophisticated'],
  },
  {
    id: 'sample-02',
    image: '/images/home/sample-02.jpg',
    title: '신뢰감을 강조한 기업 소개형',
    desc: '회사 소개·사업 분야·문의에 적합',
    tags: ['simple', 'Sophisticated'],
  },
  {
    id: 'sample-03',
    image: '/images/home/sample-03.jpg',
    title: '신뢰감을 강조한 기업 소개형',
    desc: '회사 소개·사업 분야·문의에 적합',
    tags: ['simple', 'Sophisticated'],
  },
  {
    id: 'sample-04',
    image: '/images/home/sample-04.jpg',
    title: '신뢰감을 강조한 기업 소개형',
    desc: '회사 소개·사업 분야·문의에 적합',
    tags: ['simple', 'Sophisticated'],
  },
  {
    id: 'sample-05',
    image: '/images/home/sample-05.jpg',
    title: '신뢰감을 강조한 기업 소개형',
    desc: '회사 소개·사업 분야·문의에 적합',
    tags: ['simple', 'Sophisticated'],
  },
  {
    id: 'sample-06',
    image: '/images/home/sample-06.jpg',
    title: '신뢰감을 강조한 기업 소개형',
    desc: '회사 소개·사업 분야·문의에 적합',
    tags: ['simple', 'Sophisticated'],
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

/** 디자인 샘플 여섯 장을 세 칸씩 늘어놓는다. */
export default function HomeSampleGrid() {
  return (
    <div className="grid gap-x-12 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
      {SAMPLES.map((sample, index) => (
        <SampleCard key={sample.id} sample={sample} index={index} />
      ))}
    </div>
  )
}
