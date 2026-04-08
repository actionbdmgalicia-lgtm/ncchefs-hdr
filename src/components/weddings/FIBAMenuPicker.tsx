import { useState, useEffect } from 'react'
import type { FIBAPlato } from '../../types'
import { searchFIBAPlatos, getGrupos, getPlatosByGrupo } from '../../services/fibaMenuService'

interface FIBAMenuPickerProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (plato: FIBAPlato) => void
  loading?: boolean
}

export const FIBAMenuPicker = ({
  isOpen,
  onClose,
  onSelect,
  loading
}: FIBAMenuPickerProps) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGrupoId, setSelectedGrupoId] = useState<string | null>(null)
  const [platos, setPlatos] = useState<FIBAPlato[]>([])
  const [grupos, setGrupos] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [loadingGrupos, setLoadingGrupos] = useState(false)

  // Load grupos on mount
  useEffect(() => {
    if (isOpen) {
      loadGrupos()
    }
  }, [isOpen])

  const loadGrupos = async () => {
    setLoadingGrupos(true)
    try {
      const resultado = await getGrupos()
      setGrupos(resultado)
    } catch (error) {
      console.error('Error loading grupos:', error)
    } finally {
      setLoadingGrupos(false)
    }
  }

  // Search platos
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setPlatos([])
      return
    }

    setSearching(true)
    try {
      const resultado = await searchFIBAPlatos(searchQuery)
      setPlatos(resultado)
      setSelectedGrupoId(null)
    } catch (error) {
      console.error('Error searching platos:', error)
    } finally {
      setSearching(false)
    }
  }

  // Load platos for selected grupo
  const handleGrupoSelect = async (grupoId: string) => {
    if (selectedGrupoId === grupoId) {
      setSelectedGrupoId(null)
      setPlatos([])
      return
    }

    setSelectedGrupoId(grupoId)
    setSearchQuery('')
    setSearching(true)

    try {
      const resultado = await getPlatosByGrupo(grupoId)
      setPlatos(resultado)
    } catch (error) {
      console.error('Error loading group platos:', error)
    } finally {
      setSearching(false)
    }
  }

  const handleSelectPlato = (plato: FIBAPlato) => {
    onSelect(plato)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-headline text-xl font-bold text-on-surface">
            Buscar Platos (FIBA Menus)
          </h2>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Search Bar */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Buscar plato por nombre..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                className="flex-1 px-4 py-2 border border-outline-variant rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                onClick={handleSearch}
                disabled={searching || !searchQuery.trim()}
                className="px-4 py-2 bg-primary text-on-primary rounded-lg font-bold text-sm hover:opacity-90 disabled:opacity-50"
              >
                <span className="material-symbols-outlined">search</span>
              </button>
            </div>
          </div>

          {/* Grupos Tabs */}
          {!searchQuery && (
            <div className="p-4 border-b border-gray-200">
              <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3">
                O selecciona una categoría:
              </p>
              <div className="flex flex-wrap gap-2">
                {loadingGrupos ? (
                  <p className="text-sm text-on-surface-variant">Cargando categorías...</p>
                ) : (
                  grupos.map(grupo => (
                    <button
                      key={grupo.id}
                      onClick={() => handleGrupoSelect(grupo.id)}
                      className={`px-3 py-2 rounded-lg text-sm font-bold transition-colors ${
                        selectedGrupoId === grupo.id
                          ? 'bg-primary text-on-primary'
                          : 'bg-surface-container-low text-on-surface hover:bg-primary hover:text-on-primary'
                      }`}
                    >
                      {grupo.nombre}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Platos List */}
          <div className="p-4">
            {searching ? (
              <div className="text-center py-8">
                <p className="text-on-surface-variant">Buscando platos...</p>
              </div>
            ) : platos.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-on-surface-variant text-sm">
                  {searchQuery
                    ? 'No se encontraron platos'
                    : 'Selecciona una categoría o busca un plato'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {platos.map(plato => (
                  <button
                    key={plato.id}
                    onClick={() => handleSelectPlato(plato)}
                    className="p-4 border border-outline-variant rounded-lg hover:bg-surface-container-low hover:border-primary transition-all text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-on-surface">
                          {plato.nombre}
                        </p>
                        <p className="text-xs text-on-surface-variant mt-1">
                          ID: {plato.id}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary text-lg">
                          {plato.precio}€
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
