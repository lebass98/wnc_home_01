import { useEffect, useRef, useState } from 'react'
import { changeLanguage, currentLanguage, LANGUAGES, LANGUAGE_LABEL, type Language } from '../lib/i18n'
import { requestOpenPopups, usePopupCount } from '../lib/popupLayer'
import { Flag, LANGUAGE_CODE } from './LanguageFlag'

/**
 * 상단 메뉴 오른쪽의 유틸 — 언어 선택과 팝업 다시 열기.
 * transparent 가 켜지면 어두운 히어로 위에 얹히므로 글자를 흰색으로 뒤집는다.
 */
export default function SiteUtilMenu({ transparent }: { transparent: boolean }) {
  const [open, setOpen] = useState(false)
  const [lang, setLang] = useState<Language>(() => currentLanguage())
  const ref = useRef<HTMLDivElement>(null)
  const popupCount = usePopupCount()

  // 바깥을 누르면 닫는다.
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('click', onClick)
    return () => window.removeEventListener('click', onClick)
  }, [open])

  const text = transparent ? 'text-white' : 'text-slate-900'

  return (
    <div className={`flex items-center gap-4 text-[13px] font-bold tracking-wide ${text}`}>
      {/* 언어 선택 */}
      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="언어 선택"
          className="flex items-center gap-1.5"
        >
          <span className="grid h-7 w-7 place-items-center rounded-full bg-white/90 shadow-sm ring-1 ring-black/5">
            <Flag lang={lang} />
          </span>
          {LANGUAGE_CODE[lang]}
          <svg
            className={`h-3.5 w-3.5 transition ${open ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {open && (
          <div
            role="menu"
            className="absolute right-0 top-9 z-50 w-36 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 text-slate-700 shadow-lg"
          >
            {LANGUAGES.map((l) => (
              <button
                key={l}
                type="button"
                role="menuitemradio"
                aria-checked={l === lang}
                onClick={() => {
                  changeLanguage(l)
                  setLang(l)
                  setOpen(false)
                }}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm font-medium transition ${
                  l === lang ? 'bg-slate-50 text-slate-900' : 'hover:bg-slate-50'
                }`}
              >
                <Flag lang={l} />
                <span className="w-9">{LANGUAGE_CODE[l]}</span>
                <span className="text-xs font-normal text-slate-500">{LANGUAGE_LABEL[l]}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 팝업 다시 열기 — 어느 화면에서든 항상 보이고, 배지에는 게시 중인 건수를 적는다. */}
      <button
        type="button"
        onClick={requestOpenPopups}
        disabled={popupCount === 0}
        aria-label={popupCount > 0 ? `팝업 ${popupCount}건 보기` : '게시 중인 팝업 없음'}
        className="flex items-center gap-1.5 disabled:cursor-default disabled:opacity-60"
      >
        POPUP
        {popupCount > 0 && (
          <span className="grid h-5 min-w-[1.25rem] place-items-center rounded-full bg-[#f36f21] px-1 text-[11px] font-bold text-white">
            {popupCount}
          </span>
        )}
      </button>
    </div>
  )
}
