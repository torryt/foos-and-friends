import type { FriendGroup, GroupMember } from '@foos/shared'
import { Loader, ShieldPlus, UserMinus, Users, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useGroupContext } from '@/contexts/GroupContext'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { ModalOrBottomDrawer } from './ModalOrBottomDrawer'

interface GroupMembersModalProps {
  isOpen: boolean
  onClose: () => void
  group: FriendGroup | null
}

const ROLE_LABELS: Record<GroupMember['role'], string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
}

const canPromote = (member: GroupMember) => member.role === 'member'

export const GroupMembersModal = ({ isOpen, onClose, group }: GroupMembersModalProps) => {
  const [members, setMembers] = useState<GroupMember[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actioningUserId, setActioningUserId] = useState<string | null>(null)
  const [confirmRemoveUserId, setConfirmRemoveUserId] = useState<string | null>(null)

  const { user } = useAuth()
  const { getGroupMembers, promoteMember, removeMember } = useGroupContext()
  const { toast } = useToast()

  const groupId = group?.id

  const loadMembers = useCallback(async () => {
    if (!groupId) return

    setIsLoading(true)
    setError(null)

    const result = await getGroupMembers(groupId)
    if (result.error) {
      setError(result.error)
      setMembers([])
    } else {
      setMembers(result.data)
    }
    setIsLoading(false)
  }, [groupId, getGroupMembers])

  useEffect(() => {
    if (isOpen && groupId) {
      setConfirmRemoveUserId(null)
      loadMembers()
    }
  }, [isOpen, groupId, loadMembers])

  if (!group) return null

  const isOwner = group.isOwner ?? false

  const handlePromote = async (member: GroupMember) => {
    setActioningUserId(member.userId)
    setError(null)

    const result = await promoteMember(group.id, member.userId)
    if (result.success) {
      toast().success(`${member.email || 'Member'} is now an admin`)
      await loadMembers()
    } else {
      setError(result.error || 'Failed to promote member')
    }
    setActioningUserId(null)
  }

  const handleRemove = async (member: GroupMember) => {
    setActioningUserId(member.userId)
    setError(null)

    const result = await removeMember(group.id, member.userId)
    if (result.success) {
      toast().success(`${member.email || 'Member'} removed from the group`)
      setConfirmRemoveUserId(null)
      await loadMembers()
    } else {
      setError(result.error || 'Failed to remove member')
    }
    setActioningUserId(null)
  }

  // Owners can remove admins and members; admins can only remove members.
  // Nobody can remove the owner or themselves.
  const canRemove = (member: GroupMember) =>
    member.role !== 'owner' && member.userId !== user?.id && (member.role !== 'admin' || isOwner)

  const handleClose = () => {
    if (actioningUserId === null) {
      setConfirmRemoveUserId(null)
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
            <h2 className="text-lg font-semibold text-primary">Members</h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={actioningUserId !== null}
            className="text-muted hover:text-secondary transition-colors disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-2">
          {isLoading && (
            <div className="flex items-center justify-center gap-2 py-8 text-secondary">
              <Loader size={16} className="animate-spin" />
              Loading members...
            </div>
          )}

          {!isLoading &&
            members.map((member) => {
              const isSelf = member.userId === user?.id
              const isActioning = actioningUserId === member.userId
              const isConfirmingRemove = confirmRemoveUserId === member.userId

              return (
                <div
                  key={member.id}
                  className="border border-[var(--th-border)] rounded-[var(--th-radius-md)] p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-primary truncate">
                        {member.email || 'Unknown user'}
                        {isSelf && <span className="text-muted font-normal"> (you)</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            member.role === 'owner'
                              ? 'bg-[var(--th-sport-primary)] text-white'
                              : member.role === 'admin'
                                ? 'bg-accent-subtle text-[var(--th-sport-primary)]'
                                : 'bg-card-hover text-secondary'
                          }`}
                        >
                          {ROLE_LABELS[member.role]}
                        </span>
                        <span className="text-xs text-muted">
                          Joined {new Date(member.joinedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {(canPromote(member) || canRemove(member)) && !isConfirmingRemove && (
                    <div className="flex gap-2 mt-3">
                      {canPromote(member) && (
                        <button
                          type="button"
                          onClick={() => handlePromote(member)}
                          disabled={actioningUserId !== null}
                          className="flex-1 min-h-11 px-3 py-2 border border-[var(--th-border)] text-primary rounded-[var(--th-radius-md)] hover:bg-card-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm font-medium"
                        >
                          {isActioning ? (
                            <Loader size={14} className="animate-spin" />
                          ) : (
                            <ShieldPlus size={14} className="text-[var(--th-sport-primary)]" />
                          )}
                          Make Admin
                        </button>
                      )}
                      {canRemove(member) && (
                        <button
                          type="button"
                          onClick={() => setConfirmRemoveUserId(member.userId)}
                          disabled={actioningUserId !== null}
                          className="flex-1 min-h-11 px-3 py-2 border border-[var(--th-border)] text-[var(--th-loss)] rounded-[var(--th-radius-md)] hover:bg-card-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm font-medium"
                        >
                          <UserMinus size={14} />
                          Remove
                        </button>
                      )}
                    </div>
                  )}

                  {isConfirmingRemove && (
                    <div className="mt-3">
                      <p className="text-sm text-secondary mb-2">
                        Remove {member.email || 'this member'} from the group?
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setConfirmRemoveUserId(null)}
                          disabled={actioningUserId !== null}
                          className="flex-1 min-h-11 px-3 py-2 border border-[var(--th-border)] text-primary rounded-[var(--th-radius-md)] hover:bg-card-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemove(member)}
                          disabled={actioningUserId !== null}
                          className="flex-1 min-h-11 px-3 py-2 bg-[var(--th-loss)] text-white rounded-[var(--th-radius-md)] hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm font-medium"
                        >
                          {isActioning ? (
                            <Loader size={14} className="animate-spin" />
                          ) : (
                            <UserMinus size={14} />
                          )}
                          Remove
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

          {error && (
            <div className="p-3 bg-card-hover border border-[var(--th-border)] rounded-[var(--th-radius-md)]">
              <p className="text-[var(--th-loss)] text-sm">{error}</p>
            </div>
          )}
        </div>
      </div>
    </ModalOrBottomDrawer>
  )
}
