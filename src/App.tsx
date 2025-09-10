import { useEffect, useState } from 'react'
import AddPlayerModal from '@/components/AddPlayerModal'
import { CreateGroupModal } from '@/components/CreateGroupModal'
import { GroupSelectionScreen } from '@/components/GroupSelectionScreen'
import Header from '@/components/Header'
import { JoinGroupModal } from '@/components/JoinGroupModal'
import MatchHistory from '@/components/MatchHistory'
import PlayerRankings from '@/components/PlayerRankings'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import QuickActions from '@/components/QuickActions'
import TabNavigation from '@/components/TabNavigation'
import { GroupProvider, useGroupContext } from '@/contexts/GroupContext'
import { useAuth } from '@/hooks/useAuth'
import { useGameLogic } from '@/hooks/useGameLogic'
import RecordMatchForm from '@/RecordMatchForm'
import type { AuthUser } from '@/types'

interface AppContentProps {
  user: AuthUser | null
  onSignOut: () => void
  isMockMode: boolean
}

const AppContent = ({ user, onSignOut, isMockMode }: AppContentProps) => {
  const [activeTab, setActiveTab] = useState('rankings')
  const [showAddPlayer, setShowAddPlayer] = useState(false)
  const [showRecordMatch, setShowRecordMatch] = useState(false)
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [showJoinGroup, setShowJoinGroup] = useState(false)

  const { currentGroup, userGroups, loading, switchGroup, joinGroup } = useGroupContext()

  // Always call useGameLogic at top level (hooks rule)
  const { players, matches, addPlayer, recordMatch } = useGameLogic()

  // Handle invite links on app load
  useEffect(() => {
    const handleInviteLink = async () => {
      const path = window.location.pathname
      const inviteMatch = path.match(/\/invite\/([A-Z0-9]+)$/i)

      if (inviteMatch && user) {
        const inviteCode = inviteMatch[1]
        try {
          const result = await joinGroup(inviteCode)
          if (result.success) {
            // Clear the invite URL after successful join
            window.history.replaceState({}, '', '/')
            // Optional: Show success message
            console.log('Successfully joined group via invite link')
          } else {
            console.error('Failed to join group:', result.error)
            // Optional: Show error message to user
          }
        } catch (error) {
          console.error('Error processing invite link:', error)
        }
      }
    }

    handleInviteLink()
  }, [user, joinGroup])

  // Show group selection when no active group
  if (!currentGroup) {
    return (
      <>
        <GroupSelectionScreen
          userGroups={userGroups}
          onSelectGroup={switchGroup}
          onCreateGroup={() => setShowCreateGroup(true)}
          onJoinGroup={() => setShowJoinGroup(true)}
          loading={loading}
        />

        {/* Group management modals - available from selection screen */}
        <CreateGroupModal isOpen={showCreateGroup} onClose={() => setShowCreateGroup(false)} />
        <JoinGroupModal isOpen={showJoinGroup} onClose={() => setShowJoinGroup(false)} />
      </>
    )
  }

  // Normal app functionality when group is selected

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-yellow-100">
      <Header
        playerCount={players.length}
        user={user}
        onSignOut={onSignOut}
        isMockMode={isMockMode}
      />
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="container mx-auto max-w-6xl p-4">
        {activeTab === 'rankings' && (
          <div className="space-y-4">
            <QuickActions
              onRecordMatch={() => setShowRecordMatch(true)}
              onAddPlayer={() => setShowAddPlayer(true)}
            />
            <PlayerRankings players={players} />
          </div>
        )}

        {activeTab === 'matches' && (
          <MatchHistory matches={matches} onRecordMatch={() => setShowRecordMatch(true)} />
        )}

        <AddPlayerModal
          isOpen={showAddPlayer}
          onClose={() => setShowAddPlayer(false)}
          onAddPlayer={(name, avatar) => addPlayer(name, avatar)}
        />

        {showRecordMatch && (
          <RecordMatchForm
            players={players}
            recordMatch={recordMatch}
            setShowRecordMatch={setShowRecordMatch}
          />
        )}
      </div>
    </div>
  )
}

function App() {
  const { user, signOut, isMockMode } = useAuth()

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <ProtectedRoute>
      <GroupProvider>
        <AppContent user={user} onSignOut={handleSignOut} isMockMode={isMockMode} />
      </GroupProvider>
    </ProtectedRoute>
  )
}

export default App
