import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../services/firebase'
import { collection, getDocs, addDoc } from 'firebase/firestore'

// ── Types ────────────────────────────────────────
type Method = 'blank' | 'copy'
type Step = 'method' | 'template' | 'basics' | 'preview'

interface SourceWedding {
  id: string
  couples_name: string
  date: string
  coordinator?: string
  venue?: string
  adults?: number
  children?: number
  service_type?: string
  menu?: Record<string, unknown>
  protocols?: Record<string, unknown>
  notes?: string[]
  timeline?: unknown[]
  financial?: Record<string, unknown>
}

interface WeddingForm {
  couples_name: string
  date: string
  coordinator: string
  venue: string
  service_type: string
  ceremony_type: string
  start_time: string
  end_time: string
  adults: string
  children: string
  professionals: string
  clients: string
}

interface CopyOptions {
  complementos: boolean
  aperitivos: boolean
  marisco: boolean
  tapas: boolean
  entrante: boolean
  pescado: boolean
  carne: boolean
  postre: boolean
  bodega: boolean
  infantil: boolean
  recena: boolean
  protocols: boolean
  timeline: boolean
}

// ── Constants ────────────────────────────────────
const COORDINATORS = ['Andrea', 'Marta', 'Rosa', 'Sara', 'Jimena', 'Bea']
const SERVICE_TYPES = ['Banquete', 'Cóctel', 'Banquete m2', 'Cóctel con banquete']
const CEREMONY_TYPES = ['Civil', 'Religiosa', 'Acto', 'Sin ceremonia']

const COORD_COLORS: Record<string, string> = {
  Andrea: 'bg-amber-100 text-amber-800',
  Marta:  'bg-blue-100 text-blue-800',
  Rosa:   'bg-rose-100 text-rose-800',
  Sara:   'bg-purple-100 text-purple-800',
  Jimena: 'bg-green-100 text-green-800',
  Bea:    'bg-green-100 text-green-800',
}

const COPY_SECTIONS = [
  { key: 'complementos',  label: 'Complementos',        icon: 'bakery_dining',   group: 'menu' },
  { key: 'aperitivos',    label: 'Aperitivos',           icon: 'tapas',           group: 'menu' },
  { key: 'marisco',       label: 'Marisco',              icon: 'set_meal',        group: 'menu' },
  { key: 'tapas',         label: 'Tapas',                icon: 'fastfood',        group: 'menu' },
  { key: 'entrante',      label: 'Entrante',             icon: 'soup_kitchen',    group: 'menu' },
  { key: 'pescado',       label: 'Pescado',              icon: 'set_meal',        group: 'menu' },
  { key: 'carne',         label: 'Carne',                icon: 'restaurant',      group: 'menu' },
  { key: 'postre',        label: 'Postre',               icon: 'icecream',        group: 'menu' },
  { key: 'bodega',        label: 'Bodega',               icon: 'wine_bar',        group: 'menu' },
  { key: 'infantil',      label: 'Menú Infantil',        icon: 'child_care',      group: 'extra' },
  { key: 'recena',        label: 'Recena',               icon: 'nightlife',       group: 'extra' },
  { key: 'protocols',     label: 'Protocolos',           icon: 'assignment',      group: 'extra' },
  { key: 'timeline',      label: 'Protocolo del día',    icon: 'schedule',        group: 'extra' },
] as const

const DEFAULT_FORM: WeddingForm = {
  couples_name: '', date: '', coordinator: '', venue: '',
  service_type: 'Banquete', ceremony_type: 'Civil',
  start_time: '', end_time: '', adults: '', children: '0',
  professionals: '0', clients: '',
}

const DEFAULT_COPY: CopyOptions = {
  complementos: true, aperitivos: true, marisco: true, tapas: true,
  entrante: true, pescado: true, carne: true, postre: true,
  bodega: true, infantil: false, recena: false, protocols: false, timeline: false,
}

// ── Step indicator ───────────────────────────────
const STEPS: { id: Step; label: string }[] = [
  { id: 'method',   label: 'Método' },
  { id: 'template', label: 'Plantilla' },
  { id: 'basics',   label: 'Datos' },
  { id: 'preview',  label: 'Confirmar' },
]

function StepBar({ current, method }: { current: Step; method: Method }) {
  const visible = method === 'copy'
    ? STEPS
    : STEPS.filter(s => s.id !== 'template')

  const idx = visible.findIndex(s => s.id === current)

  return (
    <div className="flex items-center gap-0 mb-10">
      {visible.map((s, i) => (
        <div key={s.id} className="flex items-center">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
            i < idx ? 'text-green-600' :
            i === idx ? 'bg-primary text-on-primary' :
            'text-on-surface-variant'
          }`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
              i < idx ? 'bg-green-100 text-green-600' :
              i === idx ? 'bg-white/30 text-on-primary' :
              'bg-gray-100 text-on-surface-variant'
            }`}>
              {i < idx ? '✓' : i + 1}
            </span>
            {s.label}
          </div>
          {i < visible.length - 1 && (
            <div className={`w-6 h-px mx-1 ${i < idx ? 'bg-green-300' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

// ── Field component ──────────────────────────────
function Field({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode
}) {
  return (
    <div>
      <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant block mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-[10px] text-on-surface-variant/60 mt-1">{hint}</p>}
    </div>
  )
}

const inputCls = "w-full px-3 py-2.5 text-sm rounded-lg border border-outline-variant/30 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 text-on-surface"

// ── Main component ───────────────────────────────
export const NewWedding = () => {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('method')
  const [method, setMethod] = useState<Method>('blank')
  const [allWeddings, setAllWeddings] = useState<SourceWedding[]>([])
  const [loadingWeddings, setLoadingWeddings] = useState(true)
  const [selectedSource, setSelectedSource] = useState<SourceWedding | null>(null)
  const [copyOptions, setCopyOptions] = useState<CopyOptions>(DEFAULT_COPY)
  const [form, setForm] = useState<WeddingForm>(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filters for template picker
  const [filterCoord, setFilterCoord] = useState('Todos')
  const [filterSearch, setFilterSearch] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDocs(collection(db, 'weddings'))
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() })) as SourceWedding[]
        setAllWeddings(data.sort((a, b) => a.date.localeCompare(b.date)))
      } catch (e) { console.error(e) }
      finally { setLoadingWeddings(false) }
    }
    load()
  }, [])

  const filteredWeddings = useMemo(() => {
    return allWeddings.filter(w => {
      const matchCoord = filterCoord === 'Todos' || w.coordinator === filterCoord
      const q = filterSearch.toLowerCase()
      const matchSearch = !q ||
        w.couples_name?.toLowerCase().includes(q) ||
        w.venue?.toLowerCase().includes(q) ||
        w.coordinator?.toLowerCase().includes(q)
      return matchCoord && matchSearch
    })
  }, [allWeddings, filterCoord, filterSearch])

  const setField = (k: keyof WeddingForm, v: string) =>
    setForm(f => ({ ...f, [k]: v }))

  const toggleCopy = (k: keyof CopyOptions) =>
    setCopyOptions(o => ({ ...o, [k]: !o[k] }))

  const selectAllCopy = (val: boolean) =>
    setCopyOptions(Object.fromEntries(
      Object.keys(DEFAULT_COPY).map(k => [k, val])
    ) as CopyOptions)

  // Navigation
  const nextStep = () => {
    if (step === 'method') {
      setStep(method === 'copy' ? 'template' : 'basics')
    } else if (step === 'template') {
      setStep('basics')
    } else if (step === 'basics') {
      setStep('preview')
    }
  }

  const prevStep = () => {
    if (step === 'basics') setStep(method === 'copy' ? 'template' : 'method')
    else if (step === 'template') setStep('method')
    else if (step === 'preview') setStep('basics')
  }

  const canProceed = () => {
    if (step === 'method') return true
    if (step === 'template') return selectedSource !== null
    if (step === 'basics') return form.couples_name.trim() && form.date && form.coordinator
    return true
  }

  // Build new wedding document
  const buildNewWedding = () => {
    const base: Record<string, unknown> = {
      couples_name: form.couples_name.trim(),
      date: form.date,
      coordinator: form.coordinator,
      venue: form.venue.trim(),
      service_type: form.service_type,
      ceremony_type: form.ceremony_type,
      start_time: form.start_time,
      end_time: form.end_time,
      adults: parseInt(form.adults) || 0,
      children: parseInt(form.children) || 0,
      professionals: parseInt(form.professionals) || 0,
      clients: form.clients.trim(),
      status: 'pending',
      file_source: 'manual',
      notes: [],
      timeline: [],
      financial: {},
      special_menus: {},
    }

    if (method === 'copy' && selectedSource) {
      const srcMenu = (selectedSource.menu || {}) as Record<string, unknown>

      const menu: Record<string, unknown> = {}
      if (copyOptions.complementos) menu.complementos = srcMenu.complementos || []
      if (copyOptions.aperitivos)   menu.aperitivos   = srcMenu.aperitivos   || []
      if (copyOptions.marisco)      menu.marisco       = srcMenu.marisco      || []
      if (copyOptions.tapas)        menu.tapa          = srcMenu.tapa         || []
      if (copyOptions.entrante)     menu.entrante      = srcMenu.entrante     || ''
      if (copyOptions.pescado)      menu.pescado       = srcMenu.pescado      || ''
      if (copyOptions.carne)        menu.carne         = srcMenu.carne        || ''
      if (copyOptions.postre)       menu.postre        = srcMenu.postre       || ''
      if (copyOptions.bodega)       menu.bodega        = srcMenu.bodega       || {}
      if (copyOptions.infantil)     menu.infantil      = srcMenu.infantil     || {}
      if (copyOptions.recena)       menu.recena        = srcMenu.recena       || []
      base.menu = menu

      if (copyOptions.protocols) base.protocols = selectedSource.protocols || {}
      if (copyOptions.timeline)  base.timeline  = selectedSource.timeline  || []
    } else {
      base.menu = {}
      base.protocols = {}
    }

    return base
  }

  const handleCreate = async () => {
    setSaving(true)
    setError(null)
    try {
      const data = buildNewWedding()
      const docRef = await addDoc(collection(db, 'weddings'), data)
      navigate(`/weddings/${docRef.id}/hdr`)
    } catch (e) {
      console.error(e)
      setError('Error al crear la boda. Inténtalo de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  const weddingDate = form.date
    ? new Date(form.date).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : ''

  return (
    <section className="p-6 md:p-10 max-w-4xl mx-auto font-body">
      {/* Header */}
      <div className="mb-8">
        <button onClick={() => navigate('/weddings')}
          className="text-primary font-bold text-xs uppercase tracking-widest hover:underline flex items-center gap-1 mb-4">
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Volver a Bodas
        </button>
        <h2 className="font-headline text-4xl font-bold text-on-surface mb-1">Nueva Hoja de Ruta</h2>
        <p className="text-on-surface-variant">Crea una HDR desde cero o copiando el menú de otra boda.</p>
      </div>

      {/* Step bar */}
      <StepBar current={step} method={method} />

      {/* ═══════════════ STEP 1: MÉTODO ═══════════════ */}
      {step === 'method' && (
        <div>
          <h3 className="font-headline text-xl font-bold text-on-surface mb-6">¿Cómo quieres crear la boda?</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* Desde cero */}
            <button
              onClick={() => setMethod('blank')}
              className={`text-left p-6 rounded-2xl border-2 transition-all hover:shadow-md ${
                method === 'blank'
                  ? 'border-primary bg-amber-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                method === 'blank' ? 'bg-primary text-on-primary' : 'bg-gray-100 text-on-surface-variant'
              }`}>
                <span className="material-symbols-outlined text-2xl">add_circle</span>
              </div>
              <h4 className="font-headline text-lg font-bold text-on-surface mb-1">Desde cero</h4>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Hoja de ruta completamente en blanco. Ideal para bodas con menú totalmente nuevo.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {['Menú nuevo', 'Personalización total', 'Plantilla vacía'].map(t => (
                  <span key={t} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">{t}</span>
                ))}
              </div>
            </button>

            {/* Copiar de otra */}
            <button
              onClick={() => setMethod('copy')}
              className={`text-left p-6 rounded-2xl border-2 transition-all hover:shadow-md ${
                method === 'copy'
                  ? 'border-primary bg-amber-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                method === 'copy' ? 'bg-primary text-on-primary' : 'bg-gray-100 text-on-surface-variant'
              }`}>
                <span className="material-symbols-outlined text-2xl">content_copy</span>
              </div>
              <h4 className="font-headline text-lg font-bold text-on-surface mb-1">Copiar de otra boda</h4>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Parte del menú y configuración de una boda existente. Elige qué copiar y qué cambiar.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {['Menú similar', 'Ahorra tiempo', 'Elige secciones'].map(t => (
                  <span key={t} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">{t}</span>
                ))}
              </div>
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════ STEP 2: PLANTILLA ═══════════════ */}
      {step === 'template' && (
        <div>
          <h3 className="font-headline text-xl font-bold text-on-surface mb-2">Selecciona la boda de referencia</h3>
          <p className="text-sm text-on-surface-variant mb-6">Elige la boda cuyo menú o configuración quieres reutilizar.</p>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-5">
            {/* Search */}
            <div className="flex items-center gap-2 px-3 py-2 border border-outline-variant/30 rounded-lg bg-white flex-1 min-w-[200px]">
              <span className="material-symbols-outlined text-base text-on-surface-variant">search</span>
              <input
                type="text"
                placeholder="Buscar pareja, lugar..."
                value={filterSearch}
                onChange={e => setFilterSearch(e.target.value)}
                className="text-sm bg-transparent outline-none w-full placeholder-on-surface-variant"
              />
            </div>
            {/* Coordinator filter */}
            <div className="flex flex-wrap gap-2">
              {['Todos', ...COORDINATORS].map(c => (
                <button key={c} onClick={() => setFilterCoord(c)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
                    filterCoord === c
                      ? 'bg-primary text-on-primary'
                      : 'border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-low'
                  }`}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Wedding grid */}
          {loadingWeddings ? (
            <div className="text-center py-12 text-on-surface-variant">
              <span className="material-symbols-outlined text-3xl block mb-2 animate-pulse">hourglass_empty</span>
              Cargando bodas...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[420px] overflow-y-auto pr-1">
              {filteredWeddings.map(w => {
                const isSelected = selectedSource?.id === w.id
                const coordColor = COORD_COLORS[w.coordinator || ''] || 'bg-gray-100 text-gray-700'
                const date = new Date(w.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
                const hasMenu = w.menu && Object.keys(w.menu).some(k => {
                  const v = (w.menu as Record<string,unknown>)[k]
                  return Array.isArray(v) ? v.length > 0 : Boolean(v)
                })

                return (
                  <button
                    key={w.id}
                    onClick={() => setSelectedSource(isSelected ? null : w)}
                    className={`text-left p-4 rounded-xl border-2 transition-all ${
                      isSelected
                        ? 'border-primary bg-amber-50 shadow-md'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        {w.coordinator && (
                          <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${coordColor} inline-block mb-1`}>
                            {w.coordinator}
                          </span>
                        )}
                        <h5 className="font-bold text-sm text-on-surface leading-tight">{w.couples_name}</h5>
                      </div>
                      {isSelected && (
                        <span className="material-symbols-outlined text-primary shrink-0" style={{fontSize:'20px'}}>
                          check_circle
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-on-surface-variant">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined" style={{fontSize:'12px'}}>calendar_today</span>
                        {date}
                      </span>
                      {w.venue && (
                        <span className="flex items-center gap-1 truncate">
                          <span className="material-symbols-outlined" style={{fontSize:'12px'}}>location_on</span>
                          {w.venue}
                        </span>
                      )}
                      {w.adults && (
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined" style={{fontSize:'12px'}}>group</span>
                          {w.adults} ad.
                        </span>
                      )}
                    </div>
                    {/* What it has */}
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      {hasMenu && <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold">MENÚ</span>}
                      {(w.menu as Record<string,unknown>)?.recena && <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold">RECENA</span>}
                      {(w.menu as Record<string,unknown>)?.infantil && <span className="text-[9px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded font-bold">INFANTIL</span>}
                      {w.timeline && Array.isArray(w.timeline) && w.timeline.length > 0 && <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold">TIMELINE</span>}
                    </div>
                  </button>
                )
              })}
              {filteredWeddings.length === 0 && (
                <div className="col-span-2 text-center py-8 text-on-surface-variant">
                  No hay bodas que coincidan con la búsqueda.
                </div>
              )}
            </div>
          )}

          {/* Selected source + copy options */}
          {selectedSource && (
            <div className="mt-6 p-5 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-bold text-on-surface">
                  Copiando de: <span className="text-primary">{selectedSource.couples_name}</span>
                </p>
                <div className="flex gap-2">
                  <button onClick={() => selectAllCopy(true)} className="text-xs text-primary font-bold hover:underline">Seleccionar todo</button>
                  <span className="text-on-surface-variant">·</span>
                  <button onClick={() => selectAllCopy(false)} className="text-xs text-on-surface-variant font-bold hover:underline">Ninguno</button>
                </div>
              </div>

              <p className="text-xs text-on-surface-variant font-bold uppercase tracking-wider mb-3">¿Qué quieres copiar?</p>

              {/* Menú group */}
              <div className="mb-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2">Menú</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {COPY_SECTIONS.filter(s => s.group === 'menu').map(s => (
                    <label key={s.key} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer border transition-all ${
                      copyOptions[s.key as keyof CopyOptions]
                        ? 'bg-white border-primary/30 text-on-surface'
                        : 'bg-white/50 border-transparent text-on-surface-variant'
                    }`}>
                      <input
                        type="checkbox"
                        checked={copyOptions[s.key as keyof CopyOptions]}
                        onChange={() => toggleCopy(s.key as keyof CopyOptions)}
                        className="accent-amber-600 w-3.5 h-3.5"
                      />
                      <span className="material-symbols-outlined text-[12px]">{s.icon}</span>
                      <span className="text-xs font-medium">{s.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Extra group */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2">Extras</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {COPY_SECTIONS.filter(s => s.group === 'extra').map(s => (
                    <label key={s.key} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer border transition-all ${
                      copyOptions[s.key as keyof CopyOptions]
                        ? 'bg-white border-primary/30 text-on-surface'
                        : 'bg-white/50 border-transparent text-on-surface-variant'
                    }`}>
                      <input
                        type="checkbox"
                        checked={copyOptions[s.key as keyof CopyOptions]}
                        onChange={() => toggleCopy(s.key as keyof CopyOptions)}
                        className="accent-amber-600 w-3.5 h-3.5"
                      />
                      <span className="material-symbols-outlined text-[12px]">{s.icon}</span>
                      <span className="text-xs font-medium">{s.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <p className="text-[10px] text-on-surface-variant/60 mt-3 italic">
                * Menús especiales, notas internas y datos financieros NO se copian nunca (son específicos de cada boda).
              </p>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════ STEP 3: DATOS BÁSICOS ═══════════════ */}
      {step === 'basics' && (
        <div>
          <h3 className="font-headline text-xl font-bold text-on-surface mb-6">Datos del evento</h3>

          <div className="space-y-6">
            {/* Pareja + fecha */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Nombre de la pareja" required>
                <input
                  type="text"
                  placeholder="Elena & Marcos"
                  value={form.couples_name}
                  onChange={e => setField('couples_name', e.target.value)}
                  className={inputCls}
                  autoFocus
                />
              </Field>
              <Field label="Fecha de la boda" required>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => setField('date', e.target.value)}
                  className={inputCls}
                />
              </Field>
            </div>

            {/* Coordinadora + venue */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Coordinadora" required>
                <div className="flex flex-wrap gap-2">
                  {COORDINATORS.map(c => (
                    <button key={c} onClick={() => setField('coordinator', c)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors border ${
                        form.coordinator === c
                          ? 'bg-primary text-on-primary border-primary'
                          : 'border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-low'
                      }`}>
                      {c}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Venue / Finca">
                <input
                  type="text"
                  placeholder="Pazo do Mosteiro, TOUZA, RDC..."
                  value={form.venue}
                  onChange={e => setField('venue', e.target.value)}
                  className={inputCls}
                />
              </Field>
            </div>

            {/* Tipo servicio + ceremonia */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Tipo de servicio">
                <div className="flex flex-wrap gap-2">
                  {SERVICE_TYPES.map(t => (
                    <button key={t} onClick={() => setField('service_type', t)}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-colors border ${
                        form.service_type === t
                          ? 'bg-primary text-on-primary border-primary'
                          : 'border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-low'
                      }`}>
                      {t}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Tipo de ceremonia">
                <div className="flex flex-wrap gap-2">
                  {CEREMONY_TYPES.map(t => (
                    <button key={t} onClick={() => setField('ceremony_type', t)}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-colors border ${
                        form.ceremony_type === t
                          ? 'bg-primary text-on-primary border-primary'
                          : 'border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-low'
                      }`}>
                      {t}
                    </button>
                  ))}
                </div>
              </Field>
            </div>

            {/* Horario */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Field label="Hora inicio">
                <input type="time" value={form.start_time} onChange={e => setField('start_time', e.target.value)} className={inputCls} />
              </Field>
              <Field label="Hora cierre">
                <input type="time" value={form.end_time} onChange={e => setField('end_time', e.target.value)} className={inputCls} />
              </Field>
              <Field label="Adultos">
                <input type="number" min="0" placeholder="0" value={form.adults} onChange={e => setField('adults', e.target.value)} className={inputCls} />
              </Field>
              <Field label="Niños">
                <input type="number" min="0" placeholder="0" value={form.children} onChange={e => setField('children', e.target.value)} className={inputCls} />
              </Field>
            </div>

            {/* Profesionales + clientes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Profesionales (foto, video, DJ...)" hint="Número de profesionales externos">
                <input type="number" min="0" placeholder="0" value={form.professionals} onChange={e => setField('professionals', e.target.value)} className={inputCls} />
              </Field>
              <Field label="Nombre completo clientes" hint="Nombres legales para el contrato">
                <input type="text" placeholder="Elena García Ruiz y Marcos Pérez López" value={form.clients} onChange={e => setField('clients', e.target.value)} className={inputCls} />
              </Field>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ STEP 4: PREVIEW ═══════════════ */}
      {step === 'preview' && (
        <div>
          <h3 className="font-headline text-xl font-bold text-on-surface mb-6">Confirmar nueva boda</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
            {/* Event summary */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-3">
              <p className="text-xs font-bold uppercase tracking-widest text-primary mb-3">Datos del Evento</p>
              {[
                { label: 'Pareja', value: form.couples_name },
                { label: 'Fecha', value: weddingDate },
                { label: 'Coordinadora', value: form.coordinator },
                { label: 'Venue', value: form.venue || '—' },
                { label: 'Servicio', value: form.service_type },
                { label: 'Ceremonia', value: form.ceremony_type },
                { label: 'Horario', value: form.start_time ? `${form.start_time}${form.end_time ? ` → ${form.end_time}` : ''}` : '—' },
                { label: 'Invitados', value: `${form.adults || 0} adultos${parseInt(form.children) > 0 ? ` + ${form.children} niños` : ''}${parseInt(form.professionals) > 0 ? ` + ${form.professionals} prof.` : ''}` },
              ].map(({ label, value }) => (
                <div key={label} className="flex gap-3 text-sm">
                  <span className="text-on-surface-variant min-w-[100px] shrink-0">{label}</span>
                  <span className="font-medium text-on-surface">{value}</span>
                </div>
              ))}
            </div>

            {/* Content summary */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-primary mb-3">Contenido que se creará</p>
              {method === 'blank' ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                    <span className="material-symbols-outlined text-gray-300 text-base">close</span>
                    Hoja de ruta completamente en blanco
                  </div>
                  <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                    <span className="material-symbols-outlined text-gray-300 text-base">close</span>
                    Menú vacío (a rellenar manualmente)
                  </div>
                  <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                    <span className="material-symbols-outlined text-green-500 text-base">check</span>
                    Protocolo del día editable
                  </div>
                  <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                    <span className="material-symbols-outlined text-green-500 text-base">check</span>
                    Estado de cuentas vacío
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-sm mb-2">
                    <span className="material-symbols-outlined text-primary text-sm">content_copy</span>
                    <span className="text-on-surface-variant">Copiando de <strong className="text-on-surface">{selectedSource?.couples_name}</strong></span>
                  </div>
                  {COPY_SECTIONS.map(s => (
                    copyOptions[s.key as keyof CopyOptions] ? (
                      <div key={s.key} className="flex items-center gap-2 text-sm text-on-surface">
                        <span className="material-symbols-outlined text-green-500 text-sm">check_circle</span>
                        {s.label}
                      </div>
                    ) : null
                  ))}
                  {Object.values(copyOptions).every(v => !v) && (
                    <p className="text-sm text-on-surface-variant italic">Nada seleccionado para copiar — equivale a "desde cero".</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-base">error</span>
              {error}
            </div>
          )}
        </div>
      )}

      {/* ── Navigation buttons ── */}
      <div className="flex items-center justify-between mt-10 pt-6 border-t border-gray-100">
        <button
          onClick={step === 'method' ? () => navigate('/weddings') : prevStep}
          className="flex items-center gap-2 px-5 py-2.5 border border-outline-variant/30 rounded-xl text-sm font-bold text-on-surface hover:bg-surface-container-low transition-colors">
          <span className="material-symbols-outlined text-base">arrow_back</span>
          {step === 'method' ? 'Cancelar' : 'Anterior'}
        </button>

        {step !== 'preview' ? (
          <button
            onClick={nextStep}
            disabled={!canProceed()}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-on-primary rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-40 transition-opacity">
            Siguiente
            <span className="material-symbols-outlined text-base">arrow_forward</span>
          </button>
        ) : (
          <button
            onClick={handleCreate}
            disabled={saving}
            className="flex items-center gap-2 px-8 py-2.5 bg-primary text-on-primary rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-40 transition-opacity">
            {saving ? (
              <>
                <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                Creando...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-base">check_circle</span>
                Crear Hoja de Ruta
              </>
            )}
          </button>
        )}
      </div>
    </section>
  )
}
