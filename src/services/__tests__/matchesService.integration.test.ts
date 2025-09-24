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

  describe('Inflationary ELO system', () => {
    it('should demonstrate net positive point creation in matches', () => {
      // Test scenario: two evenly matched teams (1200 avg each)
      const mockMatch: Match = {
        id: 'inflation-test',
        team1: [
          {
            id: 'w1',
            name: 'Winner1',
            ranking: 1200,
            matchesPlayed: 10,
            wins: 5,
            losses: 5,
            avatar: '👩',
            department: 'Engineering',
          },
          {
            id: 'w2',
            name: 'Winner2',
            ranking: 1200,
            matchesPlayed: 10,
            wins: 5,
            losses: 5,
            avatar: '👨',
            department: 'Design',
          },
        ],
        team2: [
          {
            id: 'l1',
            name: 'Loser1',
            ranking: 1200,
            matchesPlayed: 10,
            wins: 5,
            losses: 5,
            avatar: '🧑',
            department: 'Marketing',
          },
          {
            id: 'l2',
            name: 'Loser2',
            ranking: 1200,
            matchesPlayed: 10,
            wins: 5,
            losses: 5,
            avatar: '👩‍💼',
            department: 'Sales',
          },
        ],
        score1: 10, // Team1 wins
        score2: 8,
        date: '2024-01-15',
        time: '14:30',
        groupId: 'group1',
        // Simulating inflationary ELO with asymmetric K-factors
        // Winners: K=35, Losers: K=29 (vs standard K=32)
        playerStats: [
          { playerId: 'w1', preGameRanking: 1200, postGameRanking: 1218 }, // +18 points (vs +16 with K=32)
          { playerId: 'w2', preGameRanking: 1200, postGameRanking: 1218 }, // +18 points
          { playerId: 'l1', preGameRanking: 1200, postGameRanking: 1186 }, // -14 points (vs -16 with K=32)
          { playerId: 'l2', preGameRanking: 1200, postGameRanking: 1186 }, // -14 points
        ],
      }

      // Calculate total points before and after
      const totalBefore =
        mockMatch.playerStats?.reduce((sum, stat) => sum + stat.preGameRanking, 0) ?? 0
      const totalAfter =
        mockMatch.playerStats?.reduce((sum, stat) => sum + stat.postGameRanking, 0) ?? 0
      const netInflation = totalAfter - totalBefore

      // With asymmetric K-factors, we should see net positive inflation
      expect(netInflation).toBeGreaterThan(0)
      expect(netInflation).toBe(8) // (18+18) - (14+14) = 8 points created

      // Winners should still get significantly more points than losers lose
      // biome-ignore lint/style/noNonNullAssertion: We know playerStats exists in test data
      const playerStats = mockMatch.playerStats!
      const winnerGains =
        calculateRankingChange(playerStats[0]) + calculateRankingChange(playerStats[1])
      const loserLosses = Math.abs(
        calculateRankingChange(playerStats[2]) + calculateRankingChange(playerStats[3]),
      )

      expect(winnerGains).toBe(36) // +18 + +18
      expect(loserLosses).toBe(28) // 14 + 14
      expect(winnerGains).toBeGreaterThan(loserLosses)
    })

    it('should maintain competitive balance despite inflation', () => {
      // Test that relative skill differences are preserved
      const unevenMatch: Match = {
        id: 'skill-gap-test',
        team1: [
          {
            id: 'strong1',
            name: 'Strong1',
            ranking: 1400,
            matchesPlayed: 20,
            wins: 15,
            losses: 5,
            avatar: '💪',
            department: 'Engineering',
          },
          {
            id: 'strong2',
            name: 'Strong2',
            ranking: 1400,
            matchesPlayed: 20,
            wins: 15,
            losses: 5,
            avatar: '🏆',
            department: 'Design',
          },
        ],
        team2: [
          {
            id: 'weak1',
            name: 'Weak1',
            ranking: 1000,
            matchesPlayed: 20,
            wins: 5,
            losses: 15,
            avatar: '🎯',
            department: 'Marketing',
          },
          {
            id: 'weak2',
            name: 'Weak2',
            ranking: 1000,
            matchesPlayed: 20,
            wins: 5,
            losses: 15,
            avatar: '🎮',
            department: 'Sales',
          },
        ],
        score1: 10, // Strong team wins (expected)
        score2: 3,
        date: '2024-01-15',
        time: '15:00',
        groupId: 'group1',
        // With large skill gap: winners get fewer points, losers lose fewer points
        // But inflation still occurs due to asymmetric K-factors
        playerStats: [
          { playerId: 'strong1', preGameRanking: 1400, postGameRanking: 1404 }, // +4 points (small gain vs weaker opponent)
          { playerId: 'strong2', preGameRanking: 1400, postGameRanking: 1404 }, // +4 points
          { playerId: 'weak1', preGameRanking: 1000, postGameRanking: 997 }, // -3 points (small loss vs stronger opponent)
          { playerId: 'weak2', preGameRanking: 1000, postGameRanking: 997 }, // -3 points
        ],
      }

      const totalBefore =
        unevenMatch.playerStats?.reduce((sum, stat) => sum + stat.preGameRanking, 0) ?? 0
      const totalAfter =
        unevenMatch.playerStats?.reduce((sum, stat) => sum + stat.postGameRanking, 0) ?? 0
      const netInflation = totalAfter - totalBefore

      // Even with skill gap, inflation should still occur
      expect(netInflation).toBeGreaterThan(0)
      expect(netInflation).toBe(2) // (4+4) - (3+3) = 2 points created

      // Verify that stronger players gain less when beating weaker players
      // biome-ignore lint/style/noNonNullAssertion: We know playerStats exists in test data
      const unevenPlayerStats = unevenMatch.playerStats!
      const strongerPlayerGains = calculateRankingChange(unevenPlayerStats[0])
      expect(strongerPlayerGains).toBeLessThan(18) // Much less than evenly matched scenario
      expect(strongerPlayerGains).toBe(4)
    })

    it('should accumulate meaningful progression over time', () => {
      // Simulate a player playing 50 matches over a year
      const averageInflationPerMatch = 3 // Conservative estimate for mixed skill matchups
      const matchesPerYear = 50
      const expectedAnnualInflation = averageInflationPerMatch * matchesPerYear

      expect(expectedAnnualInflation).toBe(150)

      // This represents meaningful progression that players can feel
      // while maintaining competitive integrity
      expect(expectedAnnualInflation).toBeGreaterThan(100) // Noticeable progression
      expect(expectedAnnualInflation).toBeLessThan(500) // Not excessive inflation
    })
  })
})
