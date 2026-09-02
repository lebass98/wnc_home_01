import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Faq } from '@wnc/shared'
import { api } from '../../lib/api'
import PageHero from '../../components/PageHero'
import Reveal from '../../components/Reveal'
import { Loading } from '../../components/ui'
import { usePageTitle } from '../../lib/seo'

/** 문의하기 묶음 안에서 오갈 수 있는 페이지 */
export const CONTACT_TABS = [
  { to: '/contact', label: '문의하기' },
  { to: '/contact/faq', label: '자주 묻는 질문' },
]

/**
 * 자주 묻는 질문 — 참고 템플릿(THEME029 FAQ)처럼 영문 소제목과 큰 제목 아래에
 * 'Q.' 로 시작하는 질문을 한 줄씩 늘어놓고, 누르면 답이 아래로 펼쳐진다.
 * 질문과 답변은 관리자 › 자주 묻는 질문에서 관리한다.
 */
export default function FaqPage() {
  usePageTitle('자주 묻는 질문')
  const [faqs, setFaqs] = useState<Faq[]>([])
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState<number | null>(null)

  useEffect(() => {
    api<Faq[]>('/faqs')
      .then((items) => {
        setFaqs(items)
        // 첫 질문은 펼쳐 둔다.
        setOpenId(items[0]?.id ?? null)
      })
      .catch(() => setFaqs([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <>
      <PageHero title="문의하기" tabs={CONTACT_TABS} />

      <section className="pb-24 pt-24 sm:pt-28">
        <div className="container-wnc">
          {/* 제목 — 영문 소제목, 큰 제목 */}
          <Reveal>
            <p className="text-[0.95rem] font-medium tracking-wide text-mint-400">Wordncode FAQ</p>
          </Reveal>
          <Reveal index={1}>
            <h2 className="mt-3 text-[1.75rem] font-bold leading-[1.4] tracking-tight text-slate-900 sm:text-[2rem]">
              워드앤코드 자주 묻는 질문
            </h2>
          </Reveal>

          {/* 질문 목록 — 위에 굵은 검정 선, 질문마다 옅은 선 */}
          {loading ? (
            <div className="mt-16">
              <Loading />
            </div>
          ) : faqs.length === 0 ? (
            <p className="mt-16 border-t border-slate-900 py-16 text-center text-slate-500">
              아직 등록된 질문이 없습니다. 궁금한 점은 문의하기로 남겨 주세요.
            </p>
          ) : (
            <ul className="mt-12 border-t border-slate-900 sm:mt-16">
              {faqs.map((item, i) => {
                const open = openId === item.id
                return (
                  <Reveal as="li" key={item.id} index={i} step={50} className="border-b border-slate-200">
                    <button
                      type="button"
                      onClick={() => setOpenId(open ? null : item.id)}
                      aria-expanded={open}
                      className="group flex w-full items-center gap-4 py-6 text-left sm:gap-6 sm:py-7"
                    >
                      <span className="w-8 shrink-0 font-mono text-lg font-semibold text-mint-500">Q.</span>
                      <span className="flex flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
                        {item.category && (
                          <span className="shrink-0 text-xs font-medium text-slate-400 sm:w-20">{item.category}</span>
                        )}
                        <span
                          className={`text-[1.05rem] leading-snug transition group-hover:text-mint-700 ${
                            open ? 'font-semibold text-slate-900' : 'font-medium text-slate-800'
                          }`}
                        >
                          {item.question}
                        </span>
                      </span>
                      {/* 열림 표시 — 닫혀 있으면 +, 열리면 − 로 바뀐다. */}
                      <span
                        className={`relative h-5 w-5 shrink-0 transition group-hover:text-slate-900 ${
                          open ? 'text-slate-900' : 'text-slate-400'
                        }`}
                        aria-hidden
                      >
                        <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-current" />
                        <span
                          className={`absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-current transition-transform duration-300 ${
                            open ? 'scale-y-0' : 'scale-y-100'
                          }`}
                        />
                      </span>
                    </button>

                    {/* 답변 — 높이를 자연스럽게 열고 닫는다. */}
                    <div
                      className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                        open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div className="mb-7 bg-slate-50 px-6 py-6 sm:ml-14 sm:px-8">
                          <p className="whitespace-pre-wrap text-[0.95rem] leading-[1.9] text-slate-600">{item.answer}</p>
                        </div>
                      </div>
                    </div>
                  </Reveal>
                )
              })}
            </ul>
          )}

          {/* 못 찾았을 때 — 문의하기로 안내 */}
          <Reveal className="mt-16 flex flex-col items-start justify-between gap-6 border-t border-slate-900 pt-10 sm:flex-row sm:items-center">
            <div>
              <p className="text-lg font-bold text-slate-900">원하는 답을 찾지 못하셨나요?</p>
              <p className="mt-2 text-[0.95rem] text-slate-600">문의를 남겨 주시면 담당자가 1영업일 내에 연락드립니다.</p>
            </div>
            <Link
              to="/contact"
              className="inline-flex shrink-0 bg-mint-400 px-8 py-3 text-sm font-semibold text-white transition hover:bg-mint-500"
            >
              문의하기
            </Link>
          </Reveal>
        </div>
      </section>
    </>
  )
}
