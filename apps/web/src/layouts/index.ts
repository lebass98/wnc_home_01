import type { ComponentType, ReactNode } from 'react'
import type { PageHeroTab } from '../components/PageHero'
import BasicSubLayout from './BasicSubLayout'
import LeftMenuSubLayout from './LeftMenuSubLayout'

/**
 * 서브 레이아웃 등록부 — 레이아웃 하나가 파일 하나다.
 *
 * 새 레이아웃을 만들려면:
 *  1. 이 폴더에 파일을 만들고 (SubLayoutProps 를 받아 그린다)
 *  2. 아래 LAYOUTS 에 한 줄 등록한다
 * 페이지 관리의 레이아웃 선택에 바로 나타난다.
 */

/** 모든 서브 레이아웃이 받는 값 */
export interface SubLayoutProps {
  title: string
  description?: string
  /** 히어로 아래 작은 탭 — 레이아웃이 쓸지 말지 정한다. */
  tabs?: PageHeroTab[]
  children: ReactNode
}

export interface LayoutDef {
  /** 저장에 쓰는 식별자 — 영문·숫자·하이픈 */
  key: string
  label: string
  description: string
  component: ComponentType<SubLayoutProps>
}

export const LAYOUTS: LayoutDef[] = [
  { key: 'basic', label: '기본 서브', description: '전체 폭 본문. 히어로 아래에 작은 탭이 붙는다.', component: BasicSubLayout },
  { key: 'left', label: '좌측 메뉴 서브', description: '왼쪽에 메뉴 묶음, 오른쪽에 본문. 좁은 화면에서는 가로 칩.', component: LeftMenuSubLayout },
]

/** key 로 레이아웃을 찾는다 — 모르는 값이면 기본 서브를 쓴다. */
export function layoutComponent(key: string): ComponentType<SubLayoutProps> {
  return LAYOUTS.find((l) => l.key === key)?.component ?? BasicSubLayout
}
