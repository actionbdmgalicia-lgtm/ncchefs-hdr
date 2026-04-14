import { useState } from 'react'
import { db } from '../services/firebase'
import { collection, addDoc, deleteDoc, getDocs, doc, updateDoc } from 'firebase/firestore'
import * as XLSX from 'xlsx'

export const AdminDataLoader = () => {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [count, setCount] = useState(0)
  const [migrateMessage, setMigrateMessage] = useState('')
  const [migrateLoading, setMigrateLoading] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [exportMessage, setExportMessage] = useState('')

  const loadWeddings = async () => {
    setLoading(true)
    setMessage('Cargando datos...')
    try {
      const res = await fetch('/weddings_full.json')
      if (!res.ok) throw new Error(`Error HTTP ${res.status}`)
      const data = await res.json()
      if (!Array.isArray(data) || !data.length) throw new Error('JSON inválido')

      if (!window.confirm(`¿Eliminar bodas existentes y cargar ${data.length} bodas con datos completos?`)) {
        setLoading(false)
        setMessage('')
        return
      }

      setMessage('Eliminando bodas existentes...')
      const snap = await getDocs(collection(db, 'weddings'))
      for (const d of snap.docs) await deleteDoc(d.ref)
      setMessage(`Eliminadas ${snap.size} bodas. Cargando nuevas...`)

      const ref = collection(db, 'weddings')
      let loaded = 0
      for (const w of data) {
        await addDoc(ref, {
          couples_name: String(w.couples_name || ''),
          clients: String(w.clients || ''),
          date: String(w.date || ''),
          start_time: String(w.start_time || ''),
          end_time: String(w.end_time || ''),
          coordinator: String(w.coordinator || ''),
          service_type: String(w.service_type || ''),
          venue: String(w.venue || ''),
          ceremony_type: String(w.ceremony_type || ''),
          adults: parseInt(w.adults) || 0,
          children: parseInt(w.children) || 0,
          professionals: parseInt(w.professionals) || 0,
          status: 'pending',
          file_source: String(w.file_source || ''),
          menu: w.menu || {},
          protocols: w.protocols || [],
          special_menus: w.special_menus || {},
          notes: w.notes || [],
          financial: w.financial || {}
        })
        loaded++
        if (loaded % 20 === 0) setMessage(`Cargadas ${loaded}/${data.length} bodas...`)
      }

      setMessage(`✓ ${loaded} bodas cargadas con menú, protocolos y financiero`)
      setCount(loaded)
    } catch (err) {
      console.error(err)
      setMessage(`✗ Error: ${err instanceof Error ? err.message : err}`)
    } finally {
      setLoading(false)
    }
  }

  const migrateHDRSections = async () => {
    if (!window.confirm('¿Actualizar las 117 bodas con las 6 secciones nuevas (Barra Libre, Montajes, Contrataciones, Fechas, Clientes, Cuentas)?')) return
    setMigrateLoading(true)
    setMigrateMessage('Cargando datos de migración...')
    try {
      const res = await fetch('/hdr_sections_extracted.json')
      if (!res.ok) throw new Error(`Error HTTP ${res.status}`)
      const patches: Array<{
        couples_name: string
        barra_libre_musica?: object
        ubicacion_montajes?: object
        contrataciones_externas?: object
        fechas_importantes?: object
        cliente_info?: object
        cuentas_detalle?: object
      }> = await res.json()

      setMigrateMessage('Obteniendo bodas de Firestore...')
      const snap = await getDocs(collection(db, 'weddings'))

      const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
      const docMap: Record<string, string> = {}
      snap.forEach(d => {
        const cn = (d.data().couples_name || '') as string
        docMap[normalize(cn)] = d.id
      })

      let updated = 0
      let notFound = 0
      for (const patch of patches) {
        const norm = normalize(patch.couples_name)
        let docId = docMap[norm]
        if (!docId) {
          const short = norm.slice(0, 15)
          docId = Object.entries(docMap).find(([k]) => k.startsWith(short) || short.startsWith(k.slice(0, 15)))?.[1] || ''
        }
        if (!docId) { notFound++; continue }

        const fields: Record<string, object> = {}
        if (patch.barra_libre_musica && Object.keys(patch.barra_libre_musica).length)
          fields.barra_libre_musica = patch.barra_libre_musica
        if (patch.ubicacion_montajes && Object.keys(patch.ubicacion_montajes).length)
          fields.ubicacion_montajes = patch.ubicacion_montajes
        if (patch.contrataciones_externas && Object.keys(patch.contrataciones_externas).length)
          fields.contrataciones_externas = patch.contrataciones_externas
        if (patch.fechas_importantes && Object.keys(patch.fechas_importantes).length)
          fields.fechas_importantes = patch.fechas_importantes
        if (patch.cliente_info && Object.keys(patch.cliente_info).length)
          fields.cliente_info = patch.cliente_info
        if (patch.cuentas_detalle && Object.keys(patch.cuentas_detalle).length)
          fields.cuentas_detalle = patch.cuentas_detalle

        if (Object.keys(fields).length) {
          await updateDoc(doc(db, 'weddings', docId), fields)
          updated++
        }
        if (updated % 10 === 0 && updated > 0)
          setMigrateMessage(`Actualizadas ${updated}/${patches.length} bodas...`)
      }

      setMigrateMessage(`✓ ${updated} bodas actualizadas. Sin match: ${notFound}`)
    } catch (err) {
      console.error(err)
      setMigrateMessage(`✗ Error: ${err instanceof Error ? err.message : err}`)
    } finally {
      setMigrateLoading(false)
    }
  }

  // ── EXCEL EXPORT ──────────────────────────────────────────────────────────

  const exportToExcel = async () => {
    setExportLoading(true)
    setExportMessage('Descargando bodas de Firestore...')
    try {
      const snap = await getDocs(collection(db, 'weddings'))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const weddings: any[] = []
      snap.forEach(d => weddings.push({ id: d.id, ...d.data() }))

      // Sort by date
      weddings.sort((a, b) => (a.date || '').localeCompare(b.date || ''))

      setExportMessage(`Generando Excel con ${weddings.length} bodas...`)

      const wb = XLSX.utils.book_new()

      // ── Hoja 1: Resumen general ──────────────────────────────────────────
      const resumen = weddings.map(w => ({
        'Boda': w.couples_name || '',
        'Clientes': w.clients || '',
        'Fecha': w.date || '',
        'Hora Inicio': w.start_time || '',
        'Hora Fin': w.end_time || '',
        'Coordinadora': w.coordinator || '',
        'Lugar': w.venue || '',
        'Tipo Servicio': w.service_type || '',
        'Tipo Ceremonia': w.ceremony_type || '',
        'Adultos': w.adults || 0,
        'Niños': w.children || 0,
        'Profesionales': w.professionals || 0,
        'Estado': w.status || '',
        'Archivo': w.file_source || '',
      }))
      const wsResumen = XLSX.utils.json_to_sheet(resumen)
      wsResumen['!cols'] = [{ wch: 30 }, { wch: 40 }, { wch: 12 }, { wch: 10 }, { wch: 10 },
        { wch: 14 }, { wch: 20 }, { wch: 16 }, { wch: 16 }, { wch: 8 }, { wch: 6 }, { wch: 12 }, { wch: 10 }, { wch: 24 }]
      XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen')

      // ── Hoja 2: Clientes ─────────────────────────────────────────────────
      const clientes = weddings.map(w => {
        const ci = w.cliente_info || {}
        return {
          'Boda': w.couples_name || '',
          'Fecha': w.date || '',
          'Coordinadora': w.coordinator || '',
          'Nombres Clientes': ci.nombres || w.clients || '',
          'Teléfonos': ci.telefonos || '',
          'Mails': ci.mails || '',
          'Dirección': ci.direccion || '',
        }
      })
      const wsClientes = XLSX.utils.json_to_sheet(clientes)
      wsClientes['!cols'] = [{ wch: 30 }, { wch: 12 }, { wch: 14 }, { wch: 40 }, { wch: 24 }, { wch: 40 }, { wch: 40 }]
      XLSX.utils.book_append_sheet(wb, wsClientes, 'Clientes')

      // ── Hoja 3: Menú ─────────────────────────────────────────────────────
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
          'Bodega Blanco': b.blanco || '',
          'Bodega Tinto': b.tinto || '',
          'Bodega Cava': b.cava || '',
          'Bodega Otros': b.otros || '',
        }
      })
      const wsMenus = XLSX.utils.json_to_sheet(menus)
      wsMenus['!cols'] = [{ wch: 30 }, { wch: 12 }, { wch: 14 },
        { wch: 50 }, { wch: 40 }, { wch: 40 }, { wch: 40 }, { wch: 40 }, { wch: 30 }, { wch: 30 },
        { wch: 40 }, { wch: 40 }, { wch: 40 }, { wch: 30 }, { wch: 30 }, { wch: 30 }, { wch: 30 }]
      XLSX.utils.book_append_sheet(wb, wsMenus, 'Menú')

      // ── Hoja 4: Menús especiales ──────────────────────────────────────────
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
          'Alérgicos': s.alergicos || 0,
          'Infantil': s.infantil || 0,
        }
      })
      const wsEspeciales = XLSX.utils.json_to_sheet(especiales)
      wsEspeciales['!cols'] = [{ wch: 30 }, { wch: 12 }, { wch: 14 }, ...Array(8).fill({ wch: 12 })]
      XLSX.utils.book_append_sheet(wb, wsEspeciales, 'Menús Especiales')

      // ── Hoja 5: Barra Libre y Música ─────────────────────────────────────
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

      // ── Hoja 6: Contrataciones Externas ──────────────────────────────────
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

      // ── Hoja 7: Fechas Importantes ────────────────────────────────────────
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

      // ── Hoja 8: Cuentas ───────────────────────────────────────────────────
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
          'Nº Extras': Array.isArray(c.extras) ? c.extras.length : 0,
        }
      })
      const wsCuentas = XLSX.utils.json_to_sheet(cuentas)
      wsCuentas['!cols'] = [{ wch: 30 }, { wch: 12 }, { wch: 14 }, { wch: 8 }, { wch: 6 },
        { wch: 14 }, { wch: 12 }, { wch: 18 }, { wch: 14 }, { wch: 10 }]
      XLSX.utils.book_append_sheet(wb, wsCuentas, 'Cuentas')

      // ── Hoja 9: Extras Cuentas (una fila por extra) ───────────────────────
      const extrasRows: object[] = []
      for (const w of weddings) {
        const extras = w.cuentas_detalle?.extras || []
        for (const e of extras) {
          extrasRows.push({
            'Boda': w.couples_name || '',
            'Fecha': w.date || '',
            'Coordinadora': w.coordinator || '',
            'Concepto': e.concepto || '',
            '€/Ud Previsto': e.precio_unitario ?? '',
            'Uds Previstas': e.unidades_previstas ?? '',
            'Total Previsto': e.total_previsto ?? '',
            '€/Ud Real': e.precio_unitario_real ?? '',
            'Uds Reales': e.unidades_reales ?? '',
            'Total Real': e.total_real ?? '',
          })
        }
      }
      if (extrasRows.length) {
        const wsExtras = XLSX.utils.json_to_sheet(extrasRows)
        wsExtras['!cols'] = [{ wch: 30 }, { wch: 12 }, { wch: 14 }, { wch: 36 }, ...Array(6).fill({ wch: 14 })]
        XLSX.utils.book_append_sheet(wb, wsExtras, 'Extras Cuentas')
      }

      // ── Hoja 10: Protocolos ───────────────────────────────────────────────
      const protocolos = weddings.map(w => ({
        'Boda': w.couples_name || '',
        'Fecha': w.date || '',
        'Coordinadora': w.coordinator || '',
        'Protocolos': Array.isArray(w.protocols)
          ? w.protocols.join('\n')
          : (typeof w.protocols === 'string' ? w.protocols : ''),
        'Notas': Array.isArray(w.notes)
          ? w.notes.join('\n')
          : (typeof w.notes === 'string' ? w.notes : ''),
      }))
      const wsProto = XLSX.utils.json_to_sheet(protocolos)
      wsProto['!cols'] = [{ wch: 30 }, { wch: 12 }, { wch: 14 }, { wch: 80 }, { wch: 60 }]
      XLSX.utils.book_append_sheet(wb, wsProto, 'Protocolos y Notas')

      // ── Descargar ─────────────────────────────────────────────────────────
      const fecha = new Date().toISOString().slice(0, 10)
      XLSX.writeFile(wb, `NCCHEFS_HDR_${fecha}.xlsx`)

      setExportMessage(`✓ Descargado: NCCHEFS_HDR_${fecha}.xlsx (${weddings.length} bodas, 10 hojas)`)
    } catch (err) {
      console.error(err)
      setExportMessage(`✗ Error: ${err instanceof Error ? err.message : err}`)
    } finally {
      setExportLoading(false)
    }
  }

  // ── CLEAR ─────────────────────────────────────────────────────────────────

  const clearWeddings = async () => {
    if (!window.confirm('¿Eliminar TODAS las bodas de Firestore?')) return
    setLoading(true)
    setMessage('Eliminando...')
    try {
      const snap = await getDocs(collection(db, 'weddings'))
      for (const d of snap.docs) await deleteDoc(d.ref)
      setMessage(`✓ ${snap.size} bodas eliminadas`)
      setCount(0)
    } catch (err) {
      setMessage(`✗ Error: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">

      {/* Cargador */}
      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6">
        <h2 className="text-xl font-bold text-yellow-900 mb-4">⚠️ Admin: Cargador de Datos</h2>
        <div className="bg-white rounded p-4 mb-6 border border-yellow-100">
          <p className="text-sm text-gray-600 mb-1"><strong>Weddings disponibles:</strong> 117</p>
          <p className="text-sm text-gray-600"><strong>Status:</strong> {message || 'Listo para cargar'}</p>
          {count > 0 && <p className="text-sm text-green-600 font-semibold mt-2">✓ {count} bodas en Firestore</p>}
        </div>
        <p className="text-xs text-yellow-700 mb-4">⚡ Esta operación elimina las bodas existentes y carga las 117 con menú completo, protocolos y financiero.</p>
        <div className="flex gap-4">
          <button onClick={loadWeddings} disabled={loading}
            className="px-6 py-2 bg-green-600 text-white rounded font-medium hover:bg-green-700 disabled:opacity-50">
            {loading ? 'Procesando...' : '📤 Cargar 117 bodas'}
          </button>
          <button onClick={clearWeddings} disabled={loading}
            className="px-6 py-2 bg-red-600 text-white rounded font-medium hover:bg-red-700 disabled:opacity-50">
            🗑️ Eliminar todas
          </button>
        </div>
      </div>

      {/* Migración secciones HDR */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
        <h2 className="text-xl font-bold text-blue-900 mb-2">🔄 Migrar Secciones HDR</h2>
        <p className="text-sm text-blue-700 mb-1">Añade a las bodas existentes los datos de las 6 secciones nuevas extraídas de los Excel:</p>
        <ul className="text-xs text-blue-600 mb-4 list-disc ml-4">
          <li>Barra Libre y Música</li>
          <li>Ubicación y Montajes</li>
          <li>Contrataciones Externas</li>
          <li>Fechas Importantes</li>
          <li>Datos Clientes</li>
          <li>Cuentas Detalle</li>
        </ul>
        {migrateMessage && (
          <p className={`text-sm font-semibold mb-3 ${migrateMessage.startsWith('✓') ? 'text-green-700' : migrateMessage.startsWith('✗') ? 'text-red-700' : 'text-blue-700'}`}>
            {migrateMessage}
          </p>
        )}
        <button onClick={migrateHDRSections} disabled={migrateLoading}
          className="px-6 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 disabled:opacity-50">
          {migrateLoading ? 'Migrando...' : '🚀 Migrar 117 bodas'}
        </button>
      </div>

      {/* Exportar Excel */}
      <div className="bg-emerald-50 border-2 border-emerald-200 rounded-lg p-6">
        <h2 className="text-xl font-bold text-emerald-900 mb-2">📊 Exportar Base de Datos a Excel</h2>
        <p className="text-sm text-emerald-700 mb-1">Descarga todas las hojas de ruta de Firestore en un archivo Excel con 10 hojas:</p>
        <ul className="text-xs text-emerald-600 mb-4 list-disc ml-4 grid grid-cols-2 gap-x-4">
          <li>Resumen general</li>
          <li>Clientes</li>
          <li>Menú</li>
          <li>Menús Especiales</li>
          <li>Barra y Música</li>
          <li>Contrataciones</li>
          <li>Fechas Importantes</li>
          <li>Cuentas</li>
          <li>Extras Cuentas</li>
          <li>Protocolos y Notas</li>
        </ul>
        {exportMessage && (
          <p className={`text-sm font-semibold mb-3 ${exportMessage.startsWith('✓') ? 'text-green-700' : exportMessage.startsWith('✗') ? 'text-red-700' : 'text-emerald-700'}`}>
            {exportMessage}
          </p>
        )}
        <button onClick={exportToExcel} disabled={exportLoading}
          className="px-6 py-2 bg-emerald-600 text-white rounded font-medium hover:bg-emerald-700 disabled:opacity-50">
          {exportLoading ? 'Generando...' : '⬇️ Descargar Excel'}
        </button>
      </div>

    </div>
  )
}
