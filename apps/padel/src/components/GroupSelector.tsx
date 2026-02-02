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
      <div className="bg-white/80 px-3 py-2 rounded-lg border border-white/50">
        <div className="animate-pulse w-6 h-4 bg-gray-200 rounded" />
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
        className="bg-white/80 px-3 py-2 rounded-lg border border-white/50 hover:bg-white transition-colors flex items-center gap-2"
        title={currentGroup ? `Current group: ${currentGroup.name}` : 'Select a group'}
      >
        <Users size={16} className="text-gray-600" />
        <span className="hidden sm:block text-sm font-medium text-gray-700 max-w-32 truncate">
          {currentGroup ? currentGroup.name : 'Select Group'}
        </span>
        <ChevronDown
          size={14}
          className={`text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full mt-1 right-0 bg-white rounded-lg shadow-lg border border-gray-200 min-w-80 z-20">
          <div className="p-2">
            <div className="text-xs font-medium text-gray-500 px-3 py-2">Your Groups</div>

            {userGroups.map((group) => {
              const isExpanded = expandedGroups.has(group.id)
              const isCurrent = group.id === currentGroup?.id

              return (
                <div key={group.id} className="mb-1">
                  {/* Group Header - Clickable to expand/collapse */}
                  <button
                    type="button"
                    onClick={() => toggleGroupExpansion(group.id)}
                    className={`w-full text-left rounded-lg hover:bg-gray-50 transition-colors ${
                      isCurrent ? 'bg-blue-50 border border-blue-200' : ''
                    }`}
                  >
                    <div className="px-3 py-2">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900">{group.name}</div>
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-xs text-gray-400">Code: {group.inviteCode}</span>
                            {group.playerCount !== undefined && (
                              <span className="text-xs text-gray-400">
                                • {group.playerCount} players
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isCurrent && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                          )}
                          {isExpanded ? (
                            <ChevronUp size={16} className="text-gray-400" />
                          ) : (
                            <ChevronDown size={16} className="text-gray-400" />
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
                          className="w-full text-left px-6 py-2 rounded-md bg-gray-50 hover:bg-gray-100 transition-colors flex items-center gap-3 text-sm font-medium text-blue-700"
                        >
                          <Users size={14} className="text-blue-500" />
                          Switch to Group
                        </button>
                      )}

                      {/* Copy Invite Link */}
                      <button
                        type="button"
                        onClick={() => copyInviteLink(group.inviteCode, group.name)}
                        className="w-full text-left px-6 py-2 rounded-md bg-gray-50 hover:bg-gray-100 transition-colors flex items-center gap-3 text-sm font-medium text-gray-700"
                      >
                        <Clipboard size={14} className="text-gray-500" />
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
                          className="w-full text-left px-6 py-2 rounded-md bg-red-50 hover:bg-red-100 transition-colors flex items-center gap-3 text-sm font-medium text-red-700"
                        >
                          <Trash2 size={14} className="text-red-500" />
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
                          className="w-full text-left px-6 py-2 rounded-md bg-blue-50 hover:bg-blue-100 transition-colors flex items-center gap-3 text-sm font-medium text-blue-700"
                        >
                          <LogOut size={14} className="text-blue-500" />
                          Leave Group
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}

            <div className="border-t border-gray-100 mt-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  onCreateGroup?.()
                  setIsOpen(false)
                }}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm font-medium text-gray-700"
              >
                <Plus size={16} className="text-gray-500" />
                Create New Group
              </button>

              <button
                type="button"
                onClick={() => {
                  onJoinGroup?.()
                  setIsOpen(false)
                }}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm font-medium text-gray-700"
              >
                <UserPlus size={16} className="text-gray-500" />
                Join Group
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
