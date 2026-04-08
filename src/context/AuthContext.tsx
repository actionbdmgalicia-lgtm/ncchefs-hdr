import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { User as FirebaseUser } from 'firebase/auth'
import {
  onAuthStateChanged,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../services/firebase'
import type { User, UserRole } from '../types'

interface AuthContextType {
  currentUser: User | null
  loading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  signup: (email: string, password: string, name: string) => Promise<void>
  resetPassword: (email: string) => Promise<void>
  isAdmin: () => boolean
  isCoordinator: () => boolean
  hasRole: (role: UserRole) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch additional user data from Firestore
  const fetchUserData = async (firebaseUser: FirebaseUser): Promise<User | null> => {
    try {
      const userRef = doc(db, 'users', firebaseUser.uid)
      const userSnap = await getDoc(userRef)

      if (!userSnap.exists()) {
        console.warn(`No user document found for ${firebaseUser.uid}`)
        return null
      }

      const userData = userSnap.data()
      return {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        name: userData.name || '',
        role: userData.role || 'viewer',
        venues: userData.venues || [],
        active: userData.active ?? true,
        createdAt: userData.createdAt?.toDate() || new Date(),
        updatedAt: userData.updatedAt?.toDate() || new Date(),
      }
    } catch (err) {
      console.error('Error fetching user data:', err)
      return null
    }
  }

  // Monitor auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const userData = await fetchUserData(firebaseUser)
          setCurrentUser(userData)
        } else {
          setCurrentUser(null)
        }
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Auth error')
        setCurrentUser(null)
      } finally {
        setLoading(false)
      }
    })

    return unsubscribe
  }, [])

  const login = async (email: string, password: string) => {
    try {
      setError(null)
      await signInWithEmailAndPassword(auth, email, password)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed'
      setError(message)
      throw err
    }
  }

  const logout = async () => {
    try {
      setError(null)
      await signOut(auth)
      setCurrentUser(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Logout failed'
      setError(message)
      throw err
    }
  }

  const signup = async (email: string, password: string, _name: string) => {
    try {
      setError(null)
      const result = await createUserWithEmailAndPassword(auth, email, password)
      console.log('User created:', result.user.uid, '- Note: Admin must assign role in Firestore')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Signup failed'
      setError(message)
      throw err
    }
  }

  const resetPassword = async (email: string) => {
    try {
      setError(null)
      await sendPasswordResetEmail(auth, email)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Password reset failed'
      setError(message)
      throw err
    }
  }

  const isAdmin = () => currentUser?.role === 'admin'
  const isCoordinator = () => currentUser?.role === 'coordinador'
  const hasRole = (role: UserRole) => currentUser?.role === role

  const value: AuthContextType = {
    currentUser,
    loading,
    error,
    login,
    logout,
    signup,
    resetPassword,
    isAdmin,
    isCoordinator,
    hasRole,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
