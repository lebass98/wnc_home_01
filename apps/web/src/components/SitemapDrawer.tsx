import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { PageListItem } from '@wnc/shared'
import { api } from '../lib/api'
import { useBoards } from '../lib/boards'

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

/** 여닫는 데 걸리는 시간(ms) — CSS duration 과 맞춘다. */
const DURATION = 350

/**
 * 오른쪽에서 밀려 나와 화면 전체를 덮는 사이트맵.
 * 검정 반투명 덮개 위에 참고 사이트(인천공항)처럼 왼쪽 큰 제목, 오른쪽 네 칸 메뉴를 늘어놓는다.
 */
export default function SitemapDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  // 닫힐 때도 밀려 나가는 동작이 보이도록, DOM 은 애니메이션이 끝난 뒤 떼어 낸다.
  const [mounted, setMounted] = useState(open)
  const [shown, setShown] = useState(false)
  const boards = useBoards()
  const [navPages, setNavPages] = useState<PageListItem[]>([])

  useEffect(() => {
    if (open) {
      setMounted(true)
      // 붙인 직후 한 프레임 뒤에 켜야 transition 이 동작한다.
      const raf = requestAnimationFrame(() => setShown(true))
      return () => cancelAnimationFrame(raf)
    }
    setShown(false)
    const timer = setTimeout(() => setMounted(false), DURATION)
    return () => clearTimeout(timer)
  }, [open])

  // 열려 있는 동안 ESC 로 닫고, 뒤쪽 화면이 스크롤되지 않게 한다.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  useEffect(() => {
    if (!mounted) return
    api<PageListItem[]>('/pages/nav')
      .then(setNavPages)
      .catch(() => setNavPages([]))
  }, [mounted])

  if (!mounted) return null

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
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal aria-label="사이트맵">
      {/* 전체 화면을 덮는 검정 반투명 덮개 — 오른쪽 바깥에 있다가 밀려 들어온다. */}
      <div
        className={`absolute inset-0 flex flex-col overflow-y-auto bg-black/85 backdrop-blur-sm transition-transform duration-[350ms] ease-out ${
          shown ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="container-wnc flex h-16 flex-none items-center justify-between">
          <span className="text-lg font-bold tracking-[0.2em] text-white">WORDNCODE</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="사이트맵 닫기"
            className="grid h-10 w-10 place-items-center rounded-lg text-white/85 transition hover:bg-white/15 hover:text-white"
          >
            <svg className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="container-wnc py-12 sm:py-16">
          <h2 className="mb-12 text-3xl font-bold text-white sm:mb-16 sm:text-4xl">사이트맵</h2>

          {groups.map((group) => (
            <section key={group.title} className="mb-14 md:mb-16 md:flex md:items-start">
              {/* 왼쪽 큰 제목 — 위에 두꺼운 강조선을 얹는다. */}
              <h3 className="relative mb-5 w-[130px] flex-none pt-5 text-[25px] font-bold leading-tight text-white before:absolute before:left-0 before:top-0 before:h-[5px] before:w-full before:bg-mint-400 md:mb-0 md:mr-20 md:w-[200px] md:text-3xl">
                <Link to={group.to} onClick={onClose} className="transition hover:text-mint-300">
                  {group.title}
                </Link>
              </h3>

              {/* 오른쪽 메뉴 — 위아래 선 사이에 네 칸으로 펼친다. */}
              <ul className="flex flex-1 flex-wrap border-b border-white/20 pt-7 md:border-t md:border-t-white/50">
                {group.items.map((item) => (
                  <li key={item.label} className="mb-10 w-full pr-4 sm:w-1/2 lg:w-1/4">
                    <Link
                      to={item.to}
                      onClick={onClose}
                      className="mb-4 block text-lg font-bold text-white transition hover:text-mint-300 sm:text-xl"
                    >
                      {item.label}
                    </Link>
                    {item.children && item.children.length > 0 && (
                      <ul className="space-y-3">
                        {item.children.map((child) => (
                          <li
                            key={child.label}
                            className="relative pl-4 text-base leading-snug text-white/70 before:absolute before:left-0 before:top-2 before:h-[5px] before:w-[5px] before:rounded-full before:bg-mint-400"
                          >
                            <Link to={child.to} onClick={onClose} className="transition hover:text-white">
                              {child.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
