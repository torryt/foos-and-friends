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

  // Update player stats (usually after a match)
  async updatePlayerStats(
    playerId: string,
    updates: {
      ranking?: number
      matchesPlayed?: number
      wins?: number
      losses?: number
    },
  ): Promise<{ data: Player | null; error?: string }> {
    const result = await this.db.updatePlayer(playerId, updates)
    return { data: result.data, error: result.error ?? undefined }
  }

  // Update multiple players (batch update for match results)
  async updateMultiplePlayers(
    updates: Array<{
      id: string
      ranking?: number
      matchesPlayed?: number
      wins?: number
      losses?: number
    }>,
  ): Promise<{ data: Player[]; error?: string }> {
    const result = await this.db.updateMultiplePlayers(updates)
    return { data: result.data ?? [], error: result.error }
  }

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
