import type { AuthUser } from '@foos/shared'
import { Crown, LogOut, User, Users } from 'lucide-react'
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
      <div className="bg-gradient-to-r from-white/90 to-[#F0EFF4]/90 backdrop-blur-sm shadow-sm border-b border-white/20 sticky top-0 z-40">
        <div className="container mx-auto max-w-6xl">
          <div className="px-4 py-3">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-lg md:text-2xl font-bold bg-gradient-to-r from-[#832161] to-[#DA4167] bg-clip-text text-transparent flex items-center gap-2">
                  <Crown className="text-[#832161]" size={20} />
                  Chess & Friends
                </h1>
                <p className="text-xs md:text-sm text-slate-600">Play. Compete. Connect.</p>
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
                        <div className="bg-white/80 px-2 py-2 rounded-lg border border-white/50">
                          <Users size={16} className="text-gray-600" />
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
                        className="bg-white/80 px-2 py-2 rounded-lg border border-white/50 hover:bg-white transition-colors flex items-center gap-2"
                        title={user.email.split('@')[0]}
                      >
                        <User size={16} className="text-gray-600" />
                        {/* Desktop: Show username */}
                        <div className="hidden sm:flex items-center gap-1">
                          <span className="text-xs md:text-sm font-medium text-gray-700 max-w-16 md:max-w-32 truncate">
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
                          <div className="absolute top-full mt-1 right-0 bg-white rounded-lg shadow-lg border border-gray-200 min-w-48 z-20">
                            <div className="p-2">
                              {/* User info section */}
                              <div className="px-3 py-2 border-b border-gray-100">
                                <div className="text-sm font-medium text-gray-900 truncate">
                                  {user.email.split('@')[0]}
                                </div>
                                <div className="text-xs text-gray-500 truncate">{user.email}</div>
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
                                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-2 text-sm font-medium text-red-700"
                                  >
                                    <LogOut size={16} className="text-red-500" />
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
