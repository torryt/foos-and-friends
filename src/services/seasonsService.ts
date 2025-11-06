import type { Database } from '@/lib/database'
import { database } from '@/lib/supabase-database'
import type { Season, SeasonCreationResult } from '@/types'

class SeasonsService {
  private db: Database

  constructor(db: Database) {
    this.db = db
  }

  // Get all seasons for a group (newest first)
  async getSeasonsByGroup(groupId: string): Promise<{ data: Season[]; error?: string }> {
    const result = await this.db.getSeasonsByGroup(groupId)
    return { data: result.data, error: result.error ?? undefined }
  }

  // Get the currently active season for a group
  async getActiveSeason(groupId: string): Promise<{ data: Season | null; error?: string }> {
    const result = await this.db.getActiveSeason(groupId)
    return { data: result.data, error: result.error ?? undefined }
  }

  // Get a specific season by ID
  async getSeasonById(seasonId: string): Promise<{ data: Season | null; error?: string }> {
    const result = await this.db.getSeasonById(seasonId)
    return { data: result.data, error: result.error ?? undefined }
  }

  // End the current season and create a new one
  async endSeasonAndCreateNew(
    groupId: string,
    newSeasonName: string,
    newSeasonDescription?: string,
  ): Promise<SeasonCreationResult> {
    const result = await this.db.endSeasonAndCreateNew(groupId, newSeasonName, newSeasonDescription)

    if (result.error || !result.data) {
      return {
        success: false,
        error: result.error ?? 'Failed to create new season',
      }
    }

    const rpcResult = result.data

    if (!rpcResult.success) {
      return {
        success: false,
        error: rpcResult.error ?? 'Failed to create new season',
      }
    }

    return {
      success: true,
      oldSeasonId: rpcResult.old_season_id,
      newSeasonId: rpcResult.new_season_id,
      seasonNumber: rpcResult.season_number,
    }
  }
}

// Create the default service instance
export const seasonsService = new SeasonsService(database)
