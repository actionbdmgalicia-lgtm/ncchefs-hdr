import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const menuItems = [
  { icon: 'dashboard', label: 'Dashboard', href: '/dashboard' },
  { icon: 'calendar_month', label: 'Calendar', href: '/calendar' },
  { icon: 'map', label: 'Bodas', href: '/weddings' },
  { icon: 'inventory_2', label: 'Escandallos', href: '/dishes' },
  { icon: 'group', label: 'Equipo', href: '/admin/team' },
  { icon: 'settings', label: 'Configuración', href: '/admin/settings' },
]

export const Sidebar = () => {
  const location = useLocation()
  const { currentUser, logout } = useAuth()

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return (
    <aside className="hidden md:flex flex-col h-screen w-64 fixed left-0 top-0 border-r border-outline-variant/10 bg-surface-container-low z-50 p-6 gap-2 font-body">
      {/* Logo */}
      <div className="mb-8 px-4">
        <h1 className="font-headline text-lg font-bold text-on-surface">NCC Chefs</h1>
        <p className="font-label text-xs tracking-widest text-on-surface-variant uppercase">
          Gestión Bodas 2026
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-2 flex-1">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg font-label font-medium text-sm tracking-wide transition-all ${
              location.pathname === item.href
                ? 'text-primary bg-surface-container-lowest shadow-sm translate-x-1'
                : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-lowest'
            }`}
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            {item.label}
          </Link>
        ))}

        {currentUser?.role === 'admin' && (
          <Link
            to="/admin"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg font-label font-medium text-sm tracking-wide transition-all ${
              location.pathname === '/admin'
                ? 'text-primary bg-surface-container-lowest shadow-sm translate-x-1'
                : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-lowest'
            }`}
          >
            <span className="material-symbols-outlined">admin_panel_settings</span>
            Admin
          </Link>
        )}

      </nav>

      {/* User Info & Logout */}
      <div className="border-t border-outline-variant/10 pt-4 space-y-4">
        {/* External FIBA Menus link */}
        <a
          href="https://fiba-menus.vercel.app"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-4 py-2.5 rounded-lg font-label font-medium text-sm tracking-wide bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 transition-all"
        >
          <span className="material-symbols-outlined text-base">open_in_new</span>
          FIBA Menús
        </a>
        <div className="px-4">
          <p className="text-xs font-label text-on-surface-variant uppercase tracking-wider">
            Usuario
          </p>
          <p className="font-label font-medium text-on-surface mt-1">{currentUser?.name}</p>
          <p className="text-xs text-on-surface-variant">
            {currentUser?.role === 'admin' && 'Administrador'}
            {currentUser?.role === 'coordinador' && 'Coordinador'}
            {currentUser?.role === 'asistente' && 'Asistente'}
            {currentUser?.role === 'viewer' && 'Visualización'}
          </p>
        </div>

        <button
          onClick={handleLogout}
          className="w-full bg-primary text-on-primary py-3 px-4 rounded-md font-label font-bold text-xs uppercase tracking-widest shadow-lg shadow-primary/20 flex items-center justify-center gap-2 hover:bg-primary-container transition-colors"
        >
          <span className="material-symbols-outlined text-sm">logout</span>
          Salir
        </button>
      </div>
    </aside>
  )
}
