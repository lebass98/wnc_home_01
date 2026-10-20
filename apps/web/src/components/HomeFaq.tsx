import { useState } from 'react'

const FAQS = [
  {
    q: '디자인된 샘플에서 어디까지 변경이 가능한가요?',
    a: '글과 사진, 색상, 메뉴 구성은 자유롭게 바꿀 수 있습니다. 화면 구조를 크게 바꾸는 작업은 맞춤 제작 상담으로 안내해 드립니다.',
  },
  {
    q: '사진과 문구 등 들어갈 내용은 전부 직접 준비해야 하나요?',
    a: '로고와 실제 사진은 준비해 주시는 편이 가장 좋습니다. 문구는 초안만 주셔도 다듬어 드리고, 사진이 없으면 임시 이미지로 먼저 채워 보여 드립니다.',
  },
  {
    q: '제작 기간과 비용은 어떻게 되나요?',
    a: '고르신 디자인과 페이지 수, 필요한 기능에 따라 달라집니다. 자료 전달이 끝난 뒤 일정과 비용을 함께 안내해 드립니다.',
  },
  {
    q: '오픈 후 유지관리는 어떻게 할 수 있나요?',
    a: '관리자 화면에서 글·사진·메뉴를 직접 고치실 수 있습니다. 정기 점검이나 기능 추가가 필요하면 유지관리는 별도로 상담해 드립니다.',
  },
  {
    q: '수정 요청은 어떻게 진행되나요?',
    a: '시안을 확인하신 뒤 고칠 곳을 한 번에 모아 알려 주시면 반영해 드립니다. 오픈 뒤에는 관리자 화면에서 직접 고치거나 문의로 요청하실 수 있습니다.',
  },
]

/** 자주 묻는 질문 — 한 번에 하나씩 펼쳐 본다. */
export default function HomeFaq() {
  const [opened, setOpened] = useState<number | null>(null)

  return (
    <div>
      {FAQS.map((faq, index) => {
        const isOpen = opened === index
        return (
          <div key={faq.q} className="border-b border-[#cfd8e3]">
            <button
              type="button"
              onClick={() => setOpened(isOpen ? null : index)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-4 px-[4px] py-[22px] text-left"
            >
              <span className="text-[17px] font-semibold leading-[1.6] tracking-[-0.5px] text-[#00154c] sm:text-[20px]">
                {faq.q}
              </span>
              <span
                aria-hidden
                className={`shrink-0 pl-[16px] text-[22px] font-bold text-[#044acf] transition-transform ${
                  isOpen ? 'rotate-45' : ''
                }`}
              >
                +
              </span>
            </button>
            {isOpen && (
              <p className="px-[4px] pb-[22px] text-[16px] leading-[1.75] text-[#515f73]">{faq.a}</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
