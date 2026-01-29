import type { Database } from '../lib/database.ts'
import type { Player } from '../types/index.ts'

export class PlayersService {
  private db: Database

  constructor(db: Database) {
    this.db = db
  }

  // Get all players in a group (stats computed from match history)
  async getPlayersByGroup(groupId: string): Promise<{ data: Player[]; error?: string }> {
    const result = await this.db.getPlayersByGroup(groupId)
    return { data: result.data, error: result.error ?? undefined }
  }

  // Add a new player to a group
  // Note: Stats (ranking, matchesPlayed, wins, losses) are computed from match history
  async addPlayer(
    groupId: string,
    name: string,
    avatar: string,
    department: string,
    createdBy: string,
  ): Promise<{ data: Player | null; error?: string }> {
    const result = await this.db.createPlayer({
      name,
      // Stats fields are passed but ignored by db layer (computed from matches)
      ranking: 1200,
      matchesPlayed: 0,
      wins: 0,
      losses: 0,
      avatar,
      department,
      groupId,
      createdBy,
    })

    return { data: result.data, error: result.error ?? undefined }
  }

  // Get player by ID (stats computed from match history)
  async getPlayerById(playerId: string): Promise<{ data: Player | null; error?: string }> {
    const result = await this.db.getPlayerById(playerId)
    return { data: result.data, error: result.error ?? undefined }
  }

  // Update player profile (name, avatar, department only)
  // Note: Stats (ranking, matchesPlayed, wins, losses) are computed from match history
  async updatePlayerProfile(
    playerId: string,
    updates: {
      name?: string
      avatar?: string
      department?: string
    },
  ): Promise<{ data: Player | null; error?: string }> {
    const result = await this.db.updatePlayer(playerId, updates)
    return { data: result.data, error: result.error ?? undefined }
  }

  // Delete player
  async deletePlayer(playerId: string): Promise<{ success: boolean; error?: string }> {
    const result = await this.db.deletePlayer(playerId)
    return { success: result.success ?? false, error: result.error }
  }

  // DEPRECATED: Stats are now computed from match history
  // This method is kept for backwards compatibility but only handles profile updates
  async updatePlayerStats(
    playerId: string,
    updates: {
      ranking?: number
      matchesPlayed?: number
      wins?: number
      losses?: number
      name?: string
      avatar?: string
      department?: string
    },
  ): Promise<{ data: Player | null; error?: string }> {
    // Only pass through profile updates, stats are ignored
    const profileUpdates: { name?: string; avatar?: string; department?: string } = {}
    if (updates.name !== undefined) profileUpdates.name = updates.name
    if (updates.avatar !== undefined) profileUpdates.avatar = updates.avatar
    if (updates.department !== undefined) profileUpdates.department = updates.department

    // If no profile updates, just return current player
    if (Object.keys(profileUpdates).length === 0) {
      return this.getPlayerById(playerId)
    }

    const result = await this.db.updatePlayer(playerId, profileUpdates)
    return { data: result.data, error: result.error ?? undefined }
  }

  // DEPRECATED: Stats are now computed from match history
  // This method is kept for backwards compatibility but only handles profile updates
  async updateMultiplePlayers(
    updates: Array<{
      id: string
      ranking?: number
      matchesPlayed?: number
      wins?: number
      losses?: number
      name?: string
      avatar?: string
      department?: string
    }>,
  ): Promise<{ data: Player[]; error?: string }> {
    const result = await this.db.updateMultiplePlayers(updates)
    return { data: result.data ?? [], error: result.error }
  }
}

// Factory function to create players service with a database instance
export function createPlayersService(db: Database): PlayersService {
  return new PlayersService(db)
}
