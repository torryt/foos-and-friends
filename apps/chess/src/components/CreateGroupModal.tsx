import { Loader, Users, X } from 'lucide-react'
import { useId, useState } from 'react'
import { useGroupContext } from '@/contexts/GroupContext'

interface CreateGroupModalProps {
  isOpen: boolean
  onClose: () => void
}

export const CreateGroupModal = ({ isOpen, onClose }: CreateGroupModalProps) => {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const nameId = useId()
  const descriptionId = useId()

  const { createGroup } = useGroupContext()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      setError('Group name is required')
      return
    }

    if (name.trim().length < 3) {
      setError('Group name must be at least 3 characters')
      return
    }

    if (name.trim().length > 50) {
      setError('Group name must be less than 50 characters')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await createGroup(name.trim(), description.trim() || undefined)

      if (result.success) {
        // Reset form and close modal
        setName('')
        setDescription('')
        onClose()
      } else {
        setError(result.error || 'Failed to create group')
      }
    } catch (_err) {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      setName('')
      setDescription('')
      setError(null)
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Users size={20} className="text-[#832161]" />
            <h2 className="text-lg font-semibold text-gray-900">Create New Group</h2>
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
            <label htmlFor={nameId} className="block text-sm font-medium text-gray-700 mb-1">
              Group Name *
            </label>
            <input
              type="text"
              id={nameId}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Office Champions, Chess Club"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#832161] focus:border-transparent"
              disabled={isLoading}
              maxLength={50}
              required
            />
            <div className="text-xs text-gray-500 mt-1">{name.length}/50 characters</div>
          </div>

          <div>
            <label htmlFor={descriptionId} className="block text-sm font-medium text-gray-700 mb-1">
              Description (optional)
            </label>
            <textarea
              id={descriptionId}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell your group members what this group is about..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#832161] focus:border-transparent resize-none"
              disabled={isLoading}
              maxLength={200}
            />
            <div className="text-xs text-gray-500 mt-1">{description.length}/200 characters</div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <div className="bg-[#F0EFF4] border border-[#832161]/20 rounded-lg p-4">
            <h4 className="font-medium text-[#3D2645] text-sm mb-2">What happens next?</h4>
            <ul className="text-sm text-[#3D2645] space-y-1">
              <li>You'll become the group owner</li>
              <li>A unique invite code will be generated</li>
              <li>Share the code with friends to invite them</li>
              <li>Start tracking chess matches together!</li>
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
              disabled={isLoading || !name.trim()}
              className="flex-1 px-4 py-2 bg-[#832161] text-white rounded-lg hover:bg-[#6e1b52] disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader size={16} className="animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Group'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
