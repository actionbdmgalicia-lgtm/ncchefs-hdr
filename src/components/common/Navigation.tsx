import { useAuth } from '../../context/AuthContext'
import { useLocation } from 'react-router-dom'

export const Navigation = () => {
  const { currentUser } = useAuth()
  const location = useLocation()

  const isActive = (path: string) => {
    return location.pathname === path
      ? 'bg-ncchefs-verde-claro text-ncchefs-verde'
      : 'text-ncchefs-verde-med hover:bg-ncchefs-verde-claro'
  }

  return (
    <nav className="bg-ncchefs-verde-med border-b-4 border-ncchefs-dorado">
      <div className="max-w-7xl mx-auto px-6 flex items-center gap-0 overflow-x-auto">
        <a
          href="/dashboard"
          className={`px-4 py-3 font-georgia text-sm whitespace-nowrap transition-colors ${isActive(
            '/dashboard'
          )}`}
        >
          Dashboard
        </a>

        <a
          href="/weddings"
          className={`px-4 py-3 font-georgia text-sm whitespace-nowrap transition-colors ${isActive(
            '/weddings'
          )}`}
        >
          Bodas
        </a>

        <a
          href="/calendar"
          className={`px-4 py-3 font-georgia text-sm whitespace-nowrap transition-colors ${isActive(
            '/calendar'
          )}`}
        >
          Calendario
        </a>

        <a
          href="/dishes"
          className={`px-4 py-3 font-georgia text-sm whitespace-nowrap transition-colors ${isActive(
            '/dishes'
          )}`}
        >
          Escandallos
        </a>

        <a
          href="/planning"
          className={`px-4 py-3 font-georgia text-sm whitespace-nowrap transition-colors ${isActive(
            '/planning'
          )}`}
        >
          Planificación
        </a>

        <a
          href="/purchasing"
          className={`px-4 py-3 font-georgia text-sm whitespace-nowrap transition-colors ${isActive(
            '/purchasing'
          )}`}
        >
          Compras
        </a>

        {currentUser?.role === 'admin' && (
          <a
            href="/admin"
            className={`px-4 py-3 font-georgia text-sm whitespace-nowrap transition-colors ${isActive(
              '/admin'
            )}`}
          >
            Administración
          </a>
        )}
      </div>
    </nav>
  )
}
