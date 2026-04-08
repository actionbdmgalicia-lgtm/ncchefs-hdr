import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'

export const Header = () => {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const [searchOpen, setSearchOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-md flex justify-between items-center w-full px-8 py-4 border-b border-outline-variant/10 md:ml-64 font-body">
      <div className="flex items-center gap-4 flex-1">
        {/* Mobile Menu Button */}
        <button className="material-symbols-outlined text-on-surface-variant cursor-pointer md:hidden">
          menu
        </button>

        {/* Search Bar */}
        <div className="flex items-center bg-surface-container-high px-4 py-2 rounded-full w-64 focus-within:ring-2 focus-within:ring-primary transition-all">
          <span className="material-symbols-outlined text-sm text-on-surface-variant mr-2">search</span>
          <input
            className="bg-transparent border-none focus:ring-0 text-sm w-full font-body placeholder-on-surface-variant"
            placeholder="Buscar eventos..."
            type="text"
            onFocus={() => setSearchOpen(true)}
            onBlur={() => setSearchOpen(false)}
          />
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-6">
        {/* Notifications & Messages */}
        <div className="flex gap-4 text-on-surface-variant cursor-pointer">
          <span className="material-symbols-outlined hover:text-primary transition-colors">
            notifications
          </span>
          <span className="material-symbols-outlined hover:text-primary transition-colors">
            mail
          </span>
        </div>

        {/* User Avatar */}
        <div className="h-10 w-10 rounded-full overflow-hidden border-2 border-primary-container bg-primary-fixed flex items-center justify-center flex-shrink-0">
          <span className="text-lg">👤</span>
        </div>
      </div>
    </header>
  )
}
