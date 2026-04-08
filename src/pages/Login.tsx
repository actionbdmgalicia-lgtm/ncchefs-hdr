import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al iniciar sesión'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-ncchefs-crema px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-ncchefs-dorado rounded-full mb-4">
            <span className="text-2xl text-ncchefs-verde">👰</span>
          </div>
          <h1 className="text-3xl font-bold text-ncchefs-verde font-georgia">NCC Chefs</h1>
          <p className="text-sm text-ncchefs-gris mt-2">Gestión de Bodas 2026</p>
        </div>

        {/* Login Form */}
        <div className="card bg-white p-8">
          <h2 className="text-2xl font-bold text-ncchefs-verde mb-6 text-center font-georgia">
            Iniciar Sesión
          </h2>

          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-ncchefs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-georgia text-ncchefs-verde mb-2">
                Correo Electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input-field"
                placeholder="ejemplo@ncchefs.com"
              />
            </div>

            <div>
              <label className="block text-sm font-georgia text-ncchefs-verde mb-2">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="input-field"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full disabled:opacity-50"
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              to="/forgot-password"
              className="text-sm text-ncchefs-dorado hover:text-ncchefs-dorado-claro transition-colors"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-ncchefs-gris mt-6">
          © 2026 NCCHEFS. Gestión de hojas de ruta para bodas.
        </p>
      </div>
    </div>
  )
}
