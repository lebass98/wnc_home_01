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
 * 오른쪽에서 밀려 나오는 사이트맵 서랍.
 * 뒤쪽은 어둡게 가리고, 참고 사이트(인천공항)처럼 큰 제목 아래 하위 메뉴를 늘어놓는다.
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
      {/* 암막 — 누르면 닫힌다. */}
      <div
        onClick={onClose}
        aria-hidden
        className={`absolute inset-0 bg-black/60 transition-opacity duration-[350ms] ${
          shown ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* 서랍 — 오른쪽 바깥에 있다가 밀려 들어온다. */}
      <aside
        className={`absolute inset-y-0 right-0 flex w-full max-w-[520px] flex-col bg-white shadow-2xl transition-transform duration-[350ms] ease-out ${
          shown ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex h-16 flex-none items-center justify-between border-b border-slate-200 px-6 sm:px-8">
          <span className="text-lg font-bold text-slate-900">사이트맵</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="사이트맵 닫기"
            className="grid h-9 w-9 place-items-center rounded-lg text-slate-600 transition hover:bg-slate-100"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-8 sm:px-8">
          {groups.map((group) => (
            <section key={group.title} className="mb-10 last:mb-0">
              {/* 큰 제목 — 위에 두꺼운 강조선을 얹는다. */}
              <h2 className="relative mb-5 inline-block pt-4 text-2xl font-bold leading-tight text-slate-900 before:absolute before:left-0 before:top-0 before:h-1 before:w-full before:bg-mint-500">
                <Link to={group.to} onClick={onClose} className="transition hover:text-mint-700">
                  {group.title}
                </Link>
              </h2>

              <ul className="grid gap-x-6 gap-y-6 border-t border-slate-700 pt-5 sm:grid-cols-2">
                {group.items.map((item) => (
                  <li key={item.label}>
                    <Link
                      to={item.to}
                      onClick={onClose}
                      className="mb-3 block text-base font-bold text-slate-900 transition hover:text-mint-700"
                    >
                      {item.label}
                    </Link>
                    {item.children && item.children.length > 0 && (
                      <ul className="space-y-2.5">
                        {item.children.map((child) => (
                          <li
                            key={child.label}
                            className="relative pl-3.5 text-sm leading-snug text-slate-600 before:absolute before:left-0 before:top-2 before:h-1.5 before:w-1.5 before:rounded-full before:bg-mint-500"
                          >
                            <Link to={child.to} onClick={onClose} className="transition hover:text-mint-700">
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
      </aside>
    </div>
  )
}
