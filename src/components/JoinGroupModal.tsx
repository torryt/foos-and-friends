import { Loader, UserPlus, X } from 'lucide-react'
import { useState } from 'react'
import { useGroupContext } from '@/contexts/GroupContext'

interface JoinGroupModalProps {
  isOpen: boolean
  onClose: () => void
}

export const JoinGroupModal = ({ isOpen, onClose }: JoinGroupModalProps) => {
  const [inviteCode, setInviteCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { joinGroup } = useGroupContext()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!inviteCode.trim()) {
      setError('Invite code is required')
      return
    }

    const cleanCode = inviteCode.trim().toUpperCase()

    if (cleanCode.length < 6) {
      setError('Invite code must be at least 6 characters')
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
    // Auto-uppercase and clean the input
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
    setInviteCode(value)

    // Clear error when user starts typing
    if (error) {
      setError(null)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <UserPlus size={20} className="text-green-600" />
            <h2 className="text-lg font-semibold text-gray-900">Join Group</h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="inviteCode" className="block text-sm font-medium text-gray-700 mb-1">
              Invite Code *
            </label>
            <input
              type="text"
              id="inviteCode"
              value={inviteCode}
              onChange={handleCodeChange}
              placeholder="e.g., ABC123, DEMO123"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-center text-lg tracking-wider"
              disabled={isLoading}
              maxLength={10}
              required
            />
            <div className="text-xs text-gray-500 mt-1 text-center">
              Enter the invite code shared by a group member
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-medium text-green-900 text-sm mb-2">How to get an invite code:</h4>
            <ul className="text-sm text-green-800 space-y-1">
              <li>• Ask a current group member for the code</li>
              <li>• Group owners can find it in group settings</li>
              <li>• Codes are case-insensitive and usually 6-8 characters</li>
            </ul>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !inviteCode.trim()}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
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
    </div>
  )
}
