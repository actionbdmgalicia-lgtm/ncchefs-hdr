import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/common/ProtectedRoute'
import { Header } from './components/common/Header'
import { Sidebar } from './components/common/Sidebar'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { WeddingsList } from './pages/WeddingsList'
import { RoadmapDetail } from './pages/RoadmapDetail'
import { Calendar } from './pages/Calendar'
import { Dishes } from './pages/Dishes'
import { TeamManagement } from './pages/Admin/TeamManagement'
import { Settings } from './pages/Admin/Settings'
import { AdminDataLoader } from './pages/AdminDataLoader'
import { NewWedding } from './pages/NewWedding'
import './styles/globals.css'

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />

          {/* Protected Routes - with layout */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <div className="flex h-screen bg-background">
                  <Sidebar />
                  <div className="flex flex-col flex-1 md:ml-64">
                    <Header />
                    <main className="flex-1 overflow-y-auto">
                      <Routes>
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/calendar" element={<Calendar />} />
                        <Route path="/weddings" element={<WeddingsList />} />
                        <Route path="/weddings/new" element={<NewWedding />} />
                        <Route path="/weddings/:id/hdr" element={<RoadmapDetail />} />
                        <Route path="/dishes" element={<Dishes />} />
                        <Route path="/admin/team" element={<TeamManagement />} />
                        <Route path="/admin/settings" element={<Settings />} />
                        <Route path="/admin/loader" element={<AdminDataLoader />} />
                        <Route path="/" element={<Navigate to="/dashboard" replace />} />
                        <Route
                          path="*"
                          element={
                            <div className="flex items-center justify-center h-full">
                              <div className="text-center">
                                <h1 className="text-4xl font-bold text-primary mb-4 font-headline">404</h1>
                                <p className="text-on-surface-variant mb-4">Página no encontrada</p>
                                <a
                                  href="/dashboard"
                                  className="inline-block px-6 py-2 bg-primary text-on-primary rounded-lg font-label font-bold text-sm uppercase tracking-widest hover:bg-primary-container transition-colors"
                                >
                                  Ir al Dashboard
                                </a>
                              </div>
                            </div>
                          }
                        />
                      </Routes>
                    </main>
                  </div>
                </div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </Router>
  )
}

export default App
