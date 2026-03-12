import type { FriendGroup } from '@foos/shared'
import { AlertTriangle, Loader, LogOut, X } from 'lucide-react'
import { useState } from 'react'
import { useToast } from '@/hooks/useToast'
import { ModalOrBottomDrawer } from './ModalOrBottomDrawer'

interface LeaveGroupConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  group: FriendGroup | null
  onLeave: (groupId: string) => Promise<{ success: boolean; error?: string }>
}

export const LeaveGroupConfirmationModal = ({
  isOpen,
  onClose,
  group,
  onLeave,
}: LeaveGroupConfirmationModalProps) => {
  const [isLeaving, setIsLeaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  if (!group) return null

  const handleLeave = async () => {
    setIsLeaving(true)
    setError(null)

    try {
      const result = await onLeave(group.id)

      if (result.success) {
        toast().success(`Successfully left "${group.name}"`)
        onClose()
      } else {
        setError(result.error || 'Failed to leave group')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsLeaving(false)
    }
  }

  return (
    <ModalOrBottomDrawer isOpen={isOpen} onClose={onClose} className="sm:max-w-md">
      <div className="bg-card shadow-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-orange-50 border-b border-orange-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <LogOut className="text-orange-600" size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-orange-900">Leave Group</h2>
                <p className="text-sm text-orange-700">"{group.name}"</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-orange-400 hover:text-orange-600 transition-colors"
              disabled={isLeaving}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-[var(--th-radius-md)]">
              <AlertTriangle className="text-orange-500 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <h3 className="font-semibold text-orange-900 mb-2">
                  Are you sure you want to leave this group?
                </h3>
                <p className="text-orange-800 text-sm mb-3">
                  When you leave "{group.name}", you will:
                </p>
                <ul className="text-orange-800 text-sm space-y-1">
                  <li>• Lose access to the group's matches and rankings</li>
                  <li>• Need a new invite to rejoin the group</li>
                  <li>• No longer receive group notifications</li>
                </ul>
              </div>
            </div>

            <div className="bg-card-hover border border-[var(--th-border)] rounded-[var(--th-radius-md)] p-4">
              <h4 className="font-medium text-primary mb-2">Group Information:</h4>
              <div className="text-sm text-primary space-y-1">
                <div>
                  <strong>Name:</strong> {group.name}
                </div>
                {group.description && (
                  <div>
                    <strong>Description:</strong> {group.description}
                  </div>
                )}
                {group.playerCount !== undefined && (
                  <div>
                    <strong>Players:</strong> {group.playerCount}
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-[var(--th-radius-md)]">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={isLeaving}
                className="px-4 py-2 text-primary bg-card-hover hover:bg-card-hover rounded-[var(--th-radius-md)] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLeave}
                disabled={isLeaving}
                className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-[var(--th-radius-md)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isLeaving ? (
                  <>
                    <Loader className="animate-spin" size={16} />
                    Leaving...
                  </>
                ) : (
                  <>
                    <LogOut size={16} />
                    Leave Group
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </ModalOrBottomDrawer>
  )
}
