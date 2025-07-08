import React, { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { GlobalSearch } from './components/GlobalSearch'
import { useGlobalSearch } from './hooks/useGlobalSearch'
import ErrorBoundary from './components/ErrorBoundary'
import RouteErrorBoundary from './components/error-boundaries/RouteErrorBoundary'

// Import styles
import './styles/error-boundary.css'
import './styles/error-boundaries.css'
import './styles/page-loader.css'

// Lazy load pages for better performance
const LoginPage = lazy(() => import('./pages/LoginPage').then(module => ({ default: module.LoginPage })))
const RegisterPage = lazy(() => import('./pages/RegisterPage').then(module => ({ default: module.RegisterPage })))
const HomePage = lazy(() => import('./pages/HomePage').then(module => ({ default: module.HomePage })))
const CollectionsPage = lazy(() => import('./pages/CollectionsPage').then(module => ({ default: module.CollectionsPage })))
const CollectionDetailPage = lazy(() => import('./pages/CollectionDetailPage').then(module => ({ default: module.CollectionDetailPage })))
const FragrancesPage = lazy(() => import('./pages/FragrancesPage').then(module => ({ default: module.FragrancesPage })))
const FragranceDetailPage = lazy(() => import('./pages/FragranceDetailPage').then(module => ({ default: module.FragranceDetailPage })))
const BattlesPage = lazy(() => import('./pages/BattlesPage').then(module => ({ default: module.BattlesPage })))
const BattleDetailPage = lazy(() => import('./pages/BattleDetailPage').then(module => ({ default: module.BattleDetailPage })))
const AICategorizePage = lazy(() => import('./pages/AICategorizePage').then(module => ({ default: module.AICategorizePage })))
const ProfilePage = lazy(() => import('./pages/ProfilePage').then(module => ({ default: module.ProfilePage })))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then(module => ({ default: module.NotFoundPage })))

// Loading component for suspense fallback
const PageLoader = () => (
  <div className="page-loader">
    <div className="page-loader__container">
      <div className="page-loader__spinner"></div>
      <p className="page-loader__text">Loading...</p>
    </div>
  </div>
)

function App() {
  const { isOpen, closeSearch } = useGlobalSearch();

  return (
    <ErrorBoundary level="critical">
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={
            <RouteErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <LoginPage />
              </Suspense>
            </RouteErrorBoundary>
          } />
          <Route path="/register" element={
            <RouteErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <RegisterPage />
              </Suspense>
            </RouteErrorBoundary>
          } />

          {/* Protected routes */}
          <Route
            path="/"
            element={
              <RouteErrorBoundary>
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              </RouteErrorBoundary>
            }
          >
            <Route index element={
              <RouteErrorBoundary>
                <Suspense fallback={<PageLoader />}>
                  <HomePage />
                </Suspense>
              </RouteErrorBoundary>
            } />

            {/* Collections */}
            <Route path="collections" element={
              <RouteErrorBoundary>
                <Suspense fallback={<PageLoader />}>
                  <CollectionsPage />
                </Suspense>
              </RouteErrorBoundary>
            } />
            <Route path="collections/:id" element={
              <RouteErrorBoundary>
                <Suspense fallback={<PageLoader />}>
                  <CollectionDetailPage />
                </Suspense>
              </RouteErrorBoundary>
            } />

            {/* Fragrances */}
            <Route path="fragrances" element={
              <RouteErrorBoundary>
                <Suspense fallback={<PageLoader />}>
                  <FragrancesPage />
                </Suspense>
              </RouteErrorBoundary>
            } />
            <Route path="fragrances/:id" element={
              <RouteErrorBoundary>
                <Suspense fallback={<PageLoader />}>
                  <FragranceDetailPage />
                </Suspense>
              </RouteErrorBoundary>
            } />

            {/* Battles */}
            <Route path="battles" element={
              <RouteErrorBoundary>
                <Suspense fallback={<PageLoader />}>
                  <BattlesPage />
                </Suspense>
              </RouteErrorBoundary>
            } />
            <Route path="battles/:id" element={
              <RouteErrorBoundary>
                <Suspense fallback={<PageLoader />}>
                  <BattleDetailPage />
                </Suspense>
              </RouteErrorBoundary>
            } />

            {/* AI Features */}
            <Route path="ai-categorize" element={
              <RouteErrorBoundary>
                <Suspense fallback={<PageLoader />}>
                  <AICategorizePage />
                </Suspense>
              </RouteErrorBoundary>
            } />

            {/* Profile */}
            <Route path="profile" element={
              <RouteErrorBoundary>
                <Suspense fallback={<PageLoader />}>
                  <ProfilePage />
                </Suspense>
              </RouteErrorBoundary>
            } />
          </Route>

          {/* Fallback routes */}
          <Route path="/404" element={
            <RouteErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <NotFoundPage />
              </Suspense>
            </RouteErrorBoundary>
          } />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>

        {/* Global Search */}
        <ErrorBoundary level="component">
          <GlobalSearch isOpen={isOpen} onClose={closeSearch} />
        </ErrorBoundary>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
