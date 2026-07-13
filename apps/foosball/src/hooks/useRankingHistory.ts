import { type Match, type Player, replayContinuousElo } from '@foos/shared'
import { useMemo } from 'react'

export interface RankingDataPoint {
  matchNumber: number
  date: string
  ranking: number
  matchId: string
  result: 'win' | 'loss'
  score: string
  seasonId?: string
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

// One pass over the match list, bucketing each match under every player who
// played in it, preserving the source array's order. Building this once and
// looking each player up in it is O(matches) total, instead of the O(players
// * matches) cost of filtering the full match list per player.
function buildPlayerMatchBuckets(matches: Match[]): Map<string, Match[]> {
  const buckets = new Map<string, Match[]>()

  for (const match of matches) {
    const playerIds = new Set<string>()
    if (match.team1[0]) playerIds.add(match.team1[0].id)
    if (match.team1[1]) playerIds.add(match.team1[1].id)
    if (match.team2[0]) playerIds.add(match.team2[0].id)
    if (match.team2[1]) playerIds.add(match.team2[1].id)

    for (const id of playerIds) {
      const bucket = buckets.get(id)
      if (bucket) {
        bucket.push(match)
      } else {
        buckets.set(id, [match])
      }
    }
  }

  return buckets
}

export function useRankingHistory(
  playerId: string | string[],
  matches: Match[],
  players: Player[],
): PlayerRankingHistory[] {
  return useMemo(() => {
    const playerIds = Array.isArray(playerId) ? playerId : [playerId]
    const matchesByPlayer = buildPlayerMatchBuckets(matches)

    return playerIds
      .map((id) => {
        const player = players.find((p) => p.id === id)
        if (!player) return null

        // Get all matches for this player, sorted by date (newest first in the source)
        const playerMatches = (matchesByPlayer.get(id) ?? []).toReversed() // Reverse to get oldest first for chronological order

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
          const wasInTeam1 = match.team1[0].id === id || match.team1[1]?.id === id
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
            seasonId: match.seasonId,
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

// Continuous all-time ranking history: replays the whole group's match history
// as one unbroken ELO chain (no 1200 reset at season boundaries), matching the
// all-time rating shown in the profile header. Same shape as useRankingHistory.
export function useContinuousRankingHistory(
  playerId: string | string[],
  matches: Match[],
  players: Player[],
): PlayerRankingHistory[] {
  return useMemo(() => {
    const playerIds = Array.isArray(playerId) ? playerId : [playerId]
    const series = replayContinuousElo(matches)
    const matchById = new Map(matches.map((m) => [m.id, m]))

    return playerIds
      .map((id) => {
        const player = players.find((p) => p.id === id)
        if (!player) return null

        const dataPoints: RankingDataPoint[] = (series.get(id) ?? []).map((point, index) => {
          const match = matchById.get(point.matchId)
          const wasInTeam1 = match?.team1[0].id === id || match?.team1[1]?.id === id
          const won = match
            ? wasInTeam1
              ? match.score1 > match.score2
              : match.score2 > match.score1
            : false
          return {
            matchNumber: index + 1,
            date: match?.date ?? '',
            ranking: point.ranking,
            matchId: point.matchId,
            result: won ? 'win' : 'loss',
            score: match ? `${match.score1}-${match.score2}` : '',
            seasonId: match?.seasonId,
          }
        })

        const rankings = dataPoints.map((dp) => dp.ranking)
        const currentRanking = rankings.at(-1) ?? 1200
        return {
          playerId: id,
          playerName: player.name,
          playerAvatar: player.avatar,
          initialRanking: dataPoints[0]?.ranking ?? 1200,
          data: dataPoints,
          currentRanking,
          highestRanking: rankings.length > 0 ? Math.max(...rankings) : currentRanking,
          lowestRanking: rankings.length > 0 ? Math.min(...rankings) : currentRanking,
        }
      })
      .filter((history): history is PlayerRankingHistory => history !== null)
  }, [playerId, matches, players])
}
