import { useState } from 'react'
import type { BoardLocale, LocalizedText } from '@wnc/shared'
import { BOARD_LOCALES, BOARD_LOCALE_LABEL } from '@wnc/shared'

/** 기본 언어 — 지울 수 없다. */
const BASE_LOCALE: BoardLocale = 'ko'

/**
 * 언어 탭이 달린 입력란.
 * 탭을 눌러 언어를 바꾸고, x 를 눌러 해당 언어 입력을 지운다.
 */
export default function LocalizedInput({
  id,
  value,
  onChange,
  placeholder,
  multiline = false,
  rows = 4,
  maxLength = 300,
}: {
  id: string
  value: LocalizedText
  onChange: (next: LocalizedText) => void
  /** `(한국어)` 처럼 언어명이 뒤에 붙는다 */
  placeholder: string
  multiline?: boolean
  rows?: number
  maxLength?: number
}) {
  const [active, setActive] = useState<BoardLocale>(BASE_LOCALE)
  // 기본 언어와 값이 있는 언어를 항상 보여준다.
  const [shown, setShown] = useState<BoardLocale[]>(() =>
    BOARD_LOCALES.filter((l) => l === BASE_LOCALE || (value[l] ?? '') !== ''),
  )

  const hidden = BOARD_LOCALES.filter((l) => !shown.includes(l))

  function removeLocale(locale: BoardLocale) {
    setShown((prev) => prev.filter((l) => l !== locale))
    if (active === locale) setActive(BASE_LOCALE)
    // 지운 언어의 값도 함께 비운다.
    const next = { ...value }
    delete next[locale]
    onChange(next)
  }

  const field = {
    id,
    value: value[active] ?? '',
    maxLength,
    placeholder: `${placeholder} (${BOARD_LOCALE_LABEL[active]})`,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange({ ...value, [active]: e.target.value }),
    className: 'input',
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        {shown.map((locale) => {
          const isActive = active === locale
          return (
            <span
              key={locale}
              className={`inline-flex items-center gap-1.5 rounded-full py-1 pl-3 text-sm font-medium transition ${
                locale === BASE_LOCALE ? 'pr-3' : 'pr-1.5'
              } ${
                isActive
                  ? 'bg-brand-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
              }`}
            >
              <button
                type="button"
                onClick={() => setActive(locale)}
                className="inline-flex items-center gap-1.5"
                aria-pressed={isActive}
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0zM3.6 9h16.8M3.6 15h16.8M12 3a15 15 0 010 18a15 15 0 010-18z"
                  />
                </svg>
                {BOARD_LOCALE_LABEL[locale]}
              </button>

              {locale === BASE_LOCALE ? (
                <span className="text-xs opacity-80">*</span>
              ) : (
                <button
                  type="button"
                  onClick={() => removeLocale(locale)}
                  aria-label={`${BOARD_LOCALE_LABEL[locale]} 입력 제거`}
                  className="grid h-5 w-5 place-items-center rounded-full hover:bg-black/10 dark:hover:bg-white/10"
                >
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </span>
          )
        })}

        {hidden.map((locale) => (
          <button
            key={locale}
            type="button"
            onClick={() => {
              setShown((prev) => [...prev, locale])
              setActive(locale)
            }}
            className="rounded-full border border-dashed border-slate-300 px-3 py-1 text-sm text-slate-500
                       hover:border-slate-400 hover:text-slate-700
                       dark:border-slate-600 dark:text-slate-400 dark:hover:text-slate-200"
          >
            + {BOARD_LOCALE_LABEL[locale]}
          </button>
        ))}
      </div>

      {multiline ? (
        <textarea {...field} rows={rows} className="input resize-y" />
      ) : (
        <input {...field} type="text" />
      )}
    </div>
  )
}
