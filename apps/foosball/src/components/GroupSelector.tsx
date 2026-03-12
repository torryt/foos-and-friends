import { useNavigate } from '@tanstack/react-router'
import {
  ChevronDown,
  ChevronUp,
  Clipboard,
  LogOut,
  Plus,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react'
import { useState } from 'react'
import { useGroupContext } from '@/contexts/GroupContext'
import { useToast } from '@/hooks/useToast'

interface GroupSelectorProps {
  onCreateGroup?: () => void
  onJoinGroup?: () => void
  onDeleteGroup?: (groupId: string) => void
  onLeaveGroup?: (groupId: string) => void
}

export const GroupSelector = ({
  onCreateGroup,
  onJoinGroup,
  onDeleteGroup,
  onLeaveGroup,
}: GroupSelectorProps) => {
  const { currentGroup, userGroups, switchGroup, loading } = useGroupContext()
  const [isOpen, setIsOpen] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const { toast } = useToast()
  const navigate = useNavigate()

  const copyInviteLink = async (inviteCode: string, groupName: string) => {
    try {
      const inviteLink = `${window.location.origin}/invite?code=${inviteCode}`
      await navigator.clipboard.writeText(inviteLink)
      toast().success(`Invite link for "${groupName}" copied to clipboard!`)
    } catch (_err) {
      toast().error('Failed to copy invite link')
    }
  }

  const toggleGroupExpansion = (groupId: string) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId)
    } else {
      newExpanded.add(groupId)
    }
    setExpandedGroups(newExpanded)
  }

  const handleSwitchToGroup = (groupId: string) => {
    switchGroup(groupId)
    setIsOpen(false)
    // Navigate to rankings page when switching groups
    navigate({ to: '/' })
  }

  if (loading) {
    return (
      <div className="bg-card px-3 py-2 rounded-lg border border-[var(--th-border-subtle)]">
        <div className="animate-pulse w-6 h-4 bg-card-hover rounded" />
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Backdrop */}
      {isOpen && (
        <button
          type="button"
          className="fixed inset-0 z-10"
          onClick={() => setIsOpen(false)}
          tabIndex={-1}
          aria-label="Close group selector"
        />
      )}

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="bg-card px-3 py-2 rounded-lg border border-[var(--th-border-subtle)] hover:bg-card-hover transition-colors flex items-center gap-2"
        title={currentGroup ? `Current group: ${currentGroup.name}` : 'Select a group'}
      >
        <Users size={16} className="text-secondary" />
        <span className="hidden sm:block text-sm font-medium text-primary max-w-32 truncate">
          {currentGroup ? currentGroup.name : 'Select Group'}
        </span>
        <ChevronDown
          size={14}
          className={`text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full mt-1 right-0 bg-card rounded-[var(--th-radius-md)] shadow-theme-card border border-[var(--th-border)] min-w-80 z-20">
          <div className="p-2">
            <div className="text-xs font-medium text-muted px-3 py-2">Your Groups</div>

            {userGroups.map((group) => {
              const isExpanded = expandedGroups.has(group.id)
              const isCurrent = group.id === currentGroup?.id

              return (
                <div key={group.id} className="mb-1">
                  {/* Group Header - Clickable to expand/collapse */}
                  <button
                    type="button"
                    onClick={() => toggleGroupExpansion(group.id)}
                    className={`w-full text-left rounded-lg hover:bg-card-hover transition-colors ${
                      isCurrent ? 'bg-accent-subtle border border-[var(--th-border)]' : ''
                    }`}
                  >
                    <div className="px-3 py-2">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-primary">{group.name}</div>
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-xs text-muted">Code: {group.inviteCode}</span>
                            {group.playerCount !== undefined && (
                              <span className="text-xs text-muted">
                                • {group.playerCount} players
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isCurrent && (
                            <div className="w-2 h-2 bg-[var(--th-sport-primary)] rounded-full flex-shrink-0" />
                          )}
                          {isExpanded ? (
                            <ChevronUp size={16} className="text-muted" />
                          ) : (
                            <ChevronDown size={16} className="text-muted" />
                          )}
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* Expanded Actions */}
                  {isExpanded && (
                    <div className="px-3 pb-2 space-y-1">
                      {/* Switch to Group */}
                      {!isCurrent && (
                        <button
                          type="button"
                          onClick={() => handleSwitchToGroup(group.id)}
                          className="w-full text-left px-6 py-2 rounded-md bg-card-hover hover:bg-card-hover transition-colors flex items-center gap-3 text-sm font-medium text-[var(--th-sport-primary)]"
                        >
                          <Users size={14} className="text-[var(--th-sport-primary)]" />
                          Switch to Group
                        </button>
                      )}

                      {/* Copy Invite Link */}
                      <button
                        type="button"
                        onClick={() => copyInviteLink(group.inviteCode, group.name)}
                        className="w-full text-left px-6 py-2 rounded-md bg-card-hover hover:bg-card-hover transition-colors flex items-center gap-3 text-sm font-medium text-primary"
                      >
                        <Clipboard size={14} className="text-muted" />
                        Copy Invite Link
                      </button>

                      {/* Delete Group - Only show for groups with more than 1 total group and if group owner */}
                      {group.isOwner && (
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteGroup?.(group.id)
                            setIsOpen(false)
                          }}
                          className="w-full text-left px-6 py-2 rounded-md bg-card-hover hover:bg-card-hover transition-colors flex items-center gap-3 text-sm font-medium text-[var(--th-loss)]"
                        >
                          <Trash2 size={14} className="text-[var(--th-loss)]" />
                          Delete Group
                        </button>
                      )}

                      {/* Leave Group - Only show for non-owners with more than 1 total group */}
                      {!group.isOwner && (
                        <button
                          type="button"
                          onClick={() => {
                            onLeaveGroup?.(group.id)
                            setIsOpen(false)
                          }}
                          className="w-full text-left px-6 py-2 rounded-md bg-card-hover hover:bg-card-hover transition-colors flex items-center gap-3 text-sm font-medium text-[var(--th-draw)]"
                        >
                          <LogOut size={14} className="text-[var(--th-draw)]" />
                          Leave Group
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}

            <div className="border-t border-[var(--th-border)] mt-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  onCreateGroup?.()
                  setIsOpen(false)
                }}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-card-hover transition-colors flex items-center gap-2 text-sm font-medium text-primary"
              >
                <Plus size={16} className="text-muted" />
                Create New Group
              </button>

              <button
                type="button"
                onClick={() => {
                  onJoinGroup?.()
                  setIsOpen(false)
                }}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-card-hover transition-colors flex items-center gap-2 text-sm font-medium text-primary"
              >
                <UserPlus size={16} className="text-muted" />
                Join Group
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
