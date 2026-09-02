import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { PageListItem } from '@wnc/shared'
import { api } from '../../lib/api'
import { useBoards } from '../../lib/boards'
import PageHero from '../../components/PageHero'
import Reveal from '../../components/Reveal'

interface SitemapLink {
  to: string
  label: string
  /** 그 아래 작은 항목 */
  children?: SitemapLink[]
}

interface SitemapGroup {
  title: string
  to: string
  items: SitemapLink[]
}

/**
 * 사이트맵 — 참고 사이트(인천공항)처럼 왼쪽에 큰 제목, 오른쪽에 하위 메뉴를
 * 네 칸으로 펼쳐 놓는다. 게시판과 관리자가 만든 페이지는 서버에서 받아 채운다.
 */
export default function SitemapPage() {
  const boards = useBoards()
  const [navPages, setNavPages] = useState<PageListItem[]>([])

  useEffect(() => {
    api<PageListItem[]>('/pages/nav')
      .then(setNavPages)
      .catch(() => setNavPages([]))
  }, [])

  const groups: SitemapGroup[] = [
    {
      title: '회사소개',
      to: '/about',
      items: [
        {
          to: '/about',
          label: '회사 소개',
          children: [
            { to: '/about', label: '인사말' },
            { to: '/about', label: '개발 철학' },
          ],
        },
        { to: '/services', label: '사업분야' },
      ],
    },
    {
      title: '제품소개',
      to: '/products',
      items: [{ to: '/products', label: '제품 목록' }],
    },
    {
      title: '소식',
      to: '/board',
      items: [
        {
          to: '/board',
          label: '전체 소식',
          children: boards.map((b) => ({ to: `/board?category=${b.slug}`, label: b.name })),
        },
      ],
    },
    {
      title: '문의하기',
      to: '/contact',
      items: [{ to: '/contact', label: '상담 신청' }],
    },
  ]

  // 관리자가 '상단 메뉴에 표시'로 발행한 페이지가 있으면 한 묶음 더 붙인다.
  if (navPages.length > 0) {
    groups.push({
      title: '이용안내',
      to: `/page/${navPages[0].slug}`,
      items: navPages.map((p) => ({ to: `/page/${p.slug}`, label: p.title })),
    })
  }

  return (
    <>
      <PageHero title="사이트맵" description="워드앤코드 홈페이지의 전체 메뉴를 한눈에 볼 수 있습니다." />

      <section className="py-20 sm:py-24">
        <div className="container-wnc">
          {groups.map((group, gi) => (
            <Reveal key={group.title} index={gi} className="mb-16 sm:mb-20 md:flex md:items-start">
              {/* 왼쪽 제목 — 위에 두꺼운 강조선을 얹는다. */}
              <h2 className="relative mb-5 w-[130px] flex-none pt-5 text-[25px] font-bold leading-tight text-slate-900 before:absolute before:left-0 before:top-0 before:h-[5px] before:w-full before:bg-mint-500 md:mb-0 md:mr-20 md:w-[200px] md:text-3xl">
                <Link to={group.to} className="transition hover:text-mint-700">
                  {group.title}
                </Link>
              </h2>

              {/* 오른쪽 메뉴 — 위아래 선 사이에 네 칸으로 펼친다. */}
              <ul className="flex flex-1 flex-wrap border-b border-slate-300 border-t-slate-700 pt-7 md:border-t">
                {group.items.map((item) => (
                  <li key={item.label} className="mb-10 w-full pr-4 sm:w-1/2 lg:w-1/4">
                    <Link
                      to={item.to}
                      className="mb-4 block text-lg font-bold text-slate-900 transition hover:text-mint-700 sm:text-xl"
                    >
                      {item.label}
                    </Link>
                    {item.children && item.children.length > 0 && (
                      <ul className="space-y-3">
                        {item.children.map((child) => (
                          <li
                            key={child.label}
                            className="relative pl-4 text-base leading-snug text-slate-600 before:absolute before:left-0 before:top-2 before:h-[5px] before:w-[5px] before:rounded-full before:bg-mint-500"
                          >
                            <Link to={child.to} className="transition hover:text-mint-700">
                              {child.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>
      </section>
    </>
  )
}
