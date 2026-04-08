import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { db, storage } from '../services/firebase'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'

// ── Timeline types ──────────────────────────────
type TimelineCategoria =
  | 'logistica'
  | 'ceremonia'
  | 'aperitivo'
  | 'banquete'
  | 'cocina'
  | 'protocolo'
  | 'musica'
  | 'cierre'

interface TimelineStep {
  id: string
  hora: string
  titulo: string
  descripcion: string
  responsable: string
  categoria: TimelineCategoria
  completado: boolean
  imageUrl?: string       // URL imagen paso (Firebase Storage)
}

// ── Menu interfaces ─────────────────────────────
interface Bodega { blanco?: string; tinto?: string; cava?: string; otros?: string }
interface Infantil { menu?: string[]; postre?: string; notas?: string }
interface SpecialMenus {
  celiacos?: number; vegetarianos?: number; infantil?: number
  sin_marisco?: number; sin_pescado?: number; sin_carne?: number
  sin_lactosa?: number; alergicos?: number; embarazadas?: number; otros?: string[]
}
interface Menu {
  complementos?: string[]; aperitivos?: string[]; marisco?: string[]
  tapa?: string[]; entrante?: string; pescado?: string; carne?: string
  postre?: string; recena?: string[]; infantil?: Infantil; bodega?: Bodega
  special_menus?: SpecialMenus
}
interface Payment { label: string; amount: number; date?: string; status?: string }
interface Financial {
  adults?: number; children?: number; base_price_per_adult?: number
  base_total?: number; total_before_tax?: number; tax_10pct?: number
  total_invoice?: number; payments?: Payment[]; total_paid?: number
}
interface Protocols {
  bus?: string; bus_contact?: string; entrance_couple?: string; toast?: string
  bouquet?: string; other_bouquets?: string; gifts?: string; dance_opening?: string
  tobacco?: string; ceremony_time?: string; ceremony_location?: string
  ceremony_officiant?: string; notes?: string
}
interface Wedding {
  id: string; couples_name: string; clients?: string; date: string
  venue?: string; status?: string; adults?: number; children?: number
  professionals?: number; coordinator?: string; ceremony_type?: string
  start_time?: string; end_time?: string; service_type?: string
  menu?: Menu; protocols?: Protocols; notes?: string[]
  financial?: Financial; timeline?: TimelineStep[]
}

// ── Constants ───────────────────────────────────
const CATEGORIA_CONFIG: Record<TimelineCategoria, { label: string; color: string; icon: string }> = {
  logistica: { label: 'Logística',  color: 'bg-slate-100 text-slate-700 border-slate-300',    icon: 'local_shipping' },
  ceremonia: { label: 'Ceremonia',  color: 'bg-purple-100 text-purple-800 border-purple-300', icon: 'favorite' },
  aperitivo: { label: 'Aperitivo',  color: 'bg-amber-100 text-amber-800 border-amber-300',    icon: 'wine_bar' },
  banquete:  { label: 'Banquete',   color: 'bg-green-100 text-green-800 border-green-300',    icon: 'restaurant' },
  cocina:    { label: 'Cocina',     color: 'bg-orange-100 text-orange-800 border-orange-300', icon: 'soup_kitchen' },
  protocolo: { label: 'Protocolo',  color: 'bg-blue-100 text-blue-800 border-blue-300',       icon: 'assignment' },
  musica:    { label: 'Música / DJ',color: 'bg-pink-100 text-pink-800 border-pink-300',       icon: 'music_note' },
  cierre:    { label: 'Cierre',     color: 'bg-gray-100 text-gray-700 border-gray-300',       icon: 'meeting_room' },
}

const DOT_COLORS: Record<TimelineCategoria, string> = {
  logistica: 'bg-slate-400',
  ceremonia: 'bg-purple-500',
  aperitivo: 'bg-amber-500',
  banquete:  'bg-green-500',
  cocina:    'bg-orange-500',
  protocolo: 'bg-blue-500',
  musica:    'bg-pink-500',
  cierre:    'bg-gray-400',
}

const PROTOCOL_LABELS: Record<string, string> = {
  bus: 'Autobuses', bus_contact: 'Contacto Bus', entrance_couple: 'Entrada Novios',
  toast: 'Brindis', bouquet: 'Ramo', other_bouquets: 'Otros Ramos',
  gifts: 'Regalos', dance_opening: 'Baile Apertura', tobacco: 'Tabaco / Puros',
  ceremony_time: 'Hora Ceremonia', ceremony_location: 'Lugar Ceremonia',
  ceremony_officiant: 'Oficia', notes: 'Notas',
}

const SPECIAL_LABELS: Record<string, string> = {
  celiacos: 'Celíacos', vegetarianos: 'Vegetarianos', sin_marisco: 'Sin Marisco',
  sin_pescado: 'Sin Pescado', sin_carne: 'Sin Carne', sin_lactosa: 'Sin Lactosa',
  alergicos: 'Alérgicos', embarazadas: 'Embarazadas', infantil: 'Menú Infantil',
}

const RESPONSABLES = ['Coordinadora', 'Sala', 'Cocina', 'DJ', 'Fotógrafo', 'Autobús', 'Todos', 'Externo']

// ── Auto-generate timeline from wedding data ────
function generateSuggestedSteps(wedding: Wedding): TimelineStep[] {
  const steps: TimelineStep[] = []
  const p = wedding.protocols || {}

  const addStep = (
    id: string, hora: string, titulo: string, descripcion: string,
    responsable: string, categoria: TimelineCategoria
  ) => {
    if (!hora) return
    steps.push({ id, hora, titulo, descripcion, responsable, categoria, completado: false })
  }

  // Logistics: buses
  if (p.bus && p.bus !== 'no') {
    addStep('bus_llegada', '', 'Salida autobuses', p.bus, 'Autobús', 'logistica')
  }

  // Ceremony
  if (p.ceremony_time) {
    addStep('ceremonia', p.ceremony_time,
      `Ceremonia ${wedding.ceremony_type || 'civil'}`,
      [p.ceremony_location, p.ceremony_officiant].filter(Boolean).join(' · '),
      'Coordinadora', 'ceremonia')
  }

  // Aperitivo start
  if (wedding.start_time) {
    addStep('aperitivo_inicio', wedding.start_time,
      'Inicio aperitivo / recepción',
      `${wedding.adults || 0} adultos${wedding.children ? ` + ${wedding.children} niños` : ''}`,
      'Sala', 'aperitivo')
  }

  // Cocina: complementos out
  if (wedding.start_time && (wedding.menu?.complementos?.length || 0) > 0) {
    const [h, m] = (wedding.start_time).split(':').map(Number)
    const complementoHora = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
    addStep('complementos', complementoHora,
      'Complementos a la mesa',
      (wedding.menu?.complementos || []).slice(0,2).join(', '),
      'Sala', 'cocina')
  }

  // Protocolo: entrada novios
  if (p.entrance_couple && p.entrance_couple !== 'no') {
    addStep('entrada_novios', '', 'Entrada de los novios al banquete', p.entrance_couple, 'Coordinadora', 'protocolo')
  }

  // Banquete (estimated ~1.5h after aperitivo)
  if (wedding.start_time) {
    const [h, m] = wedding.start_time.split(':').map(Number)
    const banqHora = `${String(h + 1).padStart(2,'0')}:${String(m + 30).padStart(2,'0')}`
    addStep('banquete_inicio', banqHora.replace(':90', ':30').replace(':60', ':00'),
      'Llamada al banquete', 'Invitados pasan a la sala', 'Sala', 'banquete')
  }

  // Entrante
  if (wedding.menu?.entrante) {
    addStep('entrante', '', 'Pase: Entrante',
      wedding.menu.entrante.substring(0, 60) + (wedding.menu.entrante.length > 60 ? '…' : ''),
      'Cocina', 'cocina')
  }

  // Carne
  if (wedding.menu?.carne) {
    addStep('carne', '', 'Pase: Carne',
      wedding.menu.carne.substring(0, 60) + (wedding.menu.carne.length > 60 ? '…' : ''),
      'Cocina', 'cocina')
  }

  // Postre
  if (wedding.menu?.postre) {
    addStep('postre', '', 'Postre & tarta',
      wedding.menu.postre.substring(0, 60) + (wedding.menu.postre.length > 60 ? '…' : ''),
      'Sala', 'cocina')
  }

  // Brindis
  if (p.toast) {
    addStep('brindis', '', 'Brindis', p.toast, 'Coordinadora', 'protocolo')
  }

  // Baile
  if (p.dance_opening && p.dance_opening !== 'no') {
    addStep('baile', '', 'Baile nupcial', p.dance_opening, 'DJ', 'musica')
  }

  // Barra libre — look in protocols notes for time or use default
  addStep('barra_libre', '', 'Inicio barra libre', 'Apertura de barra', 'DJ', 'musica')

  // Recena
  if ((wedding.menu?.recena || []).length > 0) {
    addStep('recena', '', 'Recena',
      (wedding.menu?.recena || []).slice(0, 2).join(', '),
      'Cocina', 'cocina')
  }

  // Cierre
  if (wedding.end_time) {
    addStep('cierre', wedding.end_time, 'Cierre del evento', 'Fin de servicio', 'Coordinadora', 'cierre')
  }

  return steps.filter(s => s.hora).sort((a, b) => a.hora.localeCompare(b.hora))
}

// ── Timeline Step Card ──────────────────────────
function StepCard({
  step, index, total,
  onToggle, onEdit, onDelete,
}: {
  step: TimelineStep; index: number; total: number
  onToggle: () => void; onEdit: () => void; onDelete: () => void
}) {
  const cfg = CATEGORIA_CONFIG[step.categoria]
  const dot = DOT_COLORS[step.categoria]
  const [imgOpen, setImgOpen] = useState(false)

  return (
    <>
      <div className="flex gap-4 group">
        {/* Timeline spine */}
        <div className="flex flex-col items-center w-10 shrink-0">
          <div className={`w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 transition-all ${
            step.completado ? 'bg-green-500 border-green-500' : `${dot} border-white ring-2 ring-current`
          }`} style={{ boxShadow: step.completado ? undefined : '0 0 0 2px #e5e7eb' }} />
          {index < total - 1 && <div className="w-px flex-1 bg-gray-200 mt-1" />}
        </div>

        {/* Card */}
        <div className="flex-1 pb-5">
          <div className={`border rounded-xl overflow-hidden transition-all ${
            step.completado ? 'opacity-60 bg-gray-50 border-gray-200' : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
          }`}>

            {/* Image thumbnail (if present) */}
            {step.imageUrl && (
              <div
                className="relative cursor-pointer group/img"
                onClick={() => setImgOpen(true)}
              >
                <img
                  src={step.imageUrl}
                  alt={step.titulo}
                  className="w-full h-32 object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/20 transition-colors flex items-center justify-center">
                  <span className="material-symbols-outlined text-white opacity-0 group-hover/img:opacity-100 text-3xl transition-opacity drop-shadow-lg">
                    zoom_in
                  </span>
                </div>
                <div className="absolute top-2 right-2 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                  Foto
                </div>
              </div>
            )}

            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {/* Time + category */}
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    {step.hora && (
                      <span className="font-mono text-sm font-bold text-on-surface bg-gray-100 px-2 py-0.5 rounded">
                        {step.hora}
                      </span>
                    )}
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${cfg.color}`}>
                      <span className="material-symbols-outlined mr-0.5" style={{fontSize:'10px'}}>{cfg.icon}</span>
                      {cfg.label}
                    </span>
                    {step.responsable && (
                      <span className="text-[10px] text-on-surface-variant uppercase tracking-wider">
                        {step.responsable}
                      </span>
                    )}
                  </div>
                  {/* Title */}
                  <h5 className={`font-bold text-sm mb-0.5 ${step.completado ? 'line-through text-on-surface-variant' : 'text-on-surface'}`}>
                    {step.titulo}
                  </h5>
                  {/* Description */}
                  {step.descripcion && (
                    <p className="text-xs text-on-surface-variant italic leading-relaxed">
                      {step.descripcion}
                    </p>
                  )}
                </div>
                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={onToggle} title={step.completado ? 'Marcar pendiente' : 'Marcar hecho'}
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                      step.completado ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-green-100 hover:text-green-700'
                    }`}>
                    <span className="material-symbols-outlined" style={{fontSize:'14px'}}>
                      {step.completado ? 'check_circle' : 'radio_button_unchecked'}
                    </span>
                  </button>
                  <button onClick={onEdit} title="Editar"
                    className="w-7 h-7 rounded-full flex items-center justify-center bg-gray-100 text-gray-500 hover:bg-blue-100 hover:text-blue-700 transition-colors">
                    <span className="material-symbols-outlined" style={{fontSize:'14px'}}>edit</span>
                  </button>
                  <button onClick={onDelete} title="Eliminar"
                    className="w-7 h-7 rounded-full flex items-center justify-center bg-gray-100 text-gray-500 hover:bg-red-100 hover:text-red-600 transition-colors">
                    <span className="material-symbols-outlined" style={{fontSize:'14px'}}>delete</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {imgOpen && step.imageUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setImgOpen(false)}
        >
          <div className="relative max-w-3xl w-full" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setImgOpen(false)}
              className="absolute -top-10 right-0 text-white/70 hover:text-white flex items-center gap-1 text-sm font-bold"
            >
              <span className="material-symbols-outlined text-base">close</span> Cerrar
            </button>
            <img
              src={step.imageUrl}
              alt={step.titulo}
              className="w-full max-h-[80vh] object-contain rounded-xl shadow-2xl"
            />
            <p className="text-white/80 text-sm text-center mt-3 font-medium">{step.titulo}</p>
          </div>
        </div>
      )}
    </>
  )
}

// ── Image upload hook ───────────────────────────
function useImageUpload(weddingId: string, stepId: string) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) { setError('Solo se permiten imágenes'); return }
    if (file.size > 5 * 1024 * 1024) { setError('Máximo 5 MB'); return }

    // Local preview immediately
    const reader = new FileReader()
    reader.onload = e => setPreview(e.target?.result as string)
    reader.readAsDataURL(file)

    // Upload to Firebase Storage
    setUploading(true)
    setError(null)
    try {
      const path = `weddings/${weddingId}/timeline/${stepId}_${Date.now()}`
      const sRef = storageRef(storage, path)
      await uploadBytes(sRef, file)
      const url = await getDownloadURL(sRef)
      setUploadedUrl(url)
    } catch (e) {
      setError('Error al subir la imagen')
      console.error(e)
    } finally {
      setUploading(false)
    }
  }

  return { uploading, preview, uploadedUrl, error, handleFile }
}

// ── Step Form (add/edit) ────────────────────────
function StepForm({
  initial, weddingId, onSave, onCancel,
}: {
  initial?: Partial<TimelineStep>
  weddingId: string
  onSave: (step: Omit<TimelineStep, 'id' | 'completado'>) => void
  onCancel: () => void
}) {
  const [hora, setHora] = useState(initial?.hora || '')
  const [titulo, setTitulo] = useState(initial?.titulo || '')
  const [descripcion, setDescripcion] = useState(initial?.descripcion || '')
  const [responsable, setResponsable] = useState(initial?.responsable || 'Coordinadora')
  const [categoria, setCategoria] = useState<TimelineCategoria>(initial?.categoria || 'protocolo')
  const [existingImageUrl] = useState(initial?.imageUrl || '')

  const tempId = useRef(`tmp_${Date.now()}`).current
  const { uploading, preview, uploadedUrl, error: uploadError, handleFile } = useImageUpload(weddingId, tempId)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Effective image URL: newly uploaded > existing
  const effectiveImageUrl = uploadedUrl || existingImageUrl
  const displayPreview = preview || existingImageUrl

  const isValid = titulo.trim().length > 0

  const handleSave = () => {
    onSave({ hora, titulo, descripcion, responsable, categoria, imageUrl: effectiveImageUrl || undefined })
  }

  return (
    <div className="border-2 border-primary/20 rounded-xl bg-amber-50/50 p-5 space-y-4">
      <p className="text-xs font-bold uppercase tracking-widest text-primary">
        {initial?.titulo ? 'Editar paso' : 'Nuevo paso'}
      </p>

      <div className="grid grid-cols-2 gap-3">
        {/* Hora */}
        <div>
          <label className="text-xs text-on-surface-variant font-medium block mb-1">Hora</label>
          <input type="time" value={hora} onChange={e => setHora(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-outline-variant/30 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono" />
        </div>
        {/* Categoría */}
        <div>
          <label className="text-xs text-on-surface-variant font-medium block mb-1">Categoría</label>
          <select value={categoria} onChange={e => setCategoria(e.target.value as TimelineCategoria)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-outline-variant/30 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30">
            {Object.entries(CATEGORIA_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Título */}
      <div>
        <label className="text-xs text-on-surface-variant font-medium block mb-1">Título *</label>
        <input type="text" value={titulo} onChange={e => setTitulo(e.target.value)}
          placeholder="p.ej. Entrada de los novios"
          className="w-full px-3 py-2 text-sm rounded-lg border border-outline-variant/30 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30" />
      </div>

      {/* Descripción */}
      <div>
        <label className="text-xs text-on-surface-variant font-medium block mb-1">Descripción / Notas</label>
        <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)}
          placeholder="Detalles, instrucciones, observaciones..."
          rows={2}
          className="w-full px-3 py-2 text-sm rounded-lg border border-outline-variant/30 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
      </div>

      {/* Imagen */}
      <div>
        <label className="text-xs text-on-surface-variant font-medium block mb-2">
          Imagen del paso
          <span className="text-on-surface-variant/50 font-normal ml-1">(plano, foto referencia, setup…)</span>
        </label>

        {displayPreview ? (
          <div className="relative rounded-lg overflow-hidden border border-outline-variant/20 mb-2">
            <img src={displayPreview} alt="preview" className="w-full h-40 object-cover" />
            {uploading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="text-white text-sm font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                  Subiendo...
                </div>
              </div>
            )}
            {!uploading && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-2 right-2 bg-white/90 text-on-surface text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-white transition-colors flex items-center gap-1 shadow">
                <span className="material-symbols-outlined text-sm">swap_horiz</span>
                Cambiar
              </button>
            )}
            {uploadedUrl && (
              <div className="absolute top-2 left-2 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                <span className="material-symbols-outlined" style={{fontSize:'10px'}}>check</span>
                Guardada
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-24 border-2 border-dashed border-outline-variant/30 rounded-lg flex flex-col items-center justify-center gap-2 hover:border-primary/40 hover:bg-amber-50 transition-all group">
            <span className="material-symbols-outlined text-2xl text-on-surface-variant/40 group-hover:text-primary transition-colors">add_photo_alternate</span>
            <span className="text-xs text-on-surface-variant group-hover:text-primary transition-colors font-medium">
              Añadir imagen
            </span>
            <span className="text-[10px] text-on-surface-variant/50">JPG, PNG, WEBP · máx. 5 MB</span>
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
          }}
        />
        {uploadError && <p className="text-xs text-red-500 mt-1">{uploadError}</p>}
      </div>

      {/* Responsable */}
      <div>
        <label className="text-xs text-on-surface-variant font-medium block mb-1">Responsable</label>
        <div className="flex flex-wrap gap-2">
          {RESPONSABLES.map(r => (
            <button key={r} onClick={() => setResponsable(r)}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                responsable === r
                  ? 'bg-primary text-on-primary border-primary'
                  : 'border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-low'
              }`}>
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <button
          onClick={handleSave}
          disabled={!isValid || uploading}
          className="px-5 py-2 bg-primary text-on-primary text-xs font-bold uppercase tracking-widest rounded-lg hover:opacity-90 disabled:opacity-40 transition-opacity flex items-center gap-2">
          {uploading && <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>}
          {uploading ? 'Subiendo imagen...' : 'Guardar paso'}
        </button>
        <button onClick={onCancel}
          className="px-4 py-2 border border-outline-variant/30 text-on-surface-variant text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-surface-container-low transition-colors">
          Cancelar
        </button>
      </div>
    </div>
  )
}

// ── Main Component ──────────────────────────────
export const RoadmapDetail = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [wedding, setWedding] = useState<Wedding | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Timeline state
  const [timeline, setTimeline] = useState<TimelineStep[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingStep, setEditingStep] = useState<TimelineStep | null>(null)
  const [savingTimeline, setSavingTimeline] = useState(false)

  useEffect(() => {
    const loadWedding = async () => {
      if (!id) { setError('No ID'); setLoading(false); return }
      try {
        const snap = await getDoc(doc(db, 'weddings', id))
        if (snap.exists()) {
          const data = { id: snap.id, ...snap.data() } as Wedding
          setWedding(data)
          // Load saved timeline or generate suggestions
          if (data.timeline && data.timeline.length > 0) {
            setTimeline(data.timeline)
          } else {
            setTimeline(generateSuggestedSteps(data))
          }
        } else {
          setError('Boda no encontrada')
        }
      } catch (err) {
        console.error(err)
        setError('Error al cargar la boda')
      } finally {
        setLoading(false)
      }
    }
    loadWedding()
  }, [id])

  // Persist timeline to Firestore
  const saveTimeline = async (newTimeline: TimelineStep[]) => {
    if (!id) return
    setSavingTimeline(true)
    try {
      await updateDoc(doc(db, 'weddings', id), { timeline: newTimeline })
    } catch (e) {
      console.error('Error saving timeline', e)
    } finally {
      setSavingTimeline(false)
    }
  }

  const updateTimeline = (newTimeline: TimelineStep[]) => {
    const sorted = [...newTimeline].sort((a, b) => {
      if (!a.hora && !b.hora) return 0
      if (!a.hora) return 1
      if (!b.hora) return -1
      return a.hora.localeCompare(b.hora)
    })
    setTimeline(sorted)
    saveTimeline(sorted)
  }

  const handleAddStep = (step: Omit<TimelineStep, 'id' | 'completado'>) => {
    const newStep: TimelineStep = {
      ...step,
      id: `step_${Date.now()}`,
      completado: false,
    }
    updateTimeline([...timeline, newStep])
    setShowAddForm(false)
  }

  const handleEditStep = (step: Omit<TimelineStep, 'id' | 'completado'>) => {
    if (!editingStep) return
    updateTimeline(timeline.map(s => s.id === editingStep.id ? { ...s, ...step } : s))
    setEditingStep(null)
  }

  const handleToggle = (stepId: string) => {
    updateTimeline(timeline.map(s => s.id === stepId ? { ...s, completado: !s.completado } : s))
  }

  const handleDelete = (stepId: string) => {
    updateTimeline(timeline.filter(s => s.id !== stepId))
  }

  // ── Loading / error states ──
  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <p className="text-on-surface-variant">Cargando hoja de ruta...</p>
    </div>
  )
  if (error || !wedding) return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <p className="text-red-500 mb-4">{error}</p>
        <button onClick={() => navigate('/weddings')} className="text-primary font-bold text-xs uppercase tracking-widest hover:underline">← Volver</button>
      </div>
    </div>
  )

  // ── Derived data ──
  const weddingDate = new Date(wedding.date).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })
  const totalGuests = (wedding.adults || 0) + (wedding.children || 0)
  const menu = wedding.menu || {} as Menu
  const financial = wedding.financial || {} as Financial
  const protocols = wedding.protocols || {} as Protocols
  const notes = (wedding.notes || []).filter(Boolean)

  const fmt = (n?: number | null) =>
    n ? `${n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €` : '—'

  const protoRows = Object.entries(PROTOCOL_LABELS)
    .map(([key, label]) => ({ label, value: protocols[key as keyof Protocols] as string }))
    .filter(r => r.value && r.value.trim())

  const specialRows = Object.entries(SPECIAL_LABELS)
    .map(([key, label]) => ({ label, count: (menu.special_menus as Record<string, number>)?.[key] || 0 }))
    .filter(r => r.count > 0)

  const completedSteps = timeline.filter(s => s.completado).length
  const timelineProgress = timeline.length > 0 ? Math.round((completedSteps / timeline.length) * 100) : 0

  return (
    <section className="p-6 md:p-10 max-w-7xl mx-auto font-body">

      {/* ── Header ── */}
      <div className="mb-8">
        <button onClick={() => navigate('/weddings')} className="text-primary font-bold text-xs uppercase tracking-widest hover:underline flex items-center gap-1 mb-4">
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Volver
        </button>
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="inline-block px-3 py-1 bg-amber-100 text-amber-900 text-xs font-bold uppercase tracking-widest rounded mb-3">
              {wedding.status || 'Pendiente'}
            </div>
            <h2 className="font-headline text-4xl font-bold text-on-surface mb-3">{wedding.couples_name}</h2>
            <div className="flex flex-wrap gap-4 text-sm text-on-surface-variant">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-base">calendar_today</span>
                {weddingDate}
              </span>
              {wedding.venue && <span className="flex items-center gap-1"><span className="material-symbols-outlined text-base">location_on</span>{wedding.venue}</span>}
              {totalGuests > 0 && <span className="flex items-center gap-1"><span className="material-symbols-outlined text-base">group</span>{totalGuests} invitados ({wedding.adults} adultos{wedding.children ? `, ${wedding.children} niños` : ''})</span>}
              {wedding.start_time && <span className="flex items-center gap-1"><span className="material-symbols-outlined text-base">schedule</span>{wedding.start_time}{wedding.end_time ? ` → ${wedding.end_time}` : ''}</span>}
              {wedding.coordinator && <span className="flex items-center gap-1"><span className="material-symbols-outlined text-base">person</span>{wedding.coordinator}</span>}
            </div>
          </div>
          <div className="flex gap-3 shrink-0">
            <button className="px-5 py-2 border border-outline-variant text-on-surface text-xs font-bold uppercase tracking-widest rounded hover:bg-surface-container-low transition-colors">
              Exportar PDF
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* ── LEFT COLUMN ── */}
        <div className="lg:col-span-2 space-y-12">

          {/* ═══ I. MENÚ ═══ */}
          <div>
            <h3 className="font-headline text-2xl font-bold text-on-surface mb-6 italic">I. Menú de Degustación</h3>

            {menu.complementos && menu.complementos.length > 0 && (
              <div className="mb-6">
                <p className="text-xs font-bold uppercase tracking-widest text-primary mb-3">Complementos</p>
                <div className="space-y-1">
                  {menu.complementos.filter(Boolean).map((item, i) => (
                    <p key={i} className="text-sm text-on-surface italic pl-2 border-l-2 border-primary/30">{item}</p>
                  ))}
                </div>
              </div>
            )}

            {menu.aperitivos && menu.aperitivos.length > 0 && (
              <div className="mb-6">
                <p className="text-xs font-bold uppercase tracking-widest text-primary mb-3">Aperitivos & Bienvenida</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                  {menu.aperitivos.filter(Boolean).map((item, i) => (
                    <p key={i} className="text-sm text-on-surface italic">{item.trim()}</p>
                  ))}
                </div>
              </div>
            )}

            {menu.marisco && menu.marisco.length > 0 && (
              <div className="mb-6">
                <p className="text-xs font-bold uppercase tracking-widest text-primary mb-3">Marisco</p>
                <div className="space-y-1">
                  {menu.marisco.filter(Boolean).map((item, i) => (
                    <p key={i} className="text-sm text-on-surface italic">{item}</p>
                  ))}
                </div>
              </div>
            )}

            {menu.tapa && menu.tapa.length > 0 && (
              <div className="mb-6">
                <p className="text-xs font-bold uppercase tracking-widest text-primary mb-3">Tapas</p>
                <div className="space-y-1">
                  {menu.tapa.filter(Boolean).map((item, i) => (
                    <p key={i} className="text-sm text-on-surface italic">{item}</p>
                  ))}
                </div>
              </div>
            )}

            {menu.entrante && (
              <div className="mb-6">
                <p className="text-xs font-bold uppercase tracking-widest text-primary mb-3">Entrante</p>
                <p className="text-sm text-on-surface italic bg-surface-container-low p-3 rounded">{menu.entrante}</p>
              </div>
            )}

            {menu.pescado && (
              <div className="mb-6">
                <p className="text-xs font-bold uppercase tracking-widest text-primary mb-3">Pescado</p>
                <p className="text-sm text-on-surface italic bg-surface-container-low p-3 rounded">{menu.pescado}</p>
              </div>
            )}

            {menu.carne && (
              <div className="mb-6">
                <p className="text-xs font-bold uppercase tracking-widest text-primary mb-3">Carne</p>
                <p className="text-sm text-on-surface italic bg-surface-container-low p-3 rounded">{menu.carne}</p>
              </div>
            )}

            {menu.postre && (
              <div className="mb-6">
                <p className="text-xs font-bold uppercase tracking-widest text-primary mb-3">Postre & Tarta</p>
                <p className="text-sm text-on-surface italic bg-surface-container-low p-3 rounded">{menu.postre}</p>
              </div>
            )}

            {menu.bodega && Object.values(menu.bodega).some(Boolean) && (
              <div className="mb-6">
                <p className="text-xs font-bold uppercase tracking-widest text-primary mb-3">Bodega</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {menu.bodega.blanco && <div><span className="text-on-surface-variant">Blanco: </span><span className="text-on-surface">{menu.bodega.blanco}</span></div>}
                  {menu.bodega.tinto && <div><span className="text-on-surface-variant">Tinto: </span><span className="text-on-surface">{menu.bodega.tinto}</span></div>}
                  {menu.bodega.cava && <div><span className="text-on-surface-variant">Cava: </span><span className="text-on-surface">{menu.bodega.cava}</span></div>}
                  {menu.bodega.otros && <div className="col-span-2"><span className="text-on-surface-variant">Otras: </span><span className="text-on-surface">{menu.bodega.otros}</span></div>}
                </div>
              </div>
            )}
          </div>

          {/* ═══ II. MENÚ INFANTIL ═══ */}
          {menu.infantil && (menu.infantil.menu?.length || menu.infantil.postre) && (
            <div>
              <h3 className="font-headline text-2xl font-bold text-on-surface mb-6 italic">II. Menú Infantil</h3>
              <div className="bg-amber-50 border border-amber-100 rounded-lg p-5">
                {menu.infantil.menu && menu.infantil.menu.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-bold uppercase tracking-widest text-amber-800 mb-2">Platos</p>
                    {menu.infantil.menu.filter(Boolean).map((item, i) => (
                      <p key={i} className="text-sm text-on-surface italic">{item}</p>
                    ))}
                  </div>
                )}
                {menu.infantil.postre && (
                  <div className="mb-3">
                    <p className="text-xs font-bold uppercase tracking-widest text-amber-800 mb-1">Postre</p>
                    <p className="text-sm text-on-surface italic">{menu.infantil.postre}</p>
                  </div>
                )}
                {menu.infantil.notas && (
                  <p className="text-xs text-amber-700 mt-2 italic">{menu.infantil.notas}</p>
                )}
              </div>
            </div>
          )}

          {/* ═══ III. RECENA ═══ */}
          {menu.recena && menu.recena.length > 0 && (
            <div>
              <h3 className="font-headline text-2xl font-bold text-on-surface mb-6 italic">III. Recena</h3>
              <div className="space-y-1">
                {menu.recena.filter(Boolean).map((item, i) => (
                  <p key={i} className="text-sm text-on-surface italic pl-2 border-l-2 border-primary/30">{item}</p>
                ))}
              </div>
            </div>
          )}

          {/* ═══ IV. MENÚS ESPECIALES ═══ */}
          {specialRows.length > 0 && (
            <div>
              <h3 className="font-headline text-2xl font-bold text-on-surface mb-6 italic">IV. Menús Especiales</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {specialRows.map(({ label, count }) => (
                  <div key={label} className="bg-surface-container-low p-3 rounded-lg text-center">
                    <p className="text-2xl font-bold font-headline text-on-surface">{count}</p>
                    <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mt-1">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══ V. PROTOCOLOS ═══ */}
          {protoRows.length > 0 && (
            <div>
              <h3 className="font-headline text-2xl font-bold text-on-surface mb-6 italic">V. Protocolos</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {protoRows.map(({ label, value }) => (
                  <div key={label} className="flex gap-3 text-sm py-2 border-b border-outline-variant/10">
                    <span className="font-bold text-on-surface uppercase text-xs tracking-wider min-w-[140px] shrink-0">{label}</span>
                    <span className="text-on-surface-variant italic">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════
              VI. PROTOCOLO DEL DÍA (TIMELINE)
          ═══════════════════════════════════════ */}
          <div>
            <div className="flex items-start justify-between mb-6 gap-4">
              <div>
                <h3 className="font-headline text-2xl font-bold text-on-surface italic">VI. Protocolo del Día</h3>
                <p className="text-xs text-on-surface-variant mt-1">
                  Cronograma hora a hora · Wedding planner
                </p>
              </div>
              {/* Progress */}
              {timeline.length > 0 && (
                <div className="shrink-0 text-right">
                  <p className="text-xs text-on-surface-variant mb-1">{completedSteps}/{timeline.length} completados</p>
                  <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${timelineProgress}%` }} />
                  </div>
                </div>
              )}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-2 mb-6">
              {Object.entries(CATEGORIA_CONFIG).map(([k, v]) => (
                <span key={k} className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${v.color}`}>
                  {v.label}
                </span>
              ))}
            </div>

            {/* Steps */}
            {timeline.length === 0 ? (
              <div className="text-center py-10 bg-surface-container-lowest rounded-xl border-2 border-dashed border-outline-variant/20">
                <span className="material-symbols-outlined text-4xl text-on-surface-variant/40 block mb-3">schedule</span>
                <p className="text-sm text-on-surface-variant mb-1">Sin pasos definidos</p>
                <p className="text-xs text-on-surface-variant/60">Añade el primer paso del protocolo del día</p>
              </div>
            ) : (
              <div>
                {timeline.map((step, idx) => (
                  <div key={step.id}>
                    {editingStep?.id === step.id ? (
                      <div className="ml-14 mb-5">
                        <StepForm
                          initial={editingStep}
                          weddingId={id || ''}
                          onSave={handleEditStep}
                          onCancel={() => setEditingStep(null)}
                        />
                      </div>
                    ) : (
                      <StepCard
                        step={step}
                        index={idx}
                        total={timeline.length}
                        onToggle={() => handleToggle(step.id)}
                        onEdit={() => { setEditingStep(step); setShowAddForm(false) }}
                        onDelete={() => handleDelete(step.id)}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Add form */}
            {showAddForm ? (
              <div className="mt-4">
                <StepForm weddingId={id || ''} onSave={handleAddStep} onCancel={() => setShowAddForm(false)} />
              </div>
            ) : (
              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => { setShowAddForm(true); setEditingStep(null) }}
                  className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-primary/30 rounded-xl text-primary text-xs font-bold uppercase tracking-widest hover:border-primary/60 hover:bg-amber-50 transition-all">
                  <span className="material-symbols-outlined text-base">add</span>
                  Añadir paso
                </button>
                {timeline.length > 0 && (
                  <button
                    onClick={() => updateTimeline(timeline.map(s => ({ ...s, completado: false })))}
                    className="flex items-center gap-2 px-4 py-2 border border-outline-variant/20 rounded-xl text-on-surface-variant text-xs font-bold uppercase tracking-widest hover:bg-surface-container-low transition-colors">
                    <span className="material-symbols-outlined text-base">restart_alt</span>
                    Reiniciar
                  </button>
                )}
                {savingTimeline && (
                  <span className="text-xs text-on-surface-variant self-center animate-pulse">Guardando...</span>
                )}
              </div>
            )}
          </div>

          {/* ═══ VII. NOTAS ═══ */}
          <div>
            <h3 className="font-headline text-2xl font-bold text-on-surface mb-6 italic">VII. Notas de Coordinación</h3>
            {notes.length > 0 ? (
              <div className="space-y-3 mb-4">
                {notes.map((note, i) => (
                  <div key={i} className="p-4 bg-amber-50 rounded-lg text-sm text-on-surface italic border-l-2 border-primary">
                    {note}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-on-surface-variant mb-4">Sin notas registradas.</p>
            )}
            <textarea
              placeholder="Añadir una nota interna para el equipo..."
              className="w-full p-4 rounded-lg bg-surface-container-low border border-outline-variant/20 text-on-surface placeholder-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              rows={3}
            />
            <button className="mt-2 px-6 py-2 bg-primary text-on-primary text-xs font-bold uppercase tracking-widest rounded hover:opacity-90 transition-opacity">
              Publicar Nota
            </button>
          </div>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="space-y-6">

          {/* Estado de Cuentas */}
          <div className="bg-stone-800 p-6 rounded-xl text-white">
            <h4 className="font-headline text-lg font-bold mb-5">Estado de Cuentas</h4>
            <div className="bg-white/10 rounded-lg p-3 mb-5 text-sm space-y-1">
              {financial.adults ? <div className="flex justify-between"><span className="text-white/70">Adultos</span><span className="font-bold">{financial.adults}</span></div> : null}
              {(financial.children && financial.children < 20) ? <div className="flex justify-between"><span className="text-white/70">Niños</span><span className="font-bold">{financial.children}</span></div> : null}
            </div>
            <div className="space-y-2 text-sm mb-5">
              {financial.base_total ? <div className="flex justify-between"><span className="text-white/70 uppercase text-xs tracking-wide">Base Menú</span><span className="font-bold">{fmt(financial.base_total)}</span></div> : null}
              {financial.tax_10pct && financial.tax_10pct > 100 ? <div className="flex justify-between"><span className="text-white/70 uppercase text-xs tracking-wide">IVA 10%</span><span className="font-bold">{fmt(financial.tax_10pct)}</span></div> : null}
              {financial.total_invoice ? <div className="flex justify-between border-t border-white/20 pt-2 mt-2"><span className="text-white/70 uppercase text-xs tracking-wide">Total Factura</span><span className="font-bold text-lg">{fmt(financial.total_invoice)}</span></div> : null}
            </div>
            {financial.payments && financial.payments.length > 0 && (
              <div className="border-t border-white/20 pt-4">
                <p className="text-white/60 text-xs uppercase tracking-wider mb-3">Pagos</p>
                <div className="space-y-2">
                  {financial.payments.map((p, i) => (
                    <div key={i} className="flex justify-between items-center text-sm">
                      <div>
                        <span className="font-medium">{p.label}</span>
                        {p.date && <span className="text-white/50 text-xs ml-2">{new Date(p.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{fmt(p.amount)}</span>
                        {p.status === 'paid' && <span className="text-green-400 text-xs">✓</span>}
                      </div>
                    </div>
                  ))}
                </div>
                {financial.total_paid ? (
                  <div className="flex justify-between items-center border-t border-white/20 pt-3 mt-3">
                    <span className="text-white/70 text-xs uppercase tracking-wide">Total Pagado</span>
                    <span className="font-bold text-green-400">{fmt(financial.total_paid)}</span>
                  </div>
                ) : null}
              </div>
            )}
            {!financial.base_total && !financial.total_paid && (
              <p className="text-white/40 text-xs text-center">Sin datos financieros</p>
            )}
          </div>

          {/* Timeline mini-resumen */}
          {timeline.length > 0 && (
            <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/10">
              <h4 className="font-headline text-base font-bold text-on-surface mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-primary">schedule</span>
                Hitos del día
              </h4>
              <div className="space-y-2">
                {timeline.filter(s => s.hora).slice(0, 6).map(step => (
                    <div key={step.id} className="flex items-center gap-3 text-sm">
                      <span className="font-mono text-xs font-bold text-on-surface-variant w-10 shrink-0">{step.hora}</span>
                      <span className={`w-2 h-2 rounded-full shrink-0 ${DOT_COLORS[step.categoria]}`} />
                      <span className={`text-xs truncate ${step.completado ? 'line-through text-on-surface-variant' : 'text-on-surface'}`}>{step.titulo}</span>
                    </div>
                  )
                })}
                {timeline.filter(s => s.hora).length > 6 && (
                  <p className="text-xs text-on-surface-variant text-center pt-1">
                    +{timeline.filter(s => s.hora).length - 6} pasos más
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Detalles evento */}
          <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/10 space-y-3 text-sm">
            <h4 className="font-headline text-base font-bold text-on-surface">Detalles del Evento</h4>
            {wedding.service_type && <div className="flex gap-2"><span className="text-on-surface-variant min-w-[100px]">Tipo:</span><span className="text-on-surface font-medium">{wedding.service_type}</span></div>}
            {wedding.ceremony_type && <div className="flex gap-2"><span className="text-on-surface-variant min-w-[100px]">Ceremonia:</span><span className="text-on-surface font-medium capitalize">{wedding.ceremony_type}</span></div>}
            {wedding.clients && wedding.clients !== ':' && <div className="flex gap-2"><span className="text-on-surface-variant min-w-[100px]">Clientes:</span><span className="text-on-surface">{wedding.clients}</span></div>}
            {wedding.coordinator && <div className="flex gap-2"><span className="text-on-surface-variant min-w-[100px]">Coord.:</span><span className="text-on-surface font-medium">{wedding.coordinator}</span></div>}
          </div>
        </div>
      </div>
    </section>
  )
}
