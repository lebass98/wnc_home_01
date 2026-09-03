import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import type { SubLayoutProps } from './index'
import LeftMenuSubLayout from './LeftMenuSubLayout'

/**
 * 약관형 서브 — 이용약관·개인정보처리방침처럼 장(章)과 조(條)로 이어지는 문서를 위한 틀.
 * (참고: 인천국제공항 이용약관 화면)
 *
 * 본문은 [페이지 관리]에서 고친 내용을 그대로 쓰고, 이 레이아웃이 읽기 좋게 다듬는다.
 * 인천공항과 같은 차례로 놓는다 — 안내문 상자 → 조문 목차 → 장·조 본문.
 *  - 본문 맨 앞 목록은 안내문으로 보고 회색 상자에 옮겨 담는다
 *  - '제N조' 제목을 모아 목차를 만들고, 누르면 그 조문으로 이동한다
 *  - 장 제목에는 굵은 밑줄, 조문 사이에는 옅은 구분선 (스타일은 index.css 의 .policy-doc)
 * 좌측 메뉴는 좌측 메뉴 서브와 같게 세운다.
 */

/** 조문 목차 한 줄 — '제3조 (약관 외 준칙)' 을 번호와 이름으로 나눈 것 */
interface Article {
  id: string
  no: string
  name: string
}

function PolicyBody({ children, prologue }: { children: ReactNode; prologue?: ReactNode }) {
  const bodyRef = useRef<HTMLDivElement>(null)
  const [articles, setArticles] = useState<Article[]>([])
  /** 본문 맨 앞 목록에서 옮겨 온 안내문 */
  const [notice, setNotice] = useState<string[]>([])
  const { pathname } = useLocation()

  // 본문이 그려진 뒤 안내문과 조문을 읽어 온다.
  // 원본은 그대로 두고 안내문만 감춰(class) 위쪽 상자로 다시 보여 준다.
  useEffect(() => {
    const root = bodyRef.current
    if (!root) return

    const intro = root.querySelector('.prose-wnc > ul:first-child')
    if (intro) {
      setNotice([...intro.querySelectorAll(':scope > li')].map((li) => li.textContent?.trim() ?? ''))
      intro.classList.add('hidden')
    } else {
      setNotice([])
    }

    // 조문은 두 가지 모양으로 온다.
    //  - 이용약관 : h3 '제3조 (약관 외 준칙)'
    //  - 처리방침 : h2 '3. 개인정보의 제3자 제공'
    const found: Article[] = []
    root.querySelectorAll('h2, h3').forEach((el, i) => {
      const text = el.textContent?.trim() ?? ''
      const article = text.match(/^(제\s*\d+\s*조)\s*\(?([^)]*)\)?/)
      const numbered = el.tagName === 'H2' ? text.match(/^(\d+)\.\s*(.+)$/) : null
      if (!article && !numbered) return

      const id = `article-${i + 1}`
      el.id = id
      el.classList.add('scroll-mt-28')
      found.push(
        article
          ? { id, no: article[1].replace(/\s+/g, ''), name: article[2].trim() }
          : { id, no: `${numbered![1]}.`, name: numbered![2].trim() },
      )
    })
    setArticles(found)
  }, [children, pathname])

  return (
    <div className="policy-doc">
      {/* 안내문 — 본문 맨 앞 목록을 옮겨 담는다 */}
      {notice.length > 0 && (
        <div className="border border-slate-200 bg-slate-50 px-6 py-6 sm:px-8">
          <ul className="space-y-2 text-[0.95rem] leading-[1.8] text-slate-700">
            {notice.map((line) => (
              <li
                key={line}
                className="relative pl-4 before:absolute before:left-0 before:top-[0.8em] before:h-1 before:w-1 before:rounded-full before:bg-slate-500"
              >
                {line}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 안내문과 목차 사이에 덧붙이는 자리 — 개인정보 처리표시(라벨링) 등 */}
      {prologue}

      {/* 조문 목차 — 본문에서 찾은 조문이 있을 때만 */}
      {articles.length > 0 && (
        <nav className="mt-8 border-b border-t border-slate-300 py-6" aria-label="조문 목차">
          <ul className="flex flex-wrap gap-2">
            {articles.map((a) => (
              <li key={a.id}>
                <a
                  href={`#${a.id}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-sm text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
                >
                  <strong className="font-semibold">{a.no}</strong>
                  {a.name && <span className="text-slate-500">{a.name}</span>}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <div ref={bodyRef}>{children}</div>
    </div>
  )
}

export default function PolicySubLayout(props: SubLayoutProps) {
  return (
    <LeftMenuSubLayout {...props}>
      <PolicyBody prologue={props.prologue}>{props.children}</PolicyBody>
    </LeftMenuSubLayout>
  )
}
