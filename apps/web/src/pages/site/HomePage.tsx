import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Paginated, PostListItem } from '@wnc/shared'
import { BOARD_CATEGORY_LABEL } from '@wnc/shared'
import { api, qs } from '../../lib/api'
import { formatDate } from '../../lib/format'
import { Badge } from '../../components/ui'

const FEATURES = [
  {
    title: '웹·모바일 개발',
    desc: '기획부터 디자인, 개발, 운영까지 서비스의 전 과정을 함께합니다.',
    icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  },
  {
    title: '클라우드 전환',
    desc: '안정적이고 확장 가능한 클라우드 인프라로 비즈니스를 이전합니다.',
    icon: 'M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z',
  },
  {
    title: '데이터 분석',
    desc: '흩어진 데이터를 모아 의사결정에 필요한 인사이트로 만듭니다.',
    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  },
  {
    title: '기술 컨설팅',
    desc: '현재 시스템을 진단하고 가장 현실적인 개선 방향을 제안합니다.',
    icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
  },
]

const STATS = [
  { value: '150+', label: '누적 프로젝트' },
  { value: '12년', label: '업력' },
  { value: '98%', label: '고객 재계약률' },
  { value: '45명', label: '전문 인력' },
]

export default function HomePage() {
  const [posts, setPosts] = useState<PostListItem[]>([])

  useEffect(() => {
    api<Paginated<PostListItem>>(`/posts${qs({ pageSize: 3 })}`)
      .then((res) => setPosts(res.items))
      .catch(() => setPosts([]))
  }, [])

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-slate-900">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 30%, #3b82f6 0, transparent 45%), radial-gradient(circle at 80% 70%, #1d4ed8 0, transparent 45%)',
          }}
          aria-hidden
        />
        <div className="container-wnc relative py-24 sm:py-32">
          <div className="max-w-3xl">
            <span className="inline-flex rounded-full bg-brand-600/20 px-3 py-1 text-xs font-semibold text-brand-300 ring-1 ring-inset ring-brand-500/30">
              Word &amp; Code
            </span>
            <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl">
              기술로 비즈니스의
              <br />
              다음 단계를 만듭니다
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-slate-300">
              워드앤코드는 웹·모바일 서비스 개발과 클라우드 전환을 통해 고객의 디지털 전환을 돕는 IT
              솔루션 기업입니다.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link to="/contact" className="btn-primary px-6 py-3">
                프로젝트 상담하기
              </Link>
              <Link
                to="/services"
                className="btn border border-slate-600 px-6 py-3 text-white hover:bg-slate-800"
              >
                사업분야 보기
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 통계 */}
      <section className="border-b border-slate-200 bg-white">
        <div className="container-wnc grid grid-cols-2 gap-8 py-12 lg:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-3xl font-bold text-brand-600">{s.value}</p>
              <p className="mt-1.5 text-sm text-slate-600">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 서비스 */}
      <section className="py-20 sm:py-24">
        <div className="container-wnc">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">우리가 하는 일</h2>
            <p className="mt-4 text-slate-600">
              기획부터 운영까지, 서비스에 필요한 모든 단계를 한 팀에서 책임집니다.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="card p-6 transition hover:shadow-md">
                <div className="grid h-11 w-11 place-items-center rounded-lg bg-brand-50 text-brand-600">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d={f.icon} />
                  </svg>
                </div>
                <h3 className="mt-5 font-semibold text-slate-900">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 최근 소식 */}
      {posts.length > 0 && (
        <section className="border-t border-slate-200 bg-slate-50 py-20">
          <div className="container-wnc">
            <div className="flex items-end justify-between">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">최근 소식</h2>
              <Link to="/board" className="text-sm font-medium text-brand-600 hover:text-brand-700">
                전체 보기 →
              </Link>
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {posts.map((p) => (
                <Link key={p.id} to={`/board/${p.id}`} className="card p-6 transition hover:shadow-md">
                  <Badge tone="blue">{BOARD_CATEGORY_LABEL[p.category]}</Badge>
                  <h3 className="mt-3 line-clamp-2 font-semibold leading-snug text-slate-900">
                    {p.title}
                  </h3>
                  <p className="mt-4 text-xs text-slate-500">{formatDate(p.createdAt)}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="bg-brand-600 py-16">
        <div className="container-wnc flex flex-col items-center justify-between gap-6 text-center sm:flex-row sm:text-left">
          <div>
            <h2 className="text-2xl font-bold text-white">프로젝트를 준비 중이신가요?</h2>
            <p className="mt-2 text-brand-100">
              간단한 문의만 남겨주시면 담당자가 1영업일 내에 연락드립니다.
            </p>
          </div>
          <Link to="/contact" className="btn bg-white px-6 py-3 text-brand-700 hover:bg-brand-50">
            문의하기
          </Link>
        </div>
      </section>
    </>
  )
}
