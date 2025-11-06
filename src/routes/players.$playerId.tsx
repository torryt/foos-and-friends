import { createFileRoute } from '@tanstack/react-router'
import { Calendar, Target } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { PlayerHeader } from '@/components/player-profile/PlayerHeader'
import { PlayerPositionStats } from '@/components/player-profile/PlayerPositionStats'
import { PlayerRankingVisualization } from '@/components/player-profile/PlayerRankingVisualization'
import { PlayerRecentMatches } from '@/components/player-profile/PlayerRecentMatches'
import { PlayerRelationshipStats } from '@/components/player-profile/PlayerRelationshipStats'
import { PlayerStatsCards } from '@/components/player-profile/PlayerStatsCards'
import { Card } from '@/components/ui/Card'
import { useGameLogic } from '@/hooks/useGameLogic'
import { usePositionStats } from '@/hooks/usePositionStats'
import { useRankingHistory } from '@/hooks/useRankingHistory'
import { scrollToTop } from '@/lib/utils'

export const Route = createFileRoute('/players/$playerId')({
  component: PlayerProfile,
})

function PlayerProfile() {
  const { playerId } = Route.useParams()
  const { players, matches, updatePlayer, loading } = useGameLogic()

  const player = players.find((p) => p.id === playerId)
  const positionStats = usePositionStats(playerId, matches)

  // Get ranking history for main player and all potential comparison players
  const allPlayerIds = [
    playerId,
    ...players.filter((p) => p.id !== playerId && p.matchesPlayed > 0).map((p) => p.id),
  ]
  const allPlayerHistories = useRankingHistory(allPlayerIds, matches, players)
  const mainPlayerHistory = allPlayerHistories.filter((h) => h.playerId === playerId)

  // Scroll to top when navigating to a different player
  useEffect(() => {
    // Explicitly using playerId to track navigation between different players
    if (playerId) {
      scrollToTop()
    }
  }, [playerId])

  // Calculate player statistics
  const playerStats = useMemo(() => {
    if (!player) return null

    const playerMatches = matches.filter((match) => {
      return (
        match.team1[0].id === playerId ||
        match.team1[1].id === playerId ||
        match.team2[0].id === playerId ||
        match.team2[1].id === playerId
      )
    })

    // Recent form (last 5 matches)
    const recentMatches = playerMatches.slice(0, 5)
    const recentForm = recentMatches.map((match) => {
      const wasInTeam1 = match.team1[0].id === playerId || match.team1[1].id === playerId
      const won = wasInTeam1 ? match.score1 > match.score2 : match.score2 > match.score1
      return won ? 'W' : 'L'
    })

    // Win/loss streaks
    let currentStreak = 0
    let streakType: 'win' | 'loss' | null = null
    for (const match of playerMatches) {
      const wasInTeam1 = match.team1[0].id === playerId || match.team1[1].id === playerId
      const won = wasInTeam1 ? match.score1 > match.score2 : match.score2 > match.score1

      if (streakType === null) {
        streakType = won ? 'win' : 'loss'
        currentStreak = 1
      } else if ((won && streakType === 'win') || (!won && streakType === 'loss')) {
        currentStreak++
      } else {
        break
      }
    }

    // Goals statistics
    const totalGoalsScored = playerMatches.reduce((sum, match) => {
      const wasInTeam1 = match.team1[0].id === playerId || match.team1[1].id === playerId
      return sum + (wasInTeam1 ? match.score1 : match.score2)
    }, 0)

    const totalGoalsConceded = playerMatches.reduce((sum, match) => {
      const wasInTeam1 = match.team1[0].id === playerId || match.team1[1].id === playerId
      return sum + (wasInTeam1 ? match.score2 : match.score1)
    }, 0)

    const avgGoalsScored =
      playerMatches.length > 0 ? (totalGoalsScored / playerMatches.length).toFixed(1) : '0'
    const avgGoalsConceded =
      playerMatches.length > 0 ? (totalGoalsConceded / playerMatches.length).toFixed(1) : '0'

    // Get ranking history from player stats
    const rankingHistory: number[] = []
    for (const match of playerMatches) {
      if (match.playerStats) {
        const playerStat = match.playerStats.find((ps) => ps.playerId === playerId)
        if (playerStat) {
          rankingHistory.push(playerStat.postGameRanking)
        }
      }
    }

    const highestRanking =
      rankingHistory.length > 0 ? Math.max(player.ranking, ...rankingHistory) : player.ranking
    const lowestRanking =
      rankingHistory.length > 0 ? Math.min(player.ranking, ...rankingHistory) : player.ranking

    return {
      totalMatches: playerMatches.length,
      recentForm,
      currentStreak,
      streakType,
      avgGoalsScored,
      avgGoalsConceded,
      totalGoalsScored,
      totalGoalsConceded,
      goalDifference: totalGoalsScored - totalGoalsConceded,
      highestRanking,
      lowestRanking,
      playerMatches,
    }
  }, [player, matches, playerId])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading player data...</div>
      </div>
    )
  }

  if (!player || !playerStats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Player not found</div>
      </div>
    )
  }

  const winRate =
    player.matchesPlayed > 0 ? Math.round((player.wins / player.matchesPlayed) * 100) : 0

  const handleUpdatePlayer = async (playerId: string, updates: Partial<typeof player>) => {
    await updatePlayer(playerId, updates)
  }

  return (
    <div className="space-y-6">
      {/* Player Header */}
      <PlayerHeader
        player={player}
        isCurrentUser={true} // For now, assume current user can edit
        onUpdatePlayer={handleUpdatePlayer}
      />

      {/* Position Statistics */}
      <PlayerPositionStats positionStats={positionStats} />

      {/* Ranking Visualization */}
      <PlayerRankingVisualization
        mainPlayerHistory={mainPlayerHistory}
        comparisonHistories={allPlayerHistories}
        players={players}
        playerId={playerId}
      />

      {/* Statistics Cards */}
      <PlayerStatsCards
        winRate={winRate}
        wins={player.wins}
        losses={player.losses}
        goalDifference={playerStats.goalDifference}
        goalsFor={playerStats.totalGoalsScored}
        goalsAgainst={playerStats.totalGoalsConceded}
        currentStreak={playerStats.currentStreak}
        streakType={playerStats.streakType}
        bestStreak={playerStats.currentStreak} // Simplified for now
        worstStreak={playerStats.currentStreak} // Simplified for now
      />

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4 bg-white/80 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Goals (Avg)</p>
              <p className="text-2xl font-bold text-gray-900">
                {playerStats.avgGoalsScored} - {playerStats.avgGoalsConceded}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Diff: {playerStats.goalDifference > 0 ? '+' : ''}
                {playerStats.goalDifference}
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <Target className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-white/80 backdrop-blur-sm">
          <div className="flex items-center space-x-3">
            <Calendar className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-500">Total Matches</p>
              <p className="text-lg font-semibold text-gray-900">{player.matchesPlayed}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Relationship Statistics */}
      <PlayerRelationshipStats playerId={playerId} players={players} matches={matches} />

      {/* Match History */}
      <PlayerRecentMatches
        playerId={playerId}
        players={players}
        matches={matches}
        recentForm={playerStats.recentForm}
      />
    </div>
  )
}
