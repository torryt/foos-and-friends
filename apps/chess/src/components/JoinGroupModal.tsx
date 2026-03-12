import { Loader, UserPlus, X } from 'lucide-react'
import { useId, useState } from 'react'
import { useGroupContext } from '@/contexts/GroupContext'
import { ModalOrBottomDrawer } from './ModalOrBottomDrawer'

interface JoinGroupModalProps {
  isOpen: boolean
  onClose: () => void
}

export const JoinGroupModal = ({ isOpen, onClose }: JoinGroupModalProps) => {
  const [inviteCode, setInviteCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inviteCodeId = useId()

  const { joinGroup } = useGroupContext()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!inviteCode.trim()) {
      setError('Invite code is required')
      return
    }

    const cleanCode = inviteCode.trim().toLowerCase()

    if (cleanCode.length !== 8) {
      setError('Invite code must be exactly 8 characters')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await joinGroup(cleanCode)

      if (result.success) {
        // Reset form and close modal
        setInviteCode('')
        onClose()
      } else {
        setError(result.error || 'Failed to join group')
      }
    } catch (_err) {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      setInviteCode('')
      setError(null)
      onClose()
    }
  }

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow lowercase letters and numbers
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '')
    setInviteCode(value)

    // Clear error when user starts typing
    if (error) {
      setError(null)
    }
  }

  return (
    <ModalOrBottomDrawer isOpen={isOpen} onClose={handleClose} className="sm:max-w-md">
      <div className="bg-card shadow-xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-[var(--th-border)]">
          <div className="flex items-center gap-2">
            <UserPlus size={20} className="text-[var(--th-sport-primary)]" />
            <h2 className="text-lg font-semibold text-primary">Join Group</h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="text-muted hover:text-secondary transition-colors disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor={inviteCodeId} className="block text-sm font-medium text-primary mb-1">
              Invite Code *
            </label>
            <input
              type="text"
              id={inviteCodeId}
              value={inviteCode}
              onChange={handleCodeChange}
              placeholder="e.g., abc12345, demo1234"
              className="w-full px-3 py-2 border border-[var(--th-border)] rounded-[var(--th-radius-md)] focus:outline-none focus:ring-2 focus:ring-[var(--th-sport-primary)] focus:border-transparent font-mono text-center text-lg tracking-wider"
              disabled={isLoading}
              maxLength={8}
              required
            />
            <div className="text-xs text-muted mt-1 text-center">
              Enter the invite code shared by a group member
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-[var(--th-radius-md)]">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <div className="bg-accent-subtle border border-[var(--th-border)] rounded-[var(--th-radius-md)] p-4">
            <h4 className="font-medium text-primary text-sm mb-2">How to get an invite code:</h4>
            <ul className="text-sm text-secondary space-y-1">
              <li>• Ask a current group member for the code</li>
              <li>• Group owners can find it in group settings</li>
              <li>• Codes are exactly 8 characters (lowercase letters and numbers)</li>
            </ul>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2 border border-[var(--th-border)] text-primary rounded-[var(--th-radius-md)] hover:bg-card-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !inviteCode.trim()}
              className="flex-1 px-4 py-2 bg-[var(--th-sport-primary)] text-white rounded-[var(--th-radius-md)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader size={16} className="animate-spin" />
                  Joining...
                </>
              ) : (
                'Join Group'
              )}
            </button>
          </div>
        </form>
      </div>
    </ModalOrBottomDrawer>
  )
}
