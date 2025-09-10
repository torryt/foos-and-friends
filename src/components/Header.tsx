import { LogOut, User, Zap } from 'lucide-react'
import { useState } from 'react'
import type { AuthUser } from '@/types'
import { CreateGroupModal } from './CreateGroupModal'
import { GroupSelector } from './GroupSelector'
import { JoinGroupModal } from './JoinGroupModal'

interface HeaderProps {
  playerCount: number
  user?: AuthUser | null
  onSignOut?: () => void
  isMockMode?: boolean
}

const Header = ({ playerCount, user, onSignOut, isMockMode }: HeaderProps) => {
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [showJoinGroup, setShowJoinGroup] = useState(false)

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

              <div className="flex items-center gap-3">
                <div className="text-center bg-white/80 px-3 py-2 rounded-lg border border-white/50">
                  <div className="text-sm font-bold text-orange-600">{playerCount}</div>
                  <div className="text-xs text-slate-600">Friends</div>
                </div>

                {user && (
                  <>
                    <GroupSelector
                      onCreateGroup={() => setShowCreateGroup(true)}
                      onJoinGroup={() => setShowJoinGroup(true)}
                    />

                    <div className="flex items-center gap-2 bg-white/80 px-3 py-2 rounded-lg border border-white/50">
                      {isMockMode && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                          Demo
                        </span>
                      )}

                      <div className="flex items-center gap-2">
                        <User size={16} className="text-gray-600" />
                        <div className="text-sm font-medium text-gray-700 max-w-32 truncate">
                          {isMockMode ? 'Demo User' : user.email}
                        </div>
                      </div>

                      {onSignOut && (
                        <button
                          type="button"
                          onClick={onSignOut}
                          className="ml-2 p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Sign out"
                        >
                          <LogOut size={14} />
                        </button>
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
    </>
  )
}

export default Header
