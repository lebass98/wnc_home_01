import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

export interface CarouselItem {
  id: number
  to: string
  /** 없으면 회색 자리표시를 보여준다. */
  image: string | null
  title: string
  desc: string
}

/** 좌우 이동 버튼 */
function NavButton({
  onClick,
  label,
  direction,
  className,
}: {
  onClick: () => void
  label: string
  direction: 'prev' | 'next'
  className: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`absolute top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white text-slate-700 shadow-md transition hover:bg-slate-100 lg:grid ${className}`}
    >
      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d={direction === 'prev' ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'}
        />
      </svg>
    </button>
  )
}

/** 한 번에 두 장씩 넘겨 보는 카드 목록 */
export default function CardCarousel({
  items,
  moreTo,
}: {
  items: CarouselItem[]
  /** '전체보기'가 향할 주소 */
  moreTo: string
}) {
  const PER_PAGE = 2
  const pages = Math.max(1, Math.ceil(items.length / PER_PAGE))
  const [page, setPage] = useState(0)

  // 목록이 줄어 현재 페이지가 사라지면 첫 페이지로 되돌린다.
  useEffect(() => {
    if (page > pages - 1) setPage(0)
  }, [page, pages])

  const go = (next: number) => setPage((next + pages) % pages)
  const shown = items.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE)

  return (
    <div className="relative">
      <div className="container-wnc">
        <div className="grid gap-6 md:grid-cols-2">
          {shown.map((item) => (
            <Link key={item.id} to={item.to} className="group block bg-white">
              {item.image ? (
                <img src={item.image} alt="" className="h-64 w-full object-cover" />
              ) : (
                <div className="h-64 w-full bg-slate-200" aria-hidden />
              )}
              <div className="px-7 py-7">
                <h3 className="font-semibold text-slate-900 transition group-hover:text-mint-500">
                  {item.title}
                </h3>
                <p className="mt-4 line-clamp-2 text-sm leading-[1.9] text-slate-500">
                  {item.desc}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {/* 현재 위치 · 전체보기 */}
        <div className="mt-8 flex items-center justify-between">
          <div className="flex gap-2.5">
            {Array.from({ length: pages }, (_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setPage(i)}
                aria-label={`${i + 1}번째 목록 보기`}
                aria-current={i === page}
                className={`h-2 w-2 rounded-full transition ${
                  i === page ? 'bg-white' : 'bg-white/40 hover:bg-white/70'
                }`}
              />
            ))}
          </div>

          <Link
            to={moreTo}
            className="group inline-flex items-center gap-3 text-sm font-semibold text-white"
          >
            전체보기
            <span className="block h-px w-9 bg-white transition-all group-hover:w-12" />
          </Link>
        </div>
      </div>

      {pages > 1 && (
        <>
          <NavButton
            direction="prev"
            label="이전 목록"
            onClick={() => go(page - 1)}
            className="left-4 xl:left-10"
          />
          <NavButton
            direction="next"
            label="다음 목록"
            onClick={() => go(page + 1)}
            className="right-4 xl:right-10"
          />
        </>
      )}
    </div>
  )
}
