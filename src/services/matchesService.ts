import type { Database } from '@/lib/database'
import { database } from '@/lib/supabase-database'
import type { Match, Player } from '@/types'

// Default ranking for new players or players with no matches in a season
const DEFAULT_RANKING = 1200

class MatchesService {
  private db: Database
  private playersService: {
    getPlayerById: (id: string) => Promise<{ data: Player | null; error?: string }>
  }

  constructor(
    db: Database,
    playersService: {
      getPlayerById: (id: string) => Promise<{ data: Player | null; error?: string }>
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

  // Get matches by season
  async getMatchesBySeason(seasonId: string): Promise<{ data: Match[]; error?: string }> {
    const result = await this.db.getMatchesBySeason(seasonId)
    return { data: result.data, error: result.error ?? undefined }
  }

  // Helper to get a player's current ranking in a season
  // Returns DEFAULT_RANKING (1200) if player has no matches in this season yet
  private async getPlayerSeasonRanking(playerId: string, seasonId: string): Promise<number> {
    const { playerSeasonStatsService } = await import('./playerSeasonStatsService')
    const result = await playerSeasonStatsService.getPlayerSeasonStats(playerId, seasonId)
    // If player has no matches in this season, they won't be in the view - use default
    return result.data?.ranking ?? DEFAULT_RANKING
  }

  // Add a new match
  // Stats (ranking, wins, losses, goals) are computed from match history, not stored redundantly
  async addMatch(
    groupId: string,
    seasonId: string,
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

    // Get current season rankings for all players
    // Players with no matches in this season yet will get DEFAULT_RANKING (1200)
    const [team1Player1Ranking, team1Player2Ranking, team2Player1Ranking, team2Player2Ranking] =
      await Promise.all([
        this.getPlayerSeasonRanking(team1Player1Id, seasonId),
        this.getPlayerSeasonRanking(team1Player2Id, seasonId),
        this.getPlayerSeasonRanking(team2Player1Id, seasonId),
        this.getPlayerSeasonRanking(team2Player2Id, seasonId),
      ])

    // Determine winner and calculate new rankings
    const team1Won = score1 > score2
    const team1AvgRanking = (team1Player1Ranking + team1Player2Ranking) / 2
    const team2AvgRanking = (team2Player1Ranking + team2Player2Ranking) / 2

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

    // Calculate new rankings for all players
    const newRankings = {
      [team1Player1.id]: calculateNewRanking(team1Player1Ranking, team2AvgRanking, team1Won),
      [team1Player2.id]: calculateNewRanking(team1Player2Ranking, team2AvgRanking, team1Won),
      [team2Player1.id]: calculateNewRanking(team2Player1Ranking, team1AvgRanking, !team1Won),
      [team2Player2.id]: calculateNewRanking(team2Player2Ranking, team1AvgRanking, !team1Won),
    }

    try {
      // Record the match with pre/post rankings
      // Stats (wins, losses, matches_played, goals) are computed from match history
      const result = await this.db.recordMatch(
        groupId,
        seasonId,
        team1Player1Id,
        team1Player2Id,
        team2Player1Id,
        team2Player2Id,
        score1,
        score2,
        recordedBy,
        {
          team1Player1PreRanking: team1Player1Ranking,
          team1Player1PostRanking: newRankings[team1Player1.id],
          team1Player2PreRanking: team1Player2Ranking,
          team1Player2PostRanking: newRankings[team1Player2.id],
          team2Player1PreRanking: team2Player1Ranking,
          team2Player1PostRanking: newRankings[team2Player1.id],
          team2Player2PreRanking: team2Player2Ranking,
          team2Player2PostRanking: newRankings[team2Player2.id],
        },
      )

      return { data: result.data, error: result.error ?? undefined }
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Failed to add match' }
    }
  }

  // Get match by ID
  async getMatchById(matchId: string): Promise<{ data: Match | null; error?: string }> {
    const result = await this.db.getMatchById(matchId)
    return { data: result.data, error: result.error ?? undefined }
  }
}

// Create a simple adapter to avoid circular dependency
const playersServiceAdapter = {
  async getPlayerById(id: string) {
    const { playersService } = await import('./playersService')
    return playersService.getPlayerById(id)
  },
}

// Create the default service instance
export const matchesService = new MatchesService(database, playersServiceAdapter)
