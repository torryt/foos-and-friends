import type { Database } from '@/lib/database'
import { database } from '@/lib/supabase-database'
import type { Match, Player, PlayerSeasonStats } from '@/types'

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

  // Add a new match
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

    // Get or initialize season stats for all players
    const { playerSeasonStatsService } = await import('./playerSeasonStatsService')
    const seasonStatsResults = await Promise.all([
      playerSeasonStatsService.initializePlayerForSeason(team1Player1Id, seasonId),
      playerSeasonStatsService.initializePlayerForSeason(team1Player2Id, seasonId),
      playerSeasonStatsService.initializePlayerForSeason(team2Player1Id, seasonId),
      playerSeasonStatsService.initializePlayerForSeason(team2Player2Id, seasonId),
    ])

    const seasonStats = seasonStatsResults.map((r) => r.data).filter(Boolean) as PlayerSeasonStats[]
    if (seasonStats.length !== 4) {
      return { data: null, error: 'Failed to initialize player season stats' }
    }

    const [team1Player1Stats, team1Player2Stats, team2Player1Stats, team2Player2Stats] = seasonStats

    // Pre-game rankings would be stored for match history

    // Determine winner and calculate new rankings using season stats
    const team1Won = score1 > score2
    const team1Ranking = (team1Player1Stats.ranking + team1Player2Stats.ranking) / 2
    const team2Ranking = (team2Player1Stats.ranking + team2Player2Stats.ranking) / 2

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

    // Calculate new rankings for all players using season rankings
    // Rankings will be stored in the match for historical reference
    const newRankings = {
      [team1Player1.id]: calculateNewRanking(team1Player1Stats.ranking, team2Ranking, team1Won),
      [team1Player2.id]: calculateNewRanking(team1Player2Stats.ranking, team2Ranking, team1Won),
      [team2Player1.id]: calculateNewRanking(team2Player1Stats.ranking, team1Ranking, !team1Won),
      [team2Player2.id]: calculateNewRanking(team2Player2Stats.ranking, team1Ranking, !team1Won),
    }

    try {
      // No need to update player stats - they will be computed from matches
      // Just record the match with the calculated rankings
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
          team1Player1PreRanking: team1Player1Stats.ranking,
          team1Player1PostRanking: newRankings[team1Player1.id],
          team1Player2PreRanking: team1Player2Stats.ranking,
          team1Player2PostRanking: newRankings[team1Player2.id],
          team2Player1PreRanking: team2Player1Stats.ranking,
          team2Player1PostRanking: newRankings[team2Player1.id],
          team2Player2PreRanking: team2Player2Stats.ranking,
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
