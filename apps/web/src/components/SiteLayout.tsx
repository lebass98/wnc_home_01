import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { DEFAULT_COMPANY } from '@wnc/shared'
import { pickMenu, useSiteMenu } from '../lib/menus'
import { useSiteSeo, useSiteSetting } from '../lib/seo'
import { useSiteDesign } from '../lib/siteDesign'
import { footerComponent, headerComponent } from '../layouts'
import SitePopups from './SitePopups'
import SitemapDrawer from './SitemapDrawer'
import MobileNavDrawer from './MobileNavDrawer'

/**
 * 홈페이지 공통 틀 — 헤더·푸터는 [디자인 설정]에서 고른 레이아웃을
 * 등록부(src/layouts)에서 찾아 그린다. 드로어·팝업·투명 헤더 판정은 여기서 관리한다.
 */
export default function SiteLayout() {
  useSiteSeo()
  // 푸터 회사 정보 — 설정을 받기 전에는 기본값으로 그린다.
  const company = useSiteSetting() ?? DEFAULT_COMPANY
  const design = useSiteDesign()
  const [open, setOpen] = useState(false)
  const [sitemapOpen, setSitemapOpen] = useState(false)
  const { pathname } = useLocation()

  // 메뉴는 관리자 [메뉴 관리]에서 정한다. 상단·푸터는 각각의 노출 스위치로 거른다.
  const siteMenu = useSiteMenu()
  const menu = pickMenu(siteMenu, 'gnb')
  const footerMenu = pickMenu(siteMenu, 'footer')
  const logo = company.companyNameEn || company.companyName

  // 페이지 이동 시 모바일 메뉴를 닫고 상단으로 스크롤한다.
  useEffect(() => {
    setOpen(false)
    setSitemapOpen(false)
    window.scrollTo(0, 0)
  }, [pathname])

  // 상단이 어두운 화면(메인 히어로·서브 페이지 배너)에서는
  // 헤더를 그 위에 투명하게 얹고, 내리면 흰 배경으로 바꾼다.
  // 아래 목록에 없는 화면은 처음부터 흰 헤더를 쓴다.
  const DARK_TOP = ['/', '/about', '/services', '/products', '/board', '/contact', '/terms', '/privacy']
  const overHero =
    DARK_TOP.includes(pathname) ||
    pathname.startsWith('/page/') ||
    pathname.startsWith('/about/') ||
    pathname.startsWith('/board/') ||
    pathname.startsWith('/contact/')
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    if (!overHero) return
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [overHero])

  // 투명 상태에서는 헤더 글자를 흰색으로 뒤집는다.
  // 모바일 메뉴는 화면 전체를 덮는 별도 판이라 헤더 색은 건드리지 않는다.
  const transparent = overHero && !scrolled

  const Header = headerComponent(design.header)
  const Footer = footerComponent(design.footer)

  return (
    <div className="flex min-h-screen flex-col">
      <SitePopups />
      <SitemapDrawer open={sitemapOpen} onClose={() => setSitemapOpen(false)} />
      <MobileNavDrawer
        open={open}
        menu={menu}
        logo={logo}
        onClose={() => setOpen(false)}
        onOpenSitemap={() => setSitemapOpen(true)}
      />
      <Header
        menu={menu}
        logo={logo}
        transparent={transparent}
        onOpenMobile={() => setOpen(true)}
        onOpenSitemap={() => setSitemapOpen(true)}
      />

      <main className="flex-1">
        <Outlet />
      </main>

      <Footer company={company} menu={footerMenu} onOpenSitemap={() => setSitemapOpen(true)} />
    </div>
  )
}
