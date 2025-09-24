import { useMemo } from 'react'
import type { Match, Player } from '@/types'

export interface RankingDataPoint {
  matchNumber: number
  date: string
  ranking: number
  matchId: string
  result: 'win' | 'loss'
  score: string
}

export interface PlayerRankingHistory {
  playerId: string
  playerName: string
  playerAvatar: string
  initialRanking: number
  data: RankingDataPoint[]
  currentRanking: number
  highestRanking: number
  lowestRanking: number
}

export function useRankingHistory(
  playerId: string | string[],
  matches: Match[],
  players: Player[],
): PlayerRankingHistory[] {
  return useMemo(() => {
    const playerIds = Array.isArray(playerId) ? playerId : [playerId]

    return playerIds
      .map((id) => {
        const player = players.find((p) => p.id === id)
        if (!player) return null

        // Get all matches for this player, sorted by date (newest first in the source)
        const playerMatches = matches
          .filter(
            (match) =>
              match.team1[0].id === id ||
              match.team1[1].id === id ||
              match.team2[0].id === id ||
              match.team2[1].id === id,
          )
          .reverse() // Reverse to get oldest first for chronological order

        const dataPoints: RankingDataPoint[] = []
        let currentRanking = 1200 // Default starting ranking

        // Find the oldest match with ranking data to get initial ranking
        for (const match of playerMatches) {
          if (match.playerStats) {
            const stats = match.playerStats.find((ps) => ps.playerId === id)
            if (stats) {
              currentRanking = stats.preGameRanking
              break
            }
          }
        }

        // Build ranking history
        playerMatches.forEach((match, index) => {
          const wasInTeam1 = match.team1[0].id === id || match.team1[1].id === id
          const won = wasInTeam1 ? match.score1 > match.score2 : match.score2 > match.score1

          // Get ranking from playerStats if available
          if (match.playerStats) {
            const stats = match.playerStats.find((ps) => ps.playerId === id)
            if (stats) {
              currentRanking = stats.postGameRanking
            }
          }

          dataPoints.push({
            matchNumber: index + 1,
            date: match.date,
            ranking: currentRanking,
            matchId: match.id,
            result: won ? 'win' : 'loss',
            score: `${match.score1}-${match.score2}`,
          })
        })

        // Calculate statistics
        const rankings = dataPoints.map((dp) => dp.ranking)
        const highestRanking = rankings.length > 0 ? Math.max(...rankings) : player.ranking
        const lowestRanking = rankings.length > 0 ? Math.min(...rankings) : player.ranking

        return {
          playerId: id,
          playerName: player.name,
          playerAvatar: player.avatar,
          initialRanking: dataPoints[0]?.ranking || player.ranking,
          data: dataPoints,
          currentRanking: player.ranking,
          highestRanking: Math.max(highestRanking, player.ranking),
          lowestRanking: Math.min(lowestRanking, player.ranking),
        }
      })
      .filter((history): history is PlayerRankingHistory => history !== null)
  }, [playerId, matches, players])
}
