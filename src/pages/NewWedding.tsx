import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../services/firebase'
import { collection, addDoc } from 'firebase/firestore'

// ── Types ────────────────────────────────────────
type Step = 'basics' | 'preview'

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

// ── Constants ────────────────────────────────────
const COORDINATORS = ['Andrea', 'Marta', 'Rosa', 'Sara', 'Jimena', 'Bea']
const SERVICE_TYPES = ['Banquete', 'Cóctel', 'Banquete m2', 'Cóctel con banquete']
const CEREMONY_TYPES = ['Civil', 'Religiosa', 'Acto', 'Sin ceremonia']

const DEFAULT_FORM: WeddingForm = {
  couples_name: '', date: '', coordinator: '', venue: '',
  service_type: 'Banquete', ceremony_type: 'Civil',
  start_time: '', end_time: '', adults: '', children: '0',
  professionals: '0', clients: '',
}

// ── Step indicator ───────────────────────────────
const STEPS: { id: Step; label: string }[] = [
  { id: 'basics',  label: 'Datos' },
  { id: 'preview', label: 'Confirmar' },
]

function StepBar({ current }: { current: Step }) {
  const idx = STEPS.findIndex(s => s.id === current)
  return (
    <div className="flex items-center gap-0 mb-10">
      {STEPS.map((s, i) => (
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
          {i < STEPS.length - 1 && (
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
  const [step, setStep] = useState<Step>('basics')
  const [form, setForm] = useState<WeddingForm>(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const setField = (k: keyof WeddingForm, v: string) =>
    setForm(f => ({ ...f, [k]: v }))

  const canProceed = () => {
    if (step === 'basics') return Boolean(form.couples_name.trim() && form.date && form.coordinator)
    return true
  }

  const handleCreate = async () => {
    setSaving(true)
    setError(null)
    try {
      const data = {
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
        menu: {},
        protocols: {},
      }
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
        <p className="text-on-surface-variant">Crea una HDR desde cero con todos los campos en blanco.</p>
      </div>

      {/* Step bar */}
      <StepBar current={step} />

      {/* ═══════════════ STEP 1: DATOS BÁSICOS ═══════════════ */}
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

      {/* ═══════════════ STEP 2: PREVIEW ═══════════════ */}
      {step === 'preview' && (
        <div>
          <h3 className="font-headline text-xl font-bold text-on-surface mb-6">Confirmar nueva boda</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
            {/* Event summary */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-3">
              <p className="text-xs font-bold uppercase tracking-widest text-primary mb-3">Datos del Evento</p>
              {[
                { label: 'Pareja',      value: form.couples_name },
                { label: 'Fecha',       value: weddingDate },
                { label: 'Coordinadora',value: form.coordinator },
                { label: 'Venue',       value: form.venue || '—' },
                { label: 'Servicio',    value: form.service_type },
                { label: 'Ceremonia',   value: form.ceremony_type },
                { label: 'Horario',     value: form.start_time ? `${form.start_time}${form.end_time ? ` → ${form.end_time}` : ''}` : '—' },
                { label: 'Invitados',   value: `${form.adults || 0} adultos${parseInt(form.children) > 0 ? ` + ${form.children} niños` : ''}${parseInt(form.professionals) > 0 ? ` + ${form.professionals} prof.` : ''}` },
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
              <div className="space-y-2">
                {[
                  { ok: false, text: 'Hoja de ruta completamente en blanco' },
                  { ok: false, text: 'Menú vacío (rellenar en la HDR)' },
                  { ok: true,  text: 'Protocolo del día editable' },
                  { ok: true,  text: 'Estado de cuentas vacío' },
                  { ok: true,  text: 'Integración FIBA Menús disponible' },
                ].map(({ ok, text }) => (
                  <div key={text} className="flex items-center gap-2 text-sm text-on-surface-variant">
                    <span className={`material-symbols-outlined text-base ${ok ? 'text-green-500' : 'text-gray-300'}`}>
                      {ok ? 'check' : 'close'}
                    </span>
                    {text}
                  </div>
                ))}
              </div>
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
          onClick={step === 'basics' ? () => navigate('/weddings') : () => setStep('basics')}
          className="flex items-center gap-2 px-5 py-2.5 border border-outline-variant/30 rounded-xl text-sm font-bold text-on-surface hover:bg-surface-container-low transition-colors">
          <span className="material-symbols-outlined text-base">arrow_back</span>
          {step === 'basics' ? 'Cancelar' : 'Anterior'}
        </button>

        {step === 'basics' ? (
          <button
            onClick={() => setStep('preview')}
            disabled={!canProceed()}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-on-primary rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-40 transition-opacity">
            Revisar
            <span className="material-symbols-outlined text-base">arrow_forward</span>
          </button>
        ) : (
          <button
            onClick={handleCreate}
            disabled={saving}
            className="flex items-center gap-2 px-8 py-2.5 bg-primary text-on-primary rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-40 transition-opacity">
            {saving ? (
              <>
                <span className="material-symbols-outlined text-base animate-spin">refresh</span>
                Creando...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-base">add_circle</span>
                Crear Hoja de Ruta
              </>
            )}
          </button>
        )}
      </div>
    </section>
  )
}
