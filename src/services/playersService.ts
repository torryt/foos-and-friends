import type { Database } from '@/lib/database'
import { database } from '@/lib/supabase-database'
import type { Player } from '@/types'

class PlayersService {
  private db: Database

  constructor(db: Database) {
    this.db = db
  }

  // Get all players in a group
  async getPlayersByGroup(groupId: string): Promise<{ data: Player[]; error?: string }> {
    const result = await this.db.getPlayersByGroup(groupId)
    return { data: result.data, error: result.error ?? undefined }
  }

  // Add a new player to a group
  async addPlayer(
    groupId: string,
    name: string,
    avatar: string,
    department: string,
    createdBy: string,
  ): Promise<{ data: Player | null; error?: string }> {
    const result = await this.db.createPlayer({
      name,
      // Stats are computed from matches, so we pass defaults for the type
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

  // Note: Player stats are now computed from matches, not stored/updated directly

  // Get player by ID
  async getPlayerById(playerId: string): Promise<{ data: Player | null; error?: string }> {
    const result = await this.db.getPlayerById(playerId)
    return { data: result.data, error: result.error ?? undefined }
  }

  // Update player profile (name, avatar)
  async updatePlayerProfile(
    playerId: string,
    updates: {
      name?: string
      avatar?: string
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
}

// Create the default service instance
export const playersService = new PlayersService(database)
