import { useLocation } from 'react-router-dom'
import type { PageHeroTab } from './PageHero'
import { layoutComponent, type SubLayoutProps } from '../layouts'
import { layoutFor, usePageLayouts } from '../lib/pageLayouts'

/**
 * 서브 화면 공통 틀.
 * 페이지 관리에서 이 경로에 고른 레이아웃을 등록부(src/layouts)에서 찾아 그린다.
 */
export default function SubPage(props: Omit<SubLayoutProps, 'children'> & { children: SubLayoutProps['children']; tabs?: PageHeroTab[] }) {
  const { pathname } = useLocation()
  const layouts = usePageLayouts()
  const Layout = layoutComponent(layoutFor(pathname, layouts))
  return <Layout {...props} />
}
