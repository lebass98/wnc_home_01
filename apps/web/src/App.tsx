import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import { ThemeProvider } from './lib/theme'
import DemoBanner from './components/DemoBanner'

import SiteLayout from './components/SiteLayout'
import HomePage from './pages/site/HomePage'
import AboutPage from './pages/site/AboutPage'
import DirectionsPage from './pages/site/DirectionsPage'
import ServicesPage from './pages/site/ServicesPage'
import BoardPage from './pages/site/BoardPage'
import ProductsPage from './pages/site/ProductsPage'
import ProductDetailPage from './pages/site/ProductDetailPage'
import PostDetailPage from './pages/site/PostDetailPage'
import ContactPage from './pages/site/ContactPage'
import FaqPage from './pages/site/FaqPage'
import CustomPage from './pages/site/CustomPage'
import TermsPage from './pages/site/TermsPage'
import PrivacyPage from './pages/site/PrivacyPage'

import AdminLayout from './components/AdminLayout'
import LoginPage from './pages/admin/LoginPage'
import DashboardPage from './pages/admin/DashboardPage'
import PostListPage from './pages/admin/PostListPage'
import PostEditPage from './pages/admin/PostEditPage'
import ContactListPage from './pages/admin/ContactListPage'
import ProductListPage from './pages/admin/ProductListPage'
import ProductEditPage from './pages/admin/ProductEditPage'
import CategoryPage from './pages/admin/CategoryPage'
import PageListPage from './pages/admin/PageListPage'
import DesignPage from './pages/admin/DesignPage'
import PageEditPage from './pages/admin/PageEditPage'
import PageDetailPage from './pages/admin/PageDetailPage'
import SettingsPage from './pages/admin/SettingsPage'
import BoardListPage from './pages/admin/BoardListPage'
import BoardEditPage from './pages/admin/BoardEditPage'
import BoardSettingsPage from './pages/admin/BoardSettingsPage'
import BoardReportsPage from './pages/admin/BoardReportsPage'
import PopupListPage from './pages/admin/PopupListPage'
import PopupEditPage from './pages/admin/PopupEditPage'
import FaqListPage from './pages/admin/FaqListPage'
import FaqEditPage from './pages/admin/FaqEditPage'
import PrivacyRevisionListPage from './pages/admin/PrivacyRevisionListPage'
import PrivacyRevisionEditPage from './pages/admin/PrivacyRevisionEditPage'
import MenuListPage from './pages/admin/MenuListPage'

/** 로그인하지 않은 접근을 로그인 페이지로 돌려보낸다. */
function RequireAuth({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
        불러오는 중...
      </div>
    )
  }
  return user ? children : <Navigate to="/admin/login" replace />
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
      <DemoBanner />
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          {/* 공개 회사소개 사이트 */}
          <Route element={<SiteLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/about/directions" element={<DirectionsPage />} />
            <Route path="/services" element={<ServicesPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/products/:id" element={<ProductDetailPage />} />
            <Route path="/board" element={<BoardPage />} />
            <Route path="/board/:id" element={<PostDetailPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/contact/faq" element={<FaqPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            {/* 관리자가 만든 일반 페이지 */}
            <Route path="/page/:slug" element={<CustomPage />} />
          </Route>

          {/* 어드민 */}
          <Route path="/admin/login" element={<LoginPage />} />
          <Route
            path="/admin"
            element={
              <RequireAuth>
                <AdminLayout />
              </RequireAuth>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="posts" element={<BoardListPage />} />
            <Route path="boards/new" element={<BoardEditPage />} />
            <Route path="boards/:id" element={<BoardEditPage />} />
            <Route path="posts/list" element={<PostListPage />} />
            <Route path="posts/settings" element={<BoardSettingsPage />} />
            <Route path="posts/reports" element={<BoardReportsPage />} />
            <Route path="posts/new" element={<PostEditPage />} />
            <Route path="posts/:id" element={<PostEditPage />} />
            <Route path="products" element={<ProductListPage />} />
            <Route path="products/new" element={<ProductEditPage />} />
            <Route path="products/:id" element={<ProductEditPage />} />
            <Route path="categories" element={<CategoryPage />} />
            <Route path="pages" element={<PageListPage />} />
            <Route path="pages/new" element={<PageEditPage />} />
            <Route path="pages/:id" element={<PageEditPage />} />
            <Route path="pages/:id/detail" element={<PageDetailPage />} />
            <Route path="design" element={<DesignPage />} />
            <Route path="popups" element={<PopupListPage />} />
            <Route path="popups/new" element={<PopupEditPage />} />
            <Route path="popups/:id" element={<PopupEditPage />} />
            <Route path="menus" element={<MenuListPage />} />
            <Route path="faqs" element={<FaqListPage />} />
            <Route path="faqs/new" element={<FaqEditPage />} />
            <Route path="faqs/:id" element={<FaqEditPage />} />
            <Route path="privacy-revisions" element={<PrivacyRevisionListPage />} />
            <Route path="privacy-revisions/new" element={<PrivacyRevisionEditPage />} />
            <Route path="privacy-revisions/:id" element={<PrivacyRevisionEditPage />} />
            <Route path="contacts" element={<ContactListPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
