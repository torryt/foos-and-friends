import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { PlayerProfileContent } from '@/components/player-profile/PlayerProfileContent'
import { usePublicGroup } from '@/contexts/PublicGroupContext'

export const Route = createFileRoute('/public/$token/players/$playerId')({
  component: PublicPlayerProfile,
})

function PublicPlayerProfile() {
  const { token, playerId } = Route.useParams()
  const navigate = useNavigate()
  const { players, seasonStats, allMatches, trophies, currentSeason, loading } = usePublicGroup()

  return (
    <PlayerProfileContent
      playerId={playerId}
      players={players}
      seasonStats={seasonStats}
      allMatches={allMatches}
      trophies={trophies}
      seasonName={currentSeason?.name}
      loading={loading}
      canEdit={false}
      onPlayerClick={(otherPlayerId) => {
        navigate({
          to: '/public/$token/players/$playerId',
          params: { token, playerId: otherPlayerId },
        })
      }}
    />
  )
}
