interface EditModeToggleProps {
  isEditing: boolean
  onToggle: () => void
  onSave?: () => Promise<void>
  onCancel?: () => void
  saving?: boolean
  disabled?: boolean
}

export const EditModeToggle = ({
  isEditing,
  onToggle,
  onSave,
  onCancel,
  saving,
  disabled
}: EditModeToggleProps) => {
  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={onSave}
          disabled={saving || disabled}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-outlined text-base">check</span>
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
        <button
          onClick={onCancel}
          disabled={saving || disabled}
          className="flex items-center gap-2 px-4 py-2 border border-outline-variant text-on-surface text-sm font-bold rounded hover:bg-surface-container-low transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-outlined text-base">close</span>
          Cancelar
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-container text-on-primary hover:text-on-primary-container text-sm font-bold rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <span className="material-symbols-outlined text-base">edit</span>
      Editar
    </button>
  )
}
