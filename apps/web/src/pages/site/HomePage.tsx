import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Paginated, PostListItem, ProductListItem } from '@wnc/shared'
import { api, qs } from '../../lib/api'
import { boardName, useBoards } from '../../lib/boards'
import { formatDate } from '../../lib/format'
import SectionHeading from '../../components/SectionHeading'
import HeroSlider from '../../components/HeroSlider'
import CardCarousel from '../../components/CardCarousel'
import Reveal from '../../components/Reveal'

/** 히어로 슬라이드 — 배경은 그라데이션으로 그려 외부 이미지 없이 동작한다. */
const SLIDES = [
  {
    title: ['고객과 우리의 생각을', '함께 구현하다'],
    desc: ['필요한 것을 정확히 짚어내는 설계로', '비즈니스가 다음 단계로 나아가도록 돕습니다'],
    gradient: 'linear-gradient(135deg, #1b2a3a 0%, #24404a 55%, #2f5f63 100%)',
  },
  {
    title: ['기획부터 운영까지', '한 팀이 책임집니다'],
    desc: ['흩어진 과정을 하나로 묶어', '더 빠르고 단단하게 만들어 냅니다'],
    gradient: 'linear-gradient(135deg, #21243a 0%, #2f3557 55%, #3f5f7a 100%)',
  },
  {
    title: ['오래 쓸 수 있는', '서비스를 만듭니다'],
    desc: ['눈에 보이는 화면 뒤의 구조까지', '길게 쓰일 것을 생각하며 짓습니다'],
    gradient: 'linear-gradient(135deg, #1d2b26 0%, #2b4a41 55%, #3d6e71 100%)',
  },
]

/** 개발 철학 — 번호를 붙여 네 칸으로 늘어놓는다. */
const PHILOSOPHY = [
  { title: '혁신성', desc: ['익숙한 방식에 머무르지 않고', '더 나은 길을 먼저 찾습니다'] },
  { title: '창의성', desc: ['같은 문제도 다르게 바라보며', '고객에게 맞는 답을 만듭니다'] },
  { title: '트렌디', desc: ['새로운 기술을 빠르게 익혀', '지금에 맞는 서비스를 만듭니다'] },
  { title: '견고성', desc: ['눈에 보이지 않는 구조까지', '오래 버티도록 설계합니다'] },
]

/** 서비스 카드 */
const SERVICES = [
  {
    title: '쉽고 편리한 최적의 서비스',
    desc: ['복잡한 과정을 덜어내고 꼭 필요한 것만 남겨', '누구나 어렵지 않게 쓸 수 있게 만듭니다.'],
    gradient: 'linear-gradient(135deg, #cfe3e4 0%, #7dbbbd 100%)',
  },
  {
    title: '디지털 트랜스포메이션 혁신',
    desc: ['흩어진 업무와 데이터를 한곳으로 모아', '일하는 방식 자체를 바꿔 드립니다.'],
    gradient: 'linear-gradient(135deg, #d3dcea 0%, #6f8bb4 100%)',
  },
  {
    title: '플랫폼 중심의 커뮤니케이션',
    desc: ['고객과 사용자가 만나는 자리를 만들어', '이야기가 오래 이어지도록 돕습니다.'],
    gradient: 'linear-gradient(135deg, #dcd8e8 0%, #8b7fae 100%)',
  },
]

export default function HomePage() {
  const boards = useBoards()
  const [posts, setPosts] = useState<PostListItem[]>([])
  const [products, setProducts] = useState<ProductListItem[]>([])

  useEffect(() => {
    api<Paginated<PostListItem>>(`/posts${qs({ pageSize: 2 })}`)
      .then((res) => setPosts(res.items))
      .catch(() => setPosts([]))
    api<Paginated<ProductListItem>>(`/products${qs({ pageSize: 8 })}`)
      .then((res) => setProducts(res.items))
      .catch(() => setProducts([]))
  }, [])

  return (
    <>
      <HeroSlider slides={SLIDES} />

      {/* 소개 */}
      <section className="py-24 sm:py-28">
        <div className="container-wnc">
          <SectionHeading eyebrow="WnC About" title={['사람과 사람을 연결하는', '소통의 창 워드앤코드']} />

          <div className="mx-auto mt-14 grid max-w-5xl gap-10 md:grid-cols-2 md:gap-14">
            <Reveal as="p" className="text-[0.95rem] leading-[1.9] text-slate-600 md:border-r md:border-slate-200 md:pr-14">
              웹 서비스의 중요성이 하루하루 커지고 있지만, 전문적인 교육을 받지 않고서는 직접
              운영하기 어려운 것이 현실입니다. 워드앤코드는 담당자가 따로 배우지 않아도 손쉽게 웹과
              친숙해질 수 있도록 돕는 웹 전용 스마트 서비스입니다.
            </Reveal>
            <Reveal as="p" index={1} className="text-[0.95rem] leading-[1.9] text-slate-600">
              기획부터 디자인, 개발, 운영까지 서비스에 필요한 모든 단계를 한 팀에서 맡습니다. 중간에
              말이 바뀌거나 책임이 흩어지지 않도록, 처음 만난 담당자가 끝까지 함께합니다.
            </Reveal>
          </div>

          <Reveal index={2} className="mt-12 text-center">
            <Link
              to="/about"
              className="inline-flex bg-slate-900 px-8 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              자세히보기
            </Link>
          </Reveal>
        </div>
      </section>

      {/* 넓은 이미지 띠 */}
      <section className="container-wnc">
        <Reveal
          className="grid h-[22rem] place-items-center sm:h-[26rem]"
          style={{ background: 'linear-gradient(135deg, #20303b 0%, #2c4a52 60%, #3d6e71 100%)' }}
        >
          <div className="grid h-16 w-16 place-items-center rounded-full bg-white/25 backdrop-blur transition hover:bg-white/35">
            <svg className="ml-1 h-7 w-7 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </Reveal>
      </section>

      {/* 프로젝트 — 등록된 제품을 카드로 보여준다. */}
      {products.length > 0 && (
        <section className="relative mt-24 sm:mt-28">
          {/* 카드 아래쪽 절반에 깔리는 어두운 띠 */}
          <div className="absolute inset-x-0 bottom-0 top-56 bg-[#2b2b2b]" aria-hidden />

          <div className="relative">
            <SectionHeading
              eyebrow="WnC Project"
              title={['시각적 아름다움을 구현하는', '워드앤코드 프로젝트']}
            />

            <div className="mt-14">
              <CardCarousel
                items={products.map((p) => ({
                  id: p.id,
                  to: `/products/${p.id}`,
                  image: p.thumbnail,
                  title: p.name,
                  desc: p.summary ?? '',
                }))}
                moreTo="/products"
              />
            </div>
          </div>
        </section>
      )}

      {/* 개발 철학 */}
      <section className="bg-[#2b2b2b] pb-24 pt-20 sm:pb-28">
        <div className="container-wnc">
          <SectionHeading
            eyebrow="WnC Philosophy"
            title={['워드앤코드가 일하는 방식']}
            tone="dark"
          />

          <div className="mt-14 grid gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {PHILOSOPHY.map((p, i) => (
              <Reveal
                key={p.title}
                index={i}
                className="px-0 sm:px-8 lg:border-r lg:border-white/15 lg:last:border-r-0 lg:first:pl-0"
              >
                <p className="flex items-baseline gap-2.5">
                  <span className="text-sm font-medium text-mint-400">{i + 1}</span>
                  <span className="font-semibold text-white">{p.title}</span>
                </p>
                <p className="mt-4 text-sm leading-[1.9] text-white/60">
                  {p.desc[0]}
                  <br />
                  {p.desc[1]}
                </p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 철학 아래 넓은 이미지 — 어두운 띠에 절반 걸치게 둔다. */}
      <section className="relative">
        <div className="absolute inset-x-0 top-0 h-24 bg-[#2b2b2b]" aria-hidden />
        <div className="container-wnc relative">
          <Reveal
            className="h-[20rem] sm:h-[26rem]"
            style={{ background: 'linear-gradient(135deg, #1f6f9e 0%, #2f93c8 55%, #8fd0e8 100%)' }}
          />
          <Reveal index={1} className="mt-12 text-center">
            <Link
              to="/services"
              className="inline-flex bg-slate-900 px-8 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              자세히보기
            </Link>
          </Reveal>
        </div>
      </section>

      {/* 서비스 */}
      <section className="py-24 sm:py-28">
        <div className="container-wnc">
          <SectionHeading
            eyebrow="WnC Service"
            title={['고객님을 위한 든든한 파트너', '워드앤코드 플랫폼 서비스']}
          />

          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {SERVICES.map((s, i) => (
              <Reveal key={s.title} index={i}>
                <div className="h-56 w-full" style={{ background: s.gradient }} />
                <h3 className="mt-6 font-semibold text-slate-900">{s.title}</h3>
                <p className="mt-3 text-sm leading-[1.9] text-slate-600">
                  {s.desc[0]}
                  <br />
                  {s.desc[1]}
                </p>
              </Reveal>
            ))}
          </div>

          <Reveal index={3} className="mt-12 text-center">
            <Link
              to="/services"
              className="inline-flex bg-slate-900 px-8 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              자세히보기
            </Link>
          </Reveal>
        </div>
      </section>

      {/* 영상 — 뒤에 민트 블록을 어긋나게 깔아 입체감을 준다. */}
      <section className="relative overflow-hidden pb-24 sm:pb-28">
        <SectionHeading
          eyebrow="WnC Video"
          title={['시각적 아름다움을 구현하는', '워드앤코드 프로젝트 영상']}
        />

        <div className="relative mt-14">
          {/* 오른쪽 아래로 어긋나게 깔리는 민트 블록 */}
          <div className="absolute inset-y-16 right-0 left-56 bg-mint-400" aria-hidden />
          <div
            className="relative mr-24 grid h-[22rem] place-items-center sm:h-[30rem]"
            style={{ background: 'linear-gradient(135deg, #2a3b3f 0%, #44646a 55%, #7d9ea3 100%)' }}
          >
            <div className="grid h-16 w-16 place-items-center rounded-full bg-white/25 backdrop-blur transition hover:bg-white/35">
              <svg className="ml-1 h-7 w-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* 공지 */}
      <section className="pb-28">
        <div className="container-wnc">
          <SectionHeading eyebrow="WnC Notice" title={['사람과 사람을 연결하는', '워드앤코드 공지안내']} />

          {posts.length > 0 ? (
            <>
              <div className="mx-auto mt-14 grid max-w-5xl gap-10 md:grid-cols-2 md:gap-14">
                {posts.map((post, i) => (
                  <Reveal key={post.id} index={i}>
                    <Link
                      to={`/board/${post.id}`}
                      className={`group block ${
                        i === 0 ? 'md:border-r md:border-slate-200 md:pr-14' : ''
                      }`}
                    >
                      <h3 className="font-semibold text-slate-900 transition group-hover:text-mint-500">
                        {post.title}
                      </h3>
                      <p className="mt-4 text-[0.95rem] leading-[1.9] text-slate-600">
                        {boardName(boards, post.category)} · {post.authorName}
                      </p>
                      <p className="mt-1 text-sm text-slate-400">{formatDate(post.createdAt)}</p>
                    </Link>
                  </Reveal>
                ))}
              </div>

              <Reveal index={2} className="mt-12 flex justify-end">
                <Link
                  to="/board"
                  className="group inline-flex items-center gap-3 text-sm font-semibold text-slate-900"
                >
                  전체보기
                  <span className="block h-px w-9 bg-slate-900 transition-all group-hover:w-12" />
                </Link>
              </Reveal>
            </>
          ) : (
            <p className="mt-14 text-center text-sm text-slate-500">등록된 공지가 없습니다.</p>
          )}
        </div>
      </section>
    </>
  )
}
