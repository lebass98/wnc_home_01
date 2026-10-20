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
      <Reveal rise as="h2" className="break-keep text-[22px] font-bold leading-[1.4] tracking-[-0.8px] text-[#111] sm:text-[26px] sm:leading-[1.5] lg:text-[32px]">
        {title}
      </Reveal>
      <Reveal
        rise
        index={1}
        step={120}
        as="p"
        className="mt-3 break-keep text-[15px] leading-[1.6] tracking-[-0.45px] text-[#515f73] sm:text-[16px] lg:text-[18px] lg:leading-[25.6px]"
      >
        {desc}
      </Reveal>
    </div>
  )
}
