import { useId, useState } from 'react'
import { MIN_PASSWORD_LENGTH } from './authApi.ts'
import { PasswordInput } from './PasswordInput.tsx'
import { useAuth } from './useAuth.ts'

type AuthMode = 'signin' | 'signup' | 'magic' | 'forgot'

const MODE_COPY: Record<AuthMode, { subtitle: string; submit: string; submitting: string }> = {
  signin: { subtitle: 'Sign in to continue', submit: 'Sign in', submitting: 'Signing in...' },
  signup: {
    subtitle: 'Create an account to get started',
    submit: 'Create account',
    submitting: 'Creating account...',
  },
  magic: {
    subtitle: 'Get a sign-in link by email',
    submit: 'Send magic link',
    submitting: 'Sending magic link...',
  },
  forgot: {
    subtitle: 'We will email you a link to reset your password',
    submit: 'Send reset link',
    submitting: 'Sending reset link...',
  },
}

const isValidEmail = (email: string) => /\S+@\S+\.\S+/.test(email)

const Spinner = () => (
  <svg
    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    role="img"
    aria-label="Loading"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    ></circle>
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    ></path>
  </svg>
)

interface AuthFormProps {
  title?: string
}

export const AuthForm = ({ title = 'Welcome to Foos & Friends' }: AuthFormProps) => {
  const [mode, setMode] = useState<AuthMode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const emailId = useId()

  const { signInWithPassword, signUp, signInWithMagicLink, resetPassword } = useAuth()

  const switchMode = (next: AuthMode) => {
    setMode(next)
    setPassword('')
    setConfirmPassword('')
    setMessage('')
    setError('')
  }

  // The invite code (if present in the URL) must survive email round trips:
  // magic-link and signup confirmation emails redirect back to /invite.
  const getEmailRedirect = (): string | undefined => {
    const inviteCode = new URLSearchParams(window.location.search).get('code')
    return inviteCode
      ? `${window.location.origin}/invite?code=${encodeURIComponent(inviteCode)}`
      : undefined
  }

  const validate = (): string | null => {
    if (!email.trim()) return 'Please enter your email address'
    if (!isValidEmail(email)) return 'Please enter a valid email address'

    if (mode === 'signin' || mode === 'signup') {
      if (!password) return 'Please enter a password'
    }
    if (mode === 'signup') {
      if (password.length < MIN_PASSWORD_LENGTH)
        return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
      if (password !== confirmPassword) return 'Passwords do not match'
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsLoading(true)
    setError('')
    setMessage('')

    try {
      switch (mode) {
        case 'signin': {
          const result = await signInWithPassword(email, password)
          if (!result.success) setError(result.error || 'Failed to sign in')
          // On success the auth listener signs the user in — nothing to render here
          break
        }
        case 'signup': {
          const result = await signUp(email, password, getEmailRedirect())
          if (!result.success) {
            setError(result.error || 'Failed to sign up')
          } else if (result.needsConfirmation) {
            setMessage('Almost there! Check your email and click the confirmation link to finish signing up.')
          }
          break
        }
        case 'magic': {
          const result = await signInWithMagicLink(email, getEmailRedirect())
          if (result.success) {
            setMessage('Check your email for a magic link to sign in!')
          } else {
            setError(result.error || 'Failed to send magic link')
          }
          break
        }
        case 'forgot': {
          const result = await resetPassword(email)
          if (result.success) {
            // Same message whether or not the account exists, to avoid enumeration
            setMessage(`If an account exists for ${email}, a password reset link is on its way.`)
          } else {
            setError(result.error || 'Failed to send password reset email')
          }
          break
        }
      }
    } catch (_err) {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const copy = MODE_COPY[mode]
  const showPasswordField = mode === 'signin' || mode === 'signup'

  return (
    <div className="max-w-md w-full mx-auto mt-8 p-6 bg-card rounded-[var(--th-radius-md)] shadow-theme-card">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-primary">{title}</h2>
        <p className="text-secondary mt-2">{copy.subtitle}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor={emailId} className="block text-sm font-medium text-primary mb-1">
            Email address
          </label>
          <input
            type="email"
            id={emailId}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your.email@company.com"
            autoComplete="email"
            className="w-full px-3 py-2 border border-[var(--th-border)] rounded-[var(--th-radius-md)] focus:outline-none focus:ring-2 focus:ring-[var(--th-sport-primary)] focus:border-transparent"
            disabled={isLoading}
            required
          />
        </div>

        {showPasswordField && (
          <>
            <PasswordInput
              label="Password"
              value={password}
              onChange={setPassword}
              disabled={isLoading}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              minLength={mode === 'signup' ? MIN_PASSWORD_LENGTH : undefined}
            />

            {mode === 'signup' && (
              <PasswordInput
                label="Confirm password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                disabled={isLoading}
                autoComplete="new-password"
                minLength={MIN_PASSWORD_LENGTH}
              />
            )}

            {mode === 'signin' && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => switchMode('forgot')}
                  className="text-sm text-[var(--th-sport-primary)] hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            )}
          </>
        )}

        <button
          type="submit"
          disabled={isLoading || !email.trim()}
          className="w-full bg-[var(--th-sport-primary)] text-white py-2 px-4 rounded-[var(--th-radius-md)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <Spinner />
              {copy.submitting}
            </span>
          ) : (
            copy.submit
          )}
        </button>
      </form>

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

      <div className="mt-6 space-y-2 text-center text-sm">
        {mode === 'signin' && (
          <>
            <p>
              <button
                type="button"
                onClick={() => switchMode('magic')}
                className="text-[var(--th-sport-primary)] hover:underline"
              >
                Email me a magic link instead
              </button>
            </p>
            <p className="text-secondary">
              No account yet?{' '}
              <button
                type="button"
                onClick={() => switchMode('signup')}
                className="text-[var(--th-sport-primary)] hover:underline font-medium"
              >
                Sign up
              </button>
            </p>
          </>
        )}

        {mode === 'signup' && (
          <p className="text-secondary">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => switchMode('signin')}
              className="text-[var(--th-sport-primary)] hover:underline font-medium"
            >
              Sign in
            </button>
          </p>
        )}

        {(mode === 'magic' || mode === 'forgot') && (
          <p>
            <button
              type="button"
              onClick={() => switchMode('signin')}
              className="text-[var(--th-sport-primary)] hover:underline"
            >
              Back to sign in
            </button>
          </p>
        )}
      </div>
    </div>
  )
}
