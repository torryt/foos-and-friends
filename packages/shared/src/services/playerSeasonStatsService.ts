import type { Database } from '../lib/database.ts'
import type { PlayerSeasonStats } from '../types/index.ts'

export class PlayerSeasonStatsService {
  private db: Database

  constructor(db: Database) {
    this.db = db
  }

  // Get stats for a specific player in a specific season
  // Returns null if player has no matches in that season
  async getPlayerSeasonStats(
    playerId: string,
    seasonId: string,
  ): Promise<{ data: PlayerSeasonStats | null; error?: string }> {
    const result = await this.db.getPlayerSeasonStats(playerId, seasonId)
    return { data: result.data, error: result.error ?? undefined }
  }

  // Get season leaderboard (all players who have played in this season)
  async getSeasonLeaderboard(
    seasonId: string,
  ): Promise<{ data: PlayerSeasonStats[]; error?: string }> {
    const result = await this.db.getSeasonLeaderboard(seasonId)
    return { data: result.data, error: result.error ?? undefined }
  }

  // Calculate goal difference for a player in a season
  calculateGoalDifference(stats: PlayerSeasonStats): number {
    return stats.goalsFor - stats.goalsAgainst
  }

  // Calculate win rate for a player in a season
  calculateWinRate(stats: PlayerSeasonStats): number {
    if (stats.matchesPlayed === 0) return 0
    return (stats.wins / stats.matchesPlayed) * 100
  }
}

// Factory function to create player season stats service with a database instance
export function createPlayerSeasonStatsService(db: Database): PlayerSeasonStatsService {
  return new PlayerSeasonStatsService(db)
}
