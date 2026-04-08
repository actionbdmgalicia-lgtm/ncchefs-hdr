import { useState } from 'react'
import { db } from '../services/firebase'
import { collection, addDoc, deleteDoc, getDocs } from 'firebase/firestore'

export const AdminDataLoader = () => {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [count, setCount] = useState(0)

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
    </div>
  )
}
