import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import { ThemeProvider } from './lib/theme'
import DemoBanner from './components/DemoBanner'

import SiteLayout from './components/SiteLayout'
import HomePage from './pages/site/HomePage'
import AboutPage from './pages/site/AboutPage'
import ServicesPage from './pages/site/ServicesPage'
import BoardPage from './pages/site/BoardPage'
import ProductsPage from './pages/site/ProductsPage'
import ProductDetailPage from './pages/site/ProductDetailPage'
import PostDetailPage from './pages/site/PostDetailPage'
import ContactPage from './pages/site/ContactPage'
import CustomPage from './pages/site/CustomPage'

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
import PageEditPage from './pages/admin/PageEditPage'

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
            <Route path="/services" element={<ServicesPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/products/:id" element={<ProductDetailPage />} />
            <Route path="/board" element={<BoardPage />} />
            <Route path="/board/:id" element={<PostDetailPage />} />
            <Route path="/contact" element={<ContactPage />} />
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
            <Route path="posts" element={<PostListPage />} />
            <Route path="posts/new" element={<PostEditPage />} />
            <Route path="posts/:id" element={<PostEditPage />} />
            <Route path="products" element={<ProductListPage />} />
            <Route path="products/new" element={<ProductEditPage />} />
            <Route path="products/:id" element={<ProductEditPage />} />
            <Route path="categories" element={<CategoryPage />} />
            <Route path="pages" element={<PageListPage />} />
            <Route path="pages/new" element={<PageEditPage />} />
            <Route path="pages/:id" element={<PageEditPage />} />
            <Route path="contacts" element={<ContactListPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
