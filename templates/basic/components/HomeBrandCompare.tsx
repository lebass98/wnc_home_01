import Reveal from './Reveal'

/**
 * 같은 템플릿이 브랜딩에 따라 어떻게 달라지는지 보여 주는 세 칸.
 * 가운데가 기본 템플릿이고, 양옆이 브랜드를 입힌 모습이다.
 */
export default function HomeBrandCompare() {
  return (
    <div className="flex flex-col items-stretch justify-center gap-6 lg:flex-row lg:items-center lg:gap-0">
      {/* 왼쪽 — 따뜻한 색을 입힌 결과 */}
      <Reveal rise step={170} className="flex-1">
        <div className="flex h-full min-h-[358px] flex-col rounded-[14px] border-[3px] border-[#2c5bae] bg-[#fff0b5] p-[28px]">
          <p className="text-center text-[13px] font-black leading-[20.8px] tracking-[1.3px] text-[#2c5bae]">
            CUSTOMIZED
          </p>
          <div className="relative flex min-h-[170px] flex-1 items-stretch pt-[18px]">
            <div className="flex flex-1 flex-col">
              <div className="flex-1 rounded-[10px] bg-[#ffa62b]" />
              <div className="flex-1 rounded-[10px] bg-[#2c5bae]" />
            </div>
            <div className="flex-1 rounded-[10px] bg-[#86c5ff]" />
            <p className="absolute left-1/2 top-[70px] -translate-x-1/2 whitespace-nowrap text-[18px] font-bold leading-[28.8px] text-white">
              BRAND WEBSITE
            </p>
          </div>
          <ul className="pt-[18px] text-center text-[14px] font-semibold leading-[22.4px]">
            <li className="text-[#2c5bae]">브랜드 적용</li>
            <li className="text-[#ffa62b]">실제 콘텐츠</li>
            <li className="text-[#2c5bae]">브랜드 컬러</li>
          </ul>
        </div>
      </Reveal>

      <Reveal
        rise
        index={1}
        step={170}
        aria-hidden
        className="w-[70px] shrink-0 self-center text-center text-[30px] font-black leading-[48px] text-[#515f73] max-lg:rotate-90"
      >
        ←
      </Reveal>

      {/* 가운데 — 손대지 않은 기본 템플릿 */}
      <Reveal rise index={2} step={170} className="flex-1">
        <div className="flex h-full min-h-[358px] flex-col rounded-[14px] border-2 border-dashed border-[#e2e8f0] bg-white p-[28px]">
          <p className="text-center text-[13px] font-black leading-[20.8px] tracking-[1.3px] text-[#94a3b8]">
            TEMPLATE
          </p>
          <div className="flex min-h-[170px] flex-1 flex-col gap-[4px] pt-[18px]">
            <div className="flex flex-1 gap-[4px]">
              <div className="flex-1 rounded-[10px] bg-[#f8fafc]" />
              <div className="flex-1 rounded-[10px] bg-[#f8fafc]" />
            </div>
            <div className="relative flex flex-1 items-center justify-center rounded-[10px] bg-[#f8fafc]">
              <p className="absolute -top-[13px] left-1/2 -translate-x-1/2 whitespace-nowrap text-[16px] font-bold leading-[25.6px] text-[#94a3b8]">
                기본 디자인
              </p>
            </div>
          </div>
          <ul className="pt-[18px] text-center text-[14px] leading-[22.4px] text-[#64748b]">
            <li>기본 구조</li>
            <li>기본 콘텐츠</li>
            <li>기본 컬러</li>
          </ul>
        </div>
      </Reveal>

      <Reveal
        rise
        index={3}
        step={170}
        aria-hidden
        className="w-[70px] shrink-0 self-center text-center text-[30px] font-black leading-[48px] text-[#515f73] max-lg:rotate-90"
      >
        →
      </Reveal>

      {/* 오른쪽 — 강한 색을 입힌 결과 */}
      <Reveal rise index={4} step={170} className="flex-1">
        <div className="flex h-full min-h-[358px] flex-col rounded-[14px] border-4 border-[#ff531f] bg-[#0c21a4] p-[28px]">
          <p className="text-center text-[13px] font-black leading-[20.8px] tracking-[1.3px] text-[#ff531f]">
            CUSTOMIZED
          </p>
          <div className="relative flex min-h-[170px] flex-1 items-stretch pt-[18px]">
            <div className="flex-1 rounded-[10px] bg-[#fff5eb]" />
            <div className="flex-1 rounded-[10px] bg-[#d4d67d]" />
            <div className="flex-1 rounded-[10px] bg-[#b8c7f8]" />
            <div className="flex-1 rounded-[10px] bg-[#ff531f]" />
            <p className="absolute left-1/2 top-[70px] -translate-x-1/2 whitespace-nowrap text-[18px] font-bold leading-[28.8px] text-[#ff531f]">
              BRAND WEBSITE
            </p>
          </div>
          <ul className="pt-[18px] text-center text-[14px] font-semibold leading-[22.4px]">
            <li className="text-[#ff531f]">브랜드 적용</li>
            <li className="text-[#d4d67d]">실제 콘텐츠</li>
            <li className="text-[#b8c7f8]">브랜드 컬러</li>
          </ul>
        </div>
      </Reveal>
    </div>
  )
}
