import { useState, useEffect, useMemo } from 'react'
import { db } from '../services/firebase'
import { collection, query, getDocs, orderBy } from 'firebase/firestore'
import { useNavigate } from 'react-router-dom'

interface Wedding {
  id: string
  couples_name: string
  clients: string
  date: string
  start_time: string
  coordinator: string
  service_type: string
  venue: string
  adults: number
  children: number
  status: string
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'PENDIENTE', confirmed: 'CONFIRMADO', draft: 'BORRADOR', cancelled: 'CANCELADO'
}
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-900',
  confirmed: 'bg-green-100 text-green-900',
  draft: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-900'
}

export const WeddingsList = () => {
  const navigate = useNavigate()
  const [weddings, setWeddings] = useState<Wedding[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCoordinator, setFilterCoordinator] = useState('Todos')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  useEffect(() => {
    const load = async () => {
      try {
        const q = query(collection(db, 'weddings'), orderBy('date', 'asc'))
        const snap = await getDocs(q)
        setWeddings(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Wedding[])
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const coordinators = useMemo(() => {
    const all = [...new Set(weddings.map(w => w.coordinator).filter(Boolean))]
    return ['Todos', ...all.sort()]
  }, [weddings])

  const filtered = useMemo(() => {
    let result = [...weddings]
    if (search) result = result.filter(w =>
      w.couples_name?.toLowerCase().includes(search.toLowerCase()) ||
      w.venue?.toLowerCase().includes(search.toLowerCase()) ||
      w.clients?.toLowerCase().includes(search.toLowerCase())
    )
    if (filterCoordinator !== 'Todos') result = result.filter(w => w.coordinator === filterCoordinator)
    result.sort((a, b) => {
      const diff = new Date(a.date).getTime() - new Date(b.date).getTime()
      return sortOrder === 'asc' ? diff : -diff
    })
    return result
  }, [weddings, search, filterCoordinator, sortOrder])

  return (
    <section className="p-6 md:p-10 max-w-7xl mx-auto font-body">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Gestión de Eventos</p>
        <h2 className="font-headline text-4xl font-bold text-on-surface mb-1">Hojas de Ruta</h2>
        <p className="text-on-surface-variant">Gestiona cronogramas, hitos y aprobaciones desde un único registro.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-8 items-center">
        {/* Search */}
        <div className="flex items-center gap-2 px-3 py-2 border border-outline-variant/30 rounded bg-white flex-1 min-w-[200px] max-w-xs">
          <span className="material-symbols-outlined text-base text-on-surface-variant">search</span>
          <input
            type="text"
            placeholder="Buscar pareja, lugar..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="text-sm text-on-surface bg-transparent outline-none w-full placeholder-on-surface-variant"
          />
        </div>

        {/* Coordinator filter */}
        <div className="flex items-center gap-2 flex-wrap">
          {coordinators.map(c => (
            <button key={c} onClick={() => setFilterCoordinator(c)}
              className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-colors ${
                filterCoordinator === c
                  ? 'bg-primary text-on-primary'
                  : 'border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-low'
              }`}>
              {c}
            </button>
          ))}
        </div>

        {/* Sort */}
        <button onClick={() => setSortOrder(s => s === 'asc' ? 'desc' : 'asc')}
          className="flex items-center gap-1.5 px-3 py-2 border border-outline-variant/30 rounded text-sm font-medium text-on-surface hover:bg-surface-container-low transition-colors ml-auto">
          <span className="material-symbols-outlined text-base">
            {sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'}
          </span>
          Fecha
        </button>
      </div>

      {/* Count */}
      <p className="text-sm text-on-surface-variant mb-6">
        {loading ? 'Cargando...' : `${filtered.length} bodas encontradas`}
      </p>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full text-center py-16 text-on-surface-variant">Cargando bodas...</div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full text-center py-16 text-on-surface-variant">No hay bodas que coincidan</div>
        ) : (
          <>
            {filtered.map(w => {
              const date = new Date(w.date).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })
              const total = (w.adults || 0) + (w.children || 0)
              const statusLabel = STATUS_LABELS[w.status] || w.status?.toUpperCase() || 'PENDIENTE'
              const statusColor = STATUS_COLORS[w.status] || STATUS_COLORS.pending

              return (
                <div key={w.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-all flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded ${statusColor}`}>
                      {statusLabel}
                    </span>
                    <span className="text-xs text-on-surface-variant">{w.coordinator}</span>
                  </div>

                  <h3 className="font-headline text-lg font-bold text-on-surface mb-1">{w.couples_name}</h3>
                  <p className="text-sm text-on-surface-variant mb-4">{date}</p>

                  <div className="space-y-1.5 mb-4 pb-4 border-b border-gray-100 text-sm text-on-surface-variant flex-1">
                    {w.venue && (
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-base">location_on</span>
                        {w.venue}
                      </div>
                    )}
                    {total > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-base">group</span>
                        {total} invitados{w.adults ? ` (${w.adults} adultos${w.children ? `, ${w.children} niños` : ''})` : ''}
                      </div>
                    )}
                    {w.start_time && (
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-base">schedule</span>
                        {w.start_time}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => navigate(`/weddings/${w.id}/hdr`)}
                    className="w-full px-4 py-2 text-primary text-xs font-bold uppercase tracking-wider border border-amber-200 rounded hover:bg-amber-50 transition-colors flex items-center justify-center gap-1"
                  >
                    VER HDR <span className="material-symbols-outlined text-sm">chevron_right</span>
                  </button>
                </div>
              )
            })}

            {/* Nueva boda */}
            <button
              onClick={() => navigate('/weddings/new')}
              className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-5 flex flex-col items-center justify-center gap-3 hover:bg-amber-50 hover:border-amber-300 transition-all min-h-[200px] group">
              <span className="material-symbols-outlined text-3xl text-gray-400 group-hover:text-amber-600 transition-colors">add_circle</span>
              <div className="text-center">
                <h4 className="font-headline text-base font-bold text-on-surface group-hover:text-amber-800 transition-colors">Nueva Boda</h4>
                <p className="text-xs text-on-surface-variant">Crear desde cero o copiar</p>
              </div>
            </button>
          </>
        )}
      </div>
    </section>
  )
}
