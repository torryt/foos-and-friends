import { useState } from 'react'
import AddPlayerModal from '@/components/AddPlayerModal'
import Header from '@/components/Header'
import MatchHistory from '@/components/MatchHistory'
import PlayerRankings from '@/components/PlayerRankings'
import QuickActions from '@/components/QuickActions'
import TabNavigation from '@/components/TabNavigation'
import { useGameLogic } from '@/hooks/useGameLogic'
import RecordMatchForm from '@/RecordMatchForm'

function App() {
  const [activeTab, setActiveTab] = useState('rankings')
  const [showAddPlayer, setShowAddPlayer] = useState(false)
  const [showRecordMatch, setShowRecordMatch] = useState(false)

  const { players, matches, addPlayer, recordMatch } = useGameLogic()

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-yellow-100">
      <Header playerCount={players.length} />
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
          onAddPlayer={addPlayer}
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

export default App
