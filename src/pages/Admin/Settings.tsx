import { useState } from 'react'
import { db } from '../../services/firebase'
import { collection, getDocs } from 'firebase/firestore'
import * as XLSX from 'xlsx'

export const Settings = () => {
  const [settings, setSettings] = useState({
    companyName: 'NCC Chefs',
    email: 'admin@ncchefs.com',
    theme: 'light',
    notifications: true,
    emailAlerts: true,
    dataBackup: true
  })
  const [downloadLoading, setDownloadLoading] = useState(false)

  const exportToExcel = async () => {
    setDownloadLoading(true)
    try {
      const snap = await getDocs(collection(db, 'weddings'))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const weddings: any[] = []
      snap.forEach(d => weddings.push({ id: d.id, ...d.data() }))
      weddings.sort((a, b) => (a.date || '').localeCompare(b.date || ''))

      const wb = XLSX.utils.book_new()

      // Resumen
      const resumen = weddings.map(w => ({
        'Boda': w.couples_name || '',
        'Clientes': w.clients || '',
        'Fecha': w.date || '',
        'Hora Inicio': w.start_time || '',
        'Hora Fin': w.end_time || '',
        'Coordinadora': w.coordinator || '',
        'Lugar': w.venue || '',
        'Tipo Servicio': w.service_type || '',
        'Adultos': w.adults || 0,
        'Niños': w.children || 0,
        'Estado': w.status || '',
      }))
      const wsResumen = XLSX.utils.json_to_sheet(resumen)
      wsResumen['!cols'] = [{ wch: 30 }, { wch: 40 }, { wch: 12 }, { wch: 10 }, { wch: 10 },
        { wch: 14 }, { wch: 20 }, { wch: 16 }, { wch: 8 }, { wch: 6 }, { wch: 10 }]
      XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen')

      // Clientes
      const clientes = weddings.map(w => {
        const ci = w.cliente_info || {}
        return {
          'Boda': w.couples_name || '',
          'Fecha': w.date || '',
          'Coordinadora': w.coordinator || '',
          'Nombres': ci.nombres || w.clients || '',
          'Teléfonos': ci.telefonos || '',
          'Mails': ci.mails || '',
          'Dirección': ci.direccion || '',
        }
      })
      const wsClientes = XLSX.utils.json_to_sheet(clientes)
      wsClientes['!cols'] = [{ wch: 30 }, { wch: 12 }, { wch: 14 }, { wch: 40 }, { wch: 24 }, { wch: 40 }, { wch: 40 }]
      XLSX.utils.book_append_sheet(wb, wsClientes, 'Clientes')

      // Menú
      const menus = weddings.map(w => {
        const m = w.menu || {}
        const b = m.bodega || {}
        const inf = m.infantil || {}
        return {
          'Boda': w.couples_name || '',
          'Fecha': w.date || '',
          'Coordinadora': w.coordinator || '',
          'Aperitivos': Array.isArray(m.aperitivos) ? m.aperitivos.join(' | ') : '',
          'Complementos': Array.isArray(m.complementos) ? m.complementos.join(' | ') : '',
          'Entrante': m.entrante || '',
          'Pescado': m.pescado || '',
          'Carne': m.carne || '',
          'Postre Adultos': m.postre || '',
          'Postre Infantil': inf.postre || '',
          'Menú Infantil': Array.isArray(inf.menu) ? inf.menu.join(' | ') : (inf.menu || ''),
          'Notas Infantil': inf.notas || '',
          'Recena': Array.isArray(m.recena) ? m.recena.join(' | ') : '',
          'Vino Blanco': b.blanco || '',
          'Vino Tinto': b.tinto || '',
          'Cava': b.cava || '',
        }
      })
      const wsMenus = XLSX.utils.json_to_sheet(menus)
      wsMenus['!cols'] = [{ wch: 30 }, { wch: 12 }, { wch: 14 },
        { wch: 50 }, { wch: 40 }, { wch: 40 }, { wch: 40 }, { wch: 40 }, { wch: 30 }, { wch: 30 },
        { wch: 40 }, { wch: 40 }, { wch: 40 }, { wch: 30 }, { wch: 30 }, { wch: 30 }]
      XLSX.utils.book_append_sheet(wb, wsMenus, 'Menú')

      // Menús especiales
      const especiales = weddings.map(w => {
        const s = w.special_menus || {}
        return {
          'Boda': w.couples_name || '',
          'Fecha': w.date || '',
          'Coordinadora': w.coordinator || '',
          'Celíacos': s.celiacos || 0,
          'Vegetarianos': s.vegetarianos || 0,
          'Sin Marisco': s.sin_marisco || 0,
          'Sin Pescado': s.sin_pescado || 0,
          'Sin Carne': s.sin_carne || 0,
          'Sin Lactosa': s.sin_lactosa || 0,
          'Infantil': s.infantil || 0,
        }
      })
      const wsEspeciales = XLSX.utils.json_to_sheet(especiales)
      wsEspeciales['!cols'] = [{ wch: 30 }, { wch: 12 }, { wch: 14 }, ...Array(8).fill({ wch: 12 })]
      XLSX.utils.book_append_sheet(wb, wsEspeciales, 'Menús Especiales')

      // Barra Libre
      const barra = weddings.map(w => {
        const b = w.barra_libre_musica || {}
        return {
          'Boda': w.couples_name || '',
          'Fecha': w.date || '',
          'Coordinadora': w.coordinator || '',
          'Inicio Barra': b.inicio_barra || '',
          'Cierre Barra': b.cierre_barra || '',
          'DJ': b.dj || '',
          'Otros': b.otros || '',
        }
      })
      const wsBarra = XLSX.utils.json_to_sheet(barra)
      wsBarra['!cols'] = [{ wch: 30 }, { wch: 12 }, { wch: 14 }, { wch: 16 }, { wch: 20 }, { wch: 30 }, { wch: 40 }]
      XLSX.utils.book_append_sheet(wb, wsBarra, 'Barra y Música')

      // Contrataciones
      const contrat = weddings.map(w => {
        const c = w.contrataciones_externas || {}
        return {
          'Boda': w.couples_name || '',
          'Fecha': w.date || '',
          'Coordinadora': w.coordinator || '',
          'Fotógrafo': c.fotografo || '',
          'Vídeo': c.video || '',
          'Animación': c.animacion || '',
          'Autobuses': c.autobuses || '',
          'Bandas': c.bandas || '',
          'Otros': c.otros || '',
        }
      })
      const wsContrat = XLSX.utils.json_to_sheet(contrat)
      wsContrat['!cols'] = [{ wch: 30 }, { wch: 12 }, { wch: 14 }, ...Array(6).fill({ wch: 28 })]
      XLSX.utils.book_append_sheet(wb, wsContrat, 'Contrataciones')

      // Fechas Importantes
      const fechas = weddings.map(w => {
        const f = w.fechas_importantes || {}
        return {
          'Boda': w.couples_name || '',
          'Fecha Boda': w.date || '',
          'Coordinadora': w.coordinator || '',
          'Conf. Invitados': f.confirmacion_invitados || '',
          'Ingreso Inicial': f.ingreso_inicial || '',
          'Ingreso Restante': f.ingreso_restante || '',
        }
      })
      const wsFechas = XLSX.utils.json_to_sheet(fechas)
      wsFechas['!cols'] = [{ wch: 30 }, { wch: 12 }, { wch: 14 }, { wch: 18 }, { wch: 16 }, { wch: 18 }]
      XLSX.utils.book_append_sheet(wb, wsFechas, 'Fechas Importantes')

      // Cuentas
      const cuentas = weddings.map(w => {
        const c = w.cuentas_detalle || {}
        return {
          'Boda': w.couples_name || '',
          'Fecha': w.date || '',
          'Coordinadora': w.coordinator || '',
          'Adultos': w.adults || 0,
          'Niños': w.children || 0,
          'Precio Adulto': c.precio_adulto || '',
          'Precio Niño': c.precio_nino || '',
          'Precio Profesional': c.precio_profesional || '',
          'Total Adultos': (w.adults && c.precio_adulto) ? w.adults * c.precio_adulto : '',
        }
      })
      const wsCuentas = XLSX.utils.json_to_sheet(cuentas)
      wsCuentas['!cols'] = [{ wch: 30 }, { wch: 12 }, { wch: 14 }, { wch: 8 }, { wch: 6 },
        { wch: 14 }, { wch: 12 }, { wch: 18 }, { wch: 14 }]
      XLSX.utils.book_append_sheet(wb, wsCuentas, 'Cuentas')

      const fecha = new Date().toISOString().slice(0, 10)
      XLSX.writeFile(wb, `NCCHEFS_HDR_${fecha}.xlsx`)
    } catch (err) {
      console.error('Error descargando datos:', err)
      alert(`Error: ${err instanceof Error ? err.message : err}`)
    } finally {
      setDownloadLoading(false)
    }
  }

  return (
    <section className="p-8 md:p-12 max-w-7xl mx-auto font-body">
      <div className="mb-12">
        <h2 className="font-headline text-4xl font-bold text-on-surface mb-2">
          Configuración
        </h2>
        <p className="text-on-surface-variant text-lg">
          Administra las preferencias y ajustes del sistema.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Company Settings */}
          <div className="bg-surface-container-lowest p-6 rounded-lg border border-outline-variant/10">
            <h3 className="font-headline text-xl font-bold text-on-surface mb-6">Información Empresarial</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-on-surface mb-2">Nombre de Empresa</label>
                <input
                  type="text"
                  value={settings.companyName}
                  onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                  className="w-full px-4 py-2 border border-outline-variant/30 rounded-lg bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-on-surface mb-2">Email de Contacto</label>
                <input
                  type="email"
                  value={settings.email}
                  onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                  className="w-full px-4 py-2 border border-outline-variant/30 rounded-lg bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {/* Preferences */}
          <div className="bg-surface-container-lowest p-6 rounded-lg border border-outline-variant/10">
            <h3 className="font-headline text-xl font-bold text-on-surface mb-6">Preferencias</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-surface-container-low rounded">
                <div>
                  <p className="font-bold text-on-surface">Notificaciones en la App</p>
                  <p className="text-sm text-on-surface-variant">Recibe alertas de eventos importantes</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notifications}
                    onChange={(e) => setSettings({ ...settings, notifications: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-surface-container-high peer-checked:bg-primary rounded-full peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-surface-container-low rounded">
                <div>
                  <p className="font-bold text-on-surface">Alertas por Email</p>
                  <p className="text-sm text-on-surface-variant">Recibe notificaciones en tu email</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.emailAlerts}
                    onChange={(e) => setSettings({ ...settings, emailAlerts: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-surface-container-high peer-checked:bg-primary rounded-full peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Data Management */}
          <div className="bg-surface-container-lowest p-6 rounded-lg border border-outline-variant/10">
            <h3 className="font-headline text-xl font-bold text-on-surface mb-6">Gestión de Datos</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-surface-container-low rounded">
                <div>
                  <p className="font-bold text-on-surface">Copia de Seguridad Automática</p>
                  <p className="text-sm text-on-surface-variant">Respalda automáticamente los datos</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.dataBackup}
                    onChange={(e) => setSettings({ ...settings, dataBackup: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-surface-container-high peer-checked:bg-primary rounded-full peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                </label>
              </div>
              <button
                onClick={exportToExcel}
                disabled={downloadLoading}
                className="w-full px-4 py-3 border border-outline-variant/30 text-on-surface font-bold text-sm uppercase tracking-widest rounded hover:bg-surface-container-low transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                <span className="material-symbols-outlined">download</span>
                {downloadLoading ? 'Descargando...' : 'Descargar Base de Datos (Excel)'}
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Account Info */}
          <div className="bg-surface-container-low p-6 rounded-lg">
            <h4 className="font-headline text-lg font-bold text-on-surface mb-4">Tu Cuenta</h4>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">Plan Actual</p>
                <p className="text-lg font-bold text-primary">Profesional</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">Usuarios Activos</p>
                <p className="text-lg font-bold text-on-surface">4 de 10</p>
              </div>
              <button className="w-full px-4 py-2 bg-primary text-on-primary font-bold text-xs uppercase tracking-widest rounded hover:bg-primary-container transition-colors">
                Cambiar Plan
              </button>
            </div>
          </div>

          {/* Support */}
          <div className="bg-surface-container-low p-6 rounded-lg">
            <h4 className="font-headline text-lg font-bold text-on-surface mb-4">Ayuda</h4>
            <div className="space-y-3">
              <a href="#" className="flex items-center gap-2 text-primary font-bold text-sm hover:underline">
                <span className="material-symbols-outlined text-base">help</span>
                Centro de Ayuda
              </a>
              <a href="#" className="flex items-center gap-2 text-primary font-bold text-sm hover:underline">
                <span className="material-symbols-outlined text-base">mail</span>
                Contactar Soporte
              </a>
              <a href="#" className="flex items-center gap-2 text-primary font-bold text-sm hover:underline">
                <span className="material-symbols-outlined text-base">description</span>
                Documentación
              </a>
            </div>
          </div>

          {/* Save Changes */}
          <button className="w-full px-6 py-3 bg-primary text-on-primary font-bold text-sm uppercase tracking-widest rounded hover:bg-primary-container transition-colors">
            Guardar Cambios
          </button>
        </div>
      </div>
    </section>
  )
}
