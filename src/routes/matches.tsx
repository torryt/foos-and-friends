import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { z } from 'zod'
import { MatchEntryModal } from '@/components/MatchEntryModal'
import MatchHistory from '@/components/MatchHistory'
import { useGameLogic } from '@/hooks/useGameLogic'

const matchesSearchSchema = z.object({
  playerId: z.string().optional(),
})

export const Route = createFileRoute('/matches')({
  component: Matches,
  validateSearch: matchesSearchSchema,
})

function Matches() {
  const { playerId } = Route.useSearch()
  const navigate = useNavigate()
  const [showRecordMatch, setShowRecordMatch] = useState(false)
  const { players, matches, addMatch } = useGameLogic()

  const handlePlayerClick = (playerId: string) => {
    navigate({
      to: '/players/$playerId',
      params: { playerId },
    })
  }

  return (
    <div>
      <MatchHistory
        matches={matches}
        players={players}
        onAddMatch={() => setShowRecordMatch(true)}
        initialSelectedPlayer={playerId}
        onPlayerClick={handlePlayerClick}
      />

      {showRecordMatch && (
        <MatchEntryModal
          players={players}
          matches={matches}
          addMatch={addMatch}
          onClose={() => setShowRecordMatch(false)}
        />
      )}
    </div>
  )
}
