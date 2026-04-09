import { useState, useEffect, useMemo } from 'react'
import { getAllPlatos, getGrupos } from '../services/fibaMenuService'
import type { FIBAPlato, FIBAGrupo } from '../types'

export const Dishes = () => {
  const [platos, setPlatos] = useState<FIBAPlato[]>([])
  const [grupos, setGrupos] = useState<FIBAGrupo[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [selectedGrupo, setSelectedGrupo] = useState<string>('todos')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setLoadError(null)
      try {
        const [platosData, gruposData] = await Promise.all([getAllPlatos(), getGrupos()])
        setPlatos(platosData)
        setGrupos(gruposData)
        if (platosData.length === 0) {
          setLoadError('No se encontraron platos en FIBA Firebase. Verifica la conexión o los permisos de Firestore.')
        }
      } catch (e) {
        console.error('Error loading FIBA data:', e)
        setLoadError(`Error conectando con FIBA: ${e instanceof Error ? e.message : String(e)}`)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Map plato_ids → grupo name
  const platoGrupoMap = useMemo(() => {
    const map: Record<string, string> = {}
    grupos.forEach(g => {
      (g.plato_ids || []).forEach(pid => { map[pid] = g.nombre })
    })
    return map
  }, [grupos])

  const filtered = useMemo(() => {
    let result = [...platos]
    if (search) result = result.filter(p => p.nombre.toLowerCase().includes(search.toLowerCase()))
    if (selectedGrupo !== 'todos') {
      const grupo = grupos.find(g => g.id === selectedGrupo)
      if (grupo) result = result.filter(p => grupo.plato_ids?.includes(p.id))
    }
    return result.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  }, [platos, grupos, search, selectedGrupo])

  const totalValue = filtered.reduce((sum, p) => sum + (p.precio || 0), 0)

  return (
    <section className="p-6 md:p-10 max-w-7xl mx-auto font-body">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">FIBA Menús</p>
          <h2 className="font-headline text-4xl font-bold text-on-surface mb-1">Escandallos</h2>
          <p className="text-on-surface-variant">Catálogo de platos y precios desde FIBA Menús</p>
        </div>
        <a
          href="https://fiba-menus.vercel.app"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 text-white font-bold text-sm rounded-lg hover:bg-amber-700 transition-colors"
        >
          <span className="material-symbols-outlined text-base">open_in_new</span>
          Abrir FIBA Menús
        </a>
      </div>

      {/* Stats */}
      {!loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-on-surface-variant uppercase tracking-widest mb-1">Total Platos</p>
            <p className="font-headline text-2xl font-bold text-on-surface">{platos.length}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-on-surface-variant uppercase tracking-widest mb-1">Categorías</p>
            <p className="font-headline text-2xl font-bold text-on-surface">{grupos.length}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-on-surface-variant uppercase tracking-widest mb-1">Filtrados</p>
            <p className="font-headline text-2xl font-bold text-primary">{filtered.length}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-on-surface-variant uppercase tracking-widest mb-1">Precio medio</p>
            <p className="font-headline text-2xl font-bold text-on-surface">
              {filtered.length > 0 ? (totalValue / filtered.length).toFixed(0) : 0}€
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex items-center gap-2 px-3 py-2 border border-outline-variant/30 rounded bg-white flex-1 min-w-[200px] max-w-sm">
          <span className="material-symbols-outlined text-base text-on-surface-variant">search</span>
          <input
            type="text"
            placeholder="Buscar plato..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="text-sm text-on-surface bg-transparent outline-none w-full placeholder-on-surface-variant"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-on-surface-variant hover:text-on-surface">
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          )}
        </div>

        {/* Grupo filter */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedGrupo('todos')}
            className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-colors ${
              selectedGrupo === 'todos' ? 'bg-primary text-on-primary' : 'border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-low'
            }`}
          >
            Todos
          </button>
          {grupos.map(g => (
            <button
              key={g.id}
              onClick={() => setSelectedGrupo(selectedGrupo === g.id ? 'todos' : g.id)}
              className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-colors ${
                selectedGrupo === g.id ? 'bg-primary text-on-primary' : 'border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-low'
              }`}
            >
              {g.nombre}
            </button>
          ))}
        </div>
      </div>

      {/* Platos Grid */}
      {loading ? (
        <div className="text-center py-16 text-on-surface-variant">
          <span className="material-symbols-outlined text-4xl mb-3 block animate-pulse">restaurant_menu</span>
          Cargando catálogo desde FIBA...
        </div>
      ) : loadError ? (
        <div className="text-center py-16">
          <span className="material-symbols-outlined text-4xl mb-3 block text-red-400">error</span>
          <p className="text-red-600 text-sm max-w-md mx-auto">{loadError}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-on-surface-variant">
          <span className="material-symbols-outlined text-4xl mb-3 block">search_off</span>
          No se encontraron platos
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(plato => {
            const grupoNombre = platoGrupoMap[plato.id] || '—'
            return (
              <div key={plato.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-on-surface text-sm leading-snug">{plato.nombre}</p>
                    <p className="text-xs text-on-surface-variant mt-1">{grupoNombre}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-headline text-xl font-bold text-primary">{plato.precio}€</p>
                    <p className="text-xs text-on-surface-variant">por pers.</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-[10px] bg-surface-container-low text-on-surface-variant px-2 py-1 rounded font-mono">
                    {plato.id}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
