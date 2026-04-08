import {
  doc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import type { WeddingVersion, WeddingVersionSnapshot } from '../types'

export async function saveWeddingVersion(
  weddingId: string,
  changes: WeddingVersionSnapshot,
  changedBy: string,
  changedByName: string,
  reason?: string
): Promise<string> {
  const versionId = `v_${Date.now()}`

  const version: WeddingVersion = {
    id: versionId,
    timestamp: new Date(),
    changedBy,
    changedByName,
    reason,
    snapshot: changes,
    evaluations: {}
  }

  try {
    await updateDoc(doc(db, 'weddings', weddingId), {
      versions: arrayUnion(version),
      ...changes,
      updatedAt: serverTimestamp()
    })
    return versionId
  } catch (error) {
    console.error('Error saving wedding version:', error)
    throw error
  }
}

export async function restoreWeddingVersion(
  weddingId: string,
  versionId: string,
  restoredBy: string,
  restoredByName: string
): Promise<void> {
  // This function will be called with a versionId
  // It should fetch the version from the versions array
  // Create a new version snapshot = "Restaurado desde {versionId}"
  // Save as new version

  try {
    // Get the wedding to find the version
    const weddingDoc = doc(db, 'weddings', weddingId)

    // The actual restoration happens on the client side
    // This function confirms the restore in Firestore
    const restoreVersion: WeddingVersion = {
      id: `v_${Date.now()}`,
      timestamp: new Date(),
      changedBy: restoredBy,
      changedByName: restoredByName,
      reason: `Restaurado desde versión ${versionId}`,
      snapshot: {},
      evaluations: {}
    }

    await updateDoc(weddingDoc, {
      versions: arrayUnion(restoreVersion),
      updatedAt: serverTimestamp()
    })
  } catch (error) {
    console.error('Error restoring wedding version:', error)
    throw error
  }
}

export async function updateWeddingStatus(
  weddingId: string,
  newStatus: 'inicial' | 'prueba_menu' | 'final',
  changedBy: string,
  changedByName: string
): Promise<void> {
  try {
    // Create a version snapshot when status changes
    const version: WeddingVersion = {
      id: `v_${Date.now()}`,
      timestamp: new Date(),
      changedBy,
      changedByName,
      reason: `Estado cambió a ${newStatus}`,
      snapshot: {},
      evaluations: {}
    }

    await updateDoc(doc(db, 'weddings', weddingId), {
      hdrStatus: newStatus,
      versions: arrayUnion(version),
      updatedAt: serverTimestamp()
    })
  } catch (error) {
    console.error('Error updating wedding status:', error)
    throw error
  }
}

export async function addWeddingEvaluation(
  weddingId: string,
  versionId: string,
  statusType: 'inicial' | 'prueba_menu' | 'final',
  evaluatedBy: string,
  evaluatedByName: string,
  notes: string
): Promise<void> {
  try {
    const evaluation = {
      evaluatedBy,
      evaluatedByName,
      date: new Date(),
      notes
    }

    // Note: In a real implementation, we'd need to find the specific version
    // and update its evaluations. For now, this is a simplified version.
    await updateDoc(doc(db, 'weddings', weddingId), {
      [`evaluations.${statusType}`]: evaluation,
      updatedAt: serverTimestamp()
    })
  } catch (error) {
    console.error('Error adding wedding evaluation:', error)
    throw error
  }
}
