import { useState } from 'react'

/** 주요 처리표시(라벨링) — 아이콘을 누르면 아래에 요약이 펼쳐진다. */
const LABELS = [
  {
    key: 'info',
    name: '개인정보',
    icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
    summary: '[필수] 이름, 이메일, 연락처  [선택] 회사명, 문의 내용에 포함된 정보',
    note: '문의 접수 시 이용자가 직접 입력한 정보만 수집하며, 서비스 이용 과정에서 접속 IP·접속 일시가 자동으로 생성될 수 있습니다.',
    section: 1,
  },
  {
    key: 'purpose',
    name: '처리목적',
    icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
    summary: '회사가 수집한 개인정보는 문의 응대, 견적·계약 진행, 서비스 제공 및 개선 등 관계 법령 및 제 규정에 따른 목적으로만 이용합니다.',
    note: '목적이 변경되는 경우 「개인정보 보호법」 제18조에 따라 별도의 동의를 받는 등 필요한 조치를 이행합니다.',
    section: 2,
  },
  {
    key: 'third',
    name: '제3자 제공',
    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
    summary: '법령에 규정되거나 정보주체의 동의를 얻은 경우에 한하여 제3자 제공이 이루어질 수 있습니다. 제3자 제공 시 제공 사항 등 제반 사항을 정보주체에게 사전 고지합니다.',
    note: '현재 회사는 이용자의 개인정보를 제3자에게 제공하고 있지 않습니다.',
    section: 4,
  },
  {
    key: 'outsourcing',
    name: '처리위탁',
    icon: 'M8 9l4-4 4 4m0 6l-4 4-4-4',
    summary: '서비스 제공을 위해 필요한 경우 개인정보 처리 업무 중 일부를 외부에 위탁할 수 있습니다. 수탁자가 위탁받은 업무 목적 외로 개인정보를 처리하는 것을 제한하고, 기술적·관리적 보호조치 등을 계약서에 명시합니다.',
    note: '위탁 업무의 내용이나 수탁자가 변경될 경우 지체 없이 본 방침을 통해 공개합니다.',
    section: 5,
  },
  {
    key: 'rights',
    name: '정보주체의 권리의무',
    icon: 'M3 6l9-4 9 4v6c0 5.25-3.75 9.75-9 11-5.25-1.25-9-5.75-9-11V6z',
    summary: '개인정보에 대한 열람, 정정·삭제, 처리정지 요구 등 이용자의 권익을 존중하며, 이용자는 이러한 법령상 권익의 침해 등에 대하여 관계 기관에 분쟁조정이나 상담을 신청할 수 있습니다.',
    note: '권리 행사는 이메일(privacy@wnc.co.kr)로 요청하실 수 있으며, 회사는 지체 없이 조치합니다.',
    section: 7,
  },
  {
    key: 'complaint',
    name: '고충처리부서',
    icon: 'M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z',
    summary: '정보주체의 불만 처리 등 고충 처리를 위한 개인정보 보호책임자와 실무 담당자를 지정하여 운영하고 있습니다.',
    note: '개인정보 보호책임자 : 경영지원팀장 · 02-1234-5678 · privacy@wnc.co.kr',
    section: 10,
  },
]

/**
 * 개인정보 주요 처리표시(라벨링) — 참고 페이지(인천국제공항 개인정보처리방침)처럼
 * 아이콘 여섯 개를 두고, 누르면 그 항목의 요약을 아래에 펼쳐 보여 준다.
 * '해당 항목 보기'를 누르면 본문의 그 절로 이동한다.
 */
export default function PrivacyLabels() {
  const [label, setLabel] = useState(LABELS[0].key)
  const active = LABELS.find((l) => l.key === label) ?? LABELS[0]

  /** 본문에서 'N.' 으로 시작하는 절 제목을 찾아 그 자리로 옮긴다. */
  const jump = (no: number) => {
    const target = [...document.querySelectorAll('.policy-doc h2')].find((el) =>
      (el.textContent ?? '').trim().startsWith(`${no}.`),
    )
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-lg font-bold text-slate-900">[주요 개인정보 처리표시 (라벨링)]</h3>
        <p className="text-sm text-mint-600">아이콘을 누르면 주요 개인정보 처리에 대한 내용을 확인하실 수 있습니다.</p>
      </div>

      <div className="mt-5 border border-slate-200">
        <ul className="grid grid-cols-3 divide-x divide-slate-200 border-b border-slate-200 sm:grid-cols-6">
          {LABELS.map((l) => {
            const on = l.key === label
            return (
              <li key={l.key}>
                <button
                  type="button"
                  onClick={() => setLabel(l.key)}
                  aria-pressed={on}
                  className={`flex w-full flex-col items-center gap-3 px-2 py-6 text-center text-sm transition ${
                    on ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span
                    className={`grid h-12 w-12 place-items-center rounded-full border ${
                      on ? 'border-white/40 text-white' : 'border-slate-300 text-mint-600'
                    }`}
                  >
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d={l.icon} />
                    </svg>
                  </span>
                  <span className="font-medium leading-tight">{l.name}</span>
                </button>
              </li>
            )
          })}
        </ul>

        <div className="px-6 py-6 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <strong className="text-base text-slate-900">{active.name}</strong>
            <button
              type="button"
              onClick={() => jump(active.section)}
              className="rounded-full border border-slate-900 px-3.5 py-1 text-xs font-semibold text-slate-900 transition hover:bg-slate-900 hover:text-white"
            >
              해당 항목 보기
            </button>
          </div>
          <p className="mt-3 text-[0.95rem] leading-[1.8] text-slate-700">{active.summary}</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">※ {active.note}</p>
        </div>
      </div>
    </div>
  )
}
