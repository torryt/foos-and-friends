import type { AuthUser } from '@foos/shared'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/init'

interface AuthState {
  user: AuthUser | null
  loading: boolean
  error: string | null
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
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
    redirectTo?: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const finalRedirectUrl = redirectTo || window.location.origin

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: finalRedirectUrl,
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
    signInWithMagicLink,
    signOut,
  }
}
