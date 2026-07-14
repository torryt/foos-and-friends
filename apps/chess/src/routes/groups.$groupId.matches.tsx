import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { z } from 'zod'
import { ArchivedSeasonBanner } from '@/components/ArchivedSeasonBanner'
import { MatchEntryModal } from '@/components/MatchEntryModal'
import { MilestoneCelebration } from '@/components/MilestoneCelebration'
import MatchHistory from '@/components/MatchHistory'
import { useGroupPageMode } from '@/contexts/GroupPageContext'
import { usePublicGroup } from '@/contexts/PublicGroupContext'
import { useGameLogic } from '@/hooks/useGameLogic'

const matchesSearchSchema = z.object({
  playerId: z.string().optional(),
})

export const Route = createFileRoute('/groups/$groupId/matches')({
  component: Matches,
  validateSearch: matchesSearchSchema,
})

function Matches() {
  const mode = useGroupPageMode()
  return mode === 'member' ? <MemberMatches /> : <PublicMatches />
}

function MemberMatches() {
  const { groupId } = Route.useParams()
  const { playerId } = Route.useSearch()
  const navigate = useNavigate()
  const [showRecordMatch, setShowRecordMatch] = useState(false)
  const {
    players,
    matches,
    allMatches,
    supportedMatchTypes,
    addMatch,
    currentMilestone,
    dismissMilestone,
  } = useGameLogic()

  const handlePlayerClick = (targetPlayerId: string) => {
    navigate({
      to: '/groups/$groupId/players/$playerId',
      params: { groupId, playerId: targetPlayerId },
    })
  }

  return (
    <div className="space-y-4">
      <ArchivedSeasonBanner />
      <MatchHistory
        matches={matches}
        allMatches={allMatches}
        players={players}
        onAddMatch={() => setShowRecordMatch(true)}
        initialSelectedPlayer={playerId}
        onPlayerClick={handlePlayerClick}
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

      <MilestoneCelebration reached={currentMilestone} onDismiss={dismissMilestone} />
    </div>
  )
}

function PublicMatches() {
  const { groupId } = Route.useParams()
  const navigate = useNavigate()
  const { players, seasonMatches, allMatches } = usePublicGroup()

  const handlePlayerClick = (playerId: string) => {
    navigate({
      to: '/groups/$groupId/players/$playerId',
      params: { groupId, playerId },
    })
  }

  return (
    <div className="space-y-4">
      {/* No onAddMatch: the public view is read-only */}
      <MatchHistory
        matches={seasonMatches}
        allMatches={allMatches}
        players={players}
        onPlayerClick={handlePlayerClick}
      />
    </div>
  )
}
