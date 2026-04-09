import { useState } from 'react'

const SECTIONS = [
  {
    icon: 'map',
    title: 'Hojas de Ruta (HDR)',
    color: 'text-primary',
    steps: [
      { icon: 'add_circle', text: 'Crea una nueva HDR desde "Bodas" → botón "+ Nueva Boda".' },
      { icon: 'edit', text: 'Abre una boda y pulsa "Editar" para modificar menú, protocolos y datos financieros.' },
      { icon: 'expand', text: '"Vista Completa" muestra todos los campos aunque estén vacíos. "Vista Compacta" solo muestra los que tienen datos.' },
      { icon: 'history', text: '"Historial" muestra todas las versiones guardadas. Puedes restaurar cualquier versión anterior.' },
    ]
  },
  {
    icon: 'restaurant_menu',
    title: 'Editar el Menú',
    color: 'text-amber-700',
    steps: [
      { icon: 'edit', text: 'Pulsa "Editar" en la HDR para activar el modo edición.' },
      { icon: 'search', text: 'Cada sección del menú (Entrante, Pescado, Carne, Aperitivos...) tiene un botón "Buscar en FIBA" para seleccionar un plato con precio automático.' },
      { icon: 'close', text: 'En arrays (Complementos, Aperitivos, Marisco, Tapas, Recena) puedes eliminar items con el botón ✕ al lado de cada uno.' },
      { icon: 'save', text: 'Pulsa "Guardar" para confirmar los cambios. Se crea una versión automáticamente.' },
    ]
  },
  {
    icon: 'inventory_2',
    title: 'Escandallos',
    color: 'text-green-700',
    steps: [
      { icon: 'list', text: 'La página "Escandallos" muestra todos los platos del catálogo de FIBA Menús con sus precios.' },
      { icon: 'filter_list', text: 'Filtra por categoría (Mariscos, Carnes, Postres...) pulsando los botones de grupo.' },
      { icon: 'search', text: 'Busca un plato por nombre con la barra de búsqueda.' },
      { icon: 'open_in_new', text: 'El botón "Abrir FIBA Menús" abre la app de escandallos completa en una nueva pestaña.' },
    ]
  },
  {
    icon: 'swap_horiz',
    title: 'Estados de la HDR',
    color: 'text-blue-700',
    steps: [
      { icon: 'circle', text: 'Inicial: fase de planificación, primer borrador del menú.' },
      { icon: 'schedule', text: 'Prueba y Menú: después de la prueba de menú con los clientes.' },
      { icon: 'check_circle', text: 'Final: versión aprobada y definitiva.' },
      { icon: 'assignment', text: 'Para cambiar de estado, usa el panel "Cambiar Estado" en la columna derecha de la HDR. Debes añadir notas de evaluación.' },
    ]
  },
  {
    icon: 'calendar_month',
    title: 'Calendario',
    color: 'text-purple-700',
    steps: [
      { icon: 'event', text: 'Visualiza todas las bodas del año en el calendario mensual.' },
      { icon: 'touch_app', text: 'Haz clic en una boda del calendario para abrir su hoja de ruta.' },
      { icon: 'filter_list', text: 'Filtra por coordinador o por finca.' },
    ]
  },
]

interface HelpModalProps {
  isOpen: boolean
  onClose: () => void
}

export const HelpModal = ({ isOpen, onClose }: HelpModalProps) => {
  const [activeSection, setActiveSection] = useState(0)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col font-body"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Guía de uso</p>
            <h2 className="font-headline text-2xl font-bold text-on-surface">Ayuda & Tutorial</h2>
          </div>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface transition-colors">
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar tabs */}
          <div className="w-48 shrink-0 border-r border-gray-100 p-3 space-y-1 overflow-y-auto">
            {SECTIONS.map((s, i) => (
              <button
                key={i}
                onClick={() => setActiveSection(i)}
                className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left text-sm font-medium transition-all ${
                  activeSection === i
                    ? 'bg-primary/10 text-primary'
                    : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                }`}
              >
                <span className={`material-symbols-outlined text-base ${activeSection === i ? 'text-primary' : ''}`}>
                  {s.icon}
                </span>
                <span className="leading-tight">{s.title}</span>
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {(() => {
              const section = SECTIONS[activeSection]
              return (
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <span className={`material-symbols-outlined text-3xl ${section.color}`}>{section.icon}</span>
                    <h3 className="font-headline text-xl font-bold text-on-surface">{section.title}</h3>
                  </div>
                  <div className="space-y-4">
                    {section.steps.map((step, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                          <span className="material-symbols-outlined text-sm text-primary">{step.icon}</span>
                        </div>
                        <p className="text-sm text-on-surface leading-relaxed">{step.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <p className="text-xs text-on-surface-variant">NCC Chefs · Gestión Bodas 2026</p>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-primary text-on-primary text-xs font-bold uppercase tracking-widest rounded-lg hover:opacity-90 transition-opacity"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  )
}
