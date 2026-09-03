import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import type { CategoryNode, Paginated, ProductListItem } from '@wnc/shared'
import { api, qs } from '../../lib/api'
import { findCategory, formatPrice } from '../../lib/category'
import SubPage from '../../components/SubPage'
import Reveal from '../../components/Reveal'
import { EmptyState, ErrorMessage, Loading, Pagination } from '../../components/ui'
import { usePageTitle } from '../../lib/seo'

const PAGE_SIZE = 6

/** 탭(대분류)마다 위쪽에 보여 줄 소개 문구. 없는 분류는 기본 문구를 쓴다. */
const INTRO: Record<string, { eyebrow: string; title: string[]; desc: string }> = {
  전체: {
    eyebrow: 'Wordncode Products',
    title: ['일하는 방식을 바꾸는', '워드앤코드의 제품'],
    desc: '소프트웨어부터 하드웨어, 클라우드까지 — 현장에서 바로 쓸 수 있도록 다듬은 제품을 한자리에 모았습니다.',
  },
  소프트웨어: {
    eyebrow: 'Wordncode Software',
    title: ['업무를 가볍게 만드는', '소프트웨어'],
    desc: '그룹웨어와 전자결재, 개발 도구까지. 따로 배우지 않아도 손에 익는 화면으로 만들었습니다.',
  },
  하드웨어: {
    eyebrow: 'Wordncode Hardware',
    title: ['오래 믿고 쓰는', '하드웨어'],
    desc: '네트워크 장비와 서버를 직접 검증해 공급합니다. 도입부터 설치·운영까지 함께합니다.',
  },
  클라우드: {
    eyebrow: 'Wordncode Cloud',
    title: ['필요한 만큼만 쓰는', '클라우드'],
    desc: '가상 서버와 스토리지, 보안 서비스를 필요한 만큼 골라 쓰고 언제든 늘리거나 줄일 수 있습니다.',
  },
}

const DEFAULT_INTRO = {
  eyebrow: 'Wordncode Products',
  title: ['워드앤코드의', '제품'],
  desc: '현장에서 바로 쓸 수 있도록 다듬은 제품을 소개합니다.',
}

/** 탭마다 다른 대표 이미지 — 외부 이미지 없이 그라데이션으로 그린다. */
const BANNER: Record<string, string> = {
  전체: 'linear-gradient(135deg, #1f2d3a 0%, #2b4750 55%, #3d6e71 100%)',
  소프트웨어: 'linear-gradient(135deg, #d3dcea 0%, #6f8bb4 100%)',
  하드웨어: 'linear-gradient(135deg, #24333a 0%, #3b5a5e 55%, #7fa39f 100%)',
  클라우드: 'linear-gradient(135deg, #cfe3e4 0%, #7dbbbd 100%)',
}

/** 썸네일이 없을 때 보여 줄 자리표시자 */
function Placeholder({ tone }: { tone: string }) {
  return (
    <div className="grid h-full w-full place-items-center text-white/40" style={{ background: tone }}>
      <svg className="h-12 w-12" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    </div>
  )
}

/**
 * 제품소개 — 참고 템플릿처럼 상단 배너의 탭으로 대분류를 하나씩 오가고,
 * 탭마다 소개 글·대표 이미지·제품 목록(왼쪽 이미지, 오른쪽 설명)을 보여 준다.
 */
export default function ProductsPage() {
  usePageTitle('제품소개')
  const [searchParams, setSearchParams] = useSearchParams()
  const categoryId = searchParams.get('category') ? Number(searchParams.get('category')) : null
  const page = Number(searchParams.get('page') ?? 1)

  const [categories, setCategories] = useState<CategoryNode[]>([])
  const [data, setData] = useState<Paginated<ProductListItem> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api<CategoryNode[]>('/categories')
      .then(setCategories)
      .catch(() => setCategories([]))
  }, [])

  useEffect(() => {
    setLoading(true)
    setError('')
    api<Paginated<ProductListItem>>(
      `/products${qs({ page, pageSize: PAGE_SIZE, category: categoryId ?? undefined })}`,
    )
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [page, categoryId])

  function update(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams)
    for (const [k, v] of Object.entries(next)) {
      if (v) params.set(k, v)
      else params.delete(k)
    }
    setSearchParams(params)
  }

  // 지금 고른 분류와, 그것이 속한 대분류(탭)
  const selected = useMemo(
    () => (categoryId ? findCategory(categories, categoryId) : null),
    [categories, categoryId],
  )
  const topLevel = useMemo(() => {
    if (!categoryId) return null
    return categories.find((c) => c.id === categoryId || findCategory(c.children, categoryId)) ?? null
  }, [categories, categoryId])

  // 상단 탭 — 전체와 대분류들. 하나씩 들어가 보는 구조라 탭마다 주소가 다르다.
  const tabs = [
    { to: '/products', label: '전체', active: categoryId === null },
    ...categories.map((c) => ({
      to: `/products?category=${c.id}`,
      label: c.name,
      active: topLevel?.id === c.id,
    })),
  ]

  const key = topLevel?.name ?? '전체'
  const intro = INTRO[key] ?? { ...DEFAULT_INTRO, title: [topLevel?.name ?? '워드앤코드의', '제품'] }
  const banner = BANNER[key] ?? BANNER['전체']

  // 탭 아래 소분류 — 대분류를 골랐을 때만 보인다.
  const subs = topLevel ? topLevel.children : []

  return (
    <>
      <SubPage title="제품소개" tabs={tabs}>

      {/* 소개 — 영문 소제목, 큰 제목, 선, 설명 */}
      <section className="pt-24 sm:pt-28">
        <div className="container-wnc">
          <Reveal key={`eyebrow-${key}`}>
            <p className="text-[0.95rem] font-medium tracking-wide text-mint-400">{intro.eyebrow}</p>
          </Reveal>
          <h2
            key={`title-${key}`}
            className="mt-3 text-[1.75rem] font-bold leading-[1.4] tracking-tight text-slate-900 sm:text-[2rem]"
          >
            {intro.title.map((line, i) => (
              <Reveal key={line} as="span" index={i + 1} className="block">
                {line}
              </Reveal>
            ))}
          </h2>
          <Reveal key={`line-${key}`} index={3} className="mt-7 h-px w-14 bg-slate-900" />
          <Reveal key={`desc-${key}`} as="p" index={4} className="mt-7 max-w-2xl text-[0.95rem] leading-[1.9] text-slate-600">
            {intro.desc}
          </Reveal>
        </div>

        {/* 대표 이미지 — 가로로 넓게 */}
        <div className="container-wnc mt-12">
          <Reveal key={`banner-${key}`} className="h-64 sm:h-96" style={{ background: banner }} />
        </div>
      </section>

      {/* 제품 목록 — 왼쪽 제목, 오른쪽에 한 줄씩 */}
      <section className="py-20 sm:py-24">
        <div className="container-wnc lg:grid lg:grid-cols-[minmax(0,20rem)_1fr] lg:gap-16">
          <div>
            <Reveal>
              <h3 className="text-xl font-bold text-slate-900">{topLevel ? `${topLevel.name} 제품` : '전체 제품'}</h3>
            </Reveal>

            {/* 소분류 — 대분류 안에서 다시 좁혀 본다. */}
            {subs.length > 0 && (
              <Reveal as="ul" index={1} className="mt-6 space-y-2.5">
                <li>
                  <button
                    type="button"
                    onClick={() => update({ category: String(topLevel!.id), page: '' })}
                    className={`text-sm transition ${
                      selected?.id === topLevel?.id ? 'font-semibold text-slate-900' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    전체
                  </button>
                </li>
                {subs.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => update({ category: String(s.id), page: '' })}
                      className={`text-sm transition ${
                        selected?.id === s.id || (selected && findCategory(s.children, selected.id))
                          ? 'font-semibold text-slate-900'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      {s.name}
                    </button>
                    {s.children.length > 0 && (
                      <ul className="mt-2 space-y-1.5 pl-4">
                        {s.children.map((leaf) => (
                          <li key={leaf.id}>
                            <button
                              type="button"
                              onClick={() => update({ category: String(leaf.id), page: '' })}
                              className={`text-sm transition ${
                                selected?.id === leaf.id ? 'font-semibold text-mint-600' : 'text-slate-400 hover:text-slate-900'
                              }`}
                            >
                              {leaf.name}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </Reveal>
            )}
          </div>

          <div className="mt-10 lg:mt-0">
            {error && <ErrorMessage message={error} />}
            {loading ? (
              <Loading />
            ) : !data || data.items.length === 0 ? (
              <EmptyState
                label={selected ? `'${selected.name}' 분류에 등록된 제품이 없습니다.` : '등록된 제품이 없습니다.'}
              />
            ) : (
              <ul className="divide-y divide-slate-200 border-t border-slate-900">
                {data.items.map((p, i) => (
                  <Reveal as="li" key={p.id} index={i}>
                    <Link
                      to={`/products/${p.id}`}
                      className="group grid gap-6 py-8 sm:grid-cols-[16rem_1fr] sm:gap-10"
                    >
                      {/* 왼쪽 이미지 */}
                      <div className="aspect-[4/3] overflow-hidden">
                        {p.thumbnail ? (
                          <img
                            src={p.thumbnail}
                            alt={p.name}
                            loading="lazy"
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <Placeholder tone={banner} />
                        )}
                      </div>

                      {/* 오른쪽 글 — 분류, 이름과 화살표, 요약, 가격 */}
                      <div className="flex flex-col justify-center">
                        <span className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-mint-500">
                          <i className="h-1.5 w-1.5 rounded-full bg-mint-400" aria-hidden />
                          {p.categoryName}
                        </span>
                        <h4 className="mt-3 flex items-center gap-2 text-lg font-semibold text-slate-900 transition group-hover:text-mint-700">
                          {p.name}
                          <svg
                            className="h-3.5 w-3.5 text-slate-400 transition group-hover:translate-x-1 group-hover:text-mint-600"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            viewBox="0 0 24 24"
                            aria-hidden
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </h4>
                        {p.model && <p className="mt-1 text-xs text-slate-500">모델 {p.model}</p>}
                        {p.summary && (
                          <p className="mt-3 line-clamp-2 text-[0.95rem] leading-[1.8] text-slate-600">{p.summary}</p>
                        )}
                        <p className="mt-4 text-sm font-bold text-slate-900">{formatPrice(p.price)}</p>
                      </div>
                    </Link>
                  </Reveal>
                ))}
              </ul>
            )}

            {data && (
              <Pagination
                page={data.page}
                totalPages={data.totalPages}
                onChange={(p) => {
                  update({ page: String(p) })
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
              />
            )}
          </div>
        </div>
      </section>
      </SubPage>
    </>
  )
}
