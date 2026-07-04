import type { SupabaseClient } from '../lib/supabase.ts'

export interface AuthResult {
  success: boolean
  error?: string
}

export interface SignUpResult extends AuthResult {
  // True when Supabase requires the user to confirm their email before signing in.
  // False when confirmation is disabled and a session was created immediately.
  needsConfirmation?: boolean
}

// Client-side mirror of the minimum length configured in the Supabase dashboard
export const MIN_PASSWORD_LENGTH = 8

// Map raw Supabase auth errors to friendly, actionable messages
export function mapAuthError(rawMessage: string | undefined, fallback: string): string {
  if (!rawMessage) return fallback

  if (/invalid login credentials/i.test(rawMessage)) {
    return 'Incorrect email or password.'
  }
  if (/email not confirmed/i.test(rawMessage)) {
    return 'Please confirm your email address first — check your inbox for the confirmation link.'
  }
  if (/user already registered|already been registered/i.test(rawMessage)) {
    return 'An account with this email already exists. Try signing in instead.'
  }
  if (/rate limit|too many requests|for security purposes/i.test(rawMessage)) {
    return 'Too many attempts. Please wait a moment and try again.'
  }
  if (/password should be at least|password is too short/i.test(rawMessage)) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
  }
  if (/weak password|pwned|data breach|leaked/i.test(rawMessage)) {
    return 'This password is too easy to guess or has appeared in a data breach. Please choose another one.'
  }
  if (/same password|different from the old password/i.test(rawMessage)) {
    return 'The new password must be different from your current password.'
  }

  return rawMessage
}

export async function signInWithPassword(
  client: SupabaseClient,
  email: string,
  password: string,
): Promise<AuthResult> {
  try {
    const { error } = await client.auth.signInWithPassword({ email, password })

    if (error) {
      return { success: false, error: mapAuthError(error.message, 'Failed to sign in') }
    }

    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to sign in',
    }
  }
}

export async function signUp(
  client: SupabaseClient,
  email: string,
  password: string,
  emailRedirectTo?: string,
): Promise<SignUpResult> {
  try {
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: { emailRedirectTo },
    })

    if (error) {
      return { success: false, error: mapAuthError(error.message, 'Failed to sign up') }
    }

    // No session means Supabase sent a confirmation email first
    return { success: true, needsConfirmation: !data.session }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to sign up',
    }
  }
}

export async function resetPassword(
  client: SupabaseClient,
  email: string,
  redirectTo: string,
): Promise<AuthResult> {
  try {
    const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo })

    if (error) {
      return {
        success: false,
        error: mapAuthError(error.message, 'Failed to send password reset email'),
      }
    }

    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to send password reset email',
    }
  }
}

export async function updatePassword(
  client: SupabaseClient,
  newPassword: string,
): Promise<AuthResult> {
  try {
    const { error } = await client.auth.updateUser({ password: newPassword })

    if (error) {
      return { success: false, error: mapAuthError(error.message, 'Failed to update password') }
    }

    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update password',
    }
  }
}

export async function signInWithMagicLink(
  client: SupabaseClient,
  email: string,
  emailRedirectTo: string,
): Promise<AuthResult> {
  try {
    const { error } = await client.auth.signInWithOtp({
      email,
      options: { emailRedirectTo },
    })

    if (error) {
      return { success: false, error: mapAuthError(error.message, 'Failed to send magic link') }
    }

    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to send magic link',
    }
  }
}

export async function signOut(client: SupabaseClient): Promise<AuthResult> {
  try {
    const { error } = await client.auth.signOut()

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
