import type { Match, Player } from '@foos/shared'
import { useMemo } from 'react'

export interface RelationshipStats {
  playerId: string
  playerName: string
  playerAvatar: string
  gamesPlayed: number
  wins: number
  losses: number
  winRate: number
  goalDifference: number
  recentForm: ('W' | 'L')[] // Last 5 games: 'W' or 'L'
}

export interface RelationshipStatsData {
  teammates: RelationshipStats[]
  opponents: RelationshipStats[]
  topTeammate: RelationshipStats | null
  worstTeammate: RelationshipStats | null
  biggestRival: RelationshipStats | null
  easiestOpponent: RelationshipStats | null
}

export const useRelationshipStats = (
  playerId: string,
  matches: Match[],
  players: Player[],
): RelationshipStatsData => {
  return useMemo(() => {
    // Filter matches that include the target player and sort by createdAt
    const playerMatches = matches
      .filter((match) => {
        return (
          match.team1[0].id === playerId ||
          match.team1[1]?.id === playerId ||
          match.team2[0].id === playerId ||
          match.team2[1]?.id === playerId
        )
      })
      .sort((a, b) => {
        // Sort by createdAt in ascending order (oldest first)
        // This ensures slice(-5) gets the most recent 5 games
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return timeA - timeB
      })

    // Maps to track stats
    const teammateStats = new Map<
      string,
      {
        gamesPlayed: number
        wins: number
        losses: number
        goalDifference: number
        recentGames: { won: boolean; match: Match }[]
      }
    >()

    const opponentStats = new Map<
      string,
      {
        gamesPlayed: number
        wins: number
        losses: number
        goalDifference: number
        recentGames: { won: boolean; match: Match }[]
      }
    >()

    // Process each match
    for (const match of playerMatches) {
      const wasInTeam1 = match.team1[0].id === playerId || match.team1[1]?.id === playerId
      const won = wasInTeam1 ? match.score1 > match.score2 : match.score2 > match.score1
      const goalDiff = wasInTeam1 ? match.score1 - match.score2 : match.score2 - match.score1

      // Get teammate
      let teammateId: string | undefined
      if (match.team1[0].id === playerId) {
        teammateId = match.team1[1]?.id
      } else if (match.team1[1]?.id === playerId) {
        teammateId = match.team1[0].id
      } else if (match.team2[0].id === playerId) {
        teammateId = match.team2[1]?.id
      } else {
        teammateId = match.team2[0].id
      }

      // Update teammate stats
      if (!teammateId) continue
      if (!teammateStats.has(teammateId)) {
        teammateStats.set(teammateId, {
          gamesPlayed: 0,
          wins: 0,
          losses: 0,
          goalDifference: 0,
          recentGames: [],
        })
      }
      const teammateData = teammateStats.get(teammateId)
      if (teammateData) {
        teammateData.gamesPlayed++
        teammateData.goalDifference += goalDiff
        teammateData.recentGames.push({ won, match })
        if (won) {
          teammateData.wins++
        } else {
          teammateData.losses++
        }
      }

      // Get opponents
      const opponentTeam = wasInTeam1 ? match.team2 : match.team1
      for (const opponent of opponentTeam) {
        if (!opponent) continue
        if (!opponentStats.has(opponent.id)) {
          opponentStats.set(opponent.id, {
            gamesPlayed: 0,
            wins: 0,
            losses: 0,
            goalDifference: 0,
            recentGames: [],
          })
        }
        const opponentData = opponentStats.get(opponent.id)
        if (opponentData) {
          opponentData.gamesPlayed++
          opponentData.goalDifference += goalDiff
          opponentData.recentGames.push({ won, match })
          if (won) {
            opponentData.wins++
          } else {
            opponentData.losses++
          }
        }
      }
    }

    // Convert maps to arrays with player info
    const teammates: RelationshipStats[] = Array.from(teammateStats.entries())
      .map(([playerId, stats]) => {
        const player = players.find((p) => p.id === playerId)
        if (!player) return null

        const recentForm = stats.recentGames
          .slice(-5) // Last 5 games
          .map((game) => (game.won ? 'W' : 'L'))

        return {
          playerId,
          playerName: player.name,
          playerAvatar: player.avatar,
          gamesPlayed: stats.gamesPlayed,
          wins: stats.wins,
          losses: stats.losses,
          winRate: stats.gamesPlayed > 0 ? Math.round((stats.wins / stats.gamesPlayed) * 100) : 0,
          goalDifference: stats.goalDifference,
          recentForm,
        }
      })
      .filter((stat): stat is RelationshipStats => stat !== null)
      .sort((a, b) => b.gamesPlayed - a.gamesPlayed) // Sort by games played desc

    const opponents: RelationshipStats[] = Array.from(opponentStats.entries())
      .map(([playerId, stats]) => {
        const player = players.find((p) => p.id === playerId)
        if (!player) return null

        const recentForm = stats.recentGames
          .slice(-5) // Last 5 games
          .map((game) => (game.won ? 'W' : 'L'))

        return {
          playerId,
          playerName: player.name,
          playerAvatar: player.avatar,
          gamesPlayed: stats.gamesPlayed,
          wins: stats.wins,
          losses: stats.losses,
          winRate: stats.gamesPlayed > 0 ? Math.round((stats.wins / stats.gamesPlayed) * 100) : 0,
          goalDifference: stats.goalDifference,
          recentForm,
        }
      })
      .filter((stat): stat is RelationshipStats => stat !== null)
      .sort((a, b) => b.gamesPlayed - a.gamesPlayed) // Sort by games played desc

    // Find notable relationships (minimum 3 games for meaningful stats)
    const minGamesForStats = 3
    const qualifiedTeammates = teammates.filter((t) => t.gamesPlayed >= minGamesForStats)
    const qualifiedOpponents = opponents.filter((o) => o.gamesPlayed >= minGamesForStats)

    // Only show "Best Partner" if they have at least 1 win together
    const teammatesWithWins = qualifiedTeammates.filter((t) => t.wins > 0)
    const topTeammate =
      teammatesWithWins.length > 0
        ? teammatesWithWins.reduce((best, current) =>
            current.winRate > best.winRate ? current : best,
          )
        : null

    // Only show "Worst Teammate" if they have at least 1 loss together
    const teammatesWithLosses = qualifiedTeammates.filter((t) => t.losses > 0)
    const worstTeammate =
      teammatesWithLosses.length > 0
        ? teammatesWithLosses.reduce((worst, current) =>
            current.winRate < worst.winRate ? current : worst,
          )
        : null

    const biggestRival =
      qualifiedOpponents.length > 0
        ? qualifiedOpponents.reduce((rival, current) =>
            current.gamesPlayed > rival.gamesPlayed ? current : rival,
          )
        : null

    const easiestOpponent =
      qualifiedOpponents.length > 0
        ? qualifiedOpponents.reduce((easy, current) =>
            current.winRate > easy.winRate ? current : easy,
          )
        : null

    return {
      teammates,
      opponents,
      topTeammate,
      worstTeammate,
      biggestRival,
      easiestOpponent,
    }
  }, [playerId, matches, players])
}
