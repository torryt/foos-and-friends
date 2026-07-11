import { createFileRoute } from '@tanstack/react-router'
import { PlayerProfileContent } from '@/components/player-profile/PlayerProfileContent'
import { useSeasonContext } from '@/contexts/SeasonContext'
import { useGameLogic } from '@/hooks/useGameLogic'
import { useTrophies } from '@/hooks/useTrophies'

export const Route = createFileRoute('/players/$playerId')({
  component: PlayerProfile,
})

function PlayerProfile() {
  const { playerId } = Route.useParams()
  const { players, seasonStats, allMatches, updatePlayer, loading } = useGameLogic()
  const { currentSeason } = useSeasonContext()
  const trophies = useTrophies()

  return (
    <PlayerProfileContent
      playerId={playerId}
      players={players}
      seasonStats={seasonStats}
      allMatches={allMatches}
      trophies={trophies}
      seasonName={currentSeason?.name}
      loading={loading}
      canEdit={true} // For now, assume current user can edit
      onUpdatePlayer={async (playerId, updates) => {
        await updatePlayer(playerId, updates)
      }}
    />
  )
}
