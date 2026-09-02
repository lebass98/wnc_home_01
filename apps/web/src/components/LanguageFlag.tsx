import type { Language } from '../lib/i18n'

/**
 * 언어 표시용 조각 — 상단 유틸 메뉴와 모바일 메뉴가 함께 쓴다.
 */

/** 상단 메뉴에 짧게 보여 줄 언어 코드 */
export const LANGUAGE_CODE: Record<Language, string> = {
  ko: 'KOR',
  en: 'ENG',
  ja: 'JPN',
  zh: 'CHN',
}

/** 언어별 작은 국기 — 외부 이미지 없이 그린다. */
export function Flag({ lang }: { lang: Language }) {
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
