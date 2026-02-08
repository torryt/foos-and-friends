import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import AddPlayerModal from '@/components/AddPlayerModal'
import { MatchEntryModal } from '@/components/MatchEntryModal'
import PlayerRankings from '@/components/PlayerRankings'
import QuickActions from '@/components/QuickActions'
import { useGameLogic } from '@/hooks/useGameLogic'

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
  const navigate = useNavigate()
  const [showAddPlayer, setShowAddPlayer] = useState(false)
  const [showRecordMatch, setShowRecordMatch] = useState(false)

  const { players, seasonStats, matches, supportedMatchTypes, addPlayer, addMatch } = useGameLogic()

  const handlePlayerCardClick = (playerId: string) => {
    navigate({
      to: '/players/$playerId',
      params: { playerId },
    })
  }

  return (
    <div className="space-y-4">
      <QuickActions
        onAddMatch={() => setShowRecordMatch(true)}
        onAddPlayer={() => setShowAddPlayer(true)}
      />

      <PlayerRankings
        players={players}
        seasonStats={seasonStats}
        matches={matches}
        onPlayerClick={handlePlayerCardClick}
      />

      <AddPlayerModal
        isOpen={showAddPlayer}
        onClose={() => setShowAddPlayer(false)}
        onAddPlayer={(name, avatar) => addPlayer(name, avatar)}
      />

      {showRecordMatch && (
        <MatchEntryModal
          players={players}
          matches={matches}
          supportedMatchTypes={supportedMatchTypes}
          addMatch={addMatch}
          onClose={() => setShowRecordMatch(false)}
        />
      )}
    </div>
  )
}
