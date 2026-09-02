import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import type { Board, BoardCategory, BoardType, Paginated, PostListItem } from '@wnc/shared'
import { api, qs } from '../../lib/api'
import { boardName, useBoards } from '../../lib/boards'
import { formatDate } from '../../lib/format'
import PageHero from '../../components/PageHero'
import Reveal from '../../components/Reveal'
import { EmptyState, Loading, Pagination } from '../../components/ui'
import { useBoardSeo } from '../../lib/seo'

const PAGE_SIZE = 10

/** 검색 범위 — 참고 템플릿처럼 제목/내용 을 고른다. */
const SCOPES = [
  { value: 'all', label: '제목 + 내용' },
  { value: 'title', label: '제목' },
  { value: 'content', label: '내용' },
]

/** 썸네일이 없는 글에 씌울 표지 — 글 번호에 따라 색을 돌려 쓴다. */
const COVERS = [
  'linear-gradient(135deg, #cfe3e4 0%, #7dbbbd 100%)',
  'linear-gradient(135deg, #d3dcea 0%, #6f8bb4 100%)',
  'linear-gradient(135deg, #dcd8e8 0%, #8b7fae 100%)',
  'linear-gradient(135deg, #24333a 0%, #3b5a5e 55%, #7fa39f 100%)',
  'linear-gradient(135deg, #1f2d3a 0%, #2b4750 55%, #3d6e71 100%)',
  'linear-gradient(135deg, #dfe7ec 0%, #93aab8 100%)',
]
const coverOf = (id: number) => COVERS[id % COVERS.length]

interface ListProps {
  items: PostListItem[]
  boards: Board[]
  /** 전체 탭처럼 여러 게시판이 섞였을 때 게시판 이름을 함께 보여 준다. */
  showBoard: boolean
}

/** 기본형 — 번호·제목·작성자·등록일·조회 표. 머리글 아래 굵은 검정 선, 행마다 옅은 선. */
function BasicTable({
  data,
  boards,
  showBoard,
  onOpen,
}: Omit<ListProps, 'items'> & { data: Paginated<PostListItem>; onOpen: (id: number) => void }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-center text-[0.95rem]">
        <thead>
          <tr className="h-14 border-b-2 border-slate-900 text-sm font-medium text-slate-900">
            <th className="w-20 font-medium">번호</th>
            {showBoard && <th className="w-28 font-medium">분류</th>}
            <th className="text-left font-medium">제목</th>
            <th className="w-24 font-medium">작성자</th>
            <th className="w-36 font-medium">등록일</th>
            <th className="w-20 font-medium">조회</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((post, i) => (
            <tr
              key={post.id}
              onClick={() => onOpen(post.id)}
              className="group h-20 cursor-pointer border-b border-slate-200 font-light text-slate-800 transition hover:bg-slate-50"
            >
              <td className="font-mono text-slate-500">{data.total - ((data.page - 1) * data.pageSize + i)}</td>
              {showBoard && <td className="text-sm text-mint-600">{boardName(boards, post.category)}</td>}
              <td className="text-left">
                <span className="line-clamp-1 font-normal text-slate-900 transition group-hover:text-mint-700">
                  {post.title}
                </span>
              </td>
              <td className="text-slate-600">{post.authorName}</td>
              <td className="font-mono text-slate-500">{formatDate(post.createdAt)}</td>
              <td className="font-mono text-slate-500">{post.views}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** 카드형 — 표지·게시판 태그·제목·요약·날짜를 카드로. 뉴스처럼 읽을거리가 있는 게시판용. */
function CardList({ items, boards, showBoard }: ListProps) {
  return (
    <ul className="grid gap-8 border-t border-slate-900 pt-10 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((post, i) => (
        <Reveal as="li" key={post.id} index={i} step={80}>
          <Link to={`/board/${post.id}`} className="group flex h-full flex-col">
            <div className="relative aspect-[16/10] overflow-hidden">
              <div
                className="h-full w-full transition duration-500 group-hover:scale-105"
                style={{ background: coverOf(post.id) }}
              />
              {showBoard && (
                <span className="absolute left-4 top-4 bg-white/90 px-2.5 py-1 text-xs font-medium text-slate-900">
                  {boardName(boards, post.category)}
                </span>
              )}
            </div>
            <div className="flex flex-1 flex-col pt-5">
              <h3 className="line-clamp-2 text-lg font-semibold leading-snug text-slate-900 transition group-hover:text-mint-700">
                {post.title}
              </h3>
              <p className="mt-3 line-clamp-2 text-[0.95rem] leading-[1.8] text-slate-600">{post.excerpt}</p>
              <div className="mt-auto flex items-center gap-4 pt-5 font-mono text-sm text-slate-400">
                <span>{formatDate(post.createdAt)}</span>
                <span>조회 {post.views}</span>
              </div>
            </div>
          </Link>
        </Reveal>
      ))}
    </ul>
  )
}

/** 갤러리형 — 표지를 격자로 늘어놓고 아래에 제목·날짜만 짧게. 보도자료처럼 이미지 위주 게시판용. */
function GalleryList({ items, boards, showBoard }: ListProps) {
  return (
    <ul className="grid gap-x-6 gap-y-10 border-t border-slate-900 pt-10 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((post, i) => (
        <Reveal as="li" key={post.id} index={i} step={70}>
          <Link to={`/board/${post.id}`} className="group block">
            <div className="relative aspect-[4/3] overflow-hidden">
              <div
                className="h-full w-full transition duration-500 group-hover:scale-105"
                style={{ background: coverOf(post.id) }}
              />
              {/* 올리면 어두워지며 '자세히 보기'가 뜬다. */}
              <div className="absolute inset-0 grid place-items-center bg-black/0 text-sm font-medium text-white opacity-0 transition group-hover:bg-black/40 group-hover:opacity-100">
                자세히 보기
              </div>
            </div>
            {showBoard && (
              <p className="mt-4 text-xs font-medium text-mint-500">{boardName(boards, post.category)}</p>
            )}
            <h3 className="mt-2 line-clamp-1 font-semibold text-slate-900 transition group-hover:text-mint-700">
              {post.title}
            </h3>
            <p className="mt-1.5 font-mono text-sm text-slate-400">{formatDate(post.createdAt)}</p>
          </Link>
        </Reveal>
      ))}
    </ul>
  )
}

/**
 * 소식 — 참고 템플릿(THEME007 공지사항)처럼 상단 배너의 탭으로 게시판을 하나씩 오가고,
 * 등록 건수·검색 상자 아래에 번호·제목·작성자·등록일·조회 표를 놓는다.
 */
export default function BoardPage() {
  const boards = useBoards()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const category = (searchParams.get('category') ?? '') as BoardCategory | ''
  const current = boards.find((b) => b.slug === category)

  // 상단 탭 — 전체와 노출 중인 게시판들. 하나씩 들어가 보는 구조라 탭마다 주소가 다르다.
  const tabs = [
    { to: '/board', label: '전체', active: category === '' },
    ...boards.map((b) => ({ to: `/board?category=${b.slug}`, label: b.name, active: category === b.slug })),
  ]

  // 게시판을 고르지 않았으면 '게시판 목록', 골랐으면 '게시판 글 목록' 템플릿을 쓴다.
  useBoardSeo(category ? 'board' : 'list', {
    board_name: current?.name,
    board_description: current?.description ?? undefined,
  })
  const page = Number(searchParams.get('page') ?? 1)
  const q = searchParams.get('q') ?? ''
  const scope = searchParams.get('scope') ?? 'all'

  const [keyword, setKeyword] = useState(q)
  const [scopeInput, setScopeInput] = useState(scope)
  const [data, setData] = useState<Paginated<PostListItem> | null>(null)
  const [loading, setLoading] = useState(true)

  // 주소창에서 바뀌면 입력값도 맞춘다.
  useEffect(() => setKeyword(q), [q])
  useEffect(() => setScopeInput(scope), [scope])

  useEffect(() => {
    setLoading(true)
    api<Paginated<PostListItem>>(
      `/posts${qs({ page, pageSize: PAGE_SIZE, category: category || undefined, q: q || undefined })}`,
    )
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [page, category, q])

  /** 탭·검색·페이지를 하나의 쿼리스트링으로 관리한다. */
  function update(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams)
    for (const [k, v] of Object.entries(next)) {
      if (v) params.set(k, v)
      else params.delete(k)
    }
    setSearchParams(params)
  }

  const key = current?.slug ?? 'all'
  // 전체 탭은 여러 게시판이 섞이므로 기본형(표)으로 보여 준다.
  const type: BoardType = current?.type ?? 'basic'
  const title = current ? [current.name] : ['워드앤코드의', '새로운 소식']
  const desc =
    current?.description ?? '공지사항과 새로운 소식, 언론에 보도된 이야기를 한자리에서 전해 드립니다.'

  return (
    <>
      <PageHero title="소식" tabs={tabs} />

      {/* 소개 — 영문 소제목, 큰 제목, 선, 설명 */}
      <section className="pt-24 sm:pt-28">
        <div className="container-wnc">
          <Reveal key={`eyebrow-${key}`}>
            <p className="text-[0.95rem] font-medium tracking-wide text-mint-400">Wordncode News</p>
          </Reveal>
          <h2
            key={`title-${key}`}
            className="mt-3 text-[1.75rem] font-bold leading-[1.4] tracking-tight text-slate-900 sm:text-[2rem]"
          >
            {title.map((line, i) => (
              <Reveal key={line} as="span" index={i + 1} className="block">
                {line}
              </Reveal>
            ))}
          </h2>
          <Reveal key={`line-${key}`} index={3} className="mt-7 h-px w-14 bg-slate-900" />
          <Reveal key={`desc-${key}`} as="p" index={4} className="mt-7 max-w-2xl text-[0.95rem] leading-[1.9] text-slate-600">
            {desc}
          </Reveal>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="container-wnc">
          {/* 건수 · 검색 — 왼쪽에 등록 건수, 오른쪽에 연한 회색 알약형 검색 상자 */}
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[0.95rem] font-medium text-slate-900">
              총 <span className="font-bold">{data?.total ?? 0}</span>건의 글이 등록되어 있습니다.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                update({ q: keyword, scope: scopeInput === 'all' ? '' : scopeInput, page: '' })
              }}
              className="flex h-[52px] items-stretch overflow-hidden rounded-lg bg-slate-50"
            >
              <select
                value={scopeInput}
                onChange={(e) => setScopeInput(e.target.value)}
                aria-label="검색 범위"
                className="w-32 cursor-pointer appearance-none bg-transparent bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23111%22 stroke-width=%222%22><path d=%22M6 9l6 6 6-6%22/></svg>')] bg-[length:14px_14px] bg-[right_14px_center] bg-no-repeat pl-5 pr-9 text-sm font-medium text-slate-900 transition hover:bg-black hover:text-white focus:outline-none"
              >
                {SCOPES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              <input
                type="search"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="검색어를 입력하세요"
                className="w-40 bg-transparent pl-4 text-[0.95rem] font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none sm:w-52"
              />
              <button
                type="submit"
                aria-label="검색"
                className="grid w-[52px] place-items-center text-slate-900 transition hover:bg-slate-200"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </form>
          </div>

          {/* 목록 — 게시판 유형에 따라 기본형(표)·카드형·갤러리형으로 다르게 보여 준다. */}
          <div className="mt-10">
            {loading ? (
              <Loading />
            ) : !data || data.items.length === 0 ? (
              <EmptyState label={q ? `'${q}'에 대한 검색 결과가 없습니다.` : '등록된 게시글이 없습니다.'} />
            ) : type === 'card' ? (
              <CardList items={data.items} boards={boards} showBoard={!current} />
            ) : type === 'gallery' ? (
              <GalleryList items={data.items} boards={boards} showBoard={!current} />
            ) : (
              <BasicTable data={data} boards={boards} showBoard={!current} onOpen={(id) => navigate(`/board/${id}`)} />
            )}
          </div>

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
      </section>
    </>
  )
}
