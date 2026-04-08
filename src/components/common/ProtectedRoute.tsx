import { Navigate } from 'react-router-dom'
import type { UserRole } from '../../types'
import { useAuth } from '../../context/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: UserRole
}

export const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { currentUser, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-ncchefs-crema">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-ncchefs-dorado border-t-ncchefs-verde rounded-full animate-spin"></div>
          <p className="text-ncchefs-verde font-georgia">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />
  }

  if (requiredRole && currentUser.role !== requiredRole) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
