import { useState } from 'react'
import { db } from '../services/firebase'
import { collection, addDoc, deleteDoc, getDocs, doc, updateDoc } from 'firebase/firestore'

export const AdminDataLoader = () => {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [count, setCount] = useState(0)
  const [migrateMessage, setMigrateMessage] = useState('')
  const [migrateLoading, setMigrateLoading] = useState(false)

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

      // Eliminar todas las existentes
      setMessage('Eliminando bodas existentes...')
      const snap = await getDocs(collection(db, 'weddings'))
      for (const d of snap.docs) await deleteDoc(d.ref)
      setMessage(`Eliminadas ${snap.size} bodas. Cargando nuevas...`)

      // Cargar nuevas con todos los datos
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

      // Build lookup normalized name → doc id
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
        // Exact or partial match
        let docId = docMap[norm]
        if (!docId) {
          // Try partial (first 15 chars)
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
    <div className="p-8 max-w-2xl mx-auto">
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
      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mt-6">
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
    </div>
  )
}
