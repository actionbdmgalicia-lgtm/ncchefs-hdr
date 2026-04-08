import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../services/firebase'
import { collection, getDocs } from 'firebase/firestore'
import { useAuth } from '../context/AuthContext'

interface SpecialMenus {
  celiacos?: number
  vegetarianos?: number
  infantil?: number
  sin_marisco?: number
  sin_pescado?: number
  sin_carne?: number
  sin_lactosa?: number
  alergicos?: number
  embarazadas?: number
}

interface Wedding {
  id: string
  couples_name: string
  date: string
  venue?: string
  coordinator?: string
  adults?: number
  children?: number
  status?: string
  start_time?: string
  service_type?: string
  ceremony_type?: string
  menu?: {
    complementos?: string[]
    entrante?: string
    pescado?: string
    carne?: string
    recena?: string[]
    infantil?: { menu?: string[] }
    special_menus?: SpecialMenus
    tapa?: string[]
    marisco?: string[]
  }
  protocols?: {
    bus?: string
    ceremony_time?: string
    dance_opening?: string
    entrance_couple?: string
  }
}

const COORD_COLORS: Record<string, { bg: string; text: string; dot: string; badge: string }> = {
  Andrea: { bg: 'bg-amber-50',  text: 'text-amber-800',  dot: 'bg-amber-500',  badge: 'bg-amber-100 text-amber-800' },
  Marta:  { bg: 'bg-blue-50',   text: 'text-blue-800',   dot: 'bg-blue-500',   badge: 'bg-blue-100 text-blue-800' },
  Rosa:   { bg: 'bg-rose-50',   text: 'text-rose-800',   dot: 'bg-rose-500',   badge: 'bg-rose-100 text-rose-800' },
  Sara:   { bg: 'bg-purple-50', text: 'text-purple-800', dot: 'bg-purple-500', badge: 'bg-purple-100 text-purple-800' },
  Jimena: { bg: 'bg-green-50',  text: 'text-green-800',  dot: 'bg-green-500',  badge: 'bg-green-100 text-green-800' },
  Bea:    { bg: 'bg-green-50',  text: 'text-green-800',  dot: 'bg-green-500',  badge: 'bg-green-100 text-green-800' },
}

const getCoordColor = (coord?: string) => {
  if (!coord) return { bg: 'bg-gray-50', text: 'text-gray-700', dot: 'bg-gray-400', badge: 'bg-gray-100 text-gray-700' }
  const key = Object.keys(COORD_COLORS).find(k => coord.includes(k))
  return key ? COORD_COLORS[key] : { bg: 'bg-gray-50', text: 'text-gray-700', dot: 'bg-gray-400', badge: 'bg-gray-100 text-gray-700' }
}

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

// ── Wedding indicator chips ─────────────────────
interface Chip { label: string; icon: string; color: string }

function getWeddingChips(w: Wedding): Chip[] {
  const chips: Chip[] = []
  const sm = w.menu?.special_menus || {}

  // Tipo de servicio
  const stype = (w.service_type || '').toLowerCase()
  if (stype.includes('cóctel') || stype.includes('coctel')) {
    chips.push({ label: 'Cóctel', icon: 'wine_bar', color: 'bg-purple-100 text-purple-700' })
  } else if (stype.includes('banquete')) {
    chips.push({ label: 'Banquete', icon: 'restaurant', color: 'bg-green-100 text-green-700' })
  }

  // Tipo de ceremonia
  const ctype = (w.ceremony_type || '').toLowerCase()
  if (ctype.includes('civil')) {
    chips.push({ label: 'Ceremonia civil', icon: 'favorite', color: 'bg-pink-100 text-pink-700' })
  } else if (ctype.includes('religi')) {
    chips.push({ label: 'Religiosa', icon: 'church', color: 'bg-indigo-100 text-indigo-700' })
  }

  // Menú doble (m2)
  if ((w.service_type || '').toLowerCase().includes('m2')) {
    chips.push({ label: 'Doble menú', icon: 'menu_book', color: 'bg-amber-100 text-amber-700' })
  }

  // Marisco destacado
  if ((w.menu?.marisco || []).length > 0 || (w.menu?.complementos || []).some(c => c.toLowerCase().includes('pulpo') || c.toLowerCase().includes('marisco') || c.toLowerCase().includes('vieira'))) {
    chips.push({ label: 'Marisco', icon: 'set_meal', color: 'bg-cyan-100 text-cyan-700' })
  }

  // Recena
  if ((w.menu?.recena || []).length > 0) {
    chips.push({ label: 'Recena', icon: 'nightlife', color: 'bg-slate-100 text-slate-600' })
  }

  // Niños (menú infantil)
  if ((w.children || 0) > 0 || (w.menu?.infantil?.menu || []).length > 0) {
    chips.push({ label: `Niños: ${w.children || '?'}`, icon: 'child_care', color: 'bg-yellow-100 text-yellow-700' })
  }

  // Situaciones especiales
  const totalSpecial = Object.values(sm).filter(v => typeof v === 'number').reduce((a, b) => (a as number) + (b as number), 0) as number
  if (totalSpecial > 0) {
    const parts: string[] = []
    if (sm.celiacos) parts.push(`${sm.celiacos} cel.`)
    if (sm.vegetarianos) parts.push(`${sm.vegetarianos} veg.`)
    if (sm.alergicos) parts.push(`${sm.alergicos} alerg.`)
    if (sm.embarazadas) parts.push(`${sm.embarazadas} emb.`)
    if (sm.sin_marisco) parts.push(`${sm.sin_marisco} s/mar.`)
    if (sm.sin_lactosa) parts.push(`${sm.sin_lactosa} s/lact.`)
    chips.push({
      label: parts.length > 0 ? parts.slice(0, 3).join(' · ') : `${totalSpecial} espec.`,
      icon: 'warning',
      color: 'bg-red-100 text-red-700'
    })
  }

  // Autobús
  if (w.protocols?.bus && w.protocols.bus !== 'no' && w.protocols.bus !== '') {
    chips.push({ label: 'Autobús', icon: 'directions_bus', color: 'bg-orange-100 text-orange-600' })
  }

  // Baile
  if (w.protocols?.dance_opening && w.protocols.dance_opening !== 'no') {
    chips.push({ label: 'Baile nupcial', icon: 'music_note', color: 'bg-pink-100 text-pink-600' })
  }

  return chips
}

export const Dashboard = () => {
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const [weddings, setWeddings] = useState<Wedding[]>([])
  const [loading, setLoading] = useState(true)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const in14Days = new Date(today)
  in14Days.setDate(today.getDate() + 14)
  const in30Days = new Date(today)
  in30Days.setDate(today.getDate() + 30)

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDocs(collection(db, 'weddings'))
        setWeddings(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Wedding[])
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const upcoming14 = useMemo(() => {
    return weddings
      .filter(w => {
        const d = new Date(w.date)
        d.setHours(0, 0, 0, 0)
        return d >= today && d <= in14Days
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [weddings])

  const thisMonthCount = useMemo(() => {
    return weddings.filter(w => {
      const d = new Date(w.date)
      return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()
    }).length
  }, [weddings])

  const next30Count = useMemo(() => {
    return weddings.filter(w => {
      const d = new Date(w.date)
      d.setHours(0, 0, 0, 0)
      return d >= today && d <= in30Days
    }).length
  }, [weddings])

  const coordStats = useMemo(() => {
    const counts: Record<string, number> = {}
    upcoming14.forEach(w => {
      const key = w.coordinator || 'Sin asignar'
      counts[key] = (counts[key] || 0) + 1
    })
    return Object.entries(counts).sort((a, b) => b[1] - a[1])
  }, [upcoming14])

  // Group by date for the timeline
  const groupedByDate = useMemo(() => {
    const groups: Record<string, Wedding[]> = {}
    upcoming14.forEach(w => {
      const key = w.date.slice(0, 10)
      if (!groups[key]) groups[key] = []
      groups[key].push(w)
    })
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
  }, [upcoming14])

  const isToday = (dateStr: string) => {
    const d = new Date(dateStr)
    d.setHours(0, 0, 0, 0)
    return d.getTime() === today.getTime()
  }

  const isTomorrow = (dateStr: string) => {
    const d = new Date(dateStr)
    d.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)
    return d.getTime() === tomorrow.getTime()
  }

  const getDayLabel = (dateStr: string) => {
    if (isToday(dateStr)) return 'HOY'
    if (isTomorrow(dateStr)) return 'MAÑANA'
    const d = new Date(dateStr)
    const diff = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return `En ${diff} días`
  }

  const formatDateFull = (dateStr: string) => {
    const d = new Date(dateStr)
    return `${DAY_NAMES[d.getDay()]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`
  }

  const userName = currentUser?.name?.split(' ')[0] || currentUser?.email?.split('@')[0] || 'Coordinadora'

  return (
    <section className="p-6 md:p-10 max-w-7xl mx-auto font-body">

      {/* ── Header ── */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">
            {DAY_NAMES[today.getDay()]} {today.getDate()} de {MONTH_NAMES[today.getMonth()].toLowerCase()} de {today.getFullYear()}
          </p>
          <h2 className="font-headline text-4xl font-bold text-on-surface">
            Hola, {userName} 👋
          </h2>
          <p className="text-on-surface-variant mt-1">
            {loading ? 'Cargando...' : upcoming14.length === 0
              ? 'No hay bodas en las próximas 2 semanas.'
              : `${upcoming14.length} ${upcoming14.length === 1 ? 'boda' : 'bodas'} en los próximos 14 días`
            }
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/calendar')}
            className="flex items-center gap-2 px-4 py-2 border border-outline-variant/30 rounded-lg text-sm font-medium text-on-surface hover:bg-surface-container-low transition-colors">
            <span className="material-symbols-outlined text-base">calendar_month</span>
            Calendario
          </button>
          <button
            onClick={() => navigate('/weddings')}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-bold hover:opacity-90 transition-opacity">
            <span className="material-symbols-outlined text-base">list</span>
            Todas las bodas
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">Esta semana</p>
          <p className="font-headline text-4xl font-bold text-primary">
            {loading ? '—' : upcoming14.filter(w => {
              const d = new Date(w.date); d.setHours(0,0,0,0)
              const in7 = new Date(today); in7.setDate(today.getDate() + 7)
              return d >= today && d <= in7
            }).length}
          </p>
          <p className="text-xs text-on-surface-variant mt-1">bodas</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">Próximos 30 días</p>
          <p className="font-headline text-4xl font-bold text-on-surface">
            {loading ? '—' : next30Count}
          </p>
          <p className="text-xs text-on-surface-variant mt-1">bodas</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">Este mes</p>
          <p className="font-headline text-4xl font-bold text-on-surface">
            {loading ? '—' : thisMonthCount}
          </p>
          <p className="text-xs text-on-surface-variant mt-1">bodas</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">Temporada 2026</p>
          <p className="font-headline text-4xl font-bold text-on-surface">
            {loading ? '—' : weddings.length}
          </p>
          <p className="text-xs text-on-surface-variant mt-1">bodas totales</p>
        </div>
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* ── LEFT: Timeline 14 días ── */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-headline text-2xl font-bold text-on-surface">Próximas 2 semanas</h3>
            <span className="text-xs text-on-surface-variant">
              {formatDateFull(today.toISOString())} → {formatDateFull(in14Days.toISOString())}
            </span>
          </div>

          {loading ? (
            <div className="text-center py-16 text-on-surface-variant">
              <span className="material-symbols-outlined text-4xl block mb-3 animate-pulse">hourglass_empty</span>
              Cargando bodas...
            </div>
          ) : upcoming14.length === 0 ? (
            <div className="text-center py-16 bg-surface-container-lowest rounded-xl border-2 border-dashed border-outline-variant/20">
              <span className="material-symbols-outlined text-5xl text-on-surface-variant/30 block mb-3">event_available</span>
              <p className="text-on-surface-variant font-medium">Sin bodas en las próximas 2 semanas</p>
              <p className="text-sm text-on-surface-variant/60 mt-1">Disfruta del descanso 🎉</p>
            </div>
          ) : (
            <div className="space-y-6">
              {groupedByDate.map(([dateKey, dayWeddings]) => {
                const today_ = isToday(dateKey)
                const tomorrow_ = isTomorrow(dateKey)
                const d = new Date(dateKey)

                return (
                  <div key={dateKey}>
                    {/* Date separator */}
                    <div className="flex items-center gap-3 mb-3">
                      {/* Day block */}
                      <div className={`shrink-0 w-14 h-14 rounded-xl flex flex-col items-center justify-center ${
                        today_ ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-on-surface'
                      }`}>
                        <span className="text-xs font-bold uppercase leading-none">{DAY_NAMES[d.getDay()]}</span>
                        <span className="text-2xl font-headline font-bold leading-tight">{d.getDate()}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          {today_ && (
                            <span className="bg-primary text-on-primary text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full">
                              HOY
                            </span>
                          )}
                          {tomorrow_ && (
                            <span className="bg-amber-100 text-amber-800 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full">
                              MAÑANA
                            </span>
                          )}
                          {!today_ && !tomorrow_ && (
                            <span className="text-xs text-on-surface-variant font-medium">
                              {getDayLabel(dateKey)}
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-on-surface">
                          {d.getDate()} de {MONTH_NAMES[d.getMonth()].toLowerCase()}
                          {dayWeddings.length > 1 && (
                            <span className="text-on-surface-variant ml-2">· {dayWeddings.length} bodas</span>
                          )}
                        </p>
                      </div>
                      <div className="flex-1 h-px bg-gray-200" />
                    </div>

                    {/* Wedding cards for this day */}
                    <div className="ml-[72px] space-y-3">
                      {dayWeddings.map(w => {
                        const c = getCoordColor(w.coordinator)
                        const guests = (w.adults || 0) + (w.children || 0)

                        return (
                          <div
                            key={w.id}
                            onClick={() => navigate(`/weddings/${w.id}/hdr`)}
                            className={`${c.bg} border border-gray-200 rounded-xl p-4 cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all group`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                {/* Top row */}
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${c.dot}`} />
                                  {w.coordinator && (
                                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${c.badge}`}>
                                      {w.coordinator}
                                    </span>
                                  )}
                                  {w.start_time && (
                                    <span className="text-[10px] text-on-surface-variant font-mono">
                                      {w.start_time}
                                    </span>
                                  )}
                                  {w.service_type && (
                                    <span className="text-[10px] text-on-surface-variant capitalize">
                                      · {w.service_type}
                                    </span>
                                  )}
                                </div>
                                {/* Name */}
                                <h4 className={`font-headline text-lg font-bold ${c.text} leading-tight`}>
                                  {w.couples_name}
                                </h4>
                                {/* Details */}
                                <div className="flex items-center gap-3 mt-1.5 text-xs text-on-surface-variant flex-wrap">
                                  {w.venue && (
                                    <span className="flex items-center gap-1">
                                      <span className="material-symbols-outlined text-[12px]">location_on</span>
                                      {w.venue}
                                    </span>
                                  )}
                                  {guests > 0 && (
                                    <span className="flex items-center gap-1">
                                      <span className="material-symbols-outlined text-[12px]">group</span>
                                      {guests} invitados
                                      {w.adults ? ` (${w.adults} ad.${w.children ? ` + ${w.children} niños` : ''})` : ''}
                                    </span>
                                  )}
                                </div>

                                {/* Chips: tipo de boda y situaciones especiales */}
                                {(() => {
                                  const chips = getWeddingChips(w)
                                  if (!chips.length) return null
                                  return (
                                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                                      {chips.map((chip, i) => (
                                        <span
                                          key={i}
                                          className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${chip.color}`}
                                        >
                                          <span className="material-symbols-outlined" style={{ fontSize: '10px' }}>{chip.icon}</span>
                                          {chip.label}
                                        </span>
                                      ))}
                                    </div>
                                  )
                                })()}
                              </div>

                              {/* HDR button */}
                              <button
                                onClick={e => { e.stopPropagation(); navigate(`/weddings/${w.id}/hdr`) }}
                                className="shrink-0 flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold uppercase tracking-wider text-on-surface hover:bg-primary hover:text-on-primary hover:border-primary transition-all shadow-sm group-hover:shadow">
                                <span className="material-symbols-outlined text-sm">description</span>
                                Ver HDR
                              </button>
                            </div>

                            {/* Today highlight bar */}
                            {today_ && (
                              <div className="mt-3 pt-3 border-t border-gray-200/60 flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm text-primary">radio_button_checked</span>
                                <span className="text-xs text-primary font-bold">Evento en curso hoy</span>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── RIGHT: Sidebar ── */}
        <div className="space-y-6">

          {/* Por coordinadora */}
          {!loading && upcoming14.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h4 className="font-headline text-base font-bold text-on-surface mb-4">
                Reparto próximas 2 sem.
              </h4>
              <div className="space-y-3">
                {coordStats.map(([coord, count]) => {
                  const c = getCoordColor(coord)
                  const pct = Math.round((count / upcoming14.length) * 100)
                  return (
                    <div key={coord}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${c.dot}`} />
                          <span className="text-sm font-medium text-on-surface">{coord}</span>
                        </div>
                        <span className="text-sm font-bold text-on-surface">{count}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${c.dot}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Acceso rápido por semana */}
          {!loading && upcoming14.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h4 className="font-headline text-base font-bold text-on-surface mb-4">
                Acceso rápido a HDRs
              </h4>
              <div className="space-y-2">
                {upcoming14.slice(0, 8).map(w => {
                  const c = getCoordColor(w.coordinator)
                  const d = new Date(w.date)
                  return (
                    <button
                      key={w.id}
                      onClick={() => navigate(`/weddings/${w.id}/hdr`)}
                      className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-surface-container-low transition-colors text-left group"
                    >
                      <div className={`w-9 h-9 rounded-lg ${c.badge} flex flex-col items-center justify-center shrink-0`}>
                        <span className="text-[9px] font-bold uppercase leading-none">{DAY_NAMES[d.getDay()]}</span>
                        <span className="text-sm font-bold font-headline leading-tight">{d.getDate()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-on-surface truncate leading-tight">
                          {w.couples_name}
                        </p>
                        <p className="text-[10px] text-on-surface-variant truncate">
                          {w.venue || w.coordinator || ''}
                        </p>
                      </div>
                      <span className="material-symbols-outlined text-sm text-on-surface-variant group-hover:text-primary transition-colors">
                        chevron_right
                      </span>
                    </button>
                  )
                })}
                {upcoming14.length > 8 && (
                  <button
                    onClick={() => navigate('/weddings')}
                    className="w-full text-center text-xs text-primary font-bold uppercase tracking-wider py-2 hover:underline">
                    + {upcoming14.length - 8} más →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Nueva boda CTA */}
          <div className="bg-stone-800 text-white p-6 rounded-xl relative overflow-hidden">
            <div className="relative z-10">
              <h5 className="font-headline text-lg font-bold mb-1">Nueva Boda</h5>
              <p className="text-sm text-white/60 mb-4">Crea una hoja de ruta para un nuevo evento.</p>
              <button
                onClick={() => navigate('/weddings/new')}
                className="bg-white text-stone-800 px-5 py-2 rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-gray-100 transition-colors">
                Crear HDR
              </button>
            </div>
            <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-[100px] text-white/10">
              add_circle
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
