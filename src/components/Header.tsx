import { LogOut, User, Users, Zap } from 'lucide-react'
import { useState } from 'react'
import { useGroupContext } from '@/contexts/GroupContext'
import { useAuth } from '@/hooks/useAuth'
import { playersService } from '@/services/playersService'
import type { AuthUser, Player } from '@/types'
import { CreateGroupModal } from './CreateGroupModal'
import { GroupSelector } from './GroupSelector'
import { JoinGroupModal } from './JoinGroupModal'
import PlayerManagementModal from './PlayerManagementModal'

interface HeaderProps {
  user?: AuthUser | null
  onSignOut?: () => void
}

const Header = ({ user, onSignOut }: HeaderProps) => {
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [showJoinGroup, setShowJoinGroup] = useState(false)
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)
  const [showPlayerManagement, setShowPlayerManagement] = useState(false)
  const [players, setPlayers] = useState<Player[]>([])
  const [_loadingPlayers, setLoadingPlayers] = useState(false)
  const { currentGroup, userGroups } = useGroupContext()
  const { user: authUser } = useAuth()

  // Get current group data for admin check
  const currentGroupData = userGroups.find((g) => g.id === currentGroup?.id)
  const isAdmin = currentGroupData?.ownerId === authUser?.id

  const loadPlayers = async () => {
    if (!currentGroup) return

    setLoadingPlayers(true)
    try {
      const result = await playersService.getPlayersByGroup(currentGroup.id)
      if (result.data) {
        setPlayers(result.data)
      }
    } catch (_error) {
      console.error('Failed to load players:', _error)
    } finally {
      setLoadingPlayers(false)
    }
  }

  const handleManageGroup = (_groupId: string) => {
    setShowPlayerManagement(true)
    loadPlayers()
  }

  const handleUpdatePlayer = async (
    playerId: string,
    updates: { name?: string; avatar?: string },
  ) => {
    try {
      const result = await playersService.updatePlayerProfile(playerId, updates)
      if (result.data) {
        setPlayers((prev) => prev.map((p) => (p.id === playerId ? (result.data ?? p) : p)))
        return { success: true }
      }
      return { success: false, error: result.error || 'Failed to update player' }
    } catch (_error) {
      return { success: false, error: 'An unexpected error occurred' }
    }
  }

  const handleDeletePlayer = async (playerId: string) => {
    try {
      const result = await playersService.deletePlayer(playerId)
      if (!result.error) {
        setPlayers((prev) => prev.filter((p) => p.id !== playerId))
        return { success: true }
      }
      return { success: false, error: result.error }
    } catch (_error) {
      return { success: false, error: 'An unexpected error occurred' }
    }
  }

  return (
    <>
      <div className="bg-gradient-to-r from-white/90 to-orange-50/90 backdrop-blur-sm shadow-sm border-b border-white/20 sticky top-0 z-40">
        <div className="container mx-auto max-w-6xl">
          <div className="px-4 py-3">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-lg md:text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent flex items-center gap-2">
                  <Zap className="text-orange-500" size={20} />
                  Foos & Friends
                </h1>
                <p className="text-xs md:text-sm text-slate-600">Play. Compete. Connect.</p>
              </div>

              <div className="flex items-center gap-1 md:gap-3">
                {user && (
                  <>
                    {/* Desktop Group Selector */}
                    <div className="hidden sm:block">
                      <GroupSelector
                        onCreateGroup={() => setShowCreateGroup(true)}
                        onJoinGroup={() => setShowJoinGroup(true)}
                        onManageGroup={handleManageGroup}
                      />
                    </div>

                    {/* Mobile Group Icon */}
                    <div className="sm:hidden">
                      {currentGroup ? (
                        <GroupSelector
                          onCreateGroup={() => setShowCreateGroup(true)}
                          onJoinGroup={() => setShowJoinGroup(true)}
                          onManageGroup={handleManageGroup}
                        />
                      ) : (
                        <div className="bg-white/80 px-2 py-2 rounded-lg border border-white/50">
                          <Users size={16} className="text-gray-600" />
                        </div>
                      )}
                    </div>

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

      <PlayerManagementModal
        isOpen={showPlayerManagement}
        onClose={() => setShowPlayerManagement(false)}
        players={players}
        currentUserId={authUser?.id}
        isAdmin={isAdmin}
        onUpdatePlayer={handleUpdatePlayer}
        onDeletePlayer={handleDeletePlayer}
      />
    </>
  )
}

export default Header
