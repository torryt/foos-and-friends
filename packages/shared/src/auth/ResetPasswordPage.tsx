import { useEffect, useState } from 'react'
import { getSupabase, isSupabaseMockMode } from '../lib/supabase.ts'
import { MIN_PASSWORD_LENGTH } from './authApi.ts'
import { PasswordInput } from './PasswordInput.tsx'
import { useAuth } from './useAuth.ts'

type LinkState = 'checking' | 'ready' | 'invalid'

// How long to wait for detectSessionInUrl to turn the recovery token in the URL
// into a session before declaring the link invalid
const SESSION_WAIT_MS = 5000

// Supabase appends e.g. #error=access_denied&error_code=otp_expired to the
// redirect URL when the recovery link is expired or already used
const getHashError = (): string | null => {
  const hash = window.location.hash.replace(/^#/, '')
  if (!hash) return null
  const params = new URLSearchParams(hash)
  if (params.get('error')) {
    return params.get('error_description')?.replace(/\+/g, ' ') || 'The reset link is invalid.'
  }
  return null
}

export const ResetPasswordPage = () => {
  const [linkState, setLinkState] = useState<LinkState>(
    isSupabaseMockMode() ? 'ready' : 'checking',
  )
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const { updatePassword } = useAuth()

  useEffect(() => {
    if (isSupabaseMockMode()) return

    if (getHashError()) {
      setLinkState('invalid')
      return
    }

    const supabase = getSupabase()
    let settled = false

    // The recovery token is consumed on page load (detectSessionInUrl) — a valid
    // link yields a session, either already present or arriving via the listener.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && !settled) {
        settled = true
        setLinkState('ready')
      }
    })

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && !settled) {
        settled = true
        setLinkState('ready')
      }
    })

    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true
        setLinkState('invalid')
      }
    }, SESSION_WAIT_MS)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setIsLoading(true)
    setError('')
    setMessage('')

    try {
      const result = await updatePassword(newPassword)

      if (result.success) {
        setMessage('Password saved! Taking you to the app...')
        setTimeout(() => {
          window.location.assign('/')
        }, 1500)
      } else {
        setError(result.error || 'Failed to update password')
      }
    } catch (_err) {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-page flex items-center justify-center px-4">
      <div className="max-w-md w-full p-6 bg-card rounded-[var(--th-radius-md)] shadow-theme-card">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-primary">Set a new password</h2>
          <p className="text-secondary mt-2">
            {linkState === 'checking' && 'Checking your reset link...'}
            {linkState === 'ready' && 'Enter your new password below'}
            {linkState === 'invalid' && 'This reset link is invalid or has expired'}
          </p>
        </div>

        {linkState === 'checking' && (
          <div className="flex justify-center py-6">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--th-accent)]"></div>
          </div>
        )}

        {linkState === 'ready' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <PasswordInput
              label="New password"
              value={newPassword}
              onChange={setNewPassword}
              disabled={isLoading}
              autoComplete="new-password"
              minLength={MIN_PASSWORD_LENGTH}
            />
            <PasswordInput
              label="Confirm new password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              disabled={isLoading}
              autoComplete="new-password"
              minLength={MIN_PASSWORD_LENGTH}
            />

            <button
              type="submit"
              disabled={isLoading || !newPassword}
              className="w-full bg-[var(--th-sport-primary)] text-white py-2 px-4 rounded-[var(--th-radius-md)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isLoading ? 'Saving...' : 'Save new password'}
            </button>
          </form>
        )}

        {linkState === 'invalid' && (
          <div className="space-y-4">
            <p className="text-sm text-secondary text-center">
              Request a new reset link from the sign-in page ("Forgot password?") and try again.
            </p>
            <a
              href="/"
              className="block w-full text-center bg-[var(--th-sport-primary)] text-white py-2 px-4 rounded-[var(--th-radius-md)] hover:opacity-90 transition-colors font-medium"
            >
              Back to the app
            </a>
          </div>
        )}

        {message && (
          <div className="mt-4 p-4 bg-accent-subtle border border-[var(--th-border)] rounded-lg">
            <p className="text-primary text-sm">{message}</p>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 bg-card-hover border border-[var(--th-border)] rounded-lg">
            <p className="text-primary text-sm">{error}</p>
          </div>
        )}
      </div>
    </div>
  )
}
