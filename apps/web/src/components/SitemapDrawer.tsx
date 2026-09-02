import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { isExternalUrl, pickMenu, useSiteMenu, type SiteMenuLink } from '../lib/menus'

/** 사이트맵 안의 링크 — 외부 주소는 <a>, 사이트 안 경로는 라우터 링크. 주소가 없으면 글자만. */
function SitemapLink({
  item,
  className,
  onClick,
  children,
}: {
  item: SiteMenuLink
  className: string
  onClick: () => void
  children: ReactNode
}) {
  if (!item.url) return <span className={className}>{children}</span>
  if (isExternalUrl(item.url)) {
    return (
      <a
        href={item.url}
        target={item.newTab ? '_blank' : undefined}
        rel={item.newTab ? 'noopener noreferrer' : undefined}
        onClick={onClick}
        className={className}
      >
        {children}
      </a>
    )
  }
  return (
    <Link to={item.url} target={item.newTab ? '_blank' : undefined} onClick={onClick} className={className}>
      {children}
    </Link>
  )
}

/** 여닫는 데 걸리는 시간(ms) — CSS duration 과 맞춘다. */
const DURATION = 450

/**
 * 화면 전체를 덮는 사이트맵.
 * 열 때는 오른쪽에서 왼쪽으로 밀려 들어오며 나타나고, 닫을 때는 다시 오른쪽으로
 * 밀려 나가며 사라진다. 검정 반투명 덮개 위에 로고와 메뉴를 세로 가운데에 놓는다.
 */
export default function SitemapDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  // 닫힐 때도 밀려 나가는 동작이 보이도록, DOM 은 애니메이션이 끝난 뒤 떼어 낸다.
  const [mounted, setMounted] = useState(open)
  const [shown, setShown] = useState(false)
  const siteMenu = useSiteMenu()

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

  if (!mounted) return null

  // 메뉴는 관리자 [메뉴 관리]에서 정한다 — '사이트맵' 노출을 켠 항목만 보인다.
  const groups = pickMenu(siteMenu, 'sitemap')

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal aria-label="사이트맵">
      {/* 검정 반투명 덮개 — 오른쪽에서 밀려 들어오며 서서히 나타난다. */}
      <div
        className={`absolute inset-0 overflow-y-auto bg-black/90 transition-[transform,opacity] duration-[450ms] ease-out ${
          shown ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
        }`}
      >
        {/* 닫기 — 상단 메뉴의 사이트맵 아이콘 자리에 X 를 둔다. */}
        <div className="flex h-[4.5rem] items-center justify-end px-3 sm:px-4 lg:px-7">
          <button
            type="button"
            onClick={onClose}
            aria-label="사이트맵 닫기"
            className="grid h-10 w-10 place-items-center text-white/85 transition hover:text-white"
          >
            <svg className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 5l14 14M19 5L5 19" />
            </svg>
          </button>
        </div>

        {/* 본문 — 화면 세로 가운데에 놓는다. 내용이 담기지 않을 만큼 낮은 화면에서는 위에서부터 흐른다. */}
        <div
          className={`flex min-h-[calc(100%-4.5rem)] flex-col justify-center py-16 transition-[transform,opacity] delay-100 duration-[450ms] ease-out ${
            shown ? 'translate-x-0 opacity-100' : 'translate-x-10 opacity-0'
          }`}
        >
          <div className="mx-auto w-full max-w-[1200px] px-6 sm:px-10">
            {/* 로고 · 유틸 링크 */}
            <div className="flex flex-wrap items-end justify-between gap-6">
              <Link
                to="/"
                onClick={onClose}
                className="text-3xl font-bold tracking-[0.3em] text-white sm:text-4xl"
              >
                WORDNCODE
              </Link>
              <div className="flex items-center text-sm text-white/85">
                <Link to="/contact" onClick={onClose} className="transition hover:text-white">
                  상담 신청
                </Link>
                <span className="mx-4 h-3 w-px bg-white/30" aria-hidden />
                <Link to="/admin" className="transition hover:text-white">
                  관리자
                </Link>
              </div>
            </div>

            {/* 메뉴 — 큰 제목 아래 하위 항목을 세로로 늘어놓는다. */}
            <div className="mt-20 grid grid-cols-2 gap-x-8 gap-y-12 sm:mt-28 sm:grid-cols-3 lg:grid-cols-5">
              {groups.map((group) => (
                <div key={group.id}>
                  <SitemapLink
                    item={group}
                    onClick={onClose}
                    className="block text-lg font-bold text-white transition hover:text-mint-300"
                  >
                    {group.label}
                  </SitemapLink>
                  {group.children.length > 0 && (
                    <ul className="mt-9 space-y-2.5">
                      {group.children.map((item) => (
                        <li key={item.id}>
                          <SitemapLink
                            item={item}
                            onClick={onClose}
                            className="text-base text-white/70 transition hover:text-white"
                          >
                            {item.label}
                          </SitemapLink>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
