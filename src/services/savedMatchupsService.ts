import type { TeamAssignment } from '@/utils/matchmaking'

export interface SavedMatchup {
  id: string
  timestamp: number
  teams: TeamAssignment
  mode: 'balanced' | 'rare'
  confidence: number
  playerCount: number
}

const STORAGE_KEY = 'foosball_saved_matchups'
const EXPIRY_HOURS = 48

class SavedMatchupsService {
  /**
   * Save a generated matchup to localStorage
   */
  saveMatchup(teams: TeamAssignment, mode: 'balanced' | 'rare'): SavedMatchup {
    const matchup: SavedMatchup = {
      id: `matchup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      teams,
      mode,
      confidence: teams.confidence,
      playerCount: 4, // Always 4 players in a team assignment
    }

    const existing = this.getAllMatchups()
    const updated = [matchup, ...existing]

    // Keep only the 10 most recent matchups
    const trimmed = updated.slice(0, 10)

    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
    return matchup
  }

  /**
   * Get all saved matchups, filtered by expiry
   */
  getAllMatchups(): SavedMatchup[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
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
        localStorage.setItem(STORAGE_KEY, JSON.stringify(valid))
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
  getMatchup(id: string): SavedMatchup | null {
    const matchups = this.getAllMatchups()
    return matchups.find((m) => m.id === id) || null
  }

  /**
   * Delete a specific matchup
   */
  deleteMatchup(id: string): void {
    const matchups = this.getAllMatchups()
    const filtered = matchups.filter((m) => m.id !== id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
  }

  /**
   * Clear all saved matchups
   */
  clearAllMatchups(): void {
    localStorage.removeItem(STORAGE_KEY)
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
