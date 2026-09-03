import type { ComponentType, ReactNode } from 'react'
import type { CompanySettingInput, SiteSetting } from '@wnc/shared'
import type { PageHeroTab } from '../components/PageHero'
import type { SiteMenuLink } from '../lib/menus'
import BasicSubLayout from './BasicSubLayout'
import LeftMenuSubLayout from './LeftMenuSubLayout'
import PolicySubLayout from './PolicySubLayout'
import BasicHeader from './BasicHeader'
import CenterHeader from './CenterHeader'
import BasicFooter from './BasicFooter'
import SimpleFooter from './SimpleFooter'

/**
 * 레이아웃 등록부 — 레이아웃 하나가 파일 하나다.
 *
 * 종류가 세 가지다.
 *  - 헤더(HEADERS)·푸터(FOOTERS): 사이트 전체에 하나씩 — [디자인 설정]에서 고른다.
 *  - 서브(LAYOUTS): 화면마다 다르게 — [페이지 관리]에서 경로별로 고른다.
 *
 * 새 레이아웃을 만들려면:
 *  1. 이 폴더에 파일을 만들고 (해당 종류의 props 를 받아 그린다)
 *  2. 아래 목록에 한 줄 등록한다
 * 관리자 선택지에 바로 나타난다.
 */

/* ---------- 서브 레이아웃 ---------- */

/** 모든 서브 레이아웃이 받는 값 */
export interface SubLayoutProps {
  title: string
  description?: string
  /** 히어로 아래 작은 탭 — 레이아웃이 쓸지 말지 정한다. */
  tabs?: PageHeroTab[]
  /** 본문 위에 덧붙이는 내용 — 약관형에서 개인정보 처리표시(라벨링)에 쓴다. */
  prologue?: ReactNode
  children: ReactNode
  /** 서브 비주얼 배경 이미지 (미지정 시 경로별 자동 선택) */
  bgImage?: string
  /** 영문 소제목 (미지정 시 경로별 자동 선택) */
  eyebrow?: string
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
  { key: 'policy', label: '약관형 서브', description: '좌측 메뉴 + 약관 문서. 안내 상자와 조문 목차를 자동으로 붙인다.', component: PolicySubLayout },
]

/** key 로 레이아웃을 찾는다 — 모르는 값이면 기본 서브를 쓴다. */
export function layoutComponent(key: string): ComponentType<SubLayoutProps> {
  return LAYOUTS.find((l) => l.key === key)?.component ?? BasicSubLayout
}

/* ---------- 헤더 ---------- */

/** 모든 헤더 레이아웃이 받는 값 — 상태(드로어·투명 여부)는 SiteLayout 이 관리한다. */
export interface SiteHeaderProps {
  /** GNB 에 보일 1차 메뉴 (2차 포함) */
  menu: SiteMenuLink[]
  /** 로고 글자 */
  logo: string
  /** 어두운 히어로 위에 투명하게 얹힌 상태 — 스크롤을 내리면 꺼진다. */
  transparent: boolean
  /** 햄버거를 눌렀을 때 — 모바일 메뉴 판을 연다. */
  onOpenMobile: () => void
  onOpenSitemap: () => void
}

export interface HeaderDef {
  key: string
  label: string
  description: string
  component: ComponentType<SiteHeaderProps>
}

export const HEADERS: HeaderDef[] = [
  { key: 'basic', label: '기본 헤더', description: '로고 왼쪽, 메뉴 오른쪽 한 줄. 메뉴에 올리면 2차 메뉴 판이 아래로 펼쳐진다.', component: BasicHeader },
  { key: 'center', label: '센터 헤더', description: '로고 가운데, 그 아래 가운데 정렬 메뉴 두 줄. 2차 메뉴는 드롭다운 카드.', component: CenterHeader },
]

/** key 로 헤더를 찾는다 — 모르는 값이면 기본 헤더를 쓴다. */
export function headerComponent(key: string): ComponentType<SiteHeaderProps> {
  return HEADERS.find((h) => h.key === key)?.component ?? BasicHeader
}

/* ---------- 푸터 ---------- */

/** 모든 푸터 레이아웃이 받는 값 */
export interface SiteFooterProps {
  /** 회사 정보 — 설정을 받기 전에는 기본값(DEFAULT_COMPANY)이 온다. */
  company: SiteSetting | CompanySettingInput
  /** 푸터에 보일 1차 메뉴 (2차 포함) */
  menu: SiteMenuLink[]
  onOpenSitemap: () => void
}

export interface FooterDef {
  key: string
  label: string
  description: string
  component: ComponentType<SiteFooterProps>
}

export const FOOTERS: FooterDef[] = [
  { key: 'basic', label: '기본 푸터', description: '베이지 바탕 가운데 정렬. 메뉴 다섯 열과 SNS·회사 정보를 모두 보여 준다.', component: BasicFooter },
  { key: 'simple', label: '심플 푸터', description: '어두운 바탕 한 단. 로고·회사 정보와 1차 메뉴만 간결하게 담는다.', component: SimpleFooter },
]

/** key 로 푸터를 찾는다 — 모르는 값이면 기본 푸터를 쓴다. */
export function footerComponent(key: string): ComponentType<SiteFooterProps> {
  return FOOTERS.find((f) => f.key === key)?.component ?? BasicFooter
}
