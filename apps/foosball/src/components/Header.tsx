import { type AuthUser, ThemePicker } from '@foos/shared'
import { LogOut, User, Users, Zap } from 'lucide-react'
import { useState } from 'react'
import { useGroupContext } from '@/contexts/GroupContext'
import { ConnectionStatus } from './ConnectionStatus'
import { CreateGroupModal } from './CreateGroupModal'
import { DeleteGroupConfirmationModal } from './DeleteGroupConfirmationModal'
import { GroupSelector } from './GroupSelector'
import { JoinGroupModal } from './JoinGroupModal'
import { LeaveGroupConfirmationModal } from './LeaveGroupConfirmationModal'

// import { SeasonSelector } from './SeasonSelector' // Hidden for now

interface HeaderProps {
  user?: AuthUser | null
  onSignOut?: () => void
}

const Header = ({ user, onSignOut }: HeaderProps) => {
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [showJoinGroup, setShowJoinGroup] = useState(false)
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)
  const [showDeleteGroup, setShowDeleteGroup] = useState(false)
  const [showLeaveGroup, setShowLeaveGroup] = useState(false)
  const [groupToDelete, setGroupToDelete] = useState<string | null>(null)
  const [groupToLeave, setGroupToLeave] = useState<string | null>(null)
  const { currentGroup, userGroups, deleteGroup, leaveGroup } = useGroupContext()

  const handleDeleteGroup = (groupId: string) => {
    setGroupToDelete(groupId)
    setShowDeleteGroup(true)
  }

  const handleDeleteGroupConfirm = async (groupId: string) => {
    const result = await deleteGroup(groupId)
    setShowDeleteGroup(false)
    setGroupToDelete(null)
    return result
  }

  const handleLeaveGroup = (groupId: string) => {
    setGroupToLeave(groupId)
    setShowLeaveGroup(true)
  }

  const handleLeaveGroupConfirm = async (groupId: string) => {
    const result = await leaveGroup(groupId)
    setShowLeaveGroup(false)
    setGroupToLeave(null)
    return result
  }

  return (
    <>
      <div className="bg-[var(--th-bg-header)] backdrop-blur-sm shadow-sm border-b border-[var(--th-border-subtle)] sticky top-0 z-40">
        <div className="container mx-auto max-w-6xl">
          <div className="px-4 py-3">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-lg md:text-2xl font-bold text-sport-gradient flex items-center gap-2">
                  <Zap className="text-[var(--th-sport-primary)]" size={20} />
                  Foos & Friends
                </h1>
                <p className="text-xs md:text-sm text-secondary">Play. Compete. Connect.</p>
              </div>

              <div className="flex items-center gap-1 md:gap-3">
                {/* Connection Status Indicator */}
                <ConnectionStatus />

                {user && (
                  <>
                    {/* Desktop Group Selector */}
                    <div className="hidden sm:block">
                      <GroupSelector
                        onCreateGroup={() => setShowCreateGroup(true)}
                        onJoinGroup={() => setShowJoinGroup(true)}
                        onDeleteGroup={handleDeleteGroup}
                        onLeaveGroup={handleLeaveGroup}
                      />
                    </div>

                    {/* Mobile Group Icon */}
                    <div className="sm:hidden">
                      {currentGroup ? (
                        <GroupSelector
                          onCreateGroup={() => setShowCreateGroup(true)}
                          onJoinGroup={() => setShowJoinGroup(true)}
                          onDeleteGroup={handleDeleteGroup}
                          onLeaveGroup={handleLeaveGroup}
                        />
                      ) : (
                        <div className="bg-card px-2 py-2 rounded-[var(--th-radius-md)] border border-[var(--th-border-subtle)]">
                          <Users size={16} className="text-secondary" />
                        </div>
                      )}
                    </div>

                    {/* Season Selector - Hidden for now while implementing underlying support */}
                    {/* <SeasonSelector /> */}

                    {/* Profile Dropdown for all screen sizes */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                        className="bg-card px-2 py-2 rounded-[var(--th-radius-md)] border border-[var(--th-border-subtle)] hover:bg-card-hover transition-colors flex items-center gap-2"
                        title={user.email.split('@')[0]}
                      >
                        <User size={16} className="text-secondary" />
                        {/* Desktop: Show username */}
                        <div className="hidden sm:flex items-center gap-1">
                          <span className="text-xs md:text-sm font-medium text-primary max-w-16 md:max-w-32 truncate">
                            {user.email.split('@')[0]}
                          </span>
                        </div>
                      </button>

                      {showProfileDropdown && (
                        <>
                          {/* Backdrop */}
                          <button
                            type="button"
                            className="fixed inset-0 z-10"
                            onClick={() => setShowProfileDropdown(false)}
                            tabIndex={-1}
                            aria-label="Close profile dropdown"
                          />

                          {/* Profile Dropdown */}
                          <div className="absolute top-full mt-1 right-0 bg-card rounded-[var(--th-radius-lg)] shadow-theme-card border border-[var(--th-border)] min-w-48 z-20">
                            <div className="p-2">
                              {/* User info section */}
                              <div className="px-3 py-2 border-b border-[var(--th-border)]">
                                <div className="text-sm font-medium text-primary truncate">
                                  {user.email.split('@')[0]}
                                </div>
                                <div className="text-xs text-muted truncate">{user.email}</div>
                              </div>

                              {/* Theme picker */}
                              <div className="border-b border-[var(--th-border)]">
                                <ThemePicker />
                              </div>

                              {/* Actions section */}
                              <div className="pt-2">
                                {onSignOut && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onSignOut()
                                      setShowProfileDropdown(false)
                                    }}
                                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-loss/10 transition-colors flex items-center gap-2 text-sm font-medium text-[var(--th-loss)]"
                                  >
                                    <LogOut size={16} className="text-[var(--th-loss)]" />
                                    Sign Out
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <CreateGroupModal isOpen={showCreateGroup} onClose={() => setShowCreateGroup(false)} />

      <JoinGroupModal isOpen={showJoinGroup} onClose={() => setShowJoinGroup(false)} />

      <DeleteGroupConfirmationModal
        isOpen={showDeleteGroup}
        onClose={() => {
          setShowDeleteGroup(false)
          setGroupToDelete(null)
        }}
        group={groupToDelete ? userGroups.find((g) => g.id === groupToDelete) || null : null}
        onDelete={handleDeleteGroupConfirm}
      />

      <LeaveGroupConfirmationModal
        isOpen={showLeaveGroup}
        onClose={() => {
          setShowLeaveGroup(false)
          setGroupToLeave(null)
        }}
        group={groupToLeave ? userGroups.find((g) => g.id === groupToLeave) || null : null}
        onLeave={handleLeaveGroupConfirm}
      />
    </>
  )
}

export default Header
