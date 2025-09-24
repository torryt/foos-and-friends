import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import AddPlayerModal from '@/components/AddPlayerModal'
import PlayerRankings from '@/components/PlayerRankings'
import QuickActions from '@/components/QuickActions'
import { useGameLogic } from '@/hooks/useGameLogic'
import RegisterGameForm from '@/RegisterGameForm'

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
  const navigate = useNavigate()
  const [showAddPlayer, setShowAddPlayer] = useState(false)
  const [showRecordMatch, setShowRecordMatch] = useState(false)

  const { players, matches, addPlayer, recordMatch } = useGameLogic()

  const handlePlayerCardClick = (playerId: string) => {
    navigate({
      to: '/players/$playerId',
      params: { playerId },
    })
  }

  return (
    <div className="space-y-4">
      <QuickActions
        onRecordMatch={() => setShowRecordMatch(true)}
        onAddPlayer={() => setShowAddPlayer(true)}
      />

      <PlayerRankings players={players} matches={matches} onPlayerClick={handlePlayerCardClick} />

      <AddPlayerModal
        isOpen={showAddPlayer}
        onClose={() => setShowAddPlayer(false)}
        onAddPlayer={(name, avatar) => addPlayer(name, avatar)}
      />

      {showRecordMatch && (
        <RegisterGameForm
          players={players}
          recordMatch={recordMatch}
          setShowRecordMatch={setShowRecordMatch}
        />
      )}
    </div>
  )
}
