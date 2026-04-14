import { collection, getDocs, doc, updateDoc, addDoc } from 'firebase/firestore'
import { db } from './firebase'
import type { SheetCoordConfig, SheetWeddingRaw, SyncStats, SyncProgress } from '../types'

// ─── CONFIG PERSISTENCE ───────────────────────────────────────────────────────

const LS_KEY = 'ncchefs_sheets_config'
const LS_LAST_SYNC = 'ncchefs_last_sync'

export function loadSyncConfig(): SheetCoordConfig[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) return JSON.parse(raw) as SheetCoordConfig[]
  } catch { /* ignore */ }
  return [
    { coordinadora: 'Marta',      scriptUrl: '' },
    { coordinadora: 'Rosa',       scriptUrl: '' },
    { coordinadora: 'Sara',       scriptUrl: '' },
    { coordinadora: 'Andrea',     scriptUrl: '' },
    { coordinadora: 'Jimena/Bea', scriptUrl: '' },
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

// ─── FETCH ONE SHEET ─────────────────────────────────────────────────────────

export async function fetchFromSheet(config: SheetCoordConfig): Promise<{
  coordinadora: string; ok: boolean; weddings: SheetWeddingRaw[]; error?: string
}> {
  if (!config.scriptUrl.trim()) {
    return { coordinadora: config.coordinadora, ok: false, weddings: [], error: 'URL no configurada' }
  }
  try {
    const url = `${config.scriptUrl}?t=${Date.now()}`
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json() as { ok: boolean; weddings: SheetWeddingRaw[]; error?: string }
    if (!json.ok) throw new Error(json.error ?? 'Script returned ok:false')
    return { coordinadora: config.coordinadora, ok: true, weddings: json.weddings ?? [] }
  } catch (err) {
    return {
      coordinadora: config.coordinadora, ok: false, weddings: [],
      error: err instanceof Error ? err.message : String(err),
    }
  }
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
  return {
    couples_name: w.couples_name || '',
    clients:      w.clients || '',
    date:         w.date || '',
    coordinator:  w.coordinator || '',
    adults:       w.adults || 0,
    children:     w.children || 0,
    service_type: w.service_type || '',
    ceremony_type: w.ceremony_type || '',
    start_time:   w.start_time || '',
    end_time:     w.end_time || '',
    file_source:  w.file_source || '',
    menu:                    w.menu || {},
    special_menus:           w.special_menus || {},
    protocols:               w.protocols || {},
    barra_libre_musica:      w.barra_libre_musica || {},
    contrataciones_externas: w.contrataciones_externas || {},
    fechas_importantes:      w.fechas_importantes || {},
    cliente_info:            w.cliente_info || {},
    ubicacion_montajes:      w.ubicacion_montajes || {},
    notes:       w.notes || [],
    sync_source: 'sheets',
    synced_at:   new Date().toISOString(),
  }
}

// ─── MAIN SYNC ────────────────────────────────────────────────────────────────

export async function syncAllSheets(
  configs: SheetCoordConfig[],
  onProgress: (p: SyncProgress) => void
): Promise<SyncStats> {
  const started = Date.now()
  const stats: SyncStats = { total: 0, updated: 0, created: 0, unchanged: 0, errors: [], durationMs: 0 }
  const active = configs.filter(c => c.scriptUrl.trim())

  if (!active.length) {
    onProgress({ phase: 'error', current: 0, total: 0, message: 'No hay URLs configuradas' })
    return stats
  }

  // 1. Fetch all sheets
  onProgress({ phase: 'fetching', current: 0, total: active.length, message: 'Descargando hojas...' })
  const results = await Promise.allSettled(active.map(c => fetchFromSheet(c)))

  const allIncoming: SheetWeddingRaw[] = []
  results.forEach((r, i) => {
    const name = active[i].coordinadora
    if (r.status === 'fulfilled' && r.value.ok) {
      allIncoming.push(...r.value.weddings)
      onProgress({ phase: 'fetching', current: i + 1, total: active.length, message: `${name}: ${r.value.weddings.length} bodas` })
    } else {
      const err = r.status === 'rejected' ? String(r.reason) : (r.value.error ?? 'Error desconocido')
      stats.errors.push(`${name}: ${err}`)
      onProgress({ phase: 'fetching', current: i + 1, total: active.length, message: `${name}: Error` })
    }
  })

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
          await updateDoc(doc(db, 'weddings', existing.id), toFirestoreDoc(incoming))
          stats.updated++
        } else {
          stats.unchanged++
        }
      } else {
        await addDoc(collection(db, 'weddings'), { ...toFirestoreDoc(incoming), status: 'pending' })
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
