import type { Database } from '@/lib/database'
import { database } from '@/lib/supabase-database'
import type { PlayerSeasonStats } from '@/types'

class PlayerSeasonStatsService {
  private db: Database

  constructor(db: Database) {
    this.db = db
  }

  // Get stats for a specific player in a specific season
  async getPlayerSeasonStats(
    playerId: string,
    seasonId: string,
  ): Promise<{ data: PlayerSeasonStats | null; error?: string }> {
    const result = await this.db.getPlayerSeasonStats(playerId, seasonId)
    return { data: result.data, error: result.error ?? undefined }
  }

  // Get season leaderboard (all players sorted by ranking)
  async getSeasonLeaderboard(
    seasonId: string,
  ): Promise<{ data: PlayerSeasonStats[]; error?: string }> {
    const result = await this.db.getSeasonLeaderboard(seasonId)
    return { data: result.data, error: result.error ?? undefined }
  }

  // Initialize a player for a new season (starts at 1200 ranking)
  async initializePlayerForSeason(
    playerId: string,
    seasonId: string,
  ): Promise<{ data: PlayerSeasonStats | null; error?: string }> {
    // Check if player already has stats for this season
    const existing = await this.db.getPlayerSeasonStats(playerId, seasonId)
    if (existing.data) {
      return { data: existing.data, error: undefined }
    }

    // Create new season stats entry
    const result = await this.db.initializePlayerForSeason(playerId, seasonId)
    return { data: result.data, error: result.error ?? undefined }
  }

  // Note: Player season stats are now computed from matches, not stored/updated directly
  // The database layer will compute stats when fetching

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

// Create the default service instance
export const playerSeasonStatsService = new PlayerSeasonStatsService(database)
