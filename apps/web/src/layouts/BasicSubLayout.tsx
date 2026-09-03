import PageHero from '../components/PageHero'
import type { SubLayoutProps } from './index'

/**
 * 기본 서브 — 전체 폭 본문.
 * 히어로 아래에 작은 탭이 붙고, 본문은 페이지가 그린 그대로 놓인다.
 */
export default function BasicSubLayout({ title, description, tabs, children }: SubLayoutProps) {
  return (
    <>
      <PageHero title={title} description={description} tabs={tabs} />
      {children}
    </>
  )
}
