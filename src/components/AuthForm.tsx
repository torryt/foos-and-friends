import { useId, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'

type AuthMode = 'signin' | 'signup' | 'magic-link'

interface AuthModeProps {
  mode: AuthMode
  onModeChange: (mode: AuthMode) => void
}

const AuthModeSelector = ({ mode, onModeChange }: AuthModeProps) => {
  return (
    <div className="flex bg-slate-100 rounded-lg p-1 mb-6">
      <button
        onClick={() => onModeChange('signin')}
        className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
          mode === 'signin'
            ? 'bg-white text-slate-900 shadow-sm'
            : 'text-slate-600 hover:text-slate-900'
        }`}
        type="button"
      >
        Sign In
      </button>
      <button
        onClick={() => onModeChange('signup')}
        className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
          mode === 'signup'
            ? 'bg-white text-slate-900 shadow-sm'
            : 'text-slate-600 hover:text-slate-900'
        }`}
        type="button"
      >
        Sign Up
      </button>
    </div>
  )
}

export const AuthForm = () => {
  const [mode, setMode] = useState<AuthMode>('magic-link')
  const [showPasswordAuth, setShowPasswordAuth] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const emailId = useId()
  const passwordId = useId()
  const confirmPasswordId = useId()

  const { signInWithMagicLink, signInWithPassword, signUpWithPassword, resetPassword } = useAuth()

  const handleMagicLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email.trim()) {
      setError('Please enter your email address')
      return
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address')
      return
    }

    setIsLoading(true)
    setError('')
    setMessage('')

    try {
      // Check if we have an invite code in the current URL
      const urlParams = new URLSearchParams(window.location.search)
      const inviteCode = urlParams.get('code')

      // If we have an invite code, construct redirect URL to include it
      const customRedirect = inviteCode
        ? `${window.location.origin}/invite?code=${inviteCode}`
        : undefined

      const result = await signInWithMagicLink(email, customRedirect)

      if (result.success) {
        setMessage('Check your email for a magic link to sign in!')
        setEmail('')
      } else {
        setError(result.error || 'Failed to send magic link')
      }
    } catch (_err) {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordAuth = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email.trim()) {
      setError('Please enter your email address')
      return
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setIsLoading(true)
    setError('')
    setMessage('')

    try {
      if (mode === 'signup') {
        const result = await signUpWithPassword(email, password)
        if (result.success) {
          setMessage(
            'Account created successfully! Please check your email to verify your account.',
          )
          // Reset form
          setEmail('')
          setPassword('')
          setConfirmPassword('')
        } else {
          setError(result.error || 'Failed to create account')
        }
      } else {
        const result = await signInWithPassword(email, password)
        if (result.success) {
          // The auth state change will be automatic
        } else {
          setError(result.error || 'Failed to sign in')
        }
      }
    } catch (_err) {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError('Please enter your email address first')
      return
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address')
      return
    }

    setIsLoading(true)
    setError('')
    setMessage('')

    const result = await resetPassword(email)
    if (result.success) {
      setMessage('Password reset email sent! Please check your inbox.')
    } else {
      setError(result.error || 'Failed to send password reset email')
    }
    setIsLoading(false)
  }

  const renderPasswordForm = () => (
    <form onSubmit={handlePasswordAuth} className="space-y-4">
      {/* Email field */}
      <div>
        <label htmlFor={emailId} className="block text-sm font-medium text-gray-700 mb-1">
          Email address
        </label>
        <input
          type="email"
          id={emailId}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your.email@company.com"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={isLoading}
          required
        />
      </div>

      {/* Password field */}
      <div>
        <label htmlFor={passwordId} className="block text-sm font-medium text-gray-700 mb-1">
          Password
        </label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            id={passwordId}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
            required
            minLength={6}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
            tabIndex={-1}
          >
            {showPassword ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5"
                role="img"
                aria-label="Hide password"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5"
                role="img"
                aria-label="Show password"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            )}
          </button>
        </div>
        {mode === 'signup' && (
          <div className="mt-1 text-xs text-gray-500">Password must be at least 6 characters</div>
        )}
      </div>

      {/* Confirm password (signup only) */}
      {mode === 'signup' && (
        <div>
          <label
            htmlFor={confirmPasswordId}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Confirm Password
          </label>
          <input
            type={showPassword ? 'text' : 'password'}
            id={confirmPasswordId}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
            required
            minLength={6}
          />
          {confirmPassword && password !== confirmPassword && (
            <div className="mt-1 text-xs text-red-600">Passwords do not match</div>
          )}
        </div>
      )}

      {/* Forgot password link (signin only) */}
      {mode === 'signin' && (
        <div className="text-right">
          <button
            type="button"
            onClick={handleForgotPassword}
            className="text-sm text-blue-600 hover:text-blue-500"
            disabled={isLoading}
          >
            Forgot password?
          </button>
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading || (mode === 'signup' && password !== confirmPassword)}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
      >
        {isLoading ? (
          <span className="flex items-center justify-center">
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
            {mode === 'signup' ? 'Creating account...' : 'Signing in...'}
          </span>
        ) : mode === 'signup' ? (
          'Create Account'
        ) : (
          'Sign In'
        )}
      </button>
    </form>
  )

  const renderMagicLinkForm = () => (
    <form onSubmit={handleMagicLinkSubmit} className="space-y-4">
      <div>
        <label htmlFor={emailId} className="block text-sm font-medium text-gray-700 mb-1">
          Email address
        </label>
        <input
          type="email"
          id={emailId}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your.email@company.com"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={isLoading}
          required
        />
      </div>

      <button
        type="submit"
        disabled={isLoading || !email.trim()}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
      >
        {isLoading ? (
          <span className="flex items-center justify-center">
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
            Sending magic link...
          </span>
        ) : (
          'Send Magic Link'
        )}
      </button>
    </form>
  )

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-lg">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Welcome to Foos & Friends</h2>
        <p className="text-gray-600 mt-2">
          {showPasswordAuth
            ? 'Sign in with email and password'
            : 'Sign in with a secure magic link'}
        </p>
      </div>

      {showPasswordAuth ? (
        <>
          <AuthModeSelector mode={mode} onModeChange={setMode} />
          {renderPasswordForm()}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setShowPasswordAuth(false)
                setMode('magic-link')
                setPassword('')
                setConfirmPassword('')
                setError('')
                setMessage('')
              }}
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              ← Back to magic link
            </button>
          </div>
        </>
      ) : (
        <>
          {renderMagicLinkForm()}
          <div className="mt-6 text-center">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">or</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowPasswordAuth(true)
                setMode('signin')
                setError('')
                setMessage('')
              }}
              className="mt-4 text-sm text-gray-600 hover:text-gray-900 underline"
            >
              Sign in with password
            </button>
          </div>
        </>
      )}

      {message && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 text-sm">{message}</p>
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      <div className="mt-6 text-center">
        <p className="text-xs text-gray-500">
          {mode === 'magic-link'
            ? 'Secure passwordless authentication powered by magic links'
            : 'Secure authentication with industry-standard encryption'}
        </p>
      </div>
    </div>
  )
}
