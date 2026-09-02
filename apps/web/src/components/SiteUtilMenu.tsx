import { useEffect, useRef, useState } from 'react'
import { changeLanguage, currentLanguage, LANGUAGES, LANGUAGE_LABEL, type Language } from '../lib/i18n'
import { requestOpenPopups, usePopupCount } from '../lib/popupLayer'

/** 상단 메뉴에 짧게 보여 줄 언어 코드 */
const LANGUAGE_CODE: Record<Language, string> = {
  ko: 'KOR',
  en: 'ENG',
  ja: 'JPN',
  zh: 'CHN',
}

/** 언어별 작은 국기 — 외부 이미지 없이 그린다. */
function Flag({ lang }: { lang: Language }) {
  if (lang === 'ko') {
    // 태극기 — 흰 바탕에 태극 문양만 간단히 그린다.
    return (
      <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
        <circle cx="12" cy="12" r="12" fill="#fff" />
        <circle cx="12" cy="12" r="6" fill="#cd2e3a" />
        <path d="M6 12a3 3 0 0 0 6 0 3 3 0 0 1 6 0 6 6 0 0 1-12 0z" fill="#0047a0" />
        <circle cx="9" cy="12" r="3" fill="#cd2e3a" />
        <circle cx="15" cy="12" r="3" fill="#0047a0" />
        <g stroke="#111" strokeWidth="1">
          <path d="M3.2 6.2l2.6-1.5M3.2 7.8l2.6-1.5M3.2 9.4l2.6-1.5" />
          <path d="M18.2 4.7l2.6 1.5M18.2 6.3l2.6 1.5M18.2 7.9l2.6 1.5" />
          <path d="M3.2 14.6l2.6 1.5M3.2 16.2l2.6 1.5M3.2 17.8l2.6 1.5" />
          <path d="M18.2 16.1l2.6-1.5M18.2 17.7l2.6-1.5M18.2 19.3l2.6-1.5" />
        </g>
      </svg>
    )
  }
  if (lang === 'ja') {
    return (
      <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
        <circle cx="12" cy="12" r="12" fill="#fff" />
        <circle cx="12" cy="12" r="6" fill="#bc002d" />
      </svg>
    )
  }
  if (lang === 'zh') {
    return (
      <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
        <circle cx="12" cy="12" r="12" fill="#de2910" />
        <path d="M8 6l1.3 3.9h4.1l-3.3 2.4 1.2 3.9L8 13.8l-3.3 2.4 1.2-3.9L2.6 9.9h4.1z" fill="#ffde00" />
      </svg>
    )
  }
  // 영어 — 성조기 느낌의 줄무늬
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
      <defs>
        <clipPath id="flag-en-clip">
          <circle cx="12" cy="12" r="12" />
        </clipPath>
      </defs>
      <g clipPath="url(#flag-en-clip)">
        <rect width="24" height="24" fill="#fff" />
        {[0, 2, 4, 6].map((i) => (
          <rect key={i} y={i * 3.4} width="24" height="1.7" fill="#b22234" />
        ))}
        <rect width="11" height="12" fill="#3c3b6e" />
      </g>
    </svg>
  )
}

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

      {/* 팝업 다시 열기 — 이 화면에 팝업이 있을 때만 보인다. */}
      {popupCount > 0 && (
        <button
          type="button"
          onClick={requestOpenPopups}
          aria-label={`팝업 ${popupCount}건 보기`}
          className="flex items-center gap-1.5"
        >
          POPUP
          <span className="grid h-5 min-w-[1.25rem] place-items-center rounded-full bg-[#f36f21] px-1 text-[11px] font-bold text-white">
            {popupCount}
          </span>
        </button>
      )}
    </div>
  )
}
