import { useState } from 'react'
import type { WeddingHDRStatus, WeddingEvaluation } from '../../types'

interface StateTransitionProps {
  currentStatus: WeddingHDRStatus
  onStatusChange: (
    newStatus: WeddingHDRStatus,
    evaluation?: WeddingEvaluation
  ) => Promise<void>
  loading?: boolean
  userName: string
}

const STATUS_CONFIG: Record<
  WeddingHDRStatus,
  { label: string; description: string; color: string }
> = {
  inicial: {
    label: 'Inicial',
    description: 'Fase de planificación inicial',
    color: 'bg-amber-100 text-amber-900'
  },
  prueba_menu: {
    label: 'Prueba y Menú',
    description: 'Después de pruebas y validación',
    color: 'bg-blue-100 text-blue-900'
  },
  final: {
    label: 'Final',
    description: 'Versión final aprobada',
    color: 'bg-green-100 text-green-900'
  }
}

const STATUS_SEQUENCE: WeddingHDRStatus[] = ['inicial', 'prueba_menu', 'final']

export const StateTransition = ({
  currentStatus,
  onStatusChange,
  loading,
  userName
}: StateTransitionProps) => {
  const [selectedStatus, setSelectedStatus] = useState<WeddingHDRStatus | null>(
    null
  )
  const [evaluationNotes, setEvaluationNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const currentIndex = STATUS_SEQUENCE.indexOf(currentStatus)
  const availableStatuses = STATUS_SEQUENCE.slice(currentIndex + 1)

  const handleStatusSelect = (status: WeddingHDRStatus) => {
    setSelectedStatus(status)
    setEvaluationNotes('')
  }

  const handleConfirmChange = async () => {
    if (!selectedStatus) return

    setSaving(true)
    try {
      const evaluation: WeddingEvaluation = {
        evaluatedBy: userName,
        evaluatedByName: userName,
        date: new Date(),
        notes: evaluationNotes || 'Sin notas de evaluación'
      }

      await onStatusChange(selectedStatus, evaluation)
      setSelectedStatus(null)
      setEvaluationNotes('')
    } catch (error) {
      console.error('Error changing status:', error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      {/* Current Status */}
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">
          Estado Actual
        </p>
        <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg ${STATUS_CONFIG[currentStatus].color}`}>
          <span className="material-symbols-outlined text-base">
            {currentStatus === 'inicial' && 'circle'}
            {currentStatus === 'prueba_menu' && 'schedule'}
            {currentStatus === 'final' && 'check_circle'}
          </span>
          <span className="font-bold text-sm">
            {STATUS_CONFIG[currentStatus].label}
          </span>
        </div>
        <p className="text-xs text-on-surface-variant mt-2">
          {STATUS_CONFIG[currentStatus].description}
        </p>
      </div>

      {/* Available Next States */}
      {availableStatuses.length > 0 ? (
        <div className="space-y-4">
          <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            Siguientes Estados Disponibles
          </p>

          <div className="grid grid-cols-1 gap-3">
            {availableStatuses.map(status => (
              <button
                key={status}
                onClick={() => handleStatusSelect(status)}
                className={`p-3 border rounded-lg text-left transition-all ${
                  selectedStatus === status
                    ? 'border-primary bg-primary-container'
                    : 'border-outline-variant hover:border-primary hover:bg-surface-container-low'
                }`}
                disabled={saving}
              >
                <div className="flex items-center gap-3">
                  <div className={`flex-shrink-0 w-3 h-3 rounded-full border-2 ${
                    selectedStatus === status
                      ? 'border-primary bg-primary'
                      : 'border-outline-variant'
                  }`} />
                  <div>
                    <p className="font-semibold text-sm text-on-surface">
                      {STATUS_CONFIG[status].label}
                    </p>
                    <p className="text-xs text-on-surface-variant">
                      {STATUS_CONFIG[status].description}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Evaluation Form (if status selected) */}
          {selectedStatus && (
            <div className="mt-4 p-4 bg-surface-container-low rounded-lg border border-outline-variant">
              <p className="text-sm font-semibold text-on-surface mb-3">
                Evaluación para {STATUS_CONFIG[selectedStatus].label}
              </p>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant block mb-2">
                    Evaluador
                  </label>
                  <input
                    type="text"
                    value={userName}
                    disabled
                    className="w-full px-3 py-2 bg-white border border-outline-variant rounded text-sm text-on-surface disabled:bg-gray-100"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant block mb-2">
                    Notas de Evaluación
                  </label>
                  <textarea
                    value={evaluationNotes}
                    onChange={e => setEvaluationNotes(e.target.value)}
                    placeholder="Escribe aquí tus observaciones y notas..."
                    className="w-full px-3 py-2 border border-outline-variant rounded text-sm text-on-surface placeholder-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px]"
                    disabled={saving}
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleConfirmChange}
                    disabled={saving}
                    className="flex-1 px-4 py-2 bg-primary text-on-primary text-xs font-bold uppercase tracking-wider rounded hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {saving ? 'Guardando...' : 'Confirmar Cambio'}
                  </button>
                  <button
                    onClick={() => {
                      setSelectedStatus(null)
                      setEvaluationNotes('')
                    }}
                    disabled={saving}
                    className="flex-1 px-4 py-2 border border-outline-variant text-on-surface text-xs font-bold uppercase tracking-wider rounded hover:bg-surface-container-low transition-colors disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 bg-surface-container-low rounded-lg border border-outline-variant text-center">
          <p className="text-sm text-on-surface-variant">
            Esta HDR ya está en estado final
          </p>
        </div>
      )}
    </div>
  )
}
