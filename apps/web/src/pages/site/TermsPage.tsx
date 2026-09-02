import PageHero from '../../components/PageHero'
import Reveal from '../../components/Reveal'
import { usePageTitle } from '../../lib/seo'

/** 이용약관·개인정보처리방침 묶음의 탭 */
export const POLICY_TABS = [
  { to: '/terms', label: '이용약관' },
  { to: '/privacy', label: '개인정보처리방침' },
]

/** 위쪽 안내 — 참고 페이지의 wrap-noti */
const NOTICE = [
  '본 이용약관은 워드앤코드 홈페이지 화면 하단에 메뉴로 노출되어 있습니다.',
  '관련 법률이나 회사의 정책상 변경이 될 경우에는 7일 이전에 공지사항을 통하여 공지합니다.',
  '문의 접수 등 서비스를 이용하시기 전에 반드시 아래 이용약관을 숙지하시기 바랍니다.',
  '본 이용약관은 수시로 갱신되며, 항상 가장 최근에 개정된 이용약관을 개정 게시일과 함께 게시합니다.',
]

interface Article {
  no: number
  title: string
  /** 조문 앞 설명 */
  desc?: string
  /** ①②③ 항 — 문자열이거나, 항 아래 1) 2) 목록이 붙는 형태 */
  items?: (string | { text: string; sub: string[] })[]
}

interface Chapter {
  title: string
  articles: Article[]
}

const CHAPTERS: Chapter[] = [
  {
    title: '제1장 총칙',
    articles: [
      {
        no: 1,
        title: '목적',
        desc: '본 약관은 워드앤코드(이하 "회사")가 운영하는 웹사이트(이하 "당 사이트")가 제공하는 모든 서비스(이하 "서비스")의 이용조건 및 절차, 이용자와 당 사이트의 권리, 의무, 책임사항과 기타 필요한 사항을 규정함을 목적으로 합니다.',
      },
      {
        no: 2,
        title: '약관의 효력 및 변경',
        items: [
          '본 약관은 당 사이트에 게시하거나 기타의 방법으로 이용자에게 공지함으로써 효력이 발생합니다.',
          '회사는 합리적인 사유가 발생할 경우 관련 법령에 위배되지 않는 범위에서 본 약관을 변경할 수 있으며, 변경된 약관은 적용일자 7일 전부터 공지합니다.',
          '이용자는 변경된 약관에 동의하지 않을 경우 서비스 이용을 중단할 수 있으며, 변경된 약관의 효력 발생일 이후에도 서비스를 계속 이용하는 경우 약관의 변경 사항에 동의한 것으로 봅니다.',
        ],
      },
      {
        no: 3,
        title: '약관 외 준칙',
        desc: '이 약관에 명시되지 않은 사항은 전기통신기본법, 전기통신사업법, 정보통신망 이용촉진 및 정보보호 등에 관한 법률, 개인정보 보호법 등 기타 관계 법령에 따릅니다.',
      },
      {
        no: 4,
        title: '용어의 정의',
        desc: '본 약관에서 사용하는 용어의 정의는 다음과 같습니다.',
        items: [
          '이용자 : 당 사이트에 접속하여 이 약관에 따라 당 사이트가 제공하는 서비스를 받는 개인 또는 법인을 말합니다.',
          '문의 : 이용자가 당 사이트의 문의하기 화면을 통해 회사에 상담·견적 등을 요청하는 행위를 말합니다.',
          '게시물 : 이용자 또는 회사가 당 사이트에 게시한 글, 사진, 동영상, 파일, 링크 등을 말합니다.',
          '콘텐츠 : 회사가 당 사이트에 게시한 제품 정보, 소식, 자료 등 일체의 정보를 말합니다.',
        ],
      },
    ],
  },
  {
    title: '제2장 서비스의 이용',
    articles: [
      {
        no: 5,
        title: '서비스의 제공',
        items: [
          { text: '회사는 이용자에게 다음의 서비스를 제공합니다.', sub: ['회사·사업·제품 소개 등 정보 제공 서비스', '공지사항·뉴스·보도자료 등 소식 제공 서비스', '문의 접수 및 상담 서비스', '기타 회사가 정하는 서비스'] },
          '회사는 서비스의 내용을 변경할 수 있으며, 이 경우 변경 내용을 당 사이트에 공지합니다.',
        ],
      },
      {
        no: 6,
        title: '서비스의 이용시간',
        items: [
          '서비스의 이용은 연중무휴 1일 24시간을 원칙으로 합니다. 다만 회사의 업무상 또는 기술상의 이유로 서비스가 일시 중지될 수 있습니다.',
          '회사는 서비스를 일정 범위로 분할하여 각 범위별로 이용 가능한 시간을 별도로 정할 수 있으며, 이 경우 그 내용을 사전에 공지합니다.',
        ],
      },
      {
        no: 7,
        title: '서비스의 중지 및 중지에 대한 공지',
        items: [
          { text: '회사는 다음 각 호에 해당하는 경우 서비스 제공을 중지할 수 있습니다.', sub: ['서비스용 설비의 보수 등 공사로 인한 부득이한 경우', '전기통신사업법에 규정된 기간통신사업자가 전기통신 서비스를 중지했을 경우', '천재지변, 국가비상사태 등 불가항력적 사유가 있는 경우'] },
          '회사는 제1항의 사유로 서비스를 중지하는 경우 그 사실을 사전에 공지합니다. 다만 회사가 통제할 수 없는 사유로 사전 공지가 불가능한 경우에는 사후에 공지합니다.',
        ],
      },
      {
        no: 8,
        title: '문의 접수와 처리',
        items: [
          '이용자는 문의하기 화면을 통해 이름, 이메일, 연락처 등 회사가 정한 항목을 입력하여 문의를 접수할 수 있습니다.',
          '회사는 접수된 문의에 대해 1영업일 내에 회신하는 것을 원칙으로 하며, 문의 내용에 따라 회신이 지연될 수 있습니다.',
          { text: '회사는 다음 각 호에 해당하는 문의는 처리하지 않을 수 있습니다.', sub: ['타인의 명의나 허위 정보를 기재한 경우', '광고, 영리 목적의 홍보 등 문의 목적과 무관한 경우', '욕설, 비방 등 공서양속에 반하는 내용을 포함한 경우'] },
        ],
      },
    ],
  },
  {
    title: '제3장 권리와 의무',
    articles: [
      {
        no: 9,
        title: '회사의 의무',
        items: [
          '회사는 관련 법령과 본 약관이 금지하거나 공서양속에 반하는 행위를 하지 않으며, 계속적이고 안정적으로 서비스를 제공하기 위해 최선을 다합니다.',
          '회사는 이용자의 개인정보를 본인의 승낙 없이 제3자에게 누설·배포하지 않으며, 개인정보처리방침에 따라 안전하게 관리합니다.',
          '회사는 이용자로부터 제기되는 의견이나 불만이 정당하다고 인정할 경우 적절한 절차를 거쳐 처리합니다.',
        ],
      },
      {
        no: 10,
        title: '이용자의 의무',
        items: [
          { text: '이용자는 다음 각 호의 행위를 하여서는 안 됩니다.', sub: ['문의 접수 시 허위 내용을 기재하는 행위', '회사 또는 제3자의 지식재산권을 침해하는 행위', '회사 또는 제3자의 명예를 손상시키거나 업무를 방해하는 행위', '당 사이트의 안정적 운영을 방해할 수 있는 정보(컴퓨터 프로그램 등)를 전송하거나 게시하는 행위', '기타 관계 법령에 위배되는 행위'] },
          '이용자는 관계 법령, 본 약관의 규정, 이용 안내 및 서비스와 관련하여 공지한 주의사항, 회사가 통지하는 사항 등을 준수하여야 합니다.',
        ],
      },
      {
        no: 11,
        title: '저작권의 귀속 및 이용 제한',
        items: [
          '당 사이트에 게시된 콘텐츠에 대한 저작권 및 기타 지식재산권은 회사에 귀속됩니다.',
          '이용자는 당 사이트를 이용하여 얻은 정보를 회사의 사전 승낙 없이 복제, 송신, 출판, 배포, 방송 기타 방법에 의하여 영리 목적으로 이용하거나 제3자에게 이용하게 하여서는 안 됩니다.',
        ],
      },
      {
        no: 12,
        title: '링크 사이트',
        desc: '당 사이트는 이용자에게 다른 회사의 웹사이트 또는 자료에 대한 링크를 제공할 수 있습니다. 이 경우 회사는 외부 사이트 및 자료에 대한 통제권이 없으므로 그로부터 얻은 자료의 유용성에 대해 책임을 지지 않으며 보증하지 않습니다.',
      },
    ],
  },
  {
    title: '제4장 기타',
    articles: [
      {
        no: 13,
        title: '손해배상',
        desc: '회사는 무료로 제공되는 서비스와 관련하여 이용자에게 어떠한 손해가 발생하더라도 회사가 고의 또는 중대한 과실로 행한 손해를 제외하고는 이에 대하여 책임을 지지 않습니다.',
      },
      {
        no: 14,
        title: '면책조항',
        items: [
          '회사는 천재지변 또는 이에 준하는 불가항력으로 인하여 서비스를 제공할 수 없는 경우에는 서비스 제공에 관한 책임이 면제됩니다.',
          '회사는 이용자의 귀책사유로 인한 서비스 이용의 장애에 대하여 책임을 지지 않습니다.',
          '회사는 이용자가 서비스를 이용하여 기대하는 수익을 얻지 못하거나 상실한 것에 대하여 책임을 지지 않습니다.',
        ],
      },
      {
        no: 15,
        title: '관할법원',
        desc: '서비스 이용과 관련하여 회사와 이용자 간에 분쟁이 발생한 경우 양 당사자 간의 합의에 의해 원만히 해결하여야 하며, 합의가 이루어지지 않을 경우 회사의 본사 소재지를 관할하는 법원을 관할법원으로 합니다.',
      },
    ],
  },
]

/** 시행일 안내 */
const EFFECTIVE = [
  { label: '공고일자', value: '2026년 1월 1일' },
  { label: '시행일자', value: '2026년 1월 8일' },
]

/** ①②③ — 참고 페이지의 동그라미 숫자 목록 */
function CircleNum({ n }: { n: number }) {
  return (
    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-slate-400 text-[11px] font-medium leading-none text-slate-600">
      {n}
    </span>
  )
}

/**
 * 이용약관 — 참고 페이지(인천공항 이용약관)처럼 위쪽 안내, 조문 목차,
 * 장·조 제목과 ①②③ 항, 1) 2) 하위 목록으로 구성한다.
 */
export default function TermsPage() {
  usePageTitle('이용약관')
  const articles = CHAPTERS.flatMap((c) => c.articles)

  return (
    <>
      <PageHero title="이용약관" tabs={POLICY_TABS} />

      <section className="pb-24 pt-20 sm:pt-24">
        <div className="container-wnc max-w-5xl">
          {/* 안내 상자 */}
          <Reveal className="border border-slate-200 bg-slate-50 px-6 py-6 sm:px-8">
            <ul className="space-y-2 text-[0.95rem] leading-[1.8] text-slate-700">
              {NOTICE.map((line) => (
                <li key={line} className="relative pl-4 before:absolute before:left-0 before:top-[0.8em] before:h-1 before:w-1 before:rounded-full before:bg-slate-500">
                  {line}
                </li>
              ))}
            </ul>
          </Reveal>

          {/* 조문 목차 — 누르면 해당 조로 이동한다. */}
          <Reveal index={1} className="mt-8 border-t border-b border-slate-300 py-6">
            <ul className="flex flex-wrap gap-x-2 gap-y-2">
              {articles.map((a) => (
                <li key={a.no}>
                  <a
                    href={`#article-${a.no}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-sm text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
                  >
                    <strong className="font-semibold">제{a.no}조</strong>
                    <span className="text-slate-500">{a.title}</span>
                  </a>
                </li>
              ))}
            </ul>
          </Reveal>

          {/* 본문 */}
          {CHAPTERS.map((chapter) => (
            <div key={chapter.title} className="mt-14 sm:mt-16">
              <Reveal>
                <h2 className="border-b-2 border-slate-900 pb-4 text-2xl font-bold tracking-tight text-slate-900">
                  {chapter.title}
                </h2>
              </Reveal>

              {chapter.articles.map((a, ai) => (
                <article key={a.no} id={`article-${a.no}`} className="scroll-mt-28 border-b border-slate-200 py-8">
                <Reveal index={ai} step={60}>
                  <h3 className="text-lg font-bold text-slate-900">
                    제{a.no}조 <span className="font-semibold">({a.title})</span>
                  </h3>
                  {a.desc && <p className="mt-3 text-[0.95rem] leading-[1.9] text-slate-700">{a.desc}</p>}
                  {a.items && (
                    <ol className="mt-3 space-y-2.5">
                      {a.items.map((item, i) => {
                        const text = typeof item === 'string' ? item : item.text
                        const sub = typeof item === 'string' ? [] : item.sub
                        return (
                          <li key={text} className="flex gap-2.5 text-[0.95rem] leading-[1.9] text-slate-700">
                            <CircleNum n={i + 1} />
                            <div className="min-w-0">
                              <p>{text}</p>
                              {sub.length > 0 && (
                                <ul className="mt-1.5 space-y-1 pl-1 text-slate-600">
                                  {sub.map((s, si) => (
                                    <li key={s}>
                                      {si + 1}) {s}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </li>
                        )
                      })}
                    </ol>
                  )}
                </Reveal>
                </article>
              ))}
            </div>
          ))}

          {/* 부칙 */}
          <Reveal className="mt-14 border-t-2 border-slate-900 pt-8">
            <h2 className="text-xl font-bold text-slate-900">부칙</h2>
            <p className="mt-3 text-[0.95rem] leading-[1.9] text-slate-700">본 약관은 아래 시행일자부터 적용됩니다.</p>
            <dl className="mt-4 flex flex-wrap gap-x-10 gap-y-2 text-[0.95rem]">
              {EFFECTIVE.map((e) => (
                <div key={e.label} className="flex gap-3">
                  <dt className="font-semibold text-slate-900">{e.label}</dt>
                  <dd className="tabular-nums text-slate-700">{e.value}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
      </section>
    </>
  )
}
