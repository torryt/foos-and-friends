import type { Database } from '../lib/database.ts'
import type { SeasonTrophy } from '../types/index.ts'

export class TrophiesService {
  private db: Database

  constructor(db: Database) {
    this.db = db
  }

  // Get all season trophies awarded in a group (newest season first, gold before bronze)
  async getTrophiesByGroup(groupId: string): Promise<{ data: SeasonTrophy[]; error?: string }> {
    const result = await this.db.getTrophiesByGroup(groupId)
    return { data: result.data, error: result.error ?? undefined }
  }
}

// Factory function to create trophies service with a database instance
export function createTrophiesService(db: Database): TrophiesService {
  return new TrophiesService(db)
}
