import { useState, type FormEvent } from 'react'
import type { ContactInput } from '@wnc/shared'
import { api } from '../../lib/api'
import PageHero from '../../components/PageHero'
import { ErrorMessage } from '../../components/ui'

const EMPTY: ContactInput = { name: '', email: '', phone: '', company: '', message: '' }

const INFO = [
  {
    label: '주소',
    value: '서울특별시 강남구 테헤란로 123, 8층',
    icon: 'M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z',
  },
  {
    label: '전화',
    value: '02-1234-5678',
    icon: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z',
  },
  {
    label: '이메일',
    value: 'contact@wnc.co.kr',
    icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  },
  {
    label: '운영시간',
    value: '평일 09:00 - 18:00 (점심 12:00 - 13:00)',
    icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  },
]

export default function ContactPage() {
  const [form, setForm] = useState<ContactInput>(EMPTY)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

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
      <PageHero
        title="문의하기"
        description="프로젝트 문의나 궁금하신 점을 남겨주시면 담당자가 1영업일 내에 연락드립니다."
      />

      <section className="py-16">
        <div className="container-wnc grid gap-12 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
          <div>
            <h2 className="text-xl font-bold text-slate-900">연락처 안내</h2>
            <ul className="mt-8 space-y-6">
              {INFO.map((item) => (
                <li key={item.label} className="flex gap-4">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500">{item.label}</p>
                    <p className="mt-0.5 text-slate-900">{item.value}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="card p-8">
            {done ? (
              <div className="py-12 text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-green-100 text-green-600">
                  <svg className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="mt-5 text-lg font-bold text-slate-900">문의가 접수되었습니다</h3>
                <p className="mt-2 text-sm text-slate-600">
                  담당자가 확인 후 1영업일 내에 연락드리겠습니다.
                </p>
                <button type="button" onClick={() => setDone(false)} className="btn-secondary mt-6">
                  새 문의 작성
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && <ErrorMessage message={error} />}

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="name" className="label">
                      이름 <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="name"
                      required
                      maxLength={50}
                      value={form.name}
                      onChange={(e) => set('name', e.target.value)}
                      className="input"
                      placeholder="홍길동"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="label">
                      이메일 <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="email"
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => set('email', e.target.value)}
                      className="input"
                      placeholder="name@example.com"
                    />
                  </div>
                  <div>
                    <label htmlFor="phone" className="label">
                      연락처
                    </label>
                    <input
                      id="phone"
                      value={form.phone}
                      onChange={(e) => set('phone', e.target.value)}
                      className="input"
                      placeholder="010-0000-0000"
                    />
                  </div>
                  <div>
                    <label htmlFor="company" className="label">
                      회사명
                    </label>
                    <input
                      id="company"
                      value={form.company}
                      onChange={(e) => set('company', e.target.value)}
                      className="input"
                      placeholder="(주)워드앤코드"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="message" className="label">
                    문의 내용 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="message"
                    required
                    rows={7}
                    maxLength={5000}
                    value={form.message}
                    onChange={(e) => set('message', e.target.value)}
                    className="input resize-none"
                    placeholder="문의하실 내용을 자유롭게 작성해 주세요."
                  />
                </div>

                <p className="text-xs leading-relaxed text-slate-500">
                  입력하신 정보는 문의 응대 목적으로만 사용되며, 처리 완료 후 관련 법령에 따라
                  보관·파기됩니다.
                </p>

                <button type="submit" disabled={submitting} className="btn-primary w-full py-3">
                  {submitting ? '전송 중...' : '문의 보내기'}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </>
  )
}
