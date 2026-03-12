import { Loader, Users, X } from 'lucide-react'
import { useId, useState } from 'react'
import { useGroupContext } from '@/contexts/GroupContext'
import { ModalOrBottomDrawer } from './ModalOrBottomDrawer'

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

  return (
    <ModalOrBottomDrawer isOpen={isOpen} onClose={handleClose} className="sm:max-w-md">
      <div className="bg-card shadow-xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-[var(--th-border)]">
          <div className="flex items-center gap-2">
            <Users size={20} className="text-[var(--th-sport-primary)]" />
            <h2 className="text-lg font-semibold text-primary">Create New Group</h2>
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
            <label htmlFor={nameId} className="block text-sm font-medium text-primary mb-1">
              Group Name *
            </label>
            <input
              type="text"
              id={nameId}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Office Champions, Friday League"
              className="w-full px-3 py-2 border border-[var(--th-border)] rounded-[var(--th-radius-md)] focus:outline-none focus:ring-2 focus:ring-[var(--th-sport-primary)] focus:border-transparent"
              disabled={isLoading}
              maxLength={50}
              required
            />
            <div className="text-xs text-muted mt-1">{name.length}/50 characters</div>
          </div>

          <div>
            <label htmlFor={descriptionId} className="block text-sm font-medium text-primary mb-1">
              Description (optional)
            </label>
            <textarea
              id={descriptionId}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell your group members what this group is about..."
              rows={3}
              className="w-full px-3 py-2 border border-[var(--th-border)] rounded-[var(--th-radius-md)] focus:outline-none focus:ring-2 focus:ring-[var(--th-sport-primary)] focus:border-transparent resize-none"
              disabled={isLoading}
              maxLength={200}
            />
            <div className="text-xs text-muted mt-1">{description.length}/200 characters</div>
          </div>

          {error && (
            <div className="p-3 bg-card-hover border border-[var(--th-border)] rounded-[var(--th-radius-md)]">
              <p className="text-primary text-sm">{error}</p>
            </div>
          )}

          <div className="bg-accent-subtle border border-[var(--th-border)] rounded-[var(--th-radius-md)] p-4">
            <h4 className="font-medium text-primary text-sm mb-2">What happens next?</h4>
            <ul className="text-sm text-secondary space-y-1">
              <li>• You'll become the group owner</li>
              <li>• A unique invite code will be generated</li>
              <li>• Share the code with friends to invite them</li>
              <li>• Start tracking foosball matches together!</li>
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
              disabled={isLoading || !name.trim()}
              className="flex-1 px-4 py-2 bg-[var(--th-sport-primary)] text-white rounded-[var(--th-radius-md)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
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
    </ModalOrBottomDrawer>
  )
}
