import { collection, getDocs, doc, updateDoc, addDoc, arrayUnion } from 'firebase/firestore'
import { db } from './firebase'
import { fetchFromGoogleSheet } from './googleSheetsApiService'
import type { SheetCoordConfig, SheetWeddingRaw, SyncStats, SyncProgress } from '../types'

// ─── CONFIG PERSISTENCE ───────────────────────────────────────────────────────

const LS_KEY = 'ncchefs_sheets_config_v2'   // v2 = usa sheetUrl en lugar de scriptUrl
const LS_LAST_SYNC = 'ncchefs_last_sync'

export function loadSyncConfig(): SheetCoordConfig[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) return JSON.parse(raw) as SheetCoordConfig[]
  } catch { /* ignore */ }
  return [
    { coordinadora: 'Marta',      sheetUrl: '' },
    { coordinadora: 'Rosa',       sheetUrl: '' },
    { coordinadora: 'Sara',       sheetUrl: '' },
    { coordinadora: 'Andrea',     sheetUrl: '' },
    { coordinadora: 'Jimena/Bea', sheetUrl: '' },
  ]
}

export function saveSyncConfig(configs: SheetCoordConfig[]): void {
  localStorage.setItem(LS_KEY, JSON.stringify(configs))
}

export function loadLastSync(): string | null {
  return localStorage.getItem(LS_LAST_SYNC)
}

export function saveLastSync(iso: string): void {
  localStorage.setItem(LS_LAST_SYNC, iso)
}

// ─── NORMALIZATION ────────────────────────────────────────────────────────────

export function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

// ─── CLEAN UNDEFINED VALUES (Firestore doesn't allow undefined) ───────────────

function cleanUndefined(obj: unknown): unknown {
  if (obj === null || obj === undefined) return undefined
  if (typeof obj !== 'object') return obj
  if (Array.isArray(obj)) {
    return obj
      .map(cleanUndefined)
      .filter(v => v !== undefined)
  }
  const cleaned: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const cleaned_v = cleanUndefined(v)
    if (cleaned_v !== undefined) {
      cleaned[k] = cleaned_v
    }
  }
  return Object.keys(cleaned).length > 0 ? cleaned : undefined
}

// ─── DIFF ─────────────────────────────────────────────────────────────────────

function sortKeys(obj: unknown): unknown {
  if (obj === null || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(sortKeys)
  const sorted: Record<string, unknown> = {}
  Object.keys(obj as Record<string, unknown>).sort().forEach(k => {
    sorted[k] = sortKeys((obj as Record<string, unknown>)[k])
  })
  return sorted
}

const COMPARE_FIELDS: (keyof SheetWeddingRaw)[] = [
  'clients', 'date', 'coordinator', 'adults', 'children',
  'service_type', 'ceremony_type', 'start_time', 'end_time',
  'menu', 'special_menus', 'protocols',
  'barra_libre_musica', 'contrataciones_externas',
  'fechas_importantes', 'cliente_info', 'ubicacion_montajes',
]

function hasChanged(incoming: SheetWeddingRaw, existing: Record<string, unknown>): boolean {
  for (const field of COMPARE_FIELDS) {
    if (JSON.stringify(sortKeys(incoming[field] as Record<string, unknown>)) !==
        JSON.stringify(sortKeys(existing[field] as Record<string, unknown>))) {
      return true
    }
  }
  return false
}

function toFirestoreDoc(w: SheetWeddingRaw): Record<string, unknown> {
  const doc: Record<string, unknown> = {
    couples_name: w.couples_name || '',
    clients:      w.clients || '',
    date:         w.date || '',
    coordinator:  w.coordinator || '',
    adults:       w.adults || 0,
    children:     w.children || 0,
    professionals: w.professionals || 0,
    ceremony_time: w.ceremony_time || '',
    ceremony_place: w.ceremony_place || '',
    service_type: w.service_type || '',
    ceremony_type: w.ceremony_type || '',
    start_time:   w.start_time || '',
    end_time:     w.end_time || '',
    file_source:  w.file_source || '',
    menu:                    cleanUndefined(w.menu) || {},
    special_menus:           cleanUndefined(w.special_menus) || {},
    special_menus_detailed:  cleanUndefined(w.special_menus_detailed) || [],
    protocols:               cleanUndefined(w.protocols) || {},
    barra_libre_musica:      cleanUndefined(w.barra_libre_musica) || {},
    contrataciones_externas: cleanUndefined(w.contrataciones_externas) || {},
    fechas_importantes:      cleanUndefined(w.fechas_importantes) || {},
    cliente_info:            cleanUndefined(w.cliente_info) || {},
    ubicacion_montajes:      cleanUndefined(w.ubicacion_montajes) || {},
    cuentas_detalle:         cleanUndefined(w.cuentas_detalle) || {},
    notes:       w.notes || [],
    sync_source: 'sheets',
    synced_at:   new Date().toISOString(),
  }
  return doc
}

// ─── HISTORY ENTRY ───────────────────────────────────────────────────────────

function buildHistoryEntry(incoming: SheetWeddingRaw, existing: Record<string, unknown>): Record<string, unknown> {
  const changes: string[] = []

  // Campos simples
  const simpleFields: Array<[keyof SheetWeddingRaw, string]> = [
    ['date',          'Fecha boda'],
    ['adults',        'Adultos'],
    ['children',      'Niños'],
    ['coordinator',   'Coordinadora'],
    ['service_type',  'Tipo servicio'],
    ['ceremony_type', 'Tipo ceremonia'],
    ['start_time',    'Hora inicio'],
    ['end_time',      'Hora cierre'],
    ['clients',       'Clientes'],
  ]
  for (const [field, label] of simpleFields) {
    const nv = String(incoming[field] ?? '')
    const ov = String(existing[field] ?? '')
    if (nv !== ov && nv) changes.push(`${label}: "${ov || '–'}" → "${nv}"`)
  }

  // Menú (campos principales)
  const newMenu  = (incoming.menu  ?? {}) as Record<string, unknown>
  const oldMenu  = (existing.menu  ?? {}) as Record<string, unknown>
  for (const f of ['entrante', 'pescado', 'carne', 'postre']) {
    if (String(newMenu[f] ?? '') !== String(oldMenu[f] ?? ''))
      changes.push(`Menú ${f}: "${String(oldMenu[f] ?? '–')}" → "${String(newMenu[f] ?? '')}"`)
  }

  // Menús especiales
  const newSp = (incoming.special_menus ?? {}) as Record<string, number>
  const oldSp = (existing.special_menus ?? {})  as Record<string, number>
  for (const k of Object.keys(newSp)) {
    if ((newSp[k] ?? 0) !== (oldSp[k] ?? 0))
      changes.push(`Menú especial ${k}: ${oldSp[k] ?? 0} → ${newSp[k]}`)
  }

  // Barra / contrataciones / fechas (indicar sección cambiada)
  const sections: Array<[keyof SheetWeddingRaw, string]> = [
    ['barra_libre_musica',      'Barra y música'],
    ['contrataciones_externas', 'Contrataciones externas'],
    ['fechas_importantes',      'Fechas importantes'],
    ['cliente_info',            'Datos cliente'],
    ['ubicacion_montajes',      'Montajes'],
  ]
  for (const [field, label] of sections) {
    if (JSON.stringify(sortKeys(incoming[field] as Record<string, unknown>)) !==
        JSON.stringify(sortKeys(existing[field]  as Record<string, unknown>)))
      changes.push(`${label} actualizado`)
  }

  return {
    date:    new Date().toISOString(),
    type:    'sync',
    source:  'google_sheets',
    author:  incoming.file_source || incoming.coordinator || 'Sync automático',
    comment: changes.length > 0
      ? changes.join(' · ')
      : 'Actualización desde Google Sheets',
    changes,
  }
}

// ─── MAIN SYNC ────────────────────────────────────────────────────────────────

export async function syncAllSheets(
  configs: SheetCoordConfig[],
  onProgress: (p: SyncProgress) => void
): Promise<SyncStats> {
  const started = Date.now()
  const stats: SyncStats = { total: 0, updated: 0, created: 0, unchanged: 0, errors: [], durationMs: 0 }
  const active = configs.filter(c => c.sheetUrl?.trim())

  if (!active.length) {
    onProgress({ phase: 'error', current: 0, total: 0, message: 'No hay URLs configuradas' })
    return stats
  }

  // 1. Fetch all sheets (SERIALIZAR para no saturar API de Google: max 60 req/min)
  onProgress({ phase: 'fetching', current: 0, total: active.length, message: 'Descargando hojas...' })
  const allIncoming: SheetWeddingRaw[] = []

  for (let i = 0; i < active.length; i++) {
    const config = active[i]
    const name = config.coordinadora
    try {
      const result = await fetchFromGoogleSheet(config)
      if (result.ok) {
        allIncoming.push(...result.weddings)
        onProgress({ phase: 'fetching', current: i + 1, total: active.length, message: `${name}: ${result.weddings.length} bodas` })
      } else {
        const err = result.error ?? 'Error desconocido'
        stats.errors.push(`${name}: ${err}`)
        onProgress({ phase: 'fetching', current: i + 1, total: active.length, message: `${name}: Error` })
      }
    } catch (err) {
      stats.errors.push(`${name}: ${err instanceof Error ? err.message : String(err)}`)
      onProgress({ phase: 'fetching', current: i + 1, total: active.length, message: `${name}: Error` })
    }
  }

  stats.total = allIncoming.length

  // 2. Load Firestore index
  onProgress({ phase: 'comparing', current: 0, total: allIncoming.length, message: 'Cargando Firestore...' })
  const snap = await getDocs(collection(db, 'weddings'))
  const firestoreMap = new Map<string, { id: string; data: Record<string, unknown> }>()
  snap.forEach(d => {
    const cn = (d.data().couples_name as string) || ''
    firestoreMap.set(normalizeName(cn), { id: d.id, data: d.data() as Record<string, unknown> })
  })

  // 3. Diff and write
  onProgress({ phase: 'writing', current: 0, total: allIncoming.length, message: 'Comparando y actualizando...' })
  let processed = 0

  for (const incoming of allIncoming) {
    const key = normalizeName(incoming.couples_name)
    let existing = firestoreMap.get(key)

    // Fuzzy fallback (first 15 chars)
    if (!existing) {
      const short = key.slice(0, 15)
      firestoreMap.forEach((v, k) => {
        if (!existing && (k.startsWith(short) || short.startsWith(k.slice(0, 15)))) existing = v
      })
    }

    try {
      if (existing) {
        if (hasChanged(incoming, existing.data)) {
          // Actualizar datos PERO preservar status + añadir entrada al historial
          const historyEntry = buildHistoryEntry(incoming, existing.data)
          await updateDoc(doc(db, 'weddings', existing.id), {
            ...toFirestoreDoc(incoming),
            // status NO se incluye → Firestore lo conserva sin tocarlo
            history: arrayUnion(historyEntry),
          })
          stats.updated++
        } else {
          stats.unchanged++
        }
      } else {
        // Boda nueva: status inicial + primera entrada en historial
        await addDoc(collection(db, 'weddings'), {
          ...toFirestoreDoc(incoming),
          status: 'pending',
          history: [{
            date:    new Date().toISOString(),
            type:    'created',
            source:  'google_sheets',
            author:  incoming.file_source || incoming.coordinator || 'Sync',
            comment: 'Boda creada desde Google Sheets',
            changes: [],
          }],
        })
        stats.created++
      }
    } catch (err) {
      stats.errors.push(`${incoming.couples_name}: ${err instanceof Error ? err.message : err}`)
    }

    processed++
    if (processed % 5 === 0 || processed === allIncoming.length) {
      onProgress({ phase: 'writing', current: processed, total: allIncoming.length, message: `${processed}/${allIncoming.length} procesadas` })
    }
  }

  stats.durationMs = Date.now() - started
  onProgress({ phase: 'done', current: allIncoming.length, total: allIncoming.length, message: `✓ Sync completado en ${(stats.durationMs / 1000).toFixed(1)}s` })
  return stats
}
