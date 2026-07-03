import { beforeEach, describe, expect, it } from 'vitest'
import type { TeamAssignment } from '../../utils/matchmaking.ts'
import { SavedMatchupsService } from '../savedMatchupsService.ts'

const makePlayer = (id: string, name: string, ranking: number) => ({
  id,
  name,
  ranking,
  matchesPlayed: 0,
  wins: 0,
  losses: 0,
  avatar: '',
  department: '',
})

const mockTeams: TeamAssignment = {
  team1: {
    attacker: makePlayer('p1', 'Alice', 1200),
    defender: makePlayer('p2', 'Bob', 1100),
  },
  team2: {
    attacker: makePlayer('p3', 'Charlie', 1150),
    defender: makePlayer('p4', 'Diana', 1050),
  },
  rankingDifference: 50,
  confidence: 0.85,
}

const GROUP_ID = 'test-group'

describe('SavedMatchupsService', () => {
  let service: SavedMatchupsService
  let storage: Record<string, string>

  beforeEach(() => {
    storage = {}
    const mockStorage = {
      getItem: (key: string) => storage[key] ?? null,
      setItem: (key: string, value: string) => {
        storage[key] = value
      },
      removeItem: (key: string) => {
        delete storage[key]
      },
    }

    service = new SavedMatchupsService()
    // Override getStorage to use mock
    ;(service as unknown as { getStorage: () => typeof mockStorage }).getStorage = () => mockStorage
  })

  describe('saveMatchup - buffer behavior', () => {
    it('saves a matchup and returns it', () => {
      const saved = service.saveMatchup(mockTeams, 'balanced', GROUP_ID)
      expect(saved.teams).toBe(mockTeams)
      expect(saved.mode).toBe('balanced')
    })

    it('keeps up to 5 matchups in the buffer', () => {
      for (let i = 0; i < 5; i++) {
        service.saveMatchup(mockTeams, 'balanced', GROUP_ID)
      }
      const matchups = service.getAllMatchups(GROUP_ID)
      expect(matchups).toHaveLength(5)
    })

    it('removes oldest matchup when buffer exceeds 5', () => {
      // Save 5 matchups
      const saved: string[] = []
      for (let i = 0; i < 5; i++) {
        const m = service.saveMatchup(mockTeams, 'balanced', GROUP_ID)
        saved.push(m.id)
      }

      // Save a 6th matchup - oldest should be removed
      const sixth = service.saveMatchup(mockTeams, 'balanced', GROUP_ID)
      const matchups = service.getAllMatchups(GROUP_ID)

      expect(matchups).toHaveLength(5)
      // Newest should be first
      expect(matchups[0].id).toBe(sixth.id)
      // Oldest (first saved) should no longer be present
      const oldestId = saved[0]
      expect(matchups.find((m) => m.id === oldestId)).toBeUndefined()
    })

    it('always keeps exactly 5 latest matchups when saving more', () => {
      const ids: string[] = []
      for (let i = 0; i < 8; i++) {
        const m = service.saveMatchup(mockTeams, 'balanced', GROUP_ID)
        ids.push(m.id)
      }

      const matchups = service.getAllMatchups(GROUP_ID)
      expect(matchups).toHaveLength(5)

      // Should contain the 5 most recently saved (ids[3] through ids[7])
      const matchupIds = matchups.map((m) => m.id)
      expect(matchupIds).toContain(ids[7])
      expect(matchupIds).toContain(ids[6])
      expect(matchupIds).toContain(ids[5])
      expect(matchupIds).toContain(ids[4])
      expect(matchupIds).toContain(ids[3])
      // The 3 oldest should not be present
      expect(matchupIds).not.toContain(ids[0])
      expect(matchupIds).not.toContain(ids[1])
      expect(matchupIds).not.toContain(ids[2])
    })
  })

  describe('saveMatchup - manual mode', () => {
    it('saves a manual matchup', () => {
      const saved = service.saveMatchup(mockTeams, 'manual', GROUP_ID)
      expect(saved.mode).toBe('manual')
      expect(service.getMatchupSummary(saved).mode).toBe('Manual')
    })
  })

  describe('updateMatchup', () => {
    it('updates teams while keeping id and timestamp', () => {
      const saved = service.saveMatchup(mockTeams, 'balanced', GROUP_ID)

      const editedTeams: TeamAssignment = {
        ...mockTeams,
        team1: {
          attacker: mockTeams.team1.defender,
          defender: mockTeams.team1.attacker,
        },
        confidence: 0.7,
      }

      const updated = service.updateMatchup(saved.id, GROUP_ID, editedTeams)
      expect(updated).not.toBeNull()
      expect(updated?.id).toBe(saved.id)
      expect(updated?.timestamp).toBe(saved.timestamp)
      expect(updated?.confidence).toBe(0.7)

      const stored = service.getMatchup(saved.id, GROUP_ID)
      expect(stored?.teams.team1.attacker.id).toBe('p2')
      expect(stored?.teams.team1.defender.id).toBe('p1')
    })

    it('returns null for an unknown matchup id', () => {
      service.saveMatchup(mockTeams, 'balanced', GROUP_ID)
      expect(service.updateMatchup('nope', GROUP_ID, mockTeams)).toBeNull()
    })
  })

  describe('expiry', () => {
    it('keeps matchups younger than 7 days and drops older ones', () => {
      const fresh = service.saveMatchup(mockTeams, 'balanced', GROUP_ID)
      const stale = service.saveMatchup(mockTeams, 'rare', GROUP_ID)

      // Age the stale matchup to just over 7 days, the fresh one to just under
      const key = `foosball_saved_matchups_${GROUP_ID}`
      const stored = JSON.parse(storage[key]) as Array<{ id: string; timestamp: number }>
      const day = 24 * 60 * 60 * 1000
      for (const m of stored) {
        m.timestamp = Date.now() - (m.id === stale.id ? 7 * day + 1000 : 7 * day - 60_000)
      }
      storage[key] = JSON.stringify(stored)

      const remaining = service.getAllMatchups(GROUP_ID)
      expect(remaining.map((m) => m.id)).toContain(fresh.id)
      expect(remaining.map((m) => m.id)).not.toContain(stale.id)
    })
  })

  describe('deleteMatchup - manual deletion', () => {
    it('manually deletes a specific matchup', () => {
      const m1 = service.saveMatchup(mockTeams, 'balanced', GROUP_ID)
      const m2 = service.saveMatchup(mockTeams, 'rare', GROUP_ID)

      service.deleteMatchup(m1.id, GROUP_ID)

      const matchups = service.getAllMatchups(GROUP_ID)
      expect(matchups).toHaveLength(1)
      expect(matchups[0].id).toBe(m2.id)
    })

    it('remaining matchups stay after one is manually deleted', () => {
      for (let i = 0; i < 5; i++) {
        service.saveMatchup(mockTeams, 'balanced', GROUP_ID)
      }

      const matchups = service.getAllMatchups(GROUP_ID)
      const toDelete = matchups[2].id

      service.deleteMatchup(toDelete, GROUP_ID)

      const remaining = service.getAllMatchups(GROUP_ID)
      expect(remaining).toHaveLength(4)
      expect(remaining.find((m) => m.id === toDelete)).toBeUndefined()
    })
  })

  describe('buffer does not shrink when matchup is used', () => {
    it('matchups remain in the buffer after retrieval (no auto-delete on use)', () => {
      const m = service.saveMatchup(mockTeams, 'balanced', GROUP_ID)

      // Retrieve the matchup (simulating "using" it)
      const retrieved = service.getMatchup(m.id, GROUP_ID)
      expect(retrieved).not.toBeNull()

      // It should still be in the buffer
      const all = service.getAllMatchups(GROUP_ID)
      expect(all.find((x) => x.id === m.id)).toBeDefined()
    })

    it('buffer stays at 5 even after repeated retrievals', () => {
      for (let i = 0; i < 5; i++) {
        service.saveMatchup(mockTeams, 'balanced', GROUP_ID)
      }

      // Retrieve all matchups multiple times (simulating repeated use)
      const all = service.getAllMatchups(GROUP_ID)
      for (const m of all) {
        service.getMatchup(m.id, GROUP_ID)
      }

      // Buffer should still have 5
      expect(service.getAllMatchups(GROUP_ID)).toHaveLength(5)
    })
  })
})
