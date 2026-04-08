import { useState } from 'react'
import type { WeddingVersion } from '../../types'

interface VersionHistoryPanelProps {
  versions: WeddingVersion[]
  onRestore?: (versionId: string) => void
  loading?: boolean
}

export const VersionHistoryPanel = ({
  versions,
  onRestore,
  loading
}: VersionHistoryPanelProps) => {
  const [expandedVersionId, setExpandedVersionId] = useState<string | null>(null)
  const [restoreConfirmId, setRestoreConfirmId] = useState<string | null>(null)

  const sortedVersions = [...versions].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )

  const handleRestoreClick = (versionId: string) => {
    setRestoreConfirmId(versionId)
  }

  const handleConfirmRestore = (versionId: string) => {
    if (onRestore) {
      onRestore(versionId)
    }
    setRestoreConfirmId(null)
  }

  const getChangedFieldsLabel = (snapshot: WeddingVersion['snapshot']) => {
    const fields: string[] = []
    if (snapshot.menu) fields.push('Menú')
    if (snapshot.protocols) fields.push('Protocolos')
    if (snapshot.financial) fields.push('Financiero')
    if (snapshot.notes) fields.push('Notas')
    if (snapshot.timeline) fields.push('Timeline')
    return fields.length > 0 ? fields.join(', ') : 'Sin cambios'
  }

  return (
    <div className="flex flex-col h-full bg-surface">
      <div className="p-4 border-b border-outline-variant">
        <h3 className="font-headline text-lg font-bold text-on-surface mb-1">
          Histórico de Cambios
        </h3>
        <p className="text-xs text-on-surface-variant">
          {sortedVersions.length} versiones guardadas
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-on-surface-variant text-sm">
            Cargando histórico...
          </div>
        ) : sortedVersions.length === 0 ? (
          <div className="p-4 text-center text-on-surface-variant text-sm">
            Sin histórico aún
          </div>
        ) : (
          <div className="divide-y divide-outline-variant">
            {sortedVersions.map((version) => (
              <div
                key={version.id}
                className="border-l-4 border-primary hover:bg-surface-container-low transition-colors"
              >
                <button
                  onClick={() =>
                    setExpandedVersionId(
                      expandedVersionId === version.id ? null : version.id
                    )
                  }
                  className="w-full p-3 text-left hover:bg-surface-container-low transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-primary uppercase tracking-wider">
                        {new Date(version.timestamp).toLocaleString('es-ES')}
                      </p>
                      <p className="text-sm font-medium text-on-surface mt-1">
                        {version.reason || 'Cambios realizados'}
                      </p>
                      <p className="text-xs text-on-surface-variant mt-1">
                        Por: {version.changedByName}
                      </p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="text-[10px] bg-primary-container text-on-primary-container px-2 py-1 rounded">
                          {getChangedFieldsLabel(version.snapshot)}
                        </span>
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-base text-on-surface-variant flex-shrink-0">
                      {expandedVersionId === version.id
                        ? 'expand_less'
                        : 'expand_more'}
                    </span>
                  </div>
                </button>

                {/* Expanded details */}
                {expandedVersionId === version.id && (
                  <div className="px-3 py-3 bg-surface-container-low border-t border-outline-variant space-y-2">
                    {/* Changed fields details */}
                    {version.snapshot.menu && (
                      <div className="text-xs">
                        <span className="font-semibold text-on-surface">
                          📋 Menú
                        </span>
                        <p className="text-on-surface-variant mt-1">
                          Actualizaciones en secciones del menú
                        </p>
                      </div>
                    )}
                    {version.snapshot.protocols && (
                      <div className="text-xs">
                        <span className="font-semibold text-on-surface">
                          ⏰ Protocolos
                        </span>
                        <p className="text-on-surface-variant mt-1">
                          Cambios en protocolos y cronograma
                        </p>
                      </div>
                    )}
                    {version.snapshot.financial && (
                      <div className="text-xs">
                        <span className="font-semibold text-on-surface">
                          💰 Financiero
                        </span>
                        <p className="text-on-surface-variant mt-1">
                          Actualización de datos financieros
                        </p>
                      </div>
                    )}
                    {version.snapshot.notes && (
                      <div className="text-xs">
                        <span className="font-semibold text-on-surface">
                          📝 Notas
                        </span>
                        <p className="text-on-surface-variant mt-1">
                          Se agregaron o modificaron notas
                        </p>
                      </div>
                    )}

                    {/* Evaluations if any */}
                    {version.evaluations && Object.keys(version.evaluations).length > 0 && (
                      <div className="mt-3 pt-3 border-t border-outline-variant">
                        <p className="text-xs font-semibold text-on-surface mb-2">
                          Evaluaciones:
                        </p>
                        <div className="space-y-1.5">
                          {Object.entries(version.evaluations).map(
                            ([statusKey, evaluation]) => (
                              <div key={statusKey} className="text-[10px] bg-white bg-opacity-50 p-2 rounded">
                                <p className="font-semibold text-primary capitalize">
                                  {statusKey.replace('_', ' ')}
                                </p>
                                <p className="text-on-surface-variant">
                                  Por: {evaluation?.evaluatedByName || 'Desconocido'}
                                </p>
                                <p className="text-on-surface-variant">
                                  Nota: {evaluation?.notes || 'Sin notas'}
                                </p>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}

                    {/* Restore button */}
                    {restoreConfirmId === version.id ? (
                      <div className="mt-3 pt-3 border-t border-outline-variant">
                        <p className="text-xs text-on-surface-variant mb-2">
                          ¿Restaurar esta versión? Se creará una nueva versión con los datos de este snapshot.
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleConfirmRestore(version.id)}
                            className="flex-1 px-3 py-1.5 bg-primary text-on-primary text-xs font-bold rounded uppercase tracking-wider hover:opacity-90 transition-opacity"
                          >
                            Confirmar
                          </button>
                          <button
                            onClick={() => setRestoreConfirmId(null)}
                            className="flex-1 px-3 py-1.5 border border-outline-variant text-on-surface text-xs font-bold rounded uppercase tracking-wider hover:bg-surface-container transition-colors"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      onRestore && (
                        <button
                          onClick={() => handleRestoreClick(version.id)}
                          className="mt-3 pt-3 border-t border-outline-variant w-full px-3 py-2 text-primary text-xs font-bold uppercase tracking-wider hover:bg-primary hover:text-on-primary rounded transition-colors"
                        >
                          Restaurar esta versión
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
