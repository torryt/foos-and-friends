import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { PlayerProfileContent } from '@/components/player-profile/PlayerProfileContent'
import { useGroupPageMode } from '@/contexts/GroupPageContext'
import { usePublicGroup } from '@/contexts/PublicGroupContext'
import { useSeasonContext } from '@/contexts/SeasonContext'
import { useGameLogic } from '@/hooks/useGameLogic'
import { useTrophies } from '@/hooks/useTrophies'

export const Route = createFileRoute('/groups/$groupId/players/$playerId')({
  component: PlayerProfile,
})

function PlayerProfile() {
  const mode = useGroupPageMode()
  return mode === 'member' ? <MemberPlayerProfile /> : <PublicPlayerProfile />
}

function MemberPlayerProfile() {
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
      onUpdatePlayer={async (targetPlayerId, updates) => {
        await updatePlayer(targetPlayerId, updates)
      }}
    />
  )
}

function PublicPlayerProfile() {
  const { groupId, playerId } = Route.useParams()
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
          to: '/groups/$groupId/players/$playerId',
          params: { groupId, playerId: otherPlayerId },
        })
      }}
    />
  )
}
