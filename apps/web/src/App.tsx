import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'

// Pages
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { HomePage } from './pages/HomePage'
import { CollectionsPage } from './pages/CollectionsPage'
import { CollectionDetailPage } from './pages/CollectionDetailPage'
import { FragrancesPage } from './pages/FragrancesPage'
import { FragranceDetailPage } from './pages/FragranceDetailPage'
import { BattlesPage } from './pages/BattlesPage'
import { BattleDetailPage } from './pages/BattleDetailPage'
import { AICategorizePage } from './pages/AICategorizePage'
import { ProfilePage } from './pages/ProfilePage'
import { NotFoundPage } from './pages/NotFoundPage'

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<HomePage />} />

          {/* Collections */}
          <Route path="collections" element={<CollectionsPage />} />
          <Route path="collections/:id" element={<CollectionDetailPage />} />

          {/* Fragrances */}
          <Route path="fragrances" element={<FragrancesPage />} />
          <Route path="fragrances/:id" element={<FragranceDetailPage />} />

          {/* Battles */}
          <Route path="battles" element={<BattlesPage />} />
          <Route path="battles/:id" element={<BattleDetailPage />} />

          {/* AI Features */}
          <Route path="ai-categorize" element={<AICategorizePage />} />

          {/* Profile */}
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        {/* Fallback routes */}
        <Route path="/404" element={<NotFoundPage />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </AuthProvider>
  )
}

export default App
