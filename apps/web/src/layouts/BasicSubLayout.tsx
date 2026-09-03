import PageHero from '../components/PageHero'
import { useCrumbs } from '../components/PageBreadcrumb'
import type { SubLayoutProps } from './index'

/**
 * 기본 서브 — 전체 폭 본문.
 * 히어로에 길 안내(홈 › 묶음 › 현재)와 작은 탭이 붙고, 본문은 페이지가 그린 그대로 놓인다.
 */
export default function BasicSubLayout({ title, description, tabs, bgImage, eyebrow, children }: SubLayoutProps) {
  const crumbs = useCrumbs(title)

  return (
    <>
      <PageHero
        title={title}
        description={description}
        tabs={tabs}
        breadcrumb={crumbs}
        bgImage={bgImage}
        eyebrow={eyebrow}
      />
      {children}
    </>
  )
}
