import { useEffect, useState } from 'react'
import { getSupabase, isSupabaseMockMode } from '../lib/supabase.ts'
import { MOCK_USER } from '../mock/mock-data.ts'
import type { AuthUser } from '../types/index.ts'
import * as authApi from './authApi.ts'
import type { AuthResult, SignUpResult } from './authApi.ts'

interface AuthState {
  user: AuthUser | null
  loading: boolean
  error: string | null
}

const toAuthUser = (sessionUser: {
  id: string
  email?: string
  email_confirmed_at?: string
  created_at: string
}): AuthUser => ({
  id: sessionUser.id,
  email: sessionUser.email || '',
  emailConfirmed: !!sessionUser.email_confirmed_at,
  createdAt: sessionUser.created_at,
})

export const useAuth = () => {
  const isMockMode = isSupabaseMockMode()

  const [authState, setAuthState] = useState<AuthState>(
    isMockMode
      ? { user: MOCK_USER, loading: false, error: null }
      : { user: null, loading: true, error: null },
  )

  useEffect(() => {
    if (isMockMode) return

    const supabase = getSupabase()
    let mounted = true

    // Get initial session
    const getInitialSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()

        if (!mounted) return

        if (error) {
          setAuthState({ user: null, loading: false, error: error.message })
          return
        }

        setAuthState({
          user: session?.user ? toAuthUser(session.user) : null,
          loading: false,
          error: null,
        })
      } catch (err) {
        if (mounted) {
          setAuthState({
            user: null,
            loading: false,
            error: err instanceof Error ? err.message : 'Authentication error',
          })
        }
      }
    }

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return

      setAuthState({
        user: session?.user ? toAuthUser(session.user) : null,
        loading: false,
        error: null,
      })
    })

    getInitialSession()

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [isMockMode])

  const signInWithMagicLink = async (email: string, redirectTo?: string): Promise<AuthResult> => {
    if (isMockMode) return { success: true }
    return authApi.signInWithMagicLink(getSupabase(), email, redirectTo || window.location.origin)
  }

  const signInWithPassword = async (email: string, password: string): Promise<AuthResult> => {
    if (isMockMode) return { success: true }
    return authApi.signInWithPassword(getSupabase(), email, password)
  }

  const signUp = async (
    email: string,
    password: string,
    redirectTo?: string,
  ): Promise<SignUpResult> => {
    if (isMockMode) return { success: true, needsConfirmation: false }
    return authApi.signUp(getSupabase(), email, password, redirectTo || window.location.origin)
  }

  const resetPassword = async (email: string): Promise<AuthResult> => {
    if (isMockMode) return { success: true }
    return authApi.resetPassword(getSupabase(), email, `${window.location.origin}/reset-password`)
  }

  // Only meant to be called from the /reset-password page, where the user has a
  // fresh recovery session from the emailed link.
  const updatePassword = async (newPassword: string): Promise<AuthResult> => {
    if (isMockMode) return { success: true }
    return authApi.updatePassword(getSupabase(), newPassword)
  }

  const signOut = async (): Promise<AuthResult> => {
    if (isMockMode) return { success: true }
    return authApi.signOut(getSupabase())
  }

  return {
    user: authState.user,
    loading: authState.loading,
    error: authState.error,
    isAuthenticated: !!authState.user,
    signInWithMagicLink,
    signInWithPassword,
    signUp,
    resetPassword,
    updatePassword,
    signOut,
  }
}
