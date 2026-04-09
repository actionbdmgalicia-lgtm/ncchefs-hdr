import {
  initializeApp,
  getApps,
} from 'firebase/app'
import {
  getFirestore,
  collection,
  getDocs,
  getDoc,
  doc
} from 'firebase/firestore'
import type { FIBAPlato, FIBAGrupo } from '../types'

// FIBA Firebase configuration
const fibaConfig = {
  apiKey: 'AIzaSyBrITPuq_PTJ9VR9fBBN1kGT8ul7rqoslc',
  authDomain: 'fiba-menus.firebaseapp.com',
  projectId: 'fiba-menus',
  storageBucket: 'fiba-menus.firebasestorage.app',
  messagingSenderId: '376886606551',
  appId: '1:376886606551:web:52c857e3ae84e7a07ace92'
}

// Initialize FIBA Firebase app
let fibaApp = getApps().find(app => app.name === 'fiba')
if (!fibaApp) {
  fibaApp = initializeApp(fibaConfig, 'fiba')
}

const fibaDb = getFirestore(fibaApp)

/**
 * Get all grupos (categories) from FIBA
 */
export async function getGrupos(): Promise<FIBAGrupo[]> {
  try {
    const snap = await getDocs(collection(fibaDb, 'grupos'))
    return snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    })) as FIBAGrupo[]
  } catch (error) {
    console.error('Error fetching FIBA grupos:', error)
    return []
  }
}

/**
 * Search platos by nombre (name contains)
 */
export async function searchFIBAPlatos(query: string): Promise<FIBAPlato[]> {
  try {
    const allPlatos = await getAllPlatos()
    return allPlatos
      .filter(p => p.nombre.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 20)
  } catch (error) {
    console.error('Error searching FIBA platos:', error)
    return []
  }
}

/**
 * Get all platos in a specific grupo
 */
export async function getPlatosByGrupo(grupoId: string): Promise<FIBAPlato[]> {
  try {
    // Get grupo to get plato_ids
    const grupoDoc = await getDoc(doc(fibaDb, 'grupos', grupoId))
    if (!grupoDoc.exists()) {
      console.warn(`Grupo ${grupoId} not found`)
      return []
    }

    const grupoData = grupoDoc.data() as FIBAGrupo
    const platoIds = grupoData.plato_ids || []

    // Fetch each plato
    const platos = await Promise.all(
      platoIds.map(pId => getDoc(doc(fibaDb, 'platos', pId)))
    )

    return platos
      .filter(snap => snap.exists())
      .map(snap => extractPlato(snap.id, snap.data() as Record<string, unknown>))
      .filter((p): p is FIBAPlato => p !== null)
  } catch (error) {
    console.error(`Error fetching platos for grupo ${grupoId}:`, error)
    return []
  }
}

/**
 * Get a single plato by ID
 */
export async function getPlatoById(platoId: string): Promise<FIBAPlato | null> {
  try {
    const platoDoc = await getDoc(doc(fibaDb, 'platos', platoId))
    if (!platoDoc.exists()) {
      return null
    }

    return extractPlato(platoDoc.id, platoDoc.data() as Record<string, unknown>)
  } catch (error) {
    console.error(`Error fetching plato ${platoId}:`, error)
    return null
  }
}

// Helper: extract plato from Firestore document data
// FIBA docs may store data directly or inside a 'value' array
function extractPlato(id: string, data: Record<string, unknown>): FIBAPlato | null {
  // Structure 1: { nombre, precio, ... }
  if (typeof data.nombre === 'string') {
    return { id, nombre: data.nombre, precio: data.precio as number }
  }
  // Structure 2: { value: [{ id, nombre, precio }], updatedAt }
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
 * Get all platos
 */
export async function getAllPlatos(): Promise<FIBAPlato[]> {
  try {
    const snap = await getDocs(collection(fibaDb, 'platos'))
    const platos: FIBAPlato[] = []
    snap.docs.forEach(d => {
      const plato = extractPlato(d.id, d.data() as Record<string, unknown>)
      if (plato) platos.push(plato)
    })
    return platos
  } catch (error) {
    console.error('Error fetching all platos:', error)
    return []
  }
}

/**
 * Get menu templates (menus_tipo)
 */
export async function getMenuTemplates(): Promise<any[]> {
  try {
    const snap = await getDocs(collection(fibaDb, 'menus_tipo'))
    return snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    }))
  } catch (error) {
    console.error('Error fetching menu templates:', error)
    return []
  }
}

/**
 * Get a single menu template by ID
 */
export async function getMenuTemplate(menuId: string): Promise<any | null> {
  try {
    const menuDoc = await getDoc(doc(fibaDb, 'menus_tipo', menuId))
    if (!menuDoc.exists()) {
      return null
    }

    return {
      id: menuDoc.id,
      ...menuDoc.data()
    }
  } catch (error) {
    console.error(`Error fetching menu template ${menuId}:`, error)
    return null
  }
}

/**
 * Get all platos for a menu template slot
 * A slot has a catalogo array of grupo_ids
 */
export async function getPlatosByMenuSlot(
  catalogo: string[]
): Promise<FIBAPlato[]> {
  try {
    const allPlatos: FIBAPlato[] = []

    // Fetch platos for each grupo in the catalogo
    for (const grupoId of catalogo) {
      const platos = await getPlatosByGrupo(grupoId)
      allPlatos.push(...platos)
    }

    return allPlatos
  } catch (error) {
    console.error('Error fetching platos for menu slot:', error)
    return []
  }
}

/**
 * Search platos globally (returns top 30 matches)
 */
export async function searchGlobalPlatos(searchTerm: string): Promise<FIBAPlato[]> {
  try {
    const allPlatos = await getAllPlatos()

    const filtered = allPlatos.filter(p =>
      p.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return filtered.slice(0, 30)
  } catch (error) {
    console.error('Error in global search:', error)
    return []
  }
}
