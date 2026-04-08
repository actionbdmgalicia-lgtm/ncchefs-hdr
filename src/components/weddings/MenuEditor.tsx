import { useState } from 'react'
import type { FIBAPlato } from '../../types'
import { FIBAMenuPicker } from './FIBAMenuPicker'

interface MenuItemData {
  id: string
  nombre: string
  precio: number
  cantidadAdultos?: number
  cantidadNiños?: number
  addedFrom: 'manual' | 'fiba'
}

interface MenuEditorProps {
  section: string
  items: MenuItemData[]
  onItemsChange: (items: MenuItemData[]) => void
  onSave?: () => Promise<void>
  onCancel?: () => void
  saving?: boolean
}

export const MenuEditor = ({
  section,
  items,
  onItemsChange,
  onSave,
  onCancel,
  saving
}: MenuEditorProps) => {
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<{
    cantidadAdultos?: number
    cantidadNiños?: number
  }>({})

  const handleAddFromFIBA = (plato: FIBAPlato) => {
    const newItem: MenuItemData = {
      id: plato.id,
      nombre: plato.nombre,
      precio: plato.precio,
      cantidadAdultos: 0,
      cantidadNiños: 0,
      addedFrom: 'fiba'
    }
    onItemsChange([...items, newItem])
  }

  const handleAddManual = () => {
    const newItem: MenuItemData = {
      id: `manual_${Date.now()}`,
      nombre: 'Nuevo plato',
      precio: 0,
      cantidadAdultos: 0,
      cantidadNiños: 0,
      addedFrom: 'manual'
    }
    onItemsChange([...items, newItem])
  }

  const handleRemoveItem = (id: string) => {
    onItemsChange(items.filter(item => item.id !== id))
  }

  const handleEditItem = (id: string) => {
    const item = items.find(i => i.id === id)
    if (item) {
      setEditingItemId(id)
      setEditValues({
        cantidadAdultos: item.cantidadAdultos,
        cantidadNiños: item.cantidadNiños
      })
    }
  }

  const handleSaveEdit = (id: string) => {
    const updatedItems = items.map(item =>
      item.id === id
        ? {
            ...item,
            cantidadAdultos: editValues.cantidadAdultos || 0,
            cantidadNiños: editValues.cantidadNiños || 0
          }
        : item
    )
    onItemsChange(updatedItems)
    setEditingItemId(null)
  }

  const totalPrice = items.reduce((sum, item) => sum + item.precio, 0)

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      {/* Section Title */}
      <div className="mb-6">
        <h3 className="font-headline text-lg font-bold text-on-surface mb-2 capitalize">
          {section}
        </h3>
        <p className="text-sm text-on-surface-variant">
          {items.length} plato{items.length !== 1 ? 's' : ''} • Total: {totalPrice}€
        </p>
      </div>

      {/* Items List */}
      {items.length > 0 && (
        <div className="mb-6 space-y-3">
          {items.map(item => (
            <div
              key={item.id}
              className="p-4 border border-gray-200 rounded-lg hover:bg-surface-container-low transition-colors"
            >
              {editingItemId === item.id ? (
                // Edit Mode
                <div className="space-y-3">
                  <input
                    type="text"
                    value={item.nombre}
                    onChange={e => {
                      const updated = items.map(i =>
                        i.id === item.id ? { ...i, nombre: e.target.value } : i
                      )
                      onItemsChange(updated)
                    }}
                    className="w-full px-3 py-2 border border-outline-variant rounded text-sm"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="number"
                      placeholder="Precio"
                      value={item.precio}
                      onChange={e => {
                        const updated = items.map(i =>
                          i.id === item.id
                            ? { ...i, precio: parseFloat(e.target.value) || 0 }
                            : i
                        )
                        onItemsChange(updated)
                      }}
                      className="px-3 py-2 border border-outline-variant rounded text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Adultos"
                      value={editValues.cantidadAdultos || 0}
                      onChange={e =>
                        setEditValues({
                          ...editValues,
                          cantidadAdultos: parseInt(e.target.value) || 0
                        })
                      }
                      className="px-3 py-2 border border-outline-variant rounded text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Niños"
                      value={editValues.cantidadNiños || 0}
                      onChange={e =>
                        setEditValues({
                          ...editValues,
                          cantidadNiños: parseInt(e.target.value) || 0
                        })
                      }
                      className="px-3 py-2 border border-outline-variant rounded text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveEdit(item.id)}
                      className="flex-1 px-3 py-2 bg-primary text-on-primary text-xs font-bold rounded hover:opacity-90"
                    >
                      Guardar
                    </button>
                    <button
                      onClick={() => setEditingItemId(null)}
                      className="flex-1 px-3 py-2 border border-outline-variant text-on-surface text-xs font-bold rounded"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                // Display Mode
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-on-surface">{item.nombre}</p>
                    <p className="text-xs text-on-surface-variant mt-1">
                      {item.addedFrom === 'fiba' ? '🔗 FIBA' : '📝 Manual'} •{' '}
                      {item.cantidadAdultos || 0} adultos,{' '}
                      {item.cantidadNiños || 0} niños
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-bold text-primary text-lg">
                      {item.precio}€
                    </p>
                    <button
                      onClick={() => handleEditItem(item.id)}
                      className="p-2 text-on-surface-variant hover:text-primary"
                    >
                      <span className="material-symbols-outlined text-base">
                        edit
                      </span>
                    </button>
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className="p-2 text-on-surface-variant hover:text-red-600"
                    >
                      <span className="material-symbols-outlined text-base">
                        delete
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Buttons */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setIsPickerOpen(true)}
          className="flex-1 px-4 py-2 bg-primary text-on-primary text-sm font-bold rounded hover:opacity-90 flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-base">add</span>
          Agregar desde FIBA
        </button>
        <button
          onClick={handleAddManual}
          className="flex-1 px-4 py-2 border border-primary text-primary text-sm font-bold rounded hover:bg-primary-container flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-base">note_add</span>
          Agregar Manual
        </button>
      </div>

      {/* FIBA Menu Picker Modal */}
      <FIBAMenuPicker
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onSelect={handleAddFromFIBA}
      />

      {/* Action Buttons */}
      {onSave && (
        <div className="flex gap-2 pt-4 border-t border-gray-200">
          <button
            onClick={onSave}
            disabled={saving}
            className="flex-1 px-4 py-2 bg-green-600 text-white text-sm font-bold rounded hover:bg-green-700 disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
          {onCancel && (
            <button
              onClick={onCancel}
              disabled={saving}
              className="flex-1 px-4 py-2 border border-outline-variant text-on-surface text-sm font-bold rounded hover:bg-surface-container-low disabled:opacity-50"
            >
              Cancelar
            </button>
          )}
        </div>
      )}
    </div>
  )
}
