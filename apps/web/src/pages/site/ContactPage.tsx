import { useEffect, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import type { ContactInput } from '@wnc/shared'
import { DEFAULT_COMPANY } from '@wnc/shared'
import { api } from '../../lib/api'
import SubPage from '../../components/SubPage'
import Reveal from '../../components/Reveal'
import { ErrorMessage } from '../../components/ui'
import { usePageTitle, useSiteSetting } from '../../lib/seo'
import { CONTACT_TABS } from './FaqPage'

const EMPTY: ContactInput = { name: '', email: '', phone: '', company: '', message: '' }

/** 왼쪽 연락처 — 환경설정 > 회사 정보에서 읽는다. 비어 있는 항목은 감춘다. */
function contactInfo(c: typeof DEFAULT_COMPANY) {
  return [
    { label: 'ADDRESS', value: [c.zipCode ? `[${c.zipCode}] ${c.address}` : c.address] },
    { label: 'TEL', value: [c.tel] },
    { label: 'E-MAIL', value: [c.email] },
    { label: 'HOURS', value: c.hours.split('\n') },
  ]
    .map((item) => ({ ...item, value: item.value.map((v) => v.trim()).filter(Boolean) }))
    .filter((item) => item.value.length > 0)
}

/** 문의 절차 — 접수 뒤 어떻게 진행되는지 세 단계로 */
const STEPS = [
  { no: '1', title: '문의 접수', desc: '아래 양식으로 남겨 주시면 담당자에게 바로 전달됩니다.' },
  { no: '2', title: '담당자 연락', desc: '1영업일 내에 이메일이나 전화로 범위와 일정을 확인합니다.' },
  { no: '3', title: '견적·제안', desc: '확인한 내용을 바탕으로 항목별 견적과 진행 방식을 드립니다.' },
]

/** 밑줄만 있는 입력칸 — 참고 템플릿처럼 단순하게 */
const FIELD =
  'w-full border-0 border-b border-slate-300 bg-transparent px-0 py-3 text-[0.95rem] text-slate-900 placeholder:text-slate-400 transition focus:border-slate-900 focus:outline-none focus:ring-0'

export default function ContactPage() {
  const INFO = contactInfo(useSiteSetting() ?? DEFAULT_COMPANY)
  usePageTitle('문의하기')
  const [searchParams] = useSearchParams()
  const [form, setForm] = useState<ContactInput>(EMPTY)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  // 제품 상세에서 넘어온 경우 문의 내용을 미리 채워 준다.
  useEffect(() => {
    const product = searchParams.get('product')
    if (product) {
      setForm((prev) => ({ ...prev, message: `[제품 문의] ${product}\n\n` }))
    }
  }, [searchParams])

  function set<K extends keyof ContactInput>(key: K, value: ContactInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await api('/contacts', { method: 'POST', body: form })
      setDone(true)
      setForm(EMPTY)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <SubPage title="문의하기" tabs={CONTACT_TABS}>

      {/* 소개 — 왼쪽 제목, 오른쪽 문의 절차 세 단계 */}
      <section className="pt-24 sm:pt-28">
        <div className="container-wnc grid gap-10 lg:grid-cols-[minmax(0,20rem)_1fr] lg:gap-16">
          <div>
            <Reveal>
              <p className="text-[0.95rem] font-medium tracking-wide text-mint-400">Contact Us</p>
            </Reveal>
            <h2 className="mt-3 text-[1.75rem] font-bold leading-[1.4] tracking-tight text-slate-900 sm:text-[2rem]">
              {['무엇이든', '편하게 물어보세요'].map((line, i) => (
                <Reveal key={line} as="span" index={i + 1} className="block">
                  {line}
                </Reveal>
              ))}
            </h2>
            <Reveal index={3} className="mt-7 h-px w-14 bg-slate-900" />
            <Reveal as="p" index={4} className="mt-7 text-[0.95rem] leading-[1.9] text-slate-600">
              프로젝트 문의나 궁금하신 점을 남겨 주시면 담당자가 1영업일 내에 연락드립니다. 자주 묻는 질문에서
              먼저 답을 찾아보실 수도 있습니다.
            </Reveal>
            <Reveal index={5} className="mt-6">
              <Link to="/contact/faq" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 transition hover:text-mint-700">
                자주 묻는 질문 보기
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </Reveal>
          </div>

          <div className="grid gap-8 sm:grid-cols-3 sm:gap-6">
            {STEPS.map((s, i) => (
              <Reveal key={s.no} index={i} className="border-t border-slate-900 pt-6">
                <p className="tabular-nums text-2xl font-semibold text-mint-400">{s.no}</p>
                <h3 className="mt-3 font-bold text-slate-900">{s.title}</h3>
                <p className="mt-3 text-[0.95rem] leading-[1.8] text-slate-600">{s.desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 연락처 · 문의 양식 */}
      <section className="py-20 sm:py-24">
        <div className="container-wnc grid gap-14 lg:grid-cols-[minmax(0,20rem)_1fr] lg:gap-16">
          <div>
            <Reveal>
              <h3 className="text-xl font-bold text-slate-900">연락처</h3>
            </Reveal>
            <dl className="mt-8 space-y-7">
              {INFO.map((item, i) => (
                <Reveal key={item.label} index={i + 1} className="border-b border-slate-200 pb-6">
                  <dt className="text-xs font-semibold tracking-[0.2em] text-mint-500">{item.label}</dt>
                  <dd className="mt-2 text-[0.95rem] leading-[1.8] text-slate-900">
                    {item.value.map((line) => (
                      <span key={line} className="block">
                        {line}
                      </span>
                    ))}
                  </dd>
                </Reveal>
              ))}
            </dl>
            {/* 지도 자리 — 외부 이미지 없이 그라데이션으로 그린다. */}
            <Reveal
              index={5}
              className="mt-8 h-52"
              style={{ background: 'linear-gradient(135deg, #dfe7ec 0%, #93aab8 100%)' }}
            />
          </div>

          <Reveal index={1} className="border-t border-slate-900 pt-8">
            {done ? (
              <div className="py-16 text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-mint-50 text-mint-600">
                  <svg className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="mt-6 text-xl font-bold text-slate-900">문의가 접수되었습니다</h3>
                <p className="mt-3 text-[0.95rem] text-slate-600">담당자가 확인 후 1영업일 내에 연락드리겠습니다.</p>
                <button
                  type="button"
                  onClick={() => setDone(false)}
                  className="mt-8 inline-flex border border-slate-900 px-8 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-900 hover:text-white"
                >
                  새 문의 작성
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-8">
                {error && <ErrorMessage message={error} />}

                <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
                  <div>
                    <label htmlFor="name" className="text-sm font-semibold text-slate-900">
                      이름 <span className="text-mint-500">*</span>
                    </label>
                    <input
                      id="name"
                      required
                      maxLength={50}
                      value={form.name}
                      onChange={(e) => set('name', e.target.value)}
                      className={FIELD}
                      placeholder="홍길동"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="text-sm font-semibold text-slate-900">
                      이메일 <span className="text-mint-500">*</span>
                    </label>
                    <input
                      id="email"
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => set('email', e.target.value)}
                      className={FIELD}
                      placeholder="name@example.com"
                    />
                  </div>
                  <div>
                    <label htmlFor="phone" className="text-sm font-semibold text-slate-900">
                      연락처
                    </label>
                    <input
                      id="phone"
                      value={form.phone}
                      onChange={(e) => set('phone', e.target.value)}
                      className={FIELD}
                      placeholder="010-0000-0000"
                    />
                  </div>
                  <div>
                    <label htmlFor="company" className="text-sm font-semibold text-slate-900">
                      회사명
                    </label>
                    <input
                      id="company"
                      value={form.company}
                      onChange={(e) => set('company', e.target.value)}
                      className={FIELD}
                      placeholder="(주)워드앤코드"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="message" className="text-sm font-semibold text-slate-900">
                    문의 내용 <span className="text-mint-500">*</span>
                  </label>
                  <textarea
                    id="message"
                    required
                    rows={6}
                    maxLength={5000}
                    value={form.message}
                    onChange={(e) => set('message', e.target.value)}
                    className={`${FIELD} resize-none`}
                    placeholder="문의하실 내용을 자유롭게 작성해 주세요."
                  />
                </div>

                <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs leading-relaxed text-slate-500">
                    입력하신 정보는 문의 응대 목적으로만 사용되며, 처리 완료 후 관련 법령에 따라 보관·파기됩니다.
                  </p>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex shrink-0 items-center gap-2 bg-slate-900 px-10 py-3.5 text-sm font-semibold text-white transition hover:bg-mint-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? '전송 중...' : '문의 보내기'}
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </form>
            )}
          </Reveal>
        </div>
      </section>
      </SubPage>
    </>
  )
}
