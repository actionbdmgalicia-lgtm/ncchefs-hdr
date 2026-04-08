import { useState, useEffect } from 'react'
import { db } from '../services/firebase'
import { collection, query, getDocs } from 'firebase/firestore'
import { useNavigate } from 'react-router-dom'

interface Wedding {
  id: string
  couples_name: string
  date: string
  venue: string
  status: string
  coordinator: string
  adults: number
  children: number
}

// Color por coordinador
const COORDINATOR_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  'Andrea': { bg: 'bg-amber-100', text: 'text-amber-900', dot: 'bg-amber-600' },
  'Marta':  { bg: 'bg-blue-100',  text: 'text-blue-900',  dot: 'bg-blue-600' },
  'Rosa':   { bg: 'bg-rose-100',  text: 'text-rose-900',  dot: 'bg-rose-600' },
  'Sara':   { bg: 'bg-purple-100',text: 'text-purple-900',dot: 'bg-purple-600' },
  'Jimena': { bg: 'bg-green-100', text: 'text-green-900', dot: 'bg-green-600' },
  'Bea':    { bg: 'bg-green-100', text: 'text-green-900', dot: 'bg-green-600' },
}

const getColor = (coordinator: string) => {
  const key = Object.keys(COORDINATOR_COLORS).find(k => coordinator?.includes(k))
  return key ? COORDINATOR_COLORS[key] : { bg: 'bg-gray-100', text: 'text-gray-900', dot: 'bg-gray-500' }
}

export const Calendar = () => {
  const navigate = useNavigate()
  const [currentDate, setCurrentDate] = useState(new Date(2026, 3, 1)) // April 2026 default
  const [weddings, setWeddings] = useState<Wedding[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDocs(query(collection(db, 'weddings')))
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Wedding[]
        setWeddings(data)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayRaw = new Date(year, month, 1).getDay()
  const firstDay = firstDayRaw === 0 ? 6 : firstDayRaw - 1
  const emptyDays = Array.from({ length: firstDay })
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  const dayNames = ['LUN','MAR','MIÉ','JUE','VIE','SÁB','DOM']

  const getWeddingsForDay = (day: number) =>
    weddings.filter(w => {
      const d = new Date(w.date)
      return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year
    })

  const selectedWeddings = selectedDay ? getWeddingsForDay(selectedDay) : []

  const monthWeddings = weddings
    .filter(w => { const d = new Date(w.date); return d.getMonth() === month && d.getFullYear() === year })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  const displayWeddings = selectedDay && selectedWeddings.length > 0 ? selectedWeddings : monthWeddings.slice(0, 3)
  const totalMonthWeddings = monthWeddings.length

  return (
    <section className="p-6 md:p-10 max-w-7xl mx-auto font-body">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Bodas & Eventos</p>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-headline text-4xl font-bold text-on-surface">{monthNames[month]} {year}</h2>
            <p className="text-on-surface-variant mt-1">{totalMonthWeddings} eventos programados este mes</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setCurrentDate(new Date(year, month - 1, 1)); setSelectedDay(null) }}
              className="flex items-center gap-1 px-4 py-2 border border-outline-variant/30 rounded text-sm font-medium text-on-surface hover:bg-surface-container-low transition-colors">
              <span className="material-symbols-outlined text-base">chevron_left</span> Anterior
            </button>
            <button onClick={() => { setCurrentDate(new Date(year, month + 1, 1)); setSelectedDay(null) }}
              className="flex items-center gap-1 px-4 py-2 border border-outline-variant/30 rounded text-sm font-medium text-on-surface hover:bg-surface-container-low transition-colors">
              Siguiente <span className="material-symbols-outlined text-base">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      {/* Color legend */}
      <div className="flex flex-wrap gap-3 mb-6">
        {Object.entries(COORDINATOR_COLORS).filter(([k]) => k !== 'Bea').map(([name, colors]) => (
          <div key={name} className="flex items-center gap-1.5 text-xs text-on-surface-variant">
            <span className={`w-3 h-3 rounded-full ${colors.dot}`}></span>
            {name}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Calendar grid */}
        <div className="lg:col-span-2 bg-surface-container-lowest rounded-xl border border-outline-variant/10 p-6">
          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {dayNames.map(d => (
              <div key={d} className="text-center text-xs font-bold uppercase tracking-wider text-on-surface-variant py-2">{d}</div>
            ))}
          </div>

          {loading ? (
            <div className="text-center py-12 text-on-surface-variant">Cargando...</div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {emptyDays.map((_, i) => <div key={`e${i}`} />)}
              {days.map(day => {
                const dayWeddings = getWeddingsForDay(day)
                const isSelected = selectedDay === day
                const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(isSelected ? null : day)}
                    className={`min-h-[60px] p-1.5 rounded-lg border flex flex-col transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : isToday
                        ? 'border-primary/40 bg-primary/5'
                        : dayWeddings.length > 0
                        ? 'border-outline-variant/20 bg-white hover:shadow-sm cursor-pointer'
                        : 'border-outline-variant/10 bg-surface-container-high cursor-default'
                    }`}
                  >
                    <span className={`text-xs font-bold mb-1 self-start ${isToday ? 'text-primary' : 'text-on-surface'}`}>
                      {day}
                    </span>
                    <div className="flex flex-col gap-0.5 w-full">
                      {dayWeddings.slice(0, 3).map(w => {
                        const c = getColor(w.coordinator)
                        return (
                          <div
                            key={w.id}
                            onClick={e => { e.stopPropagation(); navigate(`/weddings/${w.id}/hdr`) }}
                            className={`${c.bg} ${c.text} text-[9px] font-bold px-1 py-0.5 rounded truncate w-full text-left hover:opacity-80`}
                          >
                            {w.couples_name.split(' ')[0]}
                          </div>
                        )
                      })}
                      {dayWeddings.length > 3 && (
                        <span className="text-[9px] text-on-surface-variant font-bold">+{dayWeddings.length - 3} más</span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <h4 className="font-headline text-lg font-bold text-on-surface">
            {selectedDay ? `${selectedDay} de ${monthNames[month]}` : `Próximas bodas — ${monthNames[month]}`}
          </h4>

          {displayWeddings.length === 0 ? (
            <div className="bg-surface-container-low p-6 rounded-lg text-center">
              <p className="text-on-surface-variant text-sm">No hay bodas {selectedDay ? 'este día' : 'este mes'}</p>
            </div>
          ) : (
            displayWeddings.map(w => {
              const c = getColor(w.coordinator)
              const date = new Date(w.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
              return (
                <div key={w.id} className={`${c.bg} p-4 rounded-lg border border-outline-variant/10`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${c.dot}`}></span>
                      <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">{w.coordinator}</span>
                    </div>
                    <span className="text-xs text-on-surface-variant">{date}</span>
                  </div>
                  <h5 className={`font-headline font-bold ${c.text} mb-1`}>{w.couples_name}</h5>
                  {w.venue && <p className="text-xs text-on-surface-variant mb-3">{w.venue}</p>}
                  {(w.adults || w.children) ? (
                    <p className="text-xs text-on-surface-variant mb-3">
                      {(w.adults || 0) + (w.children || 0)} invitados
                    </p>
                  ) : null}
                  <button
                    onClick={() => navigate(`/weddings/${w.id}/hdr`)}
                    className="w-full py-1.5 text-xs font-bold uppercase tracking-widest border border-outline-variant/30 rounded hover:bg-surface-container-low transition-colors text-on-surface"
                  >
                    Ver HDR →
                  </button>
                </div>
              )
            })
          )}

          {!selectedDay && monthWeddings.length > 3 && (
            <p className="text-xs text-on-surface-variant text-center">
              + {monthWeddings.length - 3} bodas más este mes
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
