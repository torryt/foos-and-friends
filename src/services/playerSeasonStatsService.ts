import type { Database } from '@/lib/database'
import { database } from '@/lib/supabase-database'
import type { PlayerSeasonStats } from '@/types'

class PlayerSeasonStatsService {
  private db: Database

  constructor(db: Database) {
    this.db = db
  }

  // Get stats for a specific player in a specific season (computed from match history)
  async getPlayerSeasonStats(
    playerId: string,
    seasonId: string,
  ): Promise<{ data: PlayerSeasonStats | null; error?: string }> {
    const result = await this.db.getPlayerSeasonStats(playerId, seasonId)
    return { data: result.data, error: result.error ?? undefined }
  }

  // Get season leaderboard (all players sorted by ranking, computed from match history)
  async getSeasonLeaderboard(
    seasonId: string,
  ): Promise<{ data: PlayerSeasonStats[]; error?: string }> {
    const result = await this.db.getSeasonLeaderboard(seasonId)
    return { data: result.data, error: result.error ?? undefined }
  }

  // Initialize a player for a new season (creates relationship record)
  // Stats (ranking, wins, losses, goals) are computed from match history
  async initializePlayerForSeason(
    playerId: string,
    seasonId: string,
  ): Promise<{ data: PlayerSeasonStats | null; error?: string }> {
    // Check if player already has stats for this season
    const existing = await this.db.getPlayerSeasonStats(playerId, seasonId)
    if (existing.data) {
      return { data: existing.data, error: undefined }
    }

    // Create new season stats entry (stats will be computed)
    const result = await this.db.initializePlayerForSeason(playerId, seasonId)
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

  // DEPRECATED: Stats are now computed from match history
  // This method is kept for backwards compatibility but returns current computed stats
  async updatePlayerSeasonStats(
    playerId: string,
    seasonId: string,
    _updates: {
      ranking?: number
      matchesPlayed?: number
      wins?: number
      losses?: number
      goalsFor?: number
      goalsAgainst?: number
    },
  ): Promise<{ data: PlayerSeasonStats | null; error?: string }> {
    // Stats are computed from match history, just return current stats
    return this.getPlayerSeasonStats(playerId, seasonId)
  }

  // DEPRECATED: Stats are now computed from match history
  // This method is kept for backwards compatibility but returns current computed stats
  async updateMultiplePlayerSeasonStats(
    updates: Array<{
      playerId: string
      seasonId: string
      ranking?: number
      matchesPlayed?: number
      wins?: number
      losses?: number
      goalsFor?: number
      goalsAgainst?: number
    }>,
  ): Promise<{ data: PlayerSeasonStats[]; error?: string }> {
    // Stats are computed from match history, just return current stats
    const result = await this.db.updateMultiplePlayerSeasonStats(updates)
    return { data: result.data ?? [], error: result.error }
  }
}

// Create the default service instance
export const playerSeasonStatsService = new PlayerSeasonStatsService(database)
