import { useEffect, useState } from 'react'
import { isMockMode, isSupabaseAvailable, supabase } from '@/lib/supabase'
import type { AuthUser } from '@/types'

interface AuthState {
  user: AuthUser | null
  loading: boolean
  error: string | null
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: !isMockMode, // In mock mode, no loading needed
    error: null,
  })

  useEffect(() => {
    // In mock mode, simulate authenticated user
    if (isMockMode) {
      setAuthState({
        user: {
          id: 'mock-user-id',
          email: 'demo@foosandfriends.com',
          emailConfirmed: true,
          createdAt: new Date().toISOString(),
        },
        loading: false,
        error: null,
      })
      return
    }

    // Real Supabase authentication
    if (!isSupabaseAvailable() || !supabase) {
      setAuthState((prev) => ({ ...prev, loading: false, error: 'Supabase not available' }))
      return
    }

    let mounted = true

    // Get initial session
    const getInitialSession = async () => {
      try {
        if (!supabase) return

        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()

        if (!mounted) return

        if (error) {
          setAuthState({ user: null, loading: false, error: error.message })
          return
        }

        const user = session?.user
          ? {
              id: session.user.id,
              email: session.user.email || '',
              emailConfirmed: !!session.user.email_confirmed_at,
              createdAt: session.user.created_at,
            }
          : null

        setAuthState({ user, loading: false, error: null })
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
    if (!supabase) return () => {}

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return

      const user = session?.user
        ? {
            id: session.user.id,
            email: session.user.email || '',
            emailConfirmed: !!session.user.email_confirmed_at,
            createdAt: session.user.created_at,
          }
        : null

      setAuthState({ user, loading: false, error: null })
    })

    getInitialSession()

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signInWithMagicLink = async (
    email: string,
  ): Promise<{ success: boolean; error?: string }> => {
    // In mock mode, simulate successful magic link send
    if (isMockMode) {
      console.log('Mock mode: Magic link would be sent to', email)
      return { success: true }
    }

    if (!isSupabaseAvailable() || !supabase) {
      return { success: false, error: 'Authentication service not available' }
    }

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin,
        },
      })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to send magic link',
      }
    }
  }

  const signOut = async (): Promise<{ success: boolean; error?: string }> => {
    // In mock mode, simulate signout
    if (isMockMode) {
      setAuthState({
        user: null,
        loading: false,
        error: null,
      })
      return { success: true }
    }

    if (!isSupabaseAvailable() || !supabase) {
      return { success: false, error: 'Authentication service not available' }
    }

    try {
      const { error } = await supabase.auth.signOut()

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to sign out',
      }
    }
  }

  return {
    user: authState.user,
    loading: authState.loading,
    error: authState.error,
    isAuthenticated: !!authState.user,
    isMockMode,
    signInWithMagicLink,
    signOut,
  }
}
