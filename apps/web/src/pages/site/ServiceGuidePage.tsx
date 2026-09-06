import { Link } from 'react-router-dom'
import { DEFAULT_COMPANY } from '@wnc/shared'
import SubPage from '../../components/SubPage'
import SectionHeading from '../../components/SectionHeading'
import Reveal from '../../components/Reveal'
import { usePageTitle, useSiteSetting } from '../../lib/seo'

/**
 * 서비스 — 상담부터 오픈 이후까지, 워드앤코드 서비스를 어떻게 이용하는지 안내하는 화면.
 * (참고: 위븐 THEME013 '관람안내' https://zaemit.com/previewTheme?id=THEME013&rev=1&uri=guide)
 *
 * 참고 화면의 차례를 그대로 따른다.
 *  1. 왼쪽 정렬 두 줄 제목 → 가로로 꽉 찬 사진
 *  2. 왼쪽 제목 + 강조색 시간 / 오른쪽 안내 표 (구분 · 기본형 · 맞춤형 · 지원 사항)
 *  3. 왼쪽 제목 / 오른쪽 특징 세 묶음 (강조색 소제목, 사이는 옅은 선)
 *  4. 사진 두 장 (왼쪽 좁게, 오른쪽 넓게)
 *  5. 왼쪽 제목 / 오른쪽 번호 붙은 2×2 항목
 * 메뉴에서는 사업분야 묶음의 2차 항목이다. 사업분야(/services)는 '무엇을 하는지', 여기는 '어떻게 이용하는지'.
 */

const asset = (path: string) => {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

/** 서비스 구성 안내 표 — 구분별로 기본형·맞춤형이 어떻게 다른지 */
// 기간·무상 범위 같은 숫자는 자주 묻는 질문(FAQ)의 답과 같아야 한다 — 두 화면이 다른 말을 하면 안 된다.
const PLAN_ROWS = [
  {
    label: '기획·설계',
    basic: '검증된 틀에서 시작',
    custom: '요구사항에 맞춰 설계',
  },
  { label: '디자인', basic: '테마 고르기', custom: '전용 디자인 제작' },
  {
    label: '제작 기간',
    basic: '소개 사이트 4~6주',
    custom: '관리자 포함 8~12주',
  },
]

/** 표 오른쪽 '지원 사항' 칸 — 두 구성 모두에 붙는다. */
const PLAN_SUPPORT = [
  '납품 후 1년 무상 유지보수',
  '필요하면 사용 설명서와 짧은 교육 제공',
  '이후 월 단위 유지보수 계약으로 연장',
]

/** 표 아래 작은 안내 */
const PLAN_NOTES = [
  '일정과 범위는 상담 뒤에 확정되며, 착수 전에 주 단위 일정을 공유합니다.',
  '견적은 화면 수·기능·일정을 기준으로 항목별로 드리고, 견적 상담은 무료입니다.',
]

/** 서비스 특징 세 묶음 */
const FEATURES = [
  {
    title: '첫째, 따로 배우지 않아도 운영',
    body: '관리자 화면을 단순하게 정리해 담당자가 전문 교육 없이도 바로 쓸 수 있습니다. 글을 올리고 팝업을 띄우고 메뉴를 바꾸는 일이 모두 화면 안에서 끝나고, 막히는 부분은 사용 설명서로 확인할 수 있습니다.',
  },
  {
    title: '둘째, 화면에서 직접 관리',
    body: '공지사항과 멀티미디어 게시판을 기본으로 갖추고, 메뉴·페이지·팝업을 관리자 화면에서 바로 다룹니다. 새 메뉴를 만들거나 페이지를 고치는 일을 담당자가 직접 처리할 수 있어 별도의 유지관리 요청 없이도 홈페이지가 계속 살아 있습니다.',
  },
  {
    title: '셋째, 오픈 이후에도 함께',
    body: '오픈이 끝이 아닙니다. 납품 후 1년은 오류 수정과 보안 업데이트를 무상으로 맡고, 평일 업무 시간에는 접수 1시간 안에 1차 답변을 드립니다. 클라우드 전환이나 데이터 분석처럼 운영 중에 새로 필요해지는 일도 같은 팀이 이어서 맡습니다.',
  },
]

/** 알차게 이용하는 방법 — 번호 붙은 네 항목 */
const TIPS = [
  {
    no: '1',
    title: '무료 상담으로 시작',
    body: '문의하기 화면에 하고 싶은 일을 남겨 주시면 담당자가 1영업일 안에 연락드립니다. 견적 상담은 무료이며, 규모와 일정에 맞춰 기본형과 맞춤형 중 어느 쪽이 맞는지 함께 정합니다.',
  },
  {
    no: '2',
    title: '검증된 틀로 빠른 오픈',
    body: '기본형은 이미 검증된 화면 구성에서 시작해 내용만 채우므로, 소개 사이트 기준 4~6주 안에 열 수 있습니다. 착수 전에 주 단위 일정을 확정하고 2주마다 동작하는 화면을 보여 드립니다.',
  },
  {
    no: '3',
    title: '유지보수 계약으로 안심',
    body: '납품 후 1년은 오류 수정·보안 업데이트·소규모 문구 변경을 무상으로 맡습니다. 그 뒤에는 월 단위 유지보수 계약으로 이어 가며, 대응 기준과 시간은 계약서에 명시합니다.',
  },
  {
    no: '4',
    title: '필요할 때 사용 안내',
    body: '따로 배우지 않아도 쓸 수 있게 만들었지만, 원하시면 사용 설명서와 짧은 교육을 드립니다. 담당자가 바뀌어도 설명서로 그대로 이어받을 수 있습니다.',
  },
]

export default function ServiceGuidePage() {
  usePageTitle('서비스')
  // 상담 시간은 [환경설정]의 업무시간을 그대로 쓴다 — 빈 줄·중복 줄은 거르고, 첫 줄에서 시간만 골라 크게 쓴다.
  const company = useSiteSetting() ?? DEFAULT_COMPANY
  const hoursLines = [
    ...new Set(
      company.hours
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean),
    ),
  ]
  const [hoursMain = '', ...hoursRest] = hoursLines
  // '평일 09:00 - 18:00' 처럼 시간이 있으면 그 부분만 크게, 나머지('평일')는 작은 글자로.
  // 구분자는 '-' '~' '–' 를 모두 받고, 시간을 못 찾으면 큰 글자 없이 줄만 보여 준다.
  const hoursMatch = hoursMain.match(/^(.*?)(\d{1,2}:\d{2}\s*[-~–]\s*\d{1,2}:\d{2})(.*)$/)
  const hoursTime = hoursMatch ? hoursMatch[2].replace(/\s+/g, ' ') : null
  const hoursLabel = [hoursMatch ? `${hoursMatch[1]}${hoursMatch[3]}`.trim() : hoursMain, ...hoursRest].filter(Boolean)

  return (
    <SubPage
      title="서비스"
      description="어떻게 시작하고, 무엇이 포함되며, 오픈 뒤에는 어떻게 이어지는지 — 워드앤코드 서비스의 이용 안내입니다."
    >
      {/* 소개 — 왼쪽 정렬 두 줄 제목, 그 아래 가로로 꽉 찬 사진 */}
      <section className="pt-24 sm:pt-28">
        <div className="container-wnc">
          <SectionHeading
            eyebrow="Service Guide"
            title={['상담부터 오픈 이후까지, 워드앤코드', '서비스 이용에 대한 모든 것']}
            align="left"
          />
          <Reveal
            index={2}
            className="group relative mt-12 h-72 overflow-hidden rounded-sm shadow-md sm:h-[26rem] lg:h-[32rem]"
          >
            <img
              src={asset('/images/about/about_strength_01.jpg')}
              alt="워드앤코드 서비스 운영 화면"
              className="h-full w-full object-cover object-center transition duration-700 group-hover:scale-[1.03]"
            />
            <div
              className="absolute inset-0 bg-slate-900/10 transition duration-300 group-hover:bg-transparent"
              aria-hidden
            />
          </Reveal>
        </div>
      </section>

      {/* 상담 시간과 서비스 구성 — 왼쪽 제목·시간, 오른쪽 표 */}
      <section className="py-24 sm:py-28">
        <div className="container-wnc grid gap-10 lg:grid-cols-[minmax(0,20rem)_1fr] lg:gap-16">
          <div>
            <SectionHeading eyebrow="Consulting Hours" title={['서비스 상담시간', '및 구성 안내']} align="left" />
            {(hoursTime || hoursLabel.length > 0) && (
              <Reveal index={3} className="mt-8">
                {hoursTime && (
                  <p className="text-2xl font-bold tabular-nums tracking-tight text-mint-500 sm:text-[1.75rem]">
                    {hoursTime}
                  </p>
                )}
                {hoursLabel.map((line) => (
                  <p key={line} className="mt-2 text-[0.95rem] text-slate-600">
                    {line}
                  </p>
                ))}
              </Reveal>
            )}
          </div>

          <Reveal className="min-w-0">
            {/* 표 — 좁은 화면에서는 옆으로 밀어 본다 */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[32rem] border-t border-slate-300 text-center text-[0.95rem]">
                <caption className="sr-only">
                  서비스 구성 안내 — 기본형과 맞춤형의 기획·디자인·제작 기간과 지원 사항
                </caption>
                <thead>
                  <tr className="bg-mint-50 text-sm font-semibold text-slate-900">
                    <th scope="col" className="border-b border-slate-200 px-4 py-3.5 font-semibold">
                      구분
                    </th>
                    <th scope="col" className="border-b border-l border-slate-200 px-4 py-3.5 font-semibold">
                      기본형
                    </th>
                    <th scope="col" className="border-b border-l border-slate-200 px-4 py-3.5 font-semibold">
                      맞춤형
                    </th>
                    <th scope="col" className="border-b border-l border-slate-200 px-4 py-3.5 font-semibold">
                      지원 사항
                    </th>
                  </tr>
                </thead>
                <tbody className="text-slate-700">
                  {PLAN_ROWS.map((row, i) => (
                    <tr key={row.label}>
                      <th scope="row" className="whitespace-nowrap border-b border-slate-200 px-4 py-4 font-medium text-slate-900">
                        {row.label}
                      </th>
                      <td className="border-b border-l border-slate-200 px-4 py-4">{row.basic}</td>
                      <td className="border-b border-l border-slate-200 px-4 py-4">{row.custom}</td>
                      {/* 지원 사항은 모든 구성에 같이 붙으므로 한 칸으로 합친다 */}
                      {i === 0 && (
                        <td
                          rowSpan={PLAN_ROWS.length}
                          className="border-b border-l border-slate-200 px-5 py-4 text-left align-middle text-sm leading-[1.9] text-slate-600"
                        >
                          <ul>
                            {PLAN_SUPPORT.map((s) => (
                              <li key={s}>- {s}</li>
                            ))}
                          </ul>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="mt-5 space-y-1 text-sm text-slate-500">
              {PLAN_NOTES.map((n) => (
                <li key={n}>- {n}</li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* 서비스 특징 — 왼쪽 제목, 오른쪽 세 묶음. 사이는 옅은 선 */}
      <section className="pb-24 sm:pb-28">
        <div className="container-wnc grid gap-10 lg:grid-cols-[minmax(0,20rem)_1fr] lg:gap-16">
          <SectionHeading
            eyebrow="Service Features"
            title={['담당자가 직접 운영하는', '워드앤코드', '서비스 둘러보기']}
            align="left"
          />

          <div className="divide-y divide-slate-200">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} index={i} className="py-9 first:pt-0 last:pb-0">
                <h3 className="text-lg font-semibold text-mint-600">{f.title}</h3>
                <p className="mt-4 text-[0.95rem] leading-[1.9] text-slate-600">{f.body}</p>
              </Reveal>
            ))}
          </div>
        </div>

        {/* 사진 두 장 — 왼쪽 좁게, 오른쪽 넓게 */}
        <div className="container-wnc mt-20 grid gap-6 md:grid-cols-[2fr_5fr]">
          <Reveal className="group relative h-64 overflow-hidden rounded-sm shadow-md sm:h-80">
            <img
              src={asset('/images/main/main_service_01.jpg')}
              alt="태블릿으로 관리자 화면을 다루는 담당자"
              className="h-full w-full object-cover object-center transition duration-500 group-hover:scale-105"
              loading="lazy"
            />
            <div
              className="absolute inset-0 bg-slate-900/10 transition duration-300 group-hover:bg-transparent"
              aria-hidden
            />
          </Reveal>
          <Reveal index={1} className="group relative h-64 overflow-hidden rounded-sm shadow-md sm:h-80">
            <img
              src={asset('/images/main/main_project_01.jpg')}
              alt="여러 화면에서 함께 쓰는 워드앤코드 서비스"
              className="h-full w-full object-cover object-center transition duration-500 group-hover:scale-105"
              loading="lazy"
            />
            <div
              className="absolute inset-0 bg-slate-900/10 transition duration-300 group-hover:bg-transparent"
              aria-hidden
            />
          </Reveal>
        </div>
      </section>

      {/* 이용 방법 — 왼쪽 제목, 오른쪽 번호 붙은 2×2 */}
      <section className="border-t border-slate-200 py-24 sm:py-28">
        <div className="container-wnc grid gap-10 lg:grid-cols-[minmax(0,20rem)_1fr] lg:gap-16">
          <SectionHeading eyebrow="How To Use" title={['워드앤코드를 알차게', '이용하는 방법']} align="left" />

          <ol className="grid gap-x-10 gap-y-12 sm:grid-cols-2">
            {TIPS.map((tip, i) => (
              <Reveal as="li" key={tip.no} index={i} className="border-t border-slate-300 pt-6">
                <p className="tabular-nums text-xl font-semibold text-mint-400">{tip.no}</p>
                <h3 className="mt-3 text-lg font-bold text-slate-900">{tip.title}</h3>
                <p className="mt-3 text-[0.95rem] leading-[1.9] text-slate-600">{tip.body}</p>
              </Reveal>
            ))}
          </ol>
        </div>

        <Reveal className="container-wnc mt-20 text-center">
          <Link
            to="/contact"
            className="inline-flex bg-mint-400 px-8 py-3 text-sm font-semibold text-white transition hover:bg-mint-500"
          >
            서비스 상담 신청
          </Link>
        </Reveal>
      </section>
    </SubPage>
  )
}
