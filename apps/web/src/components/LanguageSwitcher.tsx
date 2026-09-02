import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { changeLanguage, currentLanguage, LANGUAGES, LANGUAGE_LABEL } from '../lib/i18n'

/** 어드민 상단의 언어 선택 드롭다운 */
export default function LanguageSwitcher() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const active = currentLanguage()
  const ref = useRef<HTMLDivElement>(null)

  // 바깥을 누르면 닫는다.
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('click', onClick)
    return () => window.removeEventListener('click', onClick)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={t('language.label')}
        aria-label={t('language.label')}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-10 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-slate-600 transition
                   hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500
                   dark:text-slate-300 dark:hover:bg-slate-700"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 12a9 9 0 11-18 0 9 9 0 0118 0zM3.6 9h16.8M3.6 15h16.8M12 3a15 15 0 010 18a15 15 0 010-18z"
          />
        </svg>
        <span className="hidden sm:inline">{LANGUAGE_LABEL[active]}</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-11 z-50 w-36 overflow-hidden rounded-lg border border-slate-200
                     bg-white py-1 shadow-lg dark:border-slate-600 dark:bg-slate-800"
        >
          {LANGUAGES.map((lang) => (
            <button
              key={lang}
              type="button"
              role="menuitemradio"
              aria-checked={lang === active}
              onClick={() => {
                changeLanguage(lang)
                setOpen(false)
              }}
              className={`flex w-full items-center justify-between px-3.5 py-2 text-left text-sm transition ${
                lang === active
                  ? 'bg-brand-50 font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-300'
                  : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {LANGUAGE_LABEL[lang]}
              {lang === active && (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
