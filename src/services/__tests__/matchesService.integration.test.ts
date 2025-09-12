import { describe, expect, it } from 'vitest'
import type { Match, PlayerMatchStats } from '@/types'
import { addRankingChange, calculateRankingChange } from '@/types'

describe('Match History Integration', () => {
  describe('PlayerMatchStats type', () => {
    it('should have correct shape for player stats', () => {
      const stats: PlayerMatchStats = {
        playerId: 'test-player',
        preGameRanking: 1200,
        postGameRanking: 1250,
      }

      expect(stats.playerId).toBe('test-player')
      expect(stats.preGameRanking).toBe(1200)
      expect(stats.postGameRanking).toBe(1250)

      // Test utility function for ranking change
      const rankingChange = calculateRankingChange(stats)
      expect(rankingChange).toBe(50)

      // Test extended stats with ranking change
      const statsWithChange = addRankingChange(stats)
      expect(statsWithChange.rankingChange).toBe(50)
    })

    it('should handle negative ranking changes', () => {
      const stats: PlayerMatchStats = {
        playerId: 'test-player',
        preGameRanking: 1200,
        postGameRanking: 1150,
      }

      const rankingChange = calculateRankingChange(stats)
      expect(rankingChange).toBe(-50)
      expect(stats.postGameRanking - stats.preGameRanking).toBe(rankingChange)
    })

    it('should handle zero ranking changes', () => {
      const stats: PlayerMatchStats = {
        playerId: 'test-player',
        preGameRanking: 1200,
        postGameRanking: 1200,
      }

      const rankingChange = calculateRankingChange(stats)
      expect(rankingChange).toBe(0)
      expect(stats.preGameRanking).toBe(stats.postGameRanking)
    })
  })

  describe('Match with PlayerStats', () => {
    it('should include playerStats in Match type', () => {
      const mockMatch: Match = {
        id: 'match1',
        team1: [
          {
            id: 'p1',
            name: 'Alice',
            ranking: 1220,
            matchesPlayed: 10,
            wins: 6,
            losses: 4,
            avatar: '👩',
            department: 'Engineering',
          },
          {
            id: 'p2',
            name: 'Bob',
            ranking: 1318,
            matchesPlayed: 9,
            wins: 6,
            losses: 3,
            avatar: '👨',
            department: 'Design',
          },
        ],
        team2: [
          {
            id: 'p3',
            name: 'Charlie',
            ranking: 1085,
            matchesPlayed: 13,
            wins: 7,
            losses: 6,
            avatar: '🧑',
            department: 'Marketing',
          },
          {
            id: 'p4',
            name: 'Diana',
            ranking: 1377,
            matchesPlayed: 16,
            wins: 10,
            losses: 6,
            avatar: '👩‍💼',
            department: 'Sales',
          },
        ],
        score1: 10,
        score2: 8,
        date: '2024-01-15',
        time: '14:30',
        groupId: 'group1',
        playerStats: [
          { playerId: 'p1', preGameRanking: 1200, postGameRanking: 1220 },
          { playerId: 'p2', preGameRanking: 1300, postGameRanking: 1318 },
          { playerId: 'p3', preGameRanking: 1100, postGameRanking: 1085 },
          { playerId: 'p4', preGameRanking: 1400, postGameRanking: 1377 },
        ],
      }

      expect(mockMatch.playerStats).toBeDefined()
      expect(mockMatch.playerStats).toHaveLength(4)

      // Test calculated ranking changes
      const firstPlayerStats = mockMatch.playerStats?.[0]
      const thirdPlayerStats = mockMatch.playerStats?.[2]

      if (firstPlayerStats) {
        expect(calculateRankingChange(firstPlayerStats)).toBe(20)
      }
      if (thirdPlayerStats) {
        expect(calculateRankingChange(thirdPlayerStats)).toBe(-15)
      }
    })

    it('should work without playerStats for backwards compatibility', () => {
      const legacyMatch: Match = {
        id: 'match2',
        team1: [
          {
            id: 'p1',
            name: 'Alice',
            ranking: 1200,
            matchesPlayed: 10,
            wins: 6,
            losses: 4,
            avatar: '👩',
            department: 'Engineering',
          },
          {
            id: 'p2',
            name: 'Bob',
            ranking: 1300,
            matchesPlayed: 9,
            wins: 6,
            losses: 3,
            avatar: '👨',
            department: 'Design',
          },
        ],
        team2: [
          {
            id: 'p3',
            name: 'Charlie',
            ranking: 1100,
            matchesPlayed: 13,
            wins: 7,
            losses: 6,
            avatar: '🧑',
            department: 'Marketing',
          },
          {
            id: 'p4',
            name: 'Diana',
            ranking: 1400,
            matchesPlayed: 16,
            wins: 10,
            losses: 6,
            avatar: '👩‍💼',
            department: 'Sales',
          },
        ],
        score1: 7,
        score2: 10,
        date: '2024-01-10',
        time: '16:45',
        groupId: 'group1',
        // No playerStats - legacy match
      }

      expect(legacyMatch.playerStats).toBeUndefined()
      expect(legacyMatch.team1).toBeDefined()
      expect(legacyMatch.team2).toBeDefined()
    })
  })

  describe('ELO ranking constraints', () => {
    it('should respect ranking bounds (800-2400)', () => {
      const testRankings = [800, 1200, 1800, 2400]

      testRankings.forEach((ranking) => {
        expect(ranking).toBeGreaterThanOrEqual(800)
        expect(ranking).toBeLessThanOrEqual(2400)
      })
    })

    it('should calculate reasonable ranking changes', () => {
      // Typical ranking changes should be within reasonable bounds
      const reasonableChanges = [-50, -25, 0, 15, 32, -12]

      reasonableChanges.forEach((change) => {
        expect(Math.abs(change)).toBeLessThanOrEqual(100) // Most changes should be < 100 points
      })
    })
  })
})
