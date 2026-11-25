import type { Database } from '../lib/database.ts'
import type { UserPreferences } from '../types/index.ts'

export class UserPreferencesService {
  private db: Database

  constructor(db: Database) {
    this.db = db
  }

  async get(): Promise<{ data: UserPreferences; error?: string }> {
    const result = await this.db.getUserPreferences()
    return { data: result.data ?? {}, error: result.error ?? undefined }
  }

  // Merges `patch` over the stored preferences (shallow per top-level key) and saves.
  async update(patch: UserPreferences): Promise<{ data: UserPreferences; error?: string }> {
    const current = await this.db.getUserPreferences()
    if (current.error) return { data: {}, error: current.error }

    const merged: UserPreferences = { ...current.data }
    for (const key of Object.keys(patch) as (keyof UserPreferences)[]) {
      merged[key] = { ...merged[key], ...patch[key] }
    }

    const saved = await this.db.saveUserPreferences(merged)
    return { data: saved.data ?? merged, error: saved.error ?? undefined }
  }
}

export function createUserPreferencesService(db: Database): UserPreferencesService {
  return new UserPreferencesService(db)
}
