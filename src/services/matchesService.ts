import type { Database } from '@/lib/database'
import { database } from '@/lib/supabase-database'
import type { Match, Player } from '@/types'

class MatchesService {
  private db: Database
  private playersService: {
    getPlayerById: (id: string) => Promise<{ data: Player | null; error?: string }>
    updateMultiplePlayers: (
      updates: Array<{
        id: string
        ranking?: number
        matchesPlayed?: number
        wins?: number
        losses?: number
      }>,
    ) => Promise<{ data?: Player[]; error?: string }>
  }

  constructor(
    db: Database,
    playersService: {
      getPlayerById: (id: string) => Promise<{ data: Player | null; error?: string }>
      updateMultiplePlayers: (
        updates: Array<{
          id: string
          ranking?: number
          matchesPlayed?: number
          wins?: number
          losses?: number
        }>,
      ) => Promise<{ data?: Player[]; error?: string }>
    },
  ) {
    this.db = db
    this.playersService = playersService
  }

  // Get all matches in a group
  async getMatchesByGroup(groupId: string): Promise<{ data: Match[]; error?: string }> {
    const result = await this.db.getMatchesByGroup(groupId)
    return { data: result.data, error: result.error ?? undefined }
  }

  // Record a new match
  async recordMatch(
    groupId: string,
    team1Player1Id: string,
    team1Player2Id: string,
    team2Player1Id: string,
    team2Player2Id: string,
    score1: number,
    score2: number,
    recordedBy: string,
  ): Promise<{ data: Match | null; error?: string }> {
    // Validate that all players are different
    const playerIds = [team1Player1Id, team1Player2Id, team2Player1Id, team2Player2Id]
    if (new Set(playerIds).size !== 4) {
      return { data: null, error: 'All players must be different' }
    }

    // Get all players to validate they exist and are in the correct group
    const playersResults = await Promise.all([
      this.playersService.getPlayerById(team1Player1Id),
      this.playersService.getPlayerById(team1Player2Id),
      this.playersService.getPlayerById(team2Player1Id),
      this.playersService.getPlayerById(team2Player2Id),
    ])

    // Check if all players exist and are in the correct group
    const players = playersResults.map((r) => r.data).filter(Boolean) as Player[]
    if (players.length !== 4) {
      return { data: null, error: 'One or more players not found' }
    }

    const invalidPlayer = players.find((p) => p.groupId !== groupId)
    if (invalidPlayer) {
      return { data: null, error: 'All players must be in the same group' }
    }

    const [team1Player1, team1Player2, team2Player1, team2Player2] = players

    // Pre-game rankings would be stored for match history

    // Determine winner and calculate new rankings
    const team1Won = score1 > score2
    const team1Ranking = (team1Player1.ranking + team1Player2.ranking) / 2
    const team2Ranking = (team2Player1.ranking + team2Player2.ranking) / 2

    // ELO Configuration - Asymmetric K-factors for slight inflation
    const K_FACTOR_WINNER = 35 // Winners get more points (+9% vs standard K=32)
    const K_FACTOR_LOSER = 29 // Losers lose fewer points (-9% vs standard K=32)
    // Net result: ~3-8 points inflation per match while maintaining competitive balance

    // Calculate new rankings using inflationary ELO system
    const calculateNewRanking = (
      playerRanking: number,
      opponentRanking: number,
      isWinner: boolean,
    ) => {
      const K = isWinner ? K_FACTOR_WINNER : K_FACTOR_LOSER
      const expectedScore = 1 / (1 + 10 ** ((opponentRanking - playerRanking) / 400))
      const actualScore = isWinner ? 1 : 0
      const newRanking = playerRanking + K * (actualScore - expectedScore)
      return Math.max(800, Math.min(2400, Math.round(newRanking)))
    }

    // Calculate new stats for all players
    const newRankings = {
      [team1Player1.id]: calculateNewRanking(team1Player1.ranking, team2Ranking, team1Won),
      [team1Player2.id]: calculateNewRanking(team1Player2.ranking, team2Ranking, team1Won),
      [team2Player1.id]: calculateNewRanking(team2Player1.ranking, team1Ranking, !team1Won),
      [team2Player2.id]: calculateNewRanking(team2Player2.ranking, team1Ranking, !team1Won),
    }

    const playerUpdates = [
      {
        id: team1Player1.id,
        ranking: newRankings[team1Player1.id],
        matchesPlayed: team1Player1.matchesPlayed + 1,
        wins: team1Player1.wins + (team1Won ? 1 : 0),
        losses: team1Player1.losses + (team1Won ? 0 : 1),
      },
      {
        id: team1Player2.id,
        ranking: newRankings[team1Player2.id],
        matchesPlayed: team1Player2.matchesPlayed + 1,
        wins: team1Player2.wins + (team1Won ? 1 : 0),
        losses: team1Player2.losses + (team1Won ? 0 : 1),
      },
      {
        id: team2Player1.id,
        ranking: newRankings[team2Player1.id],
        matchesPlayed: team2Player1.matchesPlayed + 1,
        wins: team2Player1.wins + (!team1Won ? 1 : 0),
        losses: team2Player1.losses + (!team1Won ? 0 : 1),
      },
      {
        id: team2Player2.id,
        ranking: newRankings[team2Player2.id],
        matchesPlayed: team2Player2.matchesPlayed + 1,
        wins: team2Player2.wins + (!team1Won ? 1 : 0),
        losses: team2Player2.losses + (!team1Won ? 0 : 1),
      },
    ]

    // Player stats would be used in full match recording implementation

    try {
      // Update all player stats first
      const updateResult = await this.playersService.updateMultiplePlayers(playerUpdates)
      if (updateResult.error) {
        return { data: null, error: updateResult.error }
      }

      // Record the match using the database abstraction
      const result = await this.db.recordMatch(
        groupId,
        team1Player1Id,
        team1Player2Id,
        team2Player1Id,
        team2Player2Id,
        score1,
        score2,
        recordedBy,
        {
          team1Player1PreRanking: team1Player1.ranking,
          team1Player1PostRanking: newRankings[team1Player1.id],
          team1Player2PreRanking: team1Player2.ranking,
          team1Player2PostRanking: newRankings[team1Player2.id],
          team2Player1PreRanking: team2Player1.ranking,
          team2Player1PostRanking: newRankings[team2Player1.id],
          team2Player2PreRanking: team2Player2.ranking,
          team2Player2PostRanking: newRankings[team2Player2.id],
        },
      )

      return { data: result.data, error: result.error ?? undefined }
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Failed to record match' }
    }
  }

  // Get match by ID
  async getMatchById(matchId: string): Promise<{ data: Match | null; error?: string }> {
    const result = await this.db.getMatchById(matchId)
    return { data: result.data, error: result.error ?? undefined }
  }

  // Update a match
  async updateMatch(
    matchId: string,
    team1Player1Id: string,
    team1Player2Id: string,
    team2Player1Id: string,
    team2Player2Id: string,
    score1: number,
    score2: number,
  ): Promise<{ data?: Match; error?: string }> {
    // Validate that all players are different
    const playerIds = [team1Player1Id, team1Player2Id, team2Player1Id, team2Player2Id]
    if (new Set(playerIds).size !== 4) {
      return { error: 'All players must be different' }
    }

    // Update the match in the database
    const result = await this.db.updateMatch(
      matchId,
      team1Player1Id,
      team1Player2Id,
      team2Player1Id,
      team2Player2Id,
      score1,
      score2,
    )

    if (result.error) {
      return { error: result.error }
    }

    // Trigger recalculation
    const match = result.data
    if (match && match.groupId) {
      const matchDateTime = `${match.date}T${match.time}:00Z`
      const recalcResult = await this.recalculateFromMatch(match.groupId, matchDateTime)
      if (recalcResult.error) {
        return { error: recalcResult.error }
      }
    }

    return { data: result.data ?? undefined, error: result.error ?? undefined }
  }

  // Delete a match
  async deleteMatch(matchId: string): Promise<{ success?: boolean; error?: string }> {
    // Get the match first to know when it was played
    const matchResult = await this.db.getMatchById(matchId)
    if (matchResult.error || !matchResult.data) {
      return { error: matchResult.error || 'Match not found' }
    }

    const match = matchResult.data

    // Delete the match
    const deleteResult = await this.db.deleteMatch(matchId)
    if (deleteResult.error) {
      return { error: deleteResult.error }
    }

    // Trigger recalculation from this point forward
    if (match.groupId) {
      const matchDateTime = `${match.date}T${match.time}:00Z`
      const recalcResult = await this.recalculateFromMatch(match.groupId, matchDateTime)
      if (recalcResult.error) {
        return { error: recalcResult.error }
      }
    }

    return { success: true }
  }

  // Recalculate all ELO scores from a specific match forward
  async recalculateFromMatch(
    groupId: string,
    fromDate: string,
  ): Promise<{ success?: boolean; error?: string }> {
    // Get all matches in the group
    const matchesResult = await this.db.getMatchesByGroup(groupId)
    if (matchesResult.error) {
      return { error: matchesResult.error }
    }

    // Sort matches chronologically
    const matches = matchesResult.data.sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time}:00Z`)
      const dateB = new Date(`${b.date}T${b.time}:00Z`)
      return dateA.getTime() - dateB.getTime()
    })

    // Find the index of the match from which to start recalculating
    const startIndex = matches.findIndex((m) => {
      const matchDate = new Date(`${m.date}T${m.time}:00Z`)
      return matchDate >= new Date(fromDate)
    })
    if (startIndex === -1) {
      return { success: true } // No matches to recalculate
    }

    // Get all players in the group
    const playersResult = await this.getPlayersByGroup(groupId)
    if (!playersResult.data) {
      return { error: 'Failed to get players' }
    }

    // Reset all players to initial state (1200 ELO, 0 matches)
    const playerStats = new Map<
      string,
      {
        ranking: number
        matchesPlayed: number
        wins: number
        losses: number
      }
    >()

    playersResult.data.forEach((player) => {
      playerStats.set(player.id, {
        ranking: 1200,
        matchesPlayed: 0,
        wins: 0,
        losses: 0,
      })
    })

    // Recalculate all matches from the beginning
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i]

      // Get current stats for all players in the match
      const team1Player1Stats = playerStats.get(match.team1[0].id)
      const team1Player2Stats = playerStats.get(match.team1[1].id)
      const team2Player1Stats = playerStats.get(match.team2[0].id)
      const team2Player2Stats = playerStats.get(match.team2[1].id)

      if (!team1Player1Stats || !team1Player2Stats || !team2Player1Stats || !team2Player2Stats) {
        continue // Skip if any player not found
      }

      const team1Won = match.score1 > match.score2
      const team1Ranking = (team1Player1Stats.ranking + team1Player2Stats.ranking) / 2
      const team2Ranking = (team2Player1Stats.ranking + team2Player2Stats.ranking) / 2

      // Calculate new rankings using the same ELO system
      const K_FACTOR_WINNER = 35
      const K_FACTOR_LOSER = 29

      const calculateNewRanking = (
        playerRanking: number,
        opponentRanking: number,
        isWinner: boolean,
      ) => {
        const K = isWinner ? K_FACTOR_WINNER : K_FACTOR_LOSER
        const expectedScore = 1 / (1 + 10 ** ((opponentRanking - playerRanking) / 400))
        const actualScore = isWinner ? 1 : 0
        const newRanking = playerRanking + K * (actualScore - expectedScore)
        return Math.max(800, Math.min(2400, Math.round(newRanking)))
      }

      // Update player stats
      playerStats.set(match.team1[0].id, {
        ranking: calculateNewRanking(team1Player1Stats.ranking, team2Ranking, team1Won),
        matchesPlayed: team1Player1Stats.matchesPlayed + 1,
        wins: team1Player1Stats.wins + (team1Won ? 1 : 0),
        losses: team1Player1Stats.losses + (team1Won ? 0 : 1),
      })

      playerStats.set(match.team1[1].id, {
        ranking: calculateNewRanking(team1Player2Stats.ranking, team2Ranking, team1Won),
        matchesPlayed: team1Player2Stats.matchesPlayed + 1,
        wins: team1Player2Stats.wins + (team1Won ? 1 : 0),
        losses: team1Player2Stats.losses + (team1Won ? 0 : 1),
      })

      playerStats.set(match.team2[0].id, {
        ranking: calculateNewRanking(team2Player1Stats.ranking, team1Ranking, !team1Won),
        matchesPlayed: team2Player1Stats.matchesPlayed + 1,
        wins: team2Player1Stats.wins + (!team1Won ? 1 : 0),
        losses: team2Player1Stats.losses + (!team1Won ? 0 : 1),
      })

      playerStats.set(match.team2[1].id, {
        ranking: calculateNewRanking(team2Player2Stats.ranking, team1Ranking, !team1Won),
        matchesPlayed: team2Player2Stats.matchesPlayed + 1,
        wins: team2Player2Stats.wins + (!team1Won ? 1 : 0),
        losses: team2Player2Stats.losses + (!team1Won ? 0 : 1),
      })
    }

    // Update all players with their recalculated stats
    const playerUpdates = Array.from(playerStats.entries()).map(([id, stats]) => ({
      id,
      ...stats,
    }))

    const updateResult = await this.playersService.updateMultiplePlayers(playerUpdates)
    if (updateResult.error) {
      return { error: updateResult.error }
    }

    return { success: true }
  }

  // Helper method for getPlayersByGroup
  private async getPlayersByGroup(groupId: string) {
    const { playersService } = await import('./playersService')
    return playersService.getPlayersByGroup(groupId)
  }
}

// Create a simple adapter to avoid circular dependency
const playersServiceAdapter = {
  async getPlayerById(id: string) {
    const { playersService } = await import('./playersService')
    return playersService.getPlayerById(id)
  },
  async updateMultiplePlayers(
    updates: Array<{
      id: string
      ranking?: number
      matchesPlayed?: number
      wins?: number
      losses?: number
    }>,
  ) {
    const { playersService } = await import('./playersService')
    return playersService.updateMultiplePlayers(updates)
  },
  async getPlayersByGroup(groupId: string) {
    const { playersService } = await import('./playersService')
    return playersService.getPlayersByGroup(groupId)
  },
}

// Create the default service instance
export const matchesService = new MatchesService(database, playersServiceAdapter)
