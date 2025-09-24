import { describe, expect, it } from 'vitest'
import type { Player } from '@/types'
import {
  calculatePositionPreferences,
  calculateTeamQuality,
  findBestMatchup,
  findBestPositions,
  formatTeamAssignment,
  generateTeamCombinations,
  type PositionPreference,
  type TeamAssignment,
} from '../matchmaking'

const createMockPlayer = (id: string, name: string, ranking: number): Player => ({
  id,
  name,
  avatar: '👤',
  ranking,
  matchesPlayed: 10,
  wins: 5,
  losses: 5,
  department: 'Engineering',
  groupId: 'group1',
  createdAt: '2024-01-01',
})

describe('matchmaking algorithm', () => {
  describe('calculatePositionPreferences', () => {
    it('should use neutral heuristics when no position stats available', () => {
      const highRankedPlayer = createMockPlayer('1', 'Alice', 1600)
      const lowRankedPlayer = createMockPlayer('2', 'Bob', 1000)

      const highRankedPrefs = calculatePositionPreferences(highRankedPlayer)
      const lowRankedPrefs = calculatePositionPreferences(lowRankedPlayer)

      // Should be neutral 50/50 split when no data is available
      expect(highRankedPrefs.attackerWinRate).toBe(50)
      expect(highRankedPrefs.defenderWinRate).toBe(50)
      expect(lowRankedPrefs.attackerWinRate).toBe(50)
      expect(lowRankedPrefs.defenderWinRate).toBe(50)
      expect(highRankedPrefs.preferredPosition).toBeNull()
      expect(lowRankedPrefs.preferredPosition).toBeNull()
      expect(highRankedPrefs.confidence).toBe(0.3) // Low confidence without match data
    })

    it('should use actual position stats when available', () => {
      const player = createMockPlayer('1', 'Alice', 1200)
      const positionStats = {
        gamesAsAttacker: 5,
        gamesAsDefender: 5,
        winRateAsAttacker: 70,
        winRateAsDefender: 40,
      }

      const prefs = calculatePositionPreferences(player, positionStats)

      expect(prefs.attackerWinRate).toBe(70)
      expect(prefs.defenderWinRate).toBe(40)
      expect(prefs.preferredPosition).toBe('attacker')
      expect(prefs.confidence).toBe(1) // Full confidence with 10 games
    })

    it('should return null preference when win rates are close', () => {
      const player = createMockPlayer('1', 'Alice', 1200)
      const positionStats = {
        gamesAsAttacker: 3,
        gamesAsDefender: 3,
        winRateAsAttacker: 52,
        winRateAsDefender: 50,
      }

      const prefs = calculatePositionPreferences(player, positionStats)

      expect(prefs.preferredPosition).toBeNull()
      expect(prefs.confidence).toBe(0.6) // 6 games / 10
    })
  })

  describe('generateTeamCombinations', () => {
    it('should throw error for invalid player pool size', () => {
      const tooFew = [createMockPlayer('1', 'A', 1200), createMockPlayer('2', 'B', 1200)]
      const tooMany = Array.from({ length: 8 }, (_, i) =>
        createMockPlayer(`${i}`, `Player${i}`, 1200),
      )

      expect(() => generateTeamCombinations(tooFew)).toThrow('Player pool must contain 4-7 players')
      expect(() => generateTeamCombinations(tooMany)).toThrow(
        'Player pool must contain 4-7 players',
      )
    })

    it('should generate correct number of combinations for 4 players', () => {
      const players = [
        createMockPlayer('1', 'A', 1200),
        createMockPlayer('2', 'B', 1200),
        createMockPlayer('3', 'C', 1200),
        createMockPlayer('4', 'D', 1200),
      ]

      const combinations = generateTeamCombinations(players)

      // With 4 players, there are C(4,2) × C(2,2) = 6 × 1 = 6 combinations
      // Since we don't eliminate symmetric team pairings
      expect(combinations).toHaveLength(6)
    })

    it('should generate more combinations for larger pools', () => {
      const players = Array.from({ length: 5 }, (_, i) =>
        createMockPlayer(`${i}`, `Player${i}`, 1200),
      )
      const combinations = generateTeamCombinations(players)

      // With 5 players: C(5,2) * C(3,2) = 10 * 3 = 30 combinations
      expect(combinations.length).toBeGreaterThan(10)
    })

    it('should ensure each combination has unique players', () => {
      const players = [
        createMockPlayer('1', 'A', 1200),
        createMockPlayer('2', 'B', 1200),
        createMockPlayer('3', 'C', 1200),
        createMockPlayer('4', 'D', 1200),
      ]

      const combinations = generateTeamCombinations(players)

      for (const combo of combinations) {
        const allPlayerIds = [
          combo.team1[0].id,
          combo.team1[1].id,
          combo.team2[0].id,
          combo.team2[1].id,
        ]
        expect(new Set(allPlayerIds).size).toBe(4)
      }
    })
  })

  describe('calculateTeamQuality', () => {
    const players = [
      createMockPlayer('1', 'A', 1400),
      createMockPlayer('2', 'B', 1300),
      createMockPlayer('3', 'C', 1200),
      createMockPlayer('4', 'D', 1100),
    ]

    const mockPreferences: PositionPreference[] = players.map((player) => ({
      playerId: player.id,
      attackerWinRate: 50,
      defenderWinRate: 50,
      preferredPosition: null,
      confidence: 0.8,
    }))

    it('should favor balanced team rankings', () => {
      // Balanced teams: (1400+1100) vs (1300+1200) = 2500 vs 2500
      const balancedAssignment = {
        team1: [players[0], players[3]] as [Player, Player], // A + D
        team2: [players[1], players[2]] as [Player, Player], // B + C
      }

      // Unbalanced teams: (1400+1300) vs (1200+1100) = 2700 vs 2300
      const unbalancedAssignment = {
        team1: [players[0], players[1]] as [Player, Player], // A + B
        team2: [players[2], players[3]] as [Player, Player], // C + D
      }

      const balancedPositions = {
        team1: { attacker: players[0], defender: players[3] },
        team2: { attacker: players[1], defender: players[2] },
      }

      const unbalancedPositions = {
        team1: { attacker: players[0], defender: players[1] },
        team2: { attacker: players[2], defender: players[3] },
      }

      const balancedQuality = calculateTeamQuality(
        balancedAssignment,
        balancedPositions,
        mockPreferences,
      )
      const unbalancedQuality = calculateTeamQuality(
        unbalancedAssignment,
        unbalancedPositions,
        mockPreferences,
      )

      expect(balancedQuality.score).toBeGreaterThan(unbalancedQuality.score)
      expect(balancedQuality.rankingDifference).toBeLessThan(unbalancedQuality.rankingDifference)
    })

    it('should consider position preferences', () => {
      const assignment = {
        team1: [players[0], players[1]] as [Player, Player],
        team2: [players[2], players[3]] as [Player, Player],
      }

      const preferencesWithStrong: PositionPreference[] = [
        {
          playerId: '1',
          attackerWinRate: 80,
          defenderWinRate: 40,
          preferredPosition: 'attacker' as const,
          confidence: 1,
        },
        {
          playerId: '2',
          attackerWinRate: 30,
          defenderWinRate: 70,
          preferredPosition: 'defender' as const,
          confidence: 1,
        },
        {
          playerId: '3',
          attackerWinRate: 60,
          defenderWinRate: 50,
          preferredPosition: 'attacker' as const,
          confidence: 0.8,
        },
        {
          playerId: '4',
          attackerWinRate: 45,
          defenderWinRate: 65,
          preferredPosition: 'defender' as const,
          confidence: 0.8,
        },
      ]

      const goodPositions = {
        team1: { attacker: players[0], defender: players[1] }, // Match preferences
        team2: { attacker: players[2], defender: players[3] }, // Match preferences
      }

      const badPositions = {
        team1: { attacker: players[1], defender: players[0] }, // Against preferences
        team2: { attacker: players[3], defender: players[2] }, // Against preferences
      }

      const goodQuality = calculateTeamQuality(assignment, goodPositions, preferencesWithStrong)
      const badQuality = calculateTeamQuality(assignment, badPositions, preferencesWithStrong)

      expect(goodQuality.positionHappiness).toBeGreaterThan(badQuality.positionHappiness)
    })
  })

  describe('findBestPositions', () => {
    it('should find optimal position assignment', () => {
      const team1 = [createMockPlayer('1', 'A', 1400), createMockPlayer('2', 'B', 1200)] as [
        Player,
        Player,
      ]
      const team2 = [createMockPlayer('3', 'C', 1300), createMockPlayer('4', 'D', 1100)] as [
        Player,
        Player,
      ]

      const preferences: PositionPreference[] = [
        {
          playerId: '1',
          attackerWinRate: 70,
          defenderWinRate: 40,
          preferredPosition: 'attacker',
          confidence: 1,
        },
        {
          playerId: '2',
          attackerWinRate: 40,
          defenderWinRate: 70,
          preferredPosition: 'defender',
          confidence: 1,
        },
        {
          playerId: '3',
          attackerWinRate: 65,
          defenderWinRate: 45,
          preferredPosition: 'attacker',
          confidence: 0.8,
        },
        {
          playerId: '4',
          attackerWinRate: 35,
          defenderWinRate: 65,
          preferredPosition: 'defender',
          confidence: 0.8,
        },
      ]

      const result = findBestPositions(team1, team2, preferences)

      // Should assign each player to their preferred position
      expect(result.assignment.team1.attacker.id).toBe('1') // A prefers attacker
      expect(result.assignment.team1.defender.id).toBe('2') // B prefers defender
      expect(result.assignment.team2.attacker.id).toBe('3') // C prefers attacker
      expect(result.assignment.team2.defender.id).toBe('4') // D prefers defender
    })

    it('should handle cases with no clear preferences', () => {
      const team1 = [createMockPlayer('1', 'A', 1200), createMockPlayer('2', 'B', 1200)] as [
        Player,
        Player,
      ]
      const team2 = [createMockPlayer('3', 'C', 1200), createMockPlayer('4', 'D', 1200)] as [
        Player,
        Player,
      ]

      const neutralPreferences: PositionPreference[] = [
        {
          playerId: '1',
          attackerWinRate: 50,
          defenderWinRate: 50,
          preferredPosition: null,
          confidence: 0.3,
        },
        {
          playerId: '2',
          attackerWinRate: 50,
          defenderWinRate: 50,
          preferredPosition: null,
          confidence: 0.3,
        },
        {
          playerId: '3',
          attackerWinRate: 50,
          defenderWinRate: 50,
          preferredPosition: null,
          confidence: 0.3,
        },
        {
          playerId: '4',
          attackerWinRate: 50,
          defenderWinRate: 50,
          preferredPosition: null,
          confidence: 0.3,
        },
      ]

      const result = findBestPositions(team1, team2, neutralPreferences)

      // Should still return a valid assignment
      expect(result.assignment.team1.attacker).toBeDefined()
      expect(result.assignment.team1.defender).toBeDefined()
      expect(result.assignment.team2.attacker).toBeDefined()
      expect(result.assignment.team2.defender).toBeDefined()

      // All players should be unique
      const assignedIds = [
        result.assignment.team1.attacker.id,
        result.assignment.team1.defender.id,
        result.assignment.team2.attacker.id,
        result.assignment.team2.defender.id,
      ]
      expect(new Set(assignedIds).size).toBe(4)
    })
  })

  describe('findBestMatchup', () => {
    it('should find balanced matchup from player pool', () => {
      const players = [
        createMockPlayer('1', 'Alice', 1400),
        createMockPlayer('2', 'Bob', 1300),
        createMockPlayer('3', 'Charlie', 1200),
        createMockPlayer('4', 'Diana', 1100),
      ]

      const result = findBestMatchup(players)

      expect(result.team1.attacker).toBeDefined()
      expect(result.team1.defender).toBeDefined()
      expect(result.team2.attacker).toBeDefined()
      expect(result.team2.defender).toBeDefined()
      expect(result.rankingDifference).toBeGreaterThanOrEqual(0)
      expect(result.confidence).toBeGreaterThan(0)
      expect(result.confidence).toBeLessThanOrEqual(1)

      // All players should be unique
      const assignedIds = [
        result.team1.attacker.id,
        result.team1.defender.id,
        result.team2.attacker.id,
        result.team2.defender.id,
      ]
      expect(new Set(assignedIds).size).toBe(4)
    })

    it('should work with larger player pools', () => {
      const players = [
        createMockPlayer('1', 'A', 1500),
        createMockPlayer('2', 'B', 1400),
        createMockPlayer('3', 'C', 1300),
        createMockPlayer('4', 'D', 1200),
        createMockPlayer('5', 'E', 1100),
        createMockPlayer('6', 'F', 1000),
      ]

      const result = findBestMatchup(players)

      // Should select 4 players from the pool
      const assignedIds = [
        result.team1.attacker.id,
        result.team1.defender.id,
        result.team2.attacker.id,
        result.team2.defender.id,
      ]
      expect(new Set(assignedIds).size).toBe(4)
      expect(assignedIds.every((id) => players.some((p) => p.id === id))).toBe(true)
    })

    it('should prefer balanced teams over very unbalanced ones', () => {
      const players = [
        createMockPlayer('1', 'Pro', 2000), // Very high
        createMockPlayer('2', 'Good', 1300), // Medium-high
        createMockPlayer('3', 'OK', 1200), // Medium
        createMockPlayer('4', 'Weak', 800), // Low
      ]

      const result = findBestMatchup(players)

      // Calculate team totals
      const team1Total = result.team1.attacker.ranking + result.team1.defender.ranking
      const team2Total = result.team2.attacker.ranking + result.team2.defender.ranking

      // Should avoid pairing the pro with another good player against two weak players
      expect(Math.abs(team1Total - team2Total)).toBeLessThan(600) // Reasonable balance
    })

    it('should throw error for invalid pool size', () => {
      const tooFew = [createMockPlayer('1', 'A', 1200)]
      const tooMany = Array.from({ length: 8 }, (_, i) => createMockPlayer(`${i}`, `P${i}`, 1200))

      expect(() => findBestMatchup(tooFew)).toThrow('Player pool must contain 4-7 players')
      expect(() => findBestMatchup(tooMany)).toThrow('Player pool must contain 4-7 players')
    })

    it('should use provided position preferences', () => {
      const players = [
        createMockPlayer('1', 'A', 1300),
        createMockPlayer('2', 'B', 1200),
        createMockPlayer('3', 'C', 1200),
        createMockPlayer('4', 'D', 1100),
      ]

      const preferences: PositionPreference[] = [
        {
          playerId: '1',
          attackerWinRate: 80,
          defenderWinRate: 30,
          preferredPosition: 'attacker',
          confidence: 1,
        },
        {
          playerId: '2',
          attackerWinRate: 20,
          defenderWinRate: 80,
          preferredPosition: 'defender',
          confidence: 1,
        },
        {
          playerId: '3',
          attackerWinRate: 75,
          defenderWinRate: 35,
          preferredPosition: 'attacker',
          confidence: 1,
        },
        {
          playerId: '4',
          attackerWinRate: 25,
          defenderWinRate: 75,
          preferredPosition: 'defender',
          confidence: 1,
        },
      ]

      const result = findBestMatchup(players, preferences)

      // Should respect strong position preferences where possible
      const attackerIds = [result.team1.attacker.id, result.team2.attacker.id]
      const defenderIds = [result.team1.defender.id, result.team2.defender.id]

      // Players 1 and 3 prefer attacking, players 2 and 4 prefer defending
      expect(attackerIds.sort()).toEqual(['1', '3'])
      expect(defenderIds.sort()).toEqual(['2', '4'])
    })
  })

  describe('formatTeamAssignment', () => {
    it('should format team assignment for display', () => {
      const assignment: TeamAssignment = {
        team1: {
          attacker: createMockPlayer('1', 'Alice', 1400),
          defender: createMockPlayer('2', 'Bob', 1200),
        },
        team2: {
          attacker: createMockPlayer('3', 'Charlie', 1300),
          defender: createMockPlayer('4', 'Diana', 1100),
        },
        rankingDifference: 50,
        confidence: 0.85,
      }

      const formatted = formatTeamAssignment(assignment)

      expect(formatted).toContain('Team 1: Alice (A) + Bob (D)')
      expect(formatted).toContain('Team 2: Charlie (A) + Diana (D)')
      expect(formatted).toContain('Ranking difference: 50')
      expect(formatted).toContain('Confidence: 85%')
    })
  })

  describe('edge cases', () => {
    it('should handle identical player rankings', () => {
      const players = Array.from({ length: 4 }, (_, i) =>
        createMockPlayer(`${i}`, `Player${i}`, 1200),
      )

      const result = findBestMatchup(players)

      expect(result.rankingDifference).toBe(0)
      expect(result.confidence).toBeGreaterThan(0)
    })

    it('should handle extreme ranking differences', () => {
      const players = [
        createMockPlayer('1', 'Beginner', 800),
        createMockPlayer('2', 'Intermediate', 1200),
        createMockPlayer('3', 'Advanced', 1600),
        createMockPlayer('4', 'Expert', 2000),
      ]

      const result = findBestMatchup(players)

      // Should still produce a result, even if not perfectly balanced
      expect(result).toBeDefined()
      expect(result.rankingDifference).toBeGreaterThanOrEqual(0)
    })
  })
})
