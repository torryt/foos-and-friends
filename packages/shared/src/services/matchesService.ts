import type { Database } from '../lib/database.ts'
import type { Match, MatchType, Player, PlayerSeasonStats } from '../types/index.ts'

// Default ranking for new players or players with no matches in a season
const DEFAULT_RANKING = 1200

// ELO Configuration - Asymmetric K-factors for slight inflation
const K_FACTOR_WINNER = 35 // Winners get more points (+9% vs standard K=32)
const K_FACTOR_LOSER = 29 // Losers lose fewer points (-9% vs standard K=32)
// Net result: ~3-8 points inflation per match while maintaining competitive balance

// Calculate new ranking using inflationary ELO system
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

export class MatchesService {
  private db: Database
  private playersService: {
    getPlayerById: (id: string) => Promise<{ data: Player | null; error?: string }>
  }
  private playerSeasonStatsService: {
    getPlayerSeasonStats: (
      playerId: string,
      seasonId: string,
      matchType?: MatchType,
    ) => Promise<{ data: PlayerSeasonStats | null; error?: string }>
  }

  constructor(
    db: Database,
    playersService: {
      getPlayerById: (id: string) => Promise<{ data: Player | null; error?: string }>
    },
    playerSeasonStatsService: {
      getPlayerSeasonStats: (
        playerId: string,
        seasonId: string,
        matchType?: MatchType,
      ) => Promise<{ data: PlayerSeasonStats | null; error?: string }>
    },
  ) {
    this.db = db
    this.playersService = playersService
    this.playerSeasonStatsService = playerSeasonStatsService
  }

  // Get all matches in a group
  async getMatchesByGroup(groupId: string): Promise<{ data: Match[]; error?: string }> {
    const result = await this.db.getMatchesByGroup(groupId)
    return { data: result.data, error: result.error ?? undefined }
  }

  // Get matches by season, optionally filtered by match type
  async getMatchesBySeason(
    seasonId: string,
    matchType?: MatchType,
  ): Promise<{ data: Match[]; error?: string }> {
    const result = await this.db.getMatchesBySeason(seasonId, matchType)
    return { data: result.data, error: result.error ?? undefined }
  }

  // Helper to get a player's current ranking in a season for a specific match type
  // Returns DEFAULT_RANKING (1200) if player has no matches in this season yet
  private async getPlayerSeasonRanking(
    playerId: string,
    seasonId: string,
    matchType?: MatchType,
  ): Promise<number> {
    const result = await this.playerSeasonStatsService.getPlayerSeasonStats(
      playerId,
      seasonId,
      matchType,
    )
    // If player has no matches in this season, they won't be in the view - use default
    return result.data?.ranking ?? DEFAULT_RANKING
  }

  // Add a new match (supports both 1v1 and 2v2)
  async addMatch(
    groupId: string,
    seasonId: string,
    matchType: MatchType,
    team1Player1Id: string,
    team1Player2Id: string | null,
    team2Player1Id: string,
    team2Player2Id: string | null,
    score1: number,
    score2: number,
    recordedBy: string,
  ): Promise<{ data: Match | null; error?: string }> {
    // Validate match type constraints
    if (matchType === '1v1' && (team1Player2Id !== null || team2Player2Id !== null)) {
      return { data: null, error: '1v1 matches must have exactly 2 players' }
    }

    if (matchType === '2v2' && (!team1Player2Id || !team2Player2Id)) {
      return { data: null, error: '2v2 matches must have exactly 4 players' }
    }

    // Build player ID list and validate uniqueness
    const playerIds = [team1Player1Id, team2Player1Id]
    if (matchType === '2v2') {
      playerIds.push(team1Player2Id!, team2Player2Id!)
    }

    if (new Set(playerIds).size !== playerIds.length) {
      return { data: null, error: 'All players must be different' }
    }

    // Get all players to validate they exist and are in the correct group
    const playersResults = await Promise.all(
      playerIds.map((id) => this.playersService.getPlayerById(id)),
    )

    const players = playersResults.map((r) => r.data).filter(Boolean) as Player[]
    if (players.length !== playerIds.length) {
      return { data: null, error: 'One or more players not found' }
    }

    const invalidPlayer = players.find((p) => p.groupId !== groupId)
    if (invalidPlayer) {
      return { data: null, error: 'All players must be in the same group' }
    }

    // Get current season rankings for the specific match type
    const rankingResults = await Promise.all(
      playerIds.map((id) => this.getPlayerSeasonRanking(id, seasonId, matchType)),
    )

    const team1Won = score1 > score2

    let rankingData: {
      team1Player1PreRanking: number
      team1Player1PostRanking: number
      team1Player2PreRanking?: number | null
      team1Player2PostRanking?: number | null
      team2Player1PreRanking: number
      team2Player1PostRanking: number
      team2Player2PreRanking?: number | null
      team2Player2PostRanking?: number | null
    }

    if (matchType === '1v1') {
      // 1v1 ELO: Direct player vs player
      const [team1Player1Ranking, team2Player1Ranking] = rankingResults

      rankingData = {
        team1Player1PreRanking: team1Player1Ranking,
        team1Player1PostRanking: calculateNewRanking(
          team1Player1Ranking,
          team2Player1Ranking,
          team1Won,
        ),
        team2Player1PreRanking: team2Player1Ranking,
        team2Player1PostRanking: calculateNewRanking(
          team2Player1Ranking,
          team1Player1Ranking,
          !team1Won,
        ),
      }
    } else {
      // 2v2 ELO: Team average based
      const [team1Player1Ranking, team2Player1Ranking, team1Player2Ranking, team2Player2Ranking] =
        rankingResults
      const team1AvgRanking = (team1Player1Ranking + team1Player2Ranking) / 2
      const team2AvgRanking = (team2Player1Ranking + team2Player2Ranking) / 2

      rankingData = {
        team1Player1PreRanking: team1Player1Ranking,
        team1Player1PostRanking: calculateNewRanking(
          team1Player1Ranking,
          team2AvgRanking,
          team1Won,
        ),
        team1Player2PreRanking: team1Player2Ranking,
        team1Player2PostRanking: calculateNewRanking(
          team1Player2Ranking,
          team2AvgRanking,
          team1Won,
        ),
        team2Player1PreRanking: team2Player1Ranking,
        team2Player1PostRanking: calculateNewRanking(
          team2Player1Ranking,
          team1AvgRanking,
          !team1Won,
        ),
        team2Player2PreRanking: team2Player2Ranking,
        team2Player2PostRanking: calculateNewRanking(
          team2Player2Ranking,
          team1AvgRanking,
          !team1Won,
        ),
      }
    }

    try {
      const result = await this.db.recordMatch(
        groupId,
        seasonId,
        matchType,
        team1Player1Id,
        team1Player2Id,
        team2Player1Id,
        team2Player2Id,
        score1,
        score2,
        recordedBy,
        rankingData,
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

// Factory function to create matches service with dependencies
export function createMatchesService(
  db: Database,
  playersService: {
    getPlayerById: (id: string) => Promise<{ data: Player | null; error?: string }>
  },
  playerSeasonStatsService: {
    getPlayerSeasonStats: (
      playerId: string,
      seasonId: string,
      matchType?: MatchType,
    ) => Promise<{ data: PlayerSeasonStats | null; error?: string }>
  },
): MatchesService {
  return new MatchesService(db, playersService, playerSeasonStatsService)
}
