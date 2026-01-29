import type { FriendGroup } from '@foos/shared'
import { AlertTriangle, Loader, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useToast } from '@/hooks/useToast'

interface DeleteGroupConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  group: FriendGroup | null
  onDelete: (groupId: string) => Promise<{
    success: boolean
    error?: string
    deletedCounts?: { players: number; matches: number; members: number }
  }>
}

const ConfirmationStep = {
  WARNING: 1,
  TYPE_NAME: 2,
} as const

type ConfirmationStep = (typeof ConfirmationStep)[keyof typeof ConfirmationStep]

export const DeleteGroupConfirmationModal = ({
  isOpen,
  onClose,
  group,
  onDelete,
}: DeleteGroupConfirmationModalProps) => {
  const [step, setStep] = useState<ConfirmationStep>(ConfirmationStep.WARNING)
  const [typedName, setTypedName] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep(ConfirmationStep.WARNING)
      setTypedName('')
      setIsDeleting(false)
      setError(null)
    }
  }, [isOpen])

  if (!isOpen || !group) return null

  const handleDelete = async () => {
    setIsDeleting(true)
    setError(null)

    try {
      const result = await onDelete(group.id)

      if (result.success) {
        const counts = result.deletedCounts
        const message = counts
          ? `Successfully deleted "${group.name}" with ${counts.players} players, ${counts.matches} matches, and ${counts.members} members.`
          : `Successfully deleted "${group.name}".`

        toast().success(message)
        onClose()
      } else {
        setError(result.error || 'Failed to delete group')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsDeleting(false)
    }
  }

  const canProceedFromWarning = true
  const canDeleteFromTypeName = typedName.trim() === group.name.trim() && !isDeleting

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="bg-red-50 border-b border-red-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <Trash2 className="text-red-600" size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-red-900">Delete Group</h2>
                  <p className="text-sm text-red-700">"{group.name}"</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-red-400 hover:text-red-600 transition-colors"
                disabled={isDeleting}
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6">
            {step === ConfirmationStep.WARNING && (
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
                  <div>
                    <h3 className="font-semibold text-red-900 mb-2">
                      This action cannot be undone!
                    </h3>
                    <p className="text-red-800 text-sm mb-3">
                      Deleting this group will permanently remove:
                    </p>
                    <ul className="text-red-800 text-sm space-y-1">
                      <li>• All players and their statistics</li>
                      <li>• All match history and rankings</li>
                      <li>• All group memberships</li>
                      <li>• The group invite code</li>
                    </ul>
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Group Information:</h4>
                  <div className="text-sm text-gray-700 space-y-1">
                    <div>
                      <strong>Name:</strong> {group.name}
                    </div>
                    {group.description && (
                      <div>
                        <strong>Description:</strong> {group.description}
                      </div>
                    )}
                    <div>
                      <strong>Invite Code:</strong> {group.inviteCode}
                    </div>
                    {group.playerCount !== undefined && (
                      <div>
                        <strong>Players:</strong> {group.playerCount}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(ConfirmationStep.TYPE_NAME)}
                    disabled={!canProceedFromWarning}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {step === ConfirmationStep.TYPE_NAME && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-red-900 mb-2">
                    Type the group name to confirm:
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Please type <strong>"{group.name}"</strong> to confirm deletion.
                  </p>
                  <input
                    type="text"
                    value={typedName}
                    onChange={(e) => setTypedName(e.target.value)}
                    placeholder={group.name}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
                    <p className="text-red-800 text-sm">{error}</p>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setStep(ConfirmationStep.WARNING)}
                    disabled={isDeleting}
                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={!canDeleteFromTypeName}
                    className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isDeleting ? (
                      <>
                        <Loader className="animate-spin" size={16} />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 size={16} />
                        Delete Group Permanently
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
