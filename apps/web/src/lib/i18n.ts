import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import ko from '../locales/ko.json'
import en from '../locales/en.json'
import ja from '../locales/ja.json'
import zh from '../locales/zh.json'

/** 지원 언어 — 새 언어를 추가하려면 여기와 locales/ 에 파일을 함께 넣는다. */
export const LANGUAGES = ['ko', 'en', 'ja', 'zh'] as const
export type Language = (typeof LANGUAGES)[number]

/** 언어 선택 UI 에 쓰는 이름. 각 언어는 자기 표기로 보여 준다. */
export const LANGUAGE_LABEL: Record<Language, string> = {
  ko: '한국어',
  en: 'English',
  ja: '日本語',
  zh: '中文',
}

const STORAGE_KEY = 'wnc_admin_lang'

i18next
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      ko: { translation: ko },
      en: { translation: en },
      ja: { translation: ja },
      zh: { translation: zh },
    },
    // 지원하지 않는 언어이거나 키가 비어 있으면 한국어로 보여 준다.
    fallbackLng: 'ko',
    supportedLngs: LANGUAGES,
    // 'en-US' 같은 지역 코드를 'en' 으로 맞춘다.
    load: 'languageOnly',
    nonExplicitSupportedLngs: true,
    detection: {
      // 저장된 선택을 먼저 보고, 없으면 브라우저 설정을 따른다.
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: STORAGE_KEY,
      caches: ['localStorage'],
    },
    interpolation: {
      // React 가 이미 이스케이프하므로 중복 처리하지 않는다.
      escapeValue: false,
    },
  })

export default i18next

/** 현재 언어를 바꾸고 선택을 저장한다. */
export function changeLanguage(lang: Language) {
  i18next.changeLanguage(lang)
}

/** 지원 목록에 없는 값이 들어와도 안전하게 되돌린다. */
export function currentLanguage(): Language {
  const lang = i18next.resolvedLanguage ?? i18next.language
  return (LANGUAGES as readonly string[]).includes(lang) ? (lang as Language) : 'ko'
}

/**
 * 언어별 값({ko, en, ja})에서 지금 언어의 것을 고른다.
 * 그 언어 값이 비어 있으면 한국어, 그것도 없으면 기본값을 쓴다.
 */
export function pickLocalized(values: Partial<Record<string, string>> | null | undefined, fallback: string): string {
  const lang = currentLanguage()
  return values?.[lang]?.trim() || values?.ko?.trim() || fallback
}
