import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { AuthUser } from '@/types'

interface AuthState {
  user: AuthUser | null
  loading: boolean
  error: string | null
}

const isSupabaseAvailable = () => {
  return !!supabase && typeof supabase.auth !== 'undefined'
}

const isMockMode = !isSupabaseAvailable()

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    let mounted = true

    // Mock mode: skip Supabase initialization
    if (isMockMode) {
      // Check if we have a mock session stored
      const storedMockUser = localStorage.getItem('mockUser')
      if (storedMockUser) {
        const mockUser = JSON.parse(storedMockUser)
        setAuthState({ user: mockUser, loading: false, error: null })
      } else {
        setAuthState({ user: null, loading: false, error: null })
      }
      return
    }

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

    // Listen for auth changes (only if Supabase is available)
    const subscription = isSupabaseAvailable()
      ? supabase.auth.onAuthStateChange(async (_event, session) => {
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
        }).data.subscription
      : null

    getInitialSession()

    return () => {
      mounted = false
      subscription?.unsubscribe()
    }
  }, [])

  const signInWithMagicLink = async (
    email: string,
    redirectTo?: string,
  ): Promise<{ success: boolean; error?: string }> => {
    if (isMockMode) {
      // In mock mode, create a fake session
      const mockUser: AuthUser = {
        id: 'mock-user-id',
        email,
        emailConfirmed: true,
        createdAt: new Date().toISOString(),
      }
      localStorage.setItem('mockUser', JSON.stringify(mockUser))
      setAuthState({ user: mockUser, loading: false, error: null })
      return { success: true }
    }

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
    if (isMockMode) {
      // Mock signup - validate inputs and create session
      if (password.length < 6) {
        return { success: false, error: 'Password must be at least 6 characters' }
      }

      // Check if email is valid
      if (!/\S+@\S+\.\S+/.test(email)) {
        return { success: false, error: 'Please enter a valid email address' }
      }

      const mockUser: AuthUser = {
        id: `mock-user-${Date.now()}`,
        email,
        emailConfirmed: true,
        createdAt: new Date().toISOString(),
      }
      localStorage.setItem('mockUser', JSON.stringify(mockUser))
      localStorage.setItem('mockPassword', password) // Store for mock validation
      setAuthState({ user: mockUser, loading: false, error: null })
      return { success: true }
    }

    if (!isSupabaseAvailable()) {
      return { success: false, error: 'Authentication service not available' }
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) {
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
    if (isMockMode) {
      // Mock signin - validate against stored credentials
      const storedUser = localStorage.getItem('mockUser')
      const storedPassword = localStorage.getItem('mockPassword')

      if (!storedUser) {
        return { success: false, error: 'No account found with this email' }
      }

      const mockUser = JSON.parse(storedUser)
      if (mockUser.email !== email) {
        return { success: false, error: 'Invalid email or password' }
      }

      if (storedPassword !== password) {
        return { success: false, error: 'Invalid email or password' }
      }

      setAuthState({ user: mockUser, loading: false, error: null })
      return { success: true }
    }

    if (!isSupabaseAvailable()) {
      return { success: false, error: 'Authentication service not available' }
    }

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
    if (isMockMode) {
      if (newPassword.length < 6) {
        return { success: false, error: 'Password must be at least 6 characters' }
      }
      localStorage.setItem('mockPassword', newPassword)
      return { success: true }
    }

    if (!isSupabaseAvailable()) {
      return { success: false, error: 'Authentication service not available' }
    }

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
    if (isMockMode) {
      // In mock mode, just pretend to send the email
      console.log('Mock mode: Would send password reset email to', email)
      return { success: true }
    }

    if (!isSupabaseAvailable()) {
      return { success: false, error: 'Authentication service not available' }
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (_err) {
      return {
        success: false,
        error: _err instanceof Error ? _err.message : 'Failed to send reset email',
      }
    }
  }

  const signOut = async (): Promise<{ success: boolean; error?: string }> => {
    if (isMockMode) {
      localStorage.removeItem('mockUser')
      localStorage.removeItem('mockPassword')
      setAuthState({ user: null, loading: false, error: null })
      return { success: true }
    }

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
    isMockMode,
    signInWithMagicLink,
    signUpWithPassword,
    signInWithPassword,
    updatePassword,
    resetPassword,
    signOut,
  }
}
