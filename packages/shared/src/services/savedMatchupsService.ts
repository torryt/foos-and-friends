import type { TeamAssignment } from '../utils/matchmaking.ts'

export interface SavedMatchup {
  id: string
  timestamp: number
  teams: TeamAssignment
  mode: 'balanced' | 'rare'
  confidence: number
  playerCount: number
}

const STORAGE_KEY_PREFIX = 'foosball_saved_matchups'
const EXPIRY_HOURS = 48

export class SavedMatchupsService {
  private getStorageKey(groupId: string): string {
    return `${STORAGE_KEY_PREFIX}_${groupId}`
  }

  private getStorage(): Storage | null {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return null
    }
    return localStorage
  }

  /**
   * Save a generated matchup to localStorage
   */
  saveMatchup(teams: TeamAssignment, mode: 'balanced' | 'rare', groupId: string): SavedMatchup {
    const matchup: SavedMatchup = {
      id: `matchup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      teams,
      mode,
      confidence: teams.confidence,
      playerCount: 4, // Always 4 players in a team assignment
    }

    const storage = this.getStorage()
    if (!storage) return matchup

    const existing = this.getAllMatchups(groupId)
    const updated = [matchup, ...existing]

    // Keep only the 10 most recent matchups
    const trimmed = updated.slice(0, 10)

    storage.setItem(this.getStorageKey(groupId), JSON.stringify(trimmed))
    return matchup
  }

  /**
   * Get all saved matchups, filtered by expiry
   */
  getAllMatchups(groupId: string): SavedMatchup[] {
    try {
      const storage = this.getStorage()
      if (!storage) return []

      const stored = storage.getItem(this.getStorageKey(groupId))
      if (!stored) return []

      const matchups: SavedMatchup[] = JSON.parse(stored)
      const now = Date.now()
      const expiryTime = EXPIRY_HOURS * 60 * 60 * 1000

      // Filter out expired matchups
      const valid = matchups.filter((matchup) => {
        return now - matchup.timestamp < expiryTime
      })

      // Update storage if we filtered out expired items
      if (valid.length !== matchups.length) {
        storage.setItem(this.getStorageKey(groupId), JSON.stringify(valid))
      }

      return valid
    } catch (error) {
      console.error('Error loading saved matchups:', error)
      return []
    }
  }

  /**
   * Get a specific matchup by ID
   */
  getMatchup(id: string, groupId: string): SavedMatchup | null {
    const matchups = this.getAllMatchups(groupId)
    return matchups.find((m) => m.id === id) || null
  }

  /**
   * Delete a specific matchup
   */
  deleteMatchup(id: string, groupId: string): void {
    const storage = this.getStorage()
    if (!storage) return

    const matchups = this.getAllMatchups(groupId)
    const filtered = matchups.filter((m) => m.id !== id)
    storage.setItem(this.getStorageKey(groupId), JSON.stringify(filtered))
  }

  /**
   * Clear all saved matchups for a specific group
   */
  clearAllMatchups(groupId: string): void {
    const storage = this.getStorage()
    if (!storage) return

    storage.removeItem(this.getStorageKey(groupId))
  }

  /**
   * Get formatted time ago string
   */
  getTimeAgo(timestamp: number): string {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  /**
   * Format matchup for display
   */
  formatMatchup(matchup: SavedMatchup): string {
    const { teams } = matchup
    return `${teams.team1.attacker.name} + ${teams.team1.defender.name} vs ${teams.team2.attacker.name} + ${teams.team2.defender.name}`
  }

  /**
   * Get matchup summary for display
   */
  getMatchupSummary(matchup: SavedMatchup): {
    title: string
    subtitle: string
    timeAgo: string
    confidence: string
    mode: string
  } {
    return {
      title: this.formatMatchup(matchup),
      subtitle: `Team 1: ${matchup.teams.team1.attacker.name} (A) + ${matchup.teams.team1.defender.name} (D)`,
      timeAgo: this.getTimeAgo(matchup.timestamp),
      confidence: `${Math.round(matchup.confidence * 100)}%`,
      mode: matchup.mode === 'balanced' ? 'Balanced' : 'Rare Matchup',
    }
  }
}

// Export singleton instance
export const savedMatchupsService = new SavedMatchupsService()
