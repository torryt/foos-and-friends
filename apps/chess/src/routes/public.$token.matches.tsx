import { createFileRoute, useNavigate } from '@tanstack/react-router'
import MatchHistory from '@/components/MatchHistory'
import { usePublicGroup } from '@/contexts/PublicGroupContext'

export const Route = createFileRoute('/public/$token/matches')({
  component: PublicMatches,
})

function PublicMatches() {
  const navigate = useNavigate()
  const { token } = Route.useParams()
  const { players, seasonMatches, allMatches } = usePublicGroup()

  const handlePlayerClick = (playerId: string) => {
    navigate({
      to: '/public/$token/players/$playerId',
      params: { token, playerId },
    })
  }

  return (
    <div className="space-y-4">
      {/* No onAddMatch: the public page is read-only */}
      <MatchHistory
        matches={seasonMatches}
        allMatches={allMatches}
        players={players}
        onPlayerClick={handlePlayerClick}
      />
    </div>
  )
}
