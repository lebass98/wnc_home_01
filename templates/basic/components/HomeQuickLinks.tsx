import { Link } from 'react-router-dom'
import Reveal from './Reveal'

const LINKS = [
  {
    title: '홈페이지 제작 A to Z',
    desc: ['제작 준비부터 오픈까지,', '홈페이지 제작 과정을 한눈에 확인하세요.'],
    to: '/services',
    className: 'bg-[#0c21a4] text-white hover:bg-[#0a1c8c]',
  },
  {
    title: '1:1 제작 상담 바로하기',
    desc: ['어디서부터 시작할지 고민이라면,', '상담을 통해 우리에게 맞는 제작 방향을 찾아보세요.'],
    to: '/contact',
    className: 'bg-[#06f] text-white hover:bg-[#0059e0]',
  },
  {
    title: '제작 자료 준비 가이드',
    desc: ['지속적인 협업부터 맞춤형 프로젝트까지,', '비즈니스에 필요한 제작·운영 방안을 함께 논의하세요.'],
    to: '/service',
    className: 'bg-[#f6f7f9] text-[#333] hover:bg-[#edeff3]',
  },
]

/** 다음 걸음으로 이어 주는 큰 단추 세 개. */
export default function HomeQuickLinks() {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {LINKS.map((link, index) => (
        <Reveal key={link.title} rise index={index} step={140}>
          <Link
            to={link.to}
            className={`block h-full min-h-[163px] rounded-[16px] p-[30px] transition duration-500 ease-out hover:-translate-y-1.5 hover:shadow-[0_20px_40px_-18px_rgba(12,33,164,0.45)] ${link.className}`}
          >
            <p className="break-keep text-[20px] font-bold leading-[1.4] sm:text-[22px] sm:leading-[29.92px]">{link.title}</p>
            <p className="mt-[16px] break-keep text-[14px] font-semibold leading-[1.55] sm:text-[15px]">
              {link.desc[0]}
              {/* 넓은 화면에서만 시안대로 두 줄로 끊는다 */}
              <br className="hidden lg:inline" />{' '}
              {link.desc[1]}
            </p>
          </Link>
        </Reveal>
      ))}
    </div>
  )
}
