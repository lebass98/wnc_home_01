import { useState } from 'react'
import { changeLanguage, currentLanguage, LANGUAGES, LANGUAGE_LABEL, type Language } from '../lib/i18n'
import { requestOpenPopups, usePopupCount } from '../lib/popupLayer'

/** 언어 선택 단추에 쓰는 두 글자 표기 — 나라 코드로 짧게 */
const SHORT_CODE: Record<Language, string> = { ko: 'KR', en: 'EN', ja: 'JP', zh: 'CN' }

/**
 * 상단 메뉴 오른쪽의 유틸 — 언어 선택과 팝업 다시 열기.
 * 언어 선택은 풀다운이 아니라 알약 모양 구분 단추다 — 지금 언어는 파란 원으로 채우고 나머지는 회색 글자로 나란히 둔다.
 * transparent 가 켜지면 어두운 히어로 위에 얹히므로 글자를 흰색으로 뒤집는다.
 */
export default function SiteUtilMenu({ transparent }: { transparent: boolean }) {
  const [lang, setLang] = useState<Language>(() => currentLanguage())
  const popupCount = usePopupCount()

  const text = transparent ? 'text-white' : 'text-slate-900'

  return (
    <div className={`flex items-center gap-4 text-[13px] font-bold tracking-wide ${text}`}>
      {/* 언어 선택 — 알약 안에 KR · EN · JP · CN 을 나란히 두고 지금 언어만 파랗게 채운다 */}
      <div
        role="radiogroup"
        aria-label="언어 선택"
        className={`flex items-center rounded-full p-0.5 ${transparent ? 'bg-white/15' : 'bg-slate-100'}`}
      >
        {LANGUAGES.map((l) => {
          const on = l === lang
          return (
            <button
              key={l}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={LANGUAGE_LABEL[l]}
              onClick={() => {
                changeLanguage(l)
                setLang(l)
              }}
              className={`grid h-6 min-w-[2rem] place-items-center rounded-full px-2 text-[11px] font-bold leading-none transition ${
                on
                  ? 'bg-[#2f7cf6] text-white shadow-sm'
                  : transparent
                    ? 'text-white/70 hover:text-white'
                    : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {SHORT_CODE[l]}
            </button>
          )
        })}
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
