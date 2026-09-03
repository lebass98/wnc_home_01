import { useEffect, useState, type ReactNode } from 'react'
import { useDrawerTransition } from '../lib/drawer'
import { Link } from 'react-router-dom'
import { changeLanguage, currentLanguage, LANGUAGES, LANGUAGE_LABEL, type Language } from '../lib/i18n'
import { isExternalUrl, type SiteMenuLink } from '../lib/menus'
import { requestOpenPopups, usePopupCount } from '../lib/popupLayer'
import { Flag, LANGUAGE_CODE } from './LanguageFlag'

/** 여닫는 데 걸리는 시간(ms) — 아래 CSS duration 과 맞춘다. */
const DURATION = 400

/** 메뉴 링크 — 외부 주소는 <a>, 사이트 안 경로는 라우터 링크. 주소가 없으면 글자만. */
function DrawerLink({
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

/**
 * 모바일 상단 메뉴 — 햄버거를 누르면 오른쪽에서 밀려 들어오는 전체 화면 메뉴.
 * 참고 템플릿(THEME015)처럼 색이 깔린 판 위에 로고와 닫기를 두고,
 * 1차 메뉴 아래에 2차 메뉴를 펼쳐 놓는다.
 * 좁은 화면에서는 상단에 자리가 없으므로 언어 선택과 팝업 열기도 이 안에 넣는다.
 */
export default function MobileNavDrawer({
  open,
  menu,
  logo,
  logoImage,
  onClose,
  onOpenSitemap,
}: {
  open: boolean
  /** GNB 노출을 켠 메뉴 — 상단 메뉴와 같은 목록이다. */
  menu: SiteMenuLink[]
  /** 판 위쪽에 보여 줄 로고 글자 */
  logo: string
  /** [환경설정]에서 올린 사이트 타이틀 이미지 */
  logoImage?: string | null
  onClose: () => void
  onOpenSitemap: () => void
}) {
  // 닫힐 때도 밀려 나가는 동작이 보이도록, DOM 은 애니메이션이 끝난 뒤 떼어 낸다.
  const { mounted, shown, panelRef } = useDrawerTransition(open, DURATION)
  const [lang, setLang] = useState<Language>(() => currentLanguage())
  const popupCount = usePopupCount()

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

  return (
    <div className="fixed inset-0 z-[65] gnb:hidden" role="dialog" aria-modal aria-label="메뉴">
      {/* 색이 깔린 판 — 오른쪽에서 밀려 들어오며 서서히 나타난다. */}
      <div
        ref={panelRef}
        className={`absolute inset-0 overflow-y-auto bg-mint-700 transition-[transform,opacity] duration-[400ms] ease-out ${
          shown ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
        }`}
      >
        {/* 로고 · 닫기 — 상단 메뉴와 같은 높이에 둔다. */}
        <div className="flex h-[4.5rem] items-center justify-between px-5">
          <Link to="/" onClick={onClose} aria-label={logo}>
            {logoImage ? (
              <img src={logoImage} alt={logo} className="h-7 w-auto max-w-[11rem] object-contain" />
            ) : (
              <span className="text-lg font-bold tracking-[0.25em] text-white">{logo}</span>
            )}
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="메뉴 닫기"
            className="-mr-2 grid h-10 w-10 place-items-center text-white/85 transition hover:text-white"
          >
            <svg className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 5l14 14M19 5L5 19" />
            </svg>
          </button>
        </div>

        {/* 유틸 — 언어 선택과 팝업 열기. 좁은 화면에서는 상단 대신 여기에 둔다. */}
        <div className="border-y border-white/20 px-5 py-4">
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map((l) => (
              <button
                key={l}
                type="button"
                aria-pressed={l === lang}
                onClick={() => {
                  changeLanguage(l)
                  setLang(l)
                }}
                className={`flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3.5 text-[13px] font-bold tracking-wide transition ${
                  l === lang ? 'bg-white text-mint-800' : 'bg-white/10 text-white/80 hover:bg-white/20'
                }`}
              >
                <span className="grid h-6 w-6 place-items-center overflow-hidden rounded-full bg-white/90">
                  <Flag lang={l} />
                </span>
                {LANGUAGE_CODE[l]}
                <span className="sr-only">{LANGUAGE_LABEL[l]}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              requestOpenPopups()
              onClose()
            }}
            disabled={popupCount === 0}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-white/40 py-2.5 text-sm font-bold tracking-wide text-white transition hover:bg-white/10 disabled:cursor-default disabled:opacity-50"
          >
            POPUP
            {popupCount > 0 && (
              <span className="grid h-5 min-w-[1.25rem] place-items-center rounded-full bg-[#f36f21] px-1 text-[11px] font-bold text-white">
                {popupCount}
              </span>
            )}
            {popupCount === 0 && <span className="text-xs font-medium text-white/70">게시 중인 팝업 없음</span>}
          </button>
        </div>

        {/* 메뉴 — 1차 아래에 2차를 펼쳐 놓는다. */}
        <nav className="px-5 pb-10 pt-2">
          <ul className="divide-y divide-white/15">
            {menu.map((item) => (
              <li key={item.id} className="py-5">
                <DrawerLink
                  item={item}
                  onClick={onClose}
                  className="block text-[1.35rem] font-bold leading-tight text-white transition hover:text-white/80"
                >
                  {item.label}
                </DrawerLink>
                {item.children.length > 0 && (
                  <ul className="mt-3 space-y-2.5">
                    {item.children.map((child) => (
                      <li key={child.id}>
                        <DrawerLink
                          item={child}
                          onClick={onClose}
                          className="block text-[0.95rem] text-white/70 transition hover:text-white"
                        >
                          {child.label}
                        </DrawerLink>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>

          {/* 이용안내 — 약관·방침은 메뉴에 없을 수 있어 항상 아래에 둔다. */}
          <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-white/75">
            <button
              type="button"
              onClick={() => {
                onClose()
                onOpenSitemap()
              }}
              className="transition hover:text-white"
            >
              사이트맵
            </button>
            <span className="h-3 w-px bg-white/30" aria-hidden />
            <Link to="/terms" onClick={onClose} className="transition hover:text-white">
              이용약관
            </Link>
            <span className="h-3 w-px bg-white/30" aria-hidden />
            <Link to="/privacy" onClick={onClose} className="transition hover:text-white">
              개인정보처리방침
            </Link>
            <span className="h-3 w-px bg-white/30" aria-hidden />
            <Link to="/admin" className="transition hover:text-white">
              관리자
            </Link>
          </div>
        </nav>
      </div>
    </div>
  )
}
