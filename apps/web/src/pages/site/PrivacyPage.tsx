import { useEffect, useState } from 'react'
import type { PrivacyRevision, PrivacyRevisionListItem } from '@wnc/shared'
import { api } from '../../lib/api'
import { formatDate } from '../../lib/format'
import SubPage from '../../components/SubPage'
import Reveal from '../../components/Reveal'
import { usePageTitle } from '../../lib/seo'
import { POLICY_TABS } from './TermsPage'

/** 위쪽 안내 — 참고 페이지의 wrap-noti */
const NOTICE = [
  '워드앤코드(이하 "회사")는 정보주체의 자유와 권리 보호를 위해 「개인정보 보호법」 및 관계 법령이 정한 바를 준수하여, 적법하게 개인정보를 처리하고 안전하게 관리하고 있습니다.',
  '회사는 관련 법령에서 규정한 바에 따라 보유하고 있는 개인정보에 대한 열람, 정정·삭제, 처리정지 요구 등 정보주체의 권익을 존중하며, 정보주체는 이러한 법령상 권익의 침해 등에 대하여 개인정보 분쟁조정위원회, 개인정보침해신고센터 등에 문의하실 수 있습니다.',
  '이에 회사는 「개인정보 보호법」 제30조에 따라 정보주체에게 개인정보 처리에 관한 절차 및 기준을 안내하고, 이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록 하기 위하여 다음과 같이 개인정보 처리방침을 수립·공개합니다.',
]

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

interface Block {
  /** 소제목 — 참고 페이지의 아이콘 행 제목 */
  title?: string
  lines?: string[]
  /** 표 — 첫 행이 머리글 */
  table?: string[][]
}

interface Section {
  no: number
  title: string
  blocks: Block[]
}

const SECTIONS: Section[] = [
  {
    no: 1,
    title: '개인정보의 수집 항목 및 수집 방법',
    blocks: [
      {
        title: '수집하는 개인정보의 항목',
        lines: [
          '문의 접수 : (필수) 이름, 이메일, 연락처 (선택) 회사명, 문의 내용',
          '서비스 이용 과정에서 자동 생성 : 접속 IP, 접속 일시, 브라우저 종류',
          '서비스 제공을 위한 최소한의 정보만 수집하며, 목적 변경 시 별도 동의 절차를 시행합니다.',
        ],
      },
      {
        title: '수집 방법',
        lines: ['홈페이지 문의하기 화면에서 이용자가 직접 입력', '전화·이메일 등 상담 과정에서 이용자가 제공', '생성정보 수집 도구를 통한 자동 수집'],
      },
    ],
  },
  {
    no: 2,
    title: '개인정보의 처리 목적',
    blocks: [
      {
        table: [
          ['구분', '처리 목적'],
          ['문의 응대', '문의 내용 확인, 회신, 상담 이력 관리'],
          ['견적·계약', '견적서 발송, 계약 체결 및 이행, 대금 정산'],
          ['서비스 개선', '이용 통계 분석, 서비스 품질 향상'],
          ['고지·안내', '약관·방침 변경, 점검 등 중요 사항 안내'],
        ],
      },
    ],
  },
  {
    no: 3,
    title: '개인정보의 처리 및 보유 기간',
    blocks: [
      {
        lines: [
          '회사는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를 수집 시에 동의받은 보유·이용기간 내에서 개인정보를 처리·보유합니다.',
        ],
      },
      {
        table: [
          ['항목', '보유 기간', '근거'],
          ['문의 접수 정보', '처리 완료 후 3년', '정보주체 동의'],
          ['계약·대금 관련 기록', '5년', '전자상거래 등에서의 소비자보호에 관한 법률'],
          ['접속 기록', '3개월', '통신비밀보호법'],
        ],
      },
    ],
  },
  {
    no: 4,
    title: '개인정보의 제3자 제공',
    blocks: [
      {
        lines: [
          '회사는 정보주체의 개인정보를 제2조에서 명시한 범위 내에서만 처리하며, 정보주체의 동의, 법률의 특별한 규정 등 「개인정보 보호법」 제17조 및 제18조에 해당하는 경우에만 개인정보를 제3자에게 제공합니다.',
          '현재 회사는 이용자의 개인정보를 제3자에게 제공하고 있지 않습니다.',
        ],
      },
    ],
  },
  {
    no: 5,
    title: '개인정보 처리의 위탁',
    blocks: [
      {
        lines: ['회사는 원활한 서비스 제공을 위해 다음과 같이 개인정보 처리 업무를 위탁하고 있습니다.'],
      },
      {
        table: [
          ['수탁자', '위탁 업무'],
          ['클라우드 호스팅 사업자', '서비스 운영을 위한 서버·데이터 보관'],
          ['이메일 발송 대행사', '문의 접수 확인 및 안내 메일 발송'],
        ],
      },
      {
        lines: ['위탁 계약 체결 시 「개인정보 보호법」 제26조에 따라 위탁 업무 수행 목적 외 개인정보 처리 금지, 기술적·관리적 보호조치, 재위탁 제한, 수탁자 관리·감독, 손해배상 등을 계약서에 명시하고 수탁자가 개인정보를 안전하게 처리하는지 감독하고 있습니다.'],
      },
    ],
  },
  {
    no: 6,
    title: '개인정보의 파기 절차 및 방법',
    blocks: [
      { title: '파기 절차', lines: ['보유 기간이 경과하거나 처리 목적이 달성된 개인정보는 지체 없이 파기합니다.', '다른 법령에 따라 계속 보존해야 하는 경우 별도의 데이터베이스로 옮기거나 보관 장소를 달리하여 보존합니다.'] },
      { title: '파기 방법', lines: ['전자적 파일 형태의 정보는 기록을 재생할 수 없는 기술적 방법을 사용하여 삭제합니다.', '종이에 출력된 개인정보는 분쇄기로 분쇄하거나 소각하여 파기합니다.'] },
    ],
  },
  {
    no: 7,
    title: '정보주체와 법정대리인의 권리·의무 및 행사 방법',
    blocks: [
      {
        lines: [
          '정보주체는 회사에 대해 언제든지 개인정보 열람, 정정·삭제, 처리정지 요구 등의 권리를 행사할 수 있습니다.',
          '권리 행사는 서면, 전화, 이메일 등을 통하여 하실 수 있으며 회사는 이에 대해 지체 없이 조치합니다.',
          '권리 행사는 정보주체의 법정대리인이나 위임을 받은 자 등 대리인을 통하여 하실 수 있습니다. 이 경우 위임장을 제출하셔야 합니다.',
          '개인정보 열람 및 처리정지 요구는 「개인정보 보호법」 제35조 제4항, 제37조 제2항에 의하여 정보주체의 권리가 제한될 수 있습니다.',
        ],
      },
    ],
  },
  {
    no: 8,
    title: '개인정보의 안전성 확보 조치',
    blocks: [
      { title: '관리적 조치', lines: ['내부관리계획 수립·시행', '개인정보 취급 직원의 최소화 및 정기 교육'] },
      { title: '기술적 조치', lines: ['개인정보처리시스템 접근 권한 관리', '개인정보의 암호화 저장 및 전송 구간 암호화(HTTPS)', '보안 프로그램 설치 및 주기적 갱신'] },
      { title: '물리적 조치', lines: ['전산실·자료 보관실 등의 접근 통제'] },
    ],
  },
  {
    no: 9,
    title: '개인정보 자동 수집 장치의 설치·운영 및 거부',
    blocks: [
      {
        lines: [
          '회사는 이용자에게 맞춤 서비스를 제공하기 위해 이용 정보를 저장하고 수시로 불러오는 쿠키(cookie)를 사용할 수 있습니다.',
          '쿠키는 웹사이트를 운영하는 데 이용되는 서버가 이용자의 브라우저에 보내는 소량의 정보이며 이용자의 컴퓨터에 저장됩니다.',
          '이용자는 브라우저 설정(도구 › 인터넷 옵션 › 개인정보)에서 쿠키 저장을 거부할 수 있습니다. 다만 쿠키 저장을 거부할 경우 일부 서비스 이용에 어려움이 있을 수 있습니다.',
        ],
      },
    ],
  },
  {
    no: 10,
    title: '개인정보 보호책임자 및 고충처리 부서',
    blocks: [
      {
        lines: ['회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만 처리 및 피해 구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.'],
      },
      {
        table: [
          ['구분', '담당', '연락처'],
          ['개인정보 보호책임자', '경영지원팀장', '02-1234-5678 · privacy@wnc.co.kr'],
          ['개인정보 보호담당자', '경영지원팀 담당자', '02-1234-5678 · privacy@wnc.co.kr'],
        ],
      },
    ],
  },
  {
    no: 11,
    title: '권익 침해 구제 방법',
    blocks: [
      {
        lines: ['정보주체는 개인정보 침해로 인한 구제를 받기 위하여 아래 기관에 분쟁 해결이나 상담 등을 신청할 수 있습니다.'],
      },
      {
        table: [
          ['기관', '연락처', '홈페이지'],
          ['개인정보 분쟁조정위원회', '(국번없이) 1833-6972', 'www.kopico.go.kr'],
          ['개인정보침해신고센터', '(국번없이) 118', 'privacy.kisa.or.kr'],
          ['대검찰청', '(국번없이) 1301', 'www.spo.go.kr'],
          ['경찰청', '(국번없이) 182', 'ecrm.cyber.go.kr'],
        ],
      },
    ],
  },
  {
    no: 12,
    title: '개인정보 처리방침의 변경',
    blocks: [
      {
        lines: [
          '이 개인정보 처리방침은 2026년 1월 1일부터 적용됩니다.',
          '법령·정책 또는 보안 기술의 변경에 따라 내용의 추가·삭제 및 수정이 있을 경우 변경 사항의 시행 7일 전부터 홈페이지 공지사항을 통하여 고지합니다.',
        ],
      },
    ],
  },
]

/** 날짜를 '2026년 01월 01일' 형태로 */
function longDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}년 ${String(d.getMonth() + 1).padStart(2, '0')}월 ${String(d.getDate()).padStart(2, '0')}일`
}

/**
 * 개인정보 개정이력 — 참고 페이지(zaemit 개인정보처리방침 하단)처럼
 * 최초 시행일·최근 변경일을 적고, 번호·개정이력·보기 표를 둔다. 자세히보기는 당시 본문을 창으로 연다.
 * 이력은 관리자 › 개인정보 이력에서 관리한다.
 */
function RevisionHistory() {
  const [items, setItems] = useState<PrivacyRevisionListItem[]>([])
  const [detail, setDetail] = useState<PrivacyRevision | null>(null)
  const [loadingId, setLoadingId] = useState<number | null>(null)

  useEffect(() => {
    api<PrivacyRevisionListItem[]>('/privacy-revisions')
      .then(setItems)
      .catch(() => setItems([]))
  }, [])

  // 창이 열려 있는 동안 ESC 로 닫는다.
  useEffect(() => {
    if (!detail) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDetail(null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [detail])

  const open = (id: number) => {
    setLoadingId(id)
    api<PrivacyRevision>(`/privacy-revisions/${id}`)
      .then(setDetail)
      .catch(() => alert('이력을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'))
      .finally(() => setLoadingId(null))
  }

  if (items.length === 0) return null

  // 목록은 최신 시행일이 앞이다.
  const first = items[items.length - 1]
  const latest = items[0]
  const changes = items.length - 1

  return (
    <div className="mt-16 border-t-2 border-slate-900 pt-8">
      <dl className="space-y-1.5 text-[0.95rem] text-slate-700">
        <div className="flex flex-wrap gap-x-3">
          <dt className="font-semibold text-slate-900">최초 개인정보처리방침 시행일 :</dt>
          <dd className="tabular-nums">{longDate(first.effectiveAt)}</dd>
        </div>
        <div className="flex flex-wrap gap-x-3">
          <dt className="font-semibold text-slate-900">개인정보처리방침 {Math.max(changes, 1)}차 변경일 :</dt>
          <dd className="tabular-nums">{changes > 0 ? longDate(latest.effectiveAt) : '변경없음'}</dd>
        </div>
      </dl>

      <h3 className="mt-8 text-lg font-bold text-slate-900">개인정보 개정이력</h3>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[32rem] border-t-2 border-slate-900 text-center text-[0.95rem]">
          <thead>
            <tr className="bg-slate-50 text-sm font-semibold text-slate-900">
              <th className="w-20 border-b border-slate-200 px-4 py-3">번호</th>
              <th className="border-b border-slate-200 px-4 py-3">개정이력</th>
              <th className="w-36 border-b border-slate-200 px-4 py-3">보기</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={item.id} className="text-slate-700">
                <td className="border-b border-slate-200 px-4 py-4 tabular-nums text-slate-500">{items.length - i}</td>
                <td className="border-b border-slate-200 px-4 py-4 text-left">
                  <p className="font-medium text-slate-900">
                    {item.title}
                    <span className="ml-2 text-sm font-normal tabular-nums text-slate-500">
                      (시행일 {formatDate(item.effectiveAt)})
                    </span>
                  </p>
                  {item.summary && <p className="mt-1 text-sm text-slate-500">{item.summary}</p>}
                </td>
                <td className="border-b border-slate-200 px-4 py-4">
                  <button
                    type="button"
                    onClick={() => open(item.id)}
                    disabled={loadingId === item.id}
                    className="inline-flex rounded-md border border-slate-900 px-4 py-1.5 text-sm font-medium text-slate-900 transition hover:bg-slate-900 hover:text-white disabled:opacity-60"
                  >
                    {loadingId === item.id ? '여는 중...' : '자세히보기'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 자세히보기 창 */}
      {detail && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal aria-label={detail.title}>
          <div className="absolute inset-0 bg-slate-950/70" onClick={() => setDetail(null)} aria-hidden />
          <div className="relative flex max-h-[85vh] w-full max-w-3xl flex-col bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5 sm:px-8">
              <div>
                <h4 className="text-lg font-bold text-slate-900">{detail.title}</h4>
                <p className="mt-1 text-sm tabular-nums text-slate-500">시행일 {longDate(detail.effectiveAt)}</p>
              </div>
              <button
                type="button"
                onClick={() => setDetail(null)}
                aria-label="닫기"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto px-6 py-6 sm:px-8">
              {detail.summary && (
                <p className="mb-5 border-l-2 border-mint-400 pl-3 text-sm text-slate-600">변경 요약 — {detail.summary}</p>
              )}
              <p className="whitespace-pre-wrap text-[0.95rem] leading-[1.9] text-slate-700">{detail.content}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/** 표 — 첫 행을 머리글로 그린다. */
function Table({ rows }: { rows: string[][] }) {
  const [head, ...body] = rows
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[32rem] border-t-2 border-slate-900 text-[0.95rem]">
        <thead>
          <tr className="bg-slate-50 text-left text-sm font-semibold text-slate-900">
            {head.map((h) => (
              <th key={h} className="border-b border-slate-200 px-4 py-3">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row) => (
            <tr key={row.join('|')} className="text-slate-700">
              {row.map((cell, i) => (
                <td key={i} className={`border-b border-slate-200 px-4 py-3 leading-relaxed ${i === 0 ? 'font-medium text-slate-900' : ''}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * 개인정보처리방침 — 참고 페이지(인천공항)처럼 안내, 주요 처리표시(라벨링) 아이콘과 요약,
 * 목차, 그리고 항목별로 펼쳐 보는 본문으로 구성한다.
 */
export default function PrivacyPage() {
  usePageTitle('개인정보처리방침')
  const [label, setLabel] = useState(LABELS[0].key)
  const [openNo, setOpenNo] = useState<number | null>(1)
  const active = LABELS.find((l) => l.key === label) ?? LABELS[0]

  const jump = (no: number) => {
    setOpenNo(no)
    document.getElementById(`privacy-${no}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <>
      <SubPage title="개인정보처리방침" tabs={POLICY_TABS}>

      <section className="pb-24 pt-20 sm:pt-24">
        <div className="container-wnc">
          {/* 제목 · 시행일 */}
          <Reveal className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">개인정보처리방침</h2>
            <p className="text-sm text-slate-500">
              시행일자 <span className="tabular-nums text-slate-900">2026년 1월 1일</span>
            </p>
          </Reveal>

          {/* 안내 상자 */}
          <Reveal index={1} className="mt-6 border border-slate-200 bg-slate-50 px-6 py-6 sm:px-8">
            <ul className="space-y-2 text-[0.95rem] leading-[1.8] text-slate-700">
              {NOTICE.map((line) => (
                <li key={line} className="relative pl-4 before:absolute before:left-0 before:top-[0.8em] before:h-1 before:w-1 before:rounded-full before:bg-slate-500">
                  {line}
                </li>
              ))}
            </ul>
          </Reveal>

          {/* 주요 개인정보 처리표시(라벨링) */}
          <div className="mt-14">
            <Reveal className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-lg font-bold text-slate-900">[주요 개인정보 처리표시 (라벨링)]</h3>
              <p className="text-sm text-mint-600">아이콘을 누르면 주요 개인정보 처리에 대한 내용을 확인하실 수 있습니다.</p>
            </Reveal>

            <Reveal index={1} className="mt-5 border border-slate-200">
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
                    바로가기
                  </button>
                </div>
                <p className="mt-3 text-[0.95rem] leading-[1.8] text-slate-700">{active.summary}</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">※ {active.note}</p>
              </div>
            </Reveal>
          </div>

          {/* 목차 */}
          <div className="mt-14">
            <Reveal>
              <h3 className="text-lg font-bold text-slate-900">[목 차]</h3>
            </Reveal>
            <Reveal index={1} className="mt-5 border-t border-b border-slate-300 py-5">
              <ol className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
                {SECTIONS.map((s) => (
                  <li key={s.no}>
                    <button
                      type="button"
                      onClick={() => jump(s.no)}
                      className="flex w-full items-start gap-2 text-left text-[0.95rem] text-slate-700 transition hover:text-mint-700"
                    >
                      <span className="w-6 shrink-0 tabular-nums text-slate-400">{s.no}.</span>
                      <span>{s.title}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </Reveal>
          </div>

          {/* 본문 — 항목마다 펼쳐 본다 */}
          <ul className="mt-14 border-t-2 border-slate-900">
            {SECTIONS.map((s) => {
              const open = openNo === s.no
              return (
                <li key={s.no} id={`privacy-${s.no}`} className="scroll-mt-28 border-b border-slate-200">
                  <button
                    type="button"
                    onClick={() => setOpenNo(open ? null : s.no)}
                    aria-expanded={open}
                    className="flex w-full items-center gap-4 py-5 text-left"
                  >
                    <span className="w-8 shrink-0 tabular-nums text-lg font-semibold text-mint-500">{s.no}.</span>
                    <span className={`flex-1 text-[1.05rem] ${open ? 'font-bold text-slate-900' : 'font-semibold text-slate-800'}`}>
                      {s.title}
                    </span>
                    <svg
                      className={`h-5 w-5 shrink-0 text-slate-400 transition ${open ? 'rotate-180 text-slate-900' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.8}
                      viewBox="0 0 24 24"
                      aria-hidden
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                    <div className="overflow-hidden">
                      <div className="space-y-6 pb-8 pl-0 sm:pl-12">
                        {s.blocks.map((b, bi) => (
                          <div key={bi}>
                            {b.title && (
                              <p className="mb-2 flex items-center gap-2 font-semibold text-slate-900">
                                <span className="h-1.5 w-1.5 rounded-full bg-mint-500" aria-hidden />
                                {b.title}
                              </p>
                            )}
                            {b.lines && (
                              <ul className="space-y-1.5 text-[0.95rem] leading-[1.8] text-slate-700">
                                {b.lines.map((line) => (
                                  <li key={line} className="relative pl-3.5 before:absolute before:left-0 before:top-[0.85em] before:h-px before:w-2 before:bg-slate-400">
                                    {line}
                                  </li>
                                ))}
                              </ul>
                            )}
                            {b.table && <Table rows={b.table} />}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>

          <RevisionHistory />
        </div>
      </section>
      </SubPage>
    </>
  )
}
