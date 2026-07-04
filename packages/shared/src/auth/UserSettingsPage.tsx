import { useState } from 'react'
import { ThemePicker } from '../theme/ThemePicker.tsx'
import { useAuth } from './useAuth.ts'

export const UserSettingsPage = () => {
  const { user, resetPassword, signOut } = useAuth()
  const [resetSent, setResetSent] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState('')

  // Setting/changing a password always goes through the email reset flow: it
  // forces fresh proof of ownership instead of trusting a long-lived session,
  // and doubles as "add a password" for magic-link users.
  const handlePasswordReset = async () => {
    if (!user?.email || isSending || resetSent) return

    setIsSending(true)
    setError('')

    const result = await resetPassword(user.email)

    setIsSending(false)
    if (result.success) {
      setResetSent(true)
    } else {
      setError(result.error || 'Failed to send password reset email')
    }
  }

  const handleSignOut = async () => {
    await signOut()
    window.location.assign('/')
  }

  if (!user) return null

  return (
    <div className="max-w-md mx-auto space-y-4">
      <h2 className="text-xl font-bold text-primary">Settings</h2>

      <section className="bg-card rounded-[var(--th-radius-md)] shadow-theme-card p-4 space-y-1">
        <h3 className="text-sm font-semibold text-primary">Account</h3>
        <div className="text-sm text-secondary">Email</div>
        <div className="text-sm text-primary break-all">{user.email}</div>
      </section>

      <section className="bg-card rounded-[var(--th-radius-md)] shadow-theme-card p-4 space-y-3">
        <h3 className="text-sm font-semibold text-primary">Password</h3>
        <p className="text-sm text-secondary">
          We'll email you a link to set a new password. This also works if you've only used magic
          links so far.
        </p>
        <button
          type="button"
          onClick={handlePasswordReset}
          disabled={isSending || resetSent}
          className="w-full bg-[var(--th-sport-primary)] text-white py-2 px-4 rounded-[var(--th-radius-md)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
        >
          {isSending ? 'Sending...' : resetSent ? 'Email sent' : 'Set or change password'}
        </button>
        {resetSent && (
          <div className="p-3 bg-accent-subtle border border-[var(--th-border)] rounded-lg">
            <p className="text-primary text-sm">
              Check your inbox — we sent a password link to {user.email}.
            </p>
          </div>
        )}
        {error && (
          <div className="p-3 bg-card-hover border border-[var(--th-border)] rounded-lg">
            <p className="text-primary text-sm">{error}</p>
          </div>
        )}
      </section>

      <section className="bg-card rounded-[var(--th-radius-md)] shadow-theme-card p-4">
        <h3 className="text-sm font-semibold text-primary mb-1">Appearance</h3>
        <ThemePicker />
      </section>

      <section className="bg-card rounded-[var(--th-radius-md)] shadow-theme-card p-4">
        <button
          type="button"
          onClick={handleSignOut}
          className="w-full text-left px-3 py-2 rounded-lg hover:bg-loss/10 transition-colors text-sm font-medium text-[var(--th-loss)]"
        >
          Sign out
        </button>
      </section>
    </div>
  )
}
