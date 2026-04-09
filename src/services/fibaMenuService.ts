import type { FIBAPlato, FIBAGrupo } from '../types'

// Use Firestore REST API directly to avoid Firebase SDK's real-time channel CORS issues
const FIBA_PROJECT = 'fiba-menus'
const FIBA_API_KEY = 'AIzaSyBrITPuq_PTJ9VR9fBBN1kGT8ul7rqoslc'
const FIBA_BASE = `https://firestore.googleapis.com/v1/projects/${FIBA_PROJECT}/databases/(default)/documents`

// Firestore REST value → JS primitive
function fromFirestoreValue(val: Record<string, unknown>): unknown {
  if ('stringValue' in val) return val.stringValue
  if ('integerValue' in val) return Number(val.integerValue)
  if ('doubleValue' in val) return Number(val.doubleValue)
  if ('booleanValue' in val) return val.booleanValue
  if ('nullValue' in val) return null
  if ('arrayValue' in val) {
    const arr = val.arrayValue as { values?: Record<string, unknown>[] }
    return (arr.values || []).map(v => fromFirestoreValue(v))
  }
  if ('mapValue' in val) {
    const map = val.mapValue as { fields?: Record<string, Record<string, unknown>> }
    const result: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(map.fields || {})) {
      result[k] = fromFirestoreValue(v)
    }
    return result
  }
  return null
}

// Convert a Firestore REST document to plain JS object
function fromFirestoreDoc(doc: Record<string, unknown>): Record<string, unknown> {
  const fields = (doc.fields || {}) as Record<string, Record<string, unknown>>
  const result: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(fields)) {
    result[k] = fromFirestoreValue(v)
  }
  return result
}

// GET all documents from a collection via REST
async function getCollection(collectionName: string): Promise<Array<{ id: string; data: Record<string, unknown> }>> {
  const url = `${FIBA_BASE}/${collectionName}?key=${FIBA_API_KEY}`
  const res = await fetch(url)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`FIBA REST ${collectionName} ${res.status}: ${text}`)
  }
  const json = await res.json() as { documents?: Array<Record<string, unknown>> }
  const docs = json.documents || []
  return docs.map(d => {
    const name = d.name as string
    const id = name.split('/').pop() || ''
    return { id, data: fromFirestoreDoc(d) }
  })
}

// GET a single document via REST
async function getDocument(collectionName: string, docId: string): Promise<{ id: string; data: Record<string, unknown> } | null> {
  const url = `${FIBA_BASE}/${collectionName}/${docId}?key=${FIBA_API_KEY}`
  const res = await fetch(url)
  if (res.status === 404) return null
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`FIBA REST ${collectionName}/${docId} ${res.status}: ${text}`)
  }
  const d = await res.json() as Record<string, unknown>
  const name = d.name as string
  const id = name.split('/').pop() || ''
  return { id, data: fromFirestoreDoc(d) }
}

// Extract a FIBAPlato from document data (handles both flat and value[] structures)
function extractPlato(id: string, data: Record<string, unknown>): FIBAPlato | null {
  // Structure 1: { nombre, precio }
  if (typeof data.nombre === 'string') {
    return { id, nombre: data.nombre, precio: data.precio as number }
  }
  // Structure 2: { value: [{ id, nombre, precio }] }
  if (Array.isArray(data.value) && data.value.length > 0) {
    const item = data.value[0] as Record<string, unknown>
    if (typeof item.nombre === 'string') {
      return {
        id: (item.id as string) || id,
        nombre: item.nombre,
        precio: item.precio as number
      }
    }
  }
  return null
}

/**
 * Get all grupos (categories) from FIBA
 */
export async function getGrupos(): Promise<FIBAGrupo[]> {
  try {
    const docs = await getCollection('grupos')
    console.log('[FIBA] grupos count:', docs.length)
    return docs.map(({ id, data }) => ({ id, ...data })) as FIBAGrupo[]
  } catch (error) {
    console.error('[FIBA] Error fetching grupos:', error)
    return []
  }
}

/**
 * Get all platos
 */
export async function getAllPlatos(): Promise<FIBAPlato[]> {
  const docs = await getCollection('platos')
  console.log('[FIBA] platos raw count:', docs.length)
  if (docs.length > 0) {
    console.log('[FIBA] first doc id:', docs[0].id, 'keys:', Object.keys(docs[0].data))
  }
  const platos: FIBAPlato[] = []
  docs.forEach(({ id, data }) => {
    const p = extractPlato(id, data)
    if (p) platos.push(p)
  })
  console.log('[FIBA] extracted platos:', platos.length)
  return platos
}

/**
 * Search platos by nombre
 */
export async function searchFIBAPlatos(query: string): Promise<FIBAPlato[]> {
  try {
    const all = await getAllPlatos()
    return all.filter(p => p.nombre.toLowerCase().includes(query.toLowerCase())).slice(0, 20)
  } catch (error) {
    console.error('[FIBA] Error searching platos:', error)
    return []
  }
}

/**
 * Get platos for a specific grupo
 */
export async function getPlatosByGrupo(grupoId: string): Promise<FIBAPlato[]> {
  try {
    const grupoDoc = await getDocument('grupos', grupoId)
    if (!grupoDoc) return []
    const platoIds = (grupoDoc.data.plato_ids as string[]) || []
    const results = await Promise.all(platoIds.map(pId => getDocument('platos', pId)))
    return results
      .filter((d): d is { id: string; data: Record<string, unknown> } => d !== null)
      .map(({ id, data }) => extractPlato(id, data))
      .filter((p): p is FIBAPlato => p !== null)
  } catch (error) {
    console.error(`[FIBA] Error fetching platos for grupo ${grupoId}:`, error)
    return []
  }
}

/**
 * Get a single plato by ID
 */
export async function getPlatoById(platoId: string): Promise<FIBAPlato | null> {
  try {
    const d = await getDocument('platos', platoId)
    if (!d) return null
    return extractPlato(d.id, d.data)
  } catch (error) {
    console.error(`[FIBA] Error fetching plato ${platoId}:`, error)
    return null
  }
}

/**
 * Search platos globally
 */
export async function searchGlobalPlatos(searchTerm: string): Promise<FIBAPlato[]> {
  return searchFIBAPlatos(searchTerm)
}

/**
 * Get menu templates (menus_tipo)
 */
export async function getMenuTemplates(): Promise<Record<string, unknown>[]> {
  try {
    const docs = await getCollection('menus_tipo')
    return docs.map(({ id, data }) => ({ id, ...data }))
  } catch (error) {
    console.error('[FIBA] Error fetching menu templates:', error)
    return []
  }
}

/**
 * Get a single menu template by ID
 */
export async function getMenuTemplate(menuId: string): Promise<Record<string, unknown> | null> {
  try {
    const d = await getDocument('menus_tipo', menuId)
    if (!d) return null
    return { id: d.id, ...d.data }
  } catch (error) {
    console.error(`[FIBA] Error fetching menu template ${menuId}:`, error)
    return null
  }
}

/**
 * Get platos for a menu template slot (array of grupo_ids)
 */
export async function getPlatosByMenuSlot(catalogo: string[]): Promise<FIBAPlato[]> {
  const all: FIBAPlato[] = []
  for (const grupoId of catalogo) {
    const platos = await getPlatosByGrupo(grupoId)
    all.push(...platos)
  }
  return all
}
