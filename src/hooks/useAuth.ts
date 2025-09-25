import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { AuthUser } from '@/types'

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
      } catch (_err) {
        if (mounted) {
          setAuthState({
            user: null,
            loading: false,
            error: _err instanceof Error ? _err.message : 'Authentication error',
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
    } catch (_err) {
      return {
        success: false,
        error: _err instanceof Error ? _err.message : 'Failed to send magic link',
      }
    }
  }

  const signUpWithPassword = async (
    email: string,
    password: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      // First, try to sign up
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) {
        // If user already exists, they might have a magic link account
        // Try to sign them in and update their password
        if (error.message.includes('User already registered')) {
          // Try to sign in with magic link first to check if account exists
          const { error: linkError } = await supabase.auth.signInWithOtp({
            email,
            options: {
              shouldCreateUser: false,
            },
          })

          if (!linkError) {
            return {
              success: false,
              error:
                'An account with this email already exists. Please sign in with magic link and then add a password from settings.',
            }
          }

          // If magic link also fails, show original error
          return { success: false, error: error.message }
        }
        return { success: false, error: error.message }
      }

      if (!data.user) {
        return { success: false, error: 'Failed to create user account' }
      }

      // If email confirmation is not required, user is logged in immediately
      if (data.session) {
        const user: AuthUser = {
          id: data.user.id,
          email: data.user.email || '',
          emailConfirmed: !!data.user.email_confirmed_at,
          createdAt: data.user.created_at,
        }
        setAuthState({ user, loading: false, error: null })
      }

      return { success: true }
    } catch (_err) {
      return {
        success: false,
        error: _err instanceof Error ? _err.message : 'Failed to create account',
      }
    }
  }

  const signInWithPassword = async (
    email: string,
    password: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        return { success: false, error: error.message }
      }

      if (!data.user) {
        return { success: false, error: 'Invalid credentials' }
      }

      const user: AuthUser = {
        id: data.user.id,
        email: data.user.email || '',
        emailConfirmed: !!data.user.email_confirmed_at,
        createdAt: data.user.created_at,
      }
      setAuthState({ user, loading: false, error: null })

      return { success: true }
    } catch (_err) {
      return {
        success: false,
        error: _err instanceof Error ? _err.message : 'Failed to sign in',
      }
    }
  }

  const updatePassword = async (
    newPassword: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (_err) {
      return {
        success: false,
        error: _err instanceof Error ? _err.message : 'Failed to update password',
      }
    }
  }

  const resetPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // For users who have magic link accounts, this will add a password to their account
      // For users with password accounts, this will reset their password
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) {
        // Supabase might return an error if the user doesn't exist
        // But we don't want to reveal that for security reasons
        return { success: true }
      }

      return { success: true }
    } catch (_err) {
      // Don't reveal errors for security reasons
      return { success: true }
    }
  }

  const signOut = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.auth.signOut()

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (_err) {
      return {
        success: false,
        error: _err instanceof Error ? _err.message : 'Failed to sign out',
      }
    }
  }

  return {
    user: authState.user,
    loading: authState.loading,
    error: authState.error,
    isAuthenticated: !!authState.user,
    signInWithMagicLink,
    signUpWithPassword,
    signInWithPassword,
    updatePassword,
    resetPassword,
    signOut,
  }
}
