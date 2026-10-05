import { componentImageUrl } from '../lib/componentSettings'
import { useSiteSetting } from '../lib/seo'

/**
 * 검색 결과·SNS 공유 미리보기 — 입력한 SEO 값이 실제로 어떻게 보일지 그대로 그려 준다.
 * 비워 둔 칸은 홈페이지가 대신 쓰는 값(제목·요약·사이트 기본값)으로 채워 보여 준다.
 */

/** 검색 결과에서 잘리지 않는 대략의 길이 (한글 기준) */
const TITLE_MAX = 40
const DESC_MAX = 110

function clip(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max)}…` : text
}

function Counter({ length, max, label }: { length: number; max: number; label: string }) {
  const over = length > max
  return (
    <span className={`text-[11px] tabular-nums ${over ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`}>
      {label} {length}/{max}자{over && ' — 검색 결과에서 뒷부분이 잘립니다'}
    </span>
  )
}

export default function SeoPreview({
  title,
  description,
  path,
  image,
}: {
  /** 검색 결과 제목 (비었으면 대신 쓸 값까지 정해서 넘긴다) */
  title: string
  description: string
  /** 사이트 안 주소 — /board/12 */
  path: string
  image: string | null
}) {
  const site = useSiteSetting()
  const siteName = site?.siteName || '워드앤코드'
  const fullTitle = `${title}${site?.titleSuffix ?? ''}`
  const host = typeof window !== 'undefined' ? window.location.host : ''
  const crumbs = path.split('/').filter(Boolean)
  const shareImage = image || site?.ogImage || null

  return (
    <div className="space-y-4">
      {/* 검색 결과 */}
      <div>
        <p className="mb-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">검색 결과 미리보기</p>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <p className="truncate text-xs text-slate-600 dark:text-slate-400">
            {siteName} <span className="text-slate-400">· {host}{crumbs.length > 0 && ` › ${crumbs.join(' › ')}`}</span>
          </p>
          <p className="mt-1 text-lg leading-snug text-[#1a0dab] dark:text-[#8ab4f8]">{clip(fullTitle, TITLE_MAX + 10)}</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            {description ? clip(description, DESC_MAX) : <span className="text-slate-400">설명이 없습니다.</span>}
          </p>
        </div>
        <div className="mt-1.5 flex flex-wrap gap-x-4">
          <Counter length={title.length} max={TITLE_MAX} label="제목" />
          <Counter length={description.length} max={DESC_MAX} label="설명" />
        </div>
      </div>

      {/* SNS 공유 카드 */}
      <div>
        <p className="mb-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">SNS 공유 미리보기</p>
        <div className="max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          {shareImage ? (
            <img src={componentImageUrl(shareImage)} alt="" className="aspect-[1.91/1] w-full bg-slate-100 object-cover" />
          ) : (
            <div className="grid aspect-[1.91/1] w-full place-items-center bg-slate-100 text-xs text-slate-400 dark:bg-slate-800">
              공유 이미지가 없습니다
            </div>
          )}
          <div className="border-t border-slate-200 px-3.5 py-2.5 dark:border-slate-700">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">{host}</p>
            <p className="mt-0.5 truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</p>
            <p className="mt-0.5 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{description}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
