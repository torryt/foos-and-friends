import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { z } from 'zod'
import { EditMatchDialog } from '@/components/EditMatchDialog'
import MatchHistory from '@/components/MatchHistory'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useGameLogic } from '@/hooks/useGameLogic'
import RegisterGameForm from '@/RegisterGameForm'
import type { Match } from '@/types'

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
  const [editingMatch, setEditingMatch] = useState<Match | null>(null)
  const [deletingMatchId, setDeletingMatchId] = useState<string | null>(null)
  const { players, matches, recordMatch, updateMatch, deleteMatch } = useGameLogic()

  const handlePlayerClick = (playerId: string) => {
    navigate({
      to: '/players/$playerId',
      params: { playerId },
    })
  }

  const handleEditMatch = (match: Match) => {
    setEditingMatch(match)
  }

  const handleDeleteMatch = (matchId: string) => {
    setDeletingMatchId(matchId)
  }

  const handleSaveMatch = async (
    matchId: string,
    updates: {
      team1Player1Id: string
      team1Player2Id: string
      team2Player1Id: string
      team2Player2Id: string
      score1: number
      score2: number
    },
  ) => {
    const result = await updateMatch(matchId, updates)
    if (!result.error) {
      setEditingMatch(null)
    } else {
      alert(`Failed to update match: ${result.error}`)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deletingMatchId) return

    const result = await deleteMatch(deletingMatchId)
    if (!result.error) {
      setDeletingMatchId(null)
    } else {
      alert(`Failed to delete match: ${result.error}`)
    }
  }

  return (
    <div>
      <MatchHistory
        matches={matches}
        players={players}
        onRecordMatch={() => setShowRecordMatch(true)}
        initialSelectedPlayer={playerId}
        onPlayerClick={handlePlayerClick}
        onEditMatch={handleEditMatch}
        onDeleteMatch={handleDeleteMatch}
      />

      {showRecordMatch && (
        <RegisterGameForm
          players={players}
          matches={matches}
          recordMatch={recordMatch}
          setShowRecordMatch={setShowRecordMatch}
        />
      )}

      <EditMatchDialog
        match={editingMatch}
        players={players}
        open={!!editingMatch}
        onOpenChange={(open) => !open && setEditingMatch(null)}
        onSave={handleSaveMatch}
      />

      <ConfirmDialog
        open={!!deletingMatchId}
        onOpenChange={(open) => !open && setDeletingMatchId(null)}
        title="Delete Match"
        description="Are you sure you want to delete this match? This will recalculate all ELO scores and statistics from this point forward. This action cannot be undone."
        actionLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleConfirmDelete}
        isDestructive
      />
    </div>
  )
}
