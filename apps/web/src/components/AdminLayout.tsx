import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import ThemeToggle from './ThemeToggle'
import LanguageSwitcher from './LanguageSwitcher'
import { useEnableDarkMode } from '../lib/theme'
import { useBoards } from '../lib/boards'

/** 하위 메뉴가 없는 항목 */
interface NavLeaf {
  to: string
  label: string
  end: boolean
  icon: string
  /** 이 경로들로 시작할 때는 활성 처리하지 않는다 (형제 메뉴가 담당하는 화면). */
  notWhen?: string[]
}

/** 하위 메뉴를 품은 항목 */
interface NavGroup {
  label: string
  /** 이 경로로 시작하면 하위 메뉴를 펼친다. */
  match: string
  icon: string
  children: NavLeaf[]
}

type NavItem = NavLeaf | NavGroup

const isGroup = (item: NavItem): item is NavGroup => 'children' in item

const NAV: NavItem[] = [
  {
    to: '/admin',
    label: '대시보드',
    end: true,
    icon: 'M3 12l9-9 9 9M5 10v10h14V10',
  },
  {
    to: '/admin/settings',
    label: '환경설정',
    end: false,
    icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z',
  },
  {
    label: '게시판 관리',
    match: '/admin/posts',
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    children: [
      {
        to: '/admin/posts/settings',
        label: '환경설정',
        end: false,
        icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z',
      },
      {
        to: '/admin/posts',
        label: '게시판 목록',
        // 글 목록·작성·수정 화면까지 이 메뉴로 묶는다. (환경설정·신고현황은 제외)
        end: false,
        notWhen: ['/admin/posts/settings', '/admin/posts/reports'],
        icon: 'M4 6h16M4 12h16M4 18h16',
      },
      {
        to: '/admin/posts/reports',
        label: '게시판 신고현황',
        end: false,
        icon: 'M3 21V5a2 2 0 012-2h9l-1 3h5a1 1 0 011 1v7a1 1 0 01-1 1h-6l1-3H5',
      },
    ],
  },
  {
    to: '/admin/products',
    label: '제품 관리',
    end: false,
    icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  },
  {
    to: '/admin/categories',
    label: '제품 카테고리',
    end: false,
    icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z',
  },
  {
    to: '/admin/pages',
    label: '페이지 관리',
    end: false,
    icon: 'M9 12h6m-6 4h4M8 4h8a2 2 0 012 2v12a2 2 0 01-2 2H8a2 2 0 01-2-2V6a2 2 0 012-2zm1 4h6',
  },
  {
    to: '/admin/design',
    label: '디자인 설정',
    end: false,
    icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v3H4V5zm0 5h16v9a1 1 0 01-1 1H5a1 1 0 01-1-1v-9zm3 3h4v4H7v-4z',
  },
  {
    to: '/admin/menus',
    label: '메뉴 관리',
    end: false,
    icon: 'M4 6h16M4 12h10M4 18h7',
  },
  {
    to: '/admin/popups',
    label: '팝업 관리',
    end: false,
    icon: 'M4 5a2 2 0 012-2h9a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2V5z M9 10a2 2 0 012-2h9a2 2 0 012 2v9a2 2 0 01-2 2h-9a2 2 0 01-2-2v-9z',
  },
  {
    to: '/admin/faqs',
    label: '자주 묻는 질문',
    end: false,
    icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  {
    to: '/admin/privacy-revisions',
    label: '개인정보 이력',
    end: false,
    icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
  },
  {
    to: '/admin/contacts',
    label: '문의 관리',
    end: false,
    icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  },
]

const NAV_ITEM =
  'flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold transition'
const NAV_ACTIVE = 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100'
const NAV_IDLE =
  'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'

export default function AdminLayout() {
  useEnableDarkMode()
  // '관리자 메뉴에 표시'를 켠 게시판은 [게시판 관리] 아래에 바로가기로 붙인다.
  const { t } = useTranslation()
  const boards = useBoards(true)

  // 정적 메뉴에 게시판 바로가기를 합친다. (원본 NAV 는 건드리지 않는다)
  /** 메뉴 라벨을 언어팩에서 찾는다. 키가 없으면 원래 한글 라벨을 쓴다. */
  const navLabel = (label: string) => {
    const keys: Record<string, string> = {
      '대시보드': 'nav.dashboard',
      '환경설정': 'nav.settings',
      '게시판 관리': 'nav.boardManage',
      '게시판 목록': 'nav.boardList',
      '게시판 신고현황': 'nav.boardReports',
      '제품 관리': 'nav.products',
      '제품 카테고리': 'nav.productCategories',
      '페이지 관리': 'nav.pages',
      '메뉴 관리': 'nav.menus',
      '팝업 관리': 'nav.popups',
      '자주 묻는 질문': 'nav.faqs',
      '개인정보 이력': 'nav.privacyRevisions',
      '문의 관리': 'nav.contacts',
    }
    const key = keys[label]
    return key ? t(key) : label
  }

  const nav: NavItem[] = NAV.map((item) => {
    if (!isGroup(item) || item.label !== '게시판 관리') return item
    const shortcuts: NavLeaf[] = boards
      .filter((b) => b.showInAdminMenu)
      .map((b) => ({
        to: `/admin/posts/list?category=${encodeURIComponent(b.slug)}`,
        label: b.name,
        end: false,
        icon: 'M4 6h16M4 12h16M4 18h16',
      }))
    return { ...item, children: [...item.children, ...shortcuts] }
  })
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  // 지금 보고 있는 화면이 속한 그룹은 펼쳐 둔다.
  const [openGroup, setOpenGroup] = useState<string | null>(
    () => NAV.find((item) => isGroup(item) && pathname.startsWith(item.match))?.label ?? null,
  )

  useEffect(() => setSidebarOpen(false), [pathname])

  function handleLogout() {
    logout()
    navigate('/admin/login', { replace: true })
  }

  const sidebar = (
    <div className="flex h-full flex-col border-r border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      <div className="flex h-16 items-center border-b border-slate-200 px-6 dark:border-slate-700">
        <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
          워드앤코드 관리자
        </span>
      </div>

      <nav className="flex-1 space-y-0.5 px-4 py-5">
        {nav.map((item) =>
          isGroup(item) ? (
            <div key={item.label}>
              <button
                type="button"
                onClick={() => setOpenGroup((prev) => (prev === item.label ? null : item.label))}
                aria-expanded={openGroup === item.label}
                className={`${NAV_ITEM} ${
                  pathname.startsWith(item.match)
                    ? 'text-slate-900 dark:text-slate-100'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800'
                }`}
              >
                <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                </svg>
                {navLabel(item.label)}
                <svg
                  className={`ml-auto h-4 w-4 transition ${openGroup === item.label ? '' : '-rotate-90'}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {openGroup === item.label && (
                /* 부모 아이콘 가운데에서 내려오는 트리 선 — 항목마다 둥근 ㄴ자로 갈라진다. */
                <div className="relative ml-[1.375rem] mt-0.5">
                  {/* 마지막 항목의 곡선이 시작되는 지점(중앙에서 모서리 반지름만큼 위)에서 멈춘다. */}
                  <span
                    aria-hidden
                    className="absolute bottom-[1.875rem] left-0 top-0 border-l border-slate-300 dark:border-slate-600"
                  />
                  {item.children.map((child) => {
                    const active = child.notWhen
                      ? pathname.startsWith(child.to) && !child.notWhen.some((x) => pathname.startsWith(x))
                      : child.end
                        ? pathname === child.to
                        : pathname.startsWith(child.to)

                    return (
                    <div key={child.to} className="relative pl-5">
                      <span
                        aria-hidden
                        className="absolute left-0 top-0 h-5 w-3.5 rounded-bl-[0.625rem] border-b border-l border-slate-300 dark:border-slate-600"
                      />
                      <NavLink
                        to={child.to}
                        end={child.end}
                        className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-sm font-semibold transition ${
                          active ? NAV_ACTIVE : NAV_IDLE
                        }`}
                      >
                        <svg
                          className="h-[1.125rem] w-[1.125rem] shrink-0"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d={child.icon} />
                        </svg>
                        {navLabel(child.label)}
                      </NavLink>
                    </div>
                    )
                  })}
                </div>
              )}
            </div>
          ) : (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `${NAV_ITEM} ${isActive ? NAV_ACTIVE : NAV_IDLE}`}
            >
              <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
              {navLabel(item.label)}
            </NavLink>
          ),
        )}
      </nav>

      <div className="border-t border-slate-200 px-4 py-3 dark:border-slate-700">
        <Link
          to="/"
          className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        >
          <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
          {t('nav.viewSite')}
        </Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* 데스크톱 고정 사이드바 */}
      <aside
        className="fixed bottom-0 left-0 hidden w-64 lg:block"
        style={{ top: 'var(--demo-banner-h)' }}
      >{sidebar}</aside>

      {/* 모바일 오버레이 사이드바 */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" style={{ top: 'var(--demo-banner-h)' }}>
          <div
            className="absolute inset-0 bg-slate-900/50"
            onClick={() => setSidebarOpen(false)}
            aria-hidden
          />
          <aside className="absolute inset-y-0 left-0 w-64">{sidebar}</aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header
          style={{ top: 'var(--demo-banner-h)' }}
          className="sticky z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 dark:border-slate-700 dark:bg-slate-800 sm:px-6">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 lg:hidden"
            aria-label="메뉴 열기"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="ml-auto flex items-center gap-3">
            <LanguageSwitcher />
            <ThemeToggle />
            <div className="text-right">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{user?.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {user?.role === 'ADMIN' ? '최고관리자' : '편집자'}
              </p>
            </div>
            <button type="button" onClick={handleLogout} className="btn-secondary">
              {t('nav.logout')}
            </button>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
