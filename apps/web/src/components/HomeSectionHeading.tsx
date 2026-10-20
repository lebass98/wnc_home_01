import type { ReactNode } from 'react'
import Reveal from './Reveal'

/**
 * 메인 아래 구역들이 공통으로 쓰는 제목 묶음.
 * 32px 굵은 제목 + 18px 설명 한 줄, 가운데 정렬.
 */
export default function HomeSectionHeading({
  title,
  desc,
  className = '',
}: {
  title: ReactNode
  desc: ReactNode
  className?: string
}) {
  return (
    <div className={`text-center ${className}`}>
      <Reveal rise as="h2" className="text-[26px] font-bold leading-[1.5] tracking-[-0.8px] text-[#111] sm:text-[32px]">
        {title}
      </Reveal>
      <Reveal
        rise
        index={1}
        step={120}
        as="p"
        className="mt-3 text-[16px] leading-[25.6px] tracking-[-0.45px] text-[#515f73] sm:text-[18px]"
      >
        {desc}
      </Reveal>
    </div>
  )
}
