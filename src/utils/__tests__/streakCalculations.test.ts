import { describe, expect, it } from 'vitest'
import type { Match, Player } from '@/types'
import { calculateStreaks } from '../streakCalculations'

const createMockPlayer = (id: string, name: string): Player => ({
  id,
  name,
  avatar: '👤',
  ranking: 1200,
  matchesPlayed: 10,
  wins: 5,
  losses: 5,
  department: 'Engineering',
  groupId: 'group1',
  createdAt: '2024-01-01',
})

const createMockMatch = (
  team1Player1: Player,
  team1Player2: Player,
  team2Player1: Player,
  team2Player2: Player,
  score1: number,
  score2: number,
): Match => ({
  id: `match-${Date.now()}-${Math.random()}`,
  team1: [team1Player1, team1Player2],
  team2: [team2Player1, team2Player2],
  score1,
  score2,
  date: '2024-01-01',
  time: '12:00',
  groupId: 'group1',
  createdAt: '2024-01-01T00:00:00.000Z',
})

describe('calculateStreaks', () => {
  const player1 = createMockPlayer('1', 'Alice')
  const player2 = createMockPlayer('2', 'Bob')
  const player3 = createMockPlayer('3', 'Charlie')
  const player4 = createMockPlayer('4', 'Diana')

  describe('current streak calculation', () => {
    it('should calculate a winning streak correctly', () => {
      const matches: Match[] = [
        // Most recent matches first (wins for player1)
        createMockMatch(player1, player2, player3, player4, 10, 5), // Win (player1 in team1)
        createMockMatch(player1, player2, player3, player4, 10, 6), // Win (player1 in team1)
        createMockMatch(player1, player2, player3, player4, 10, 7), // Win (player1 in team1)
        createMockMatch(player3, player4, player1, player2, 10, 5), // Loss (player1 in team2, team1 wins)
      ]

      const result = calculateStreaks('1', matches)

      expect(result.currentStreak).toBe(3)
      expect(result.streakType).toBe('win')
    })

    it('should calculate a losing streak correctly', () => {
      const matches: Match[] = [
        // Most recent matches first (losses for player1)
        createMockMatch(player3, player4, player1, player2, 10, 5), // Loss
        createMockMatch(player3, player4, player1, player2, 10, 6), // Loss
        createMockMatch(player1, player2, player3, player4, 10, 5), // Win (stops streak)
      ]

      const result = calculateStreaks('1', matches)

      expect(result.currentStreak).toBe(2)
      expect(result.streakType).toBe('loss')
    })

    it('should handle single match', () => {
      const matches: Match[] = [createMockMatch(player1, player2, player3, player4, 10, 5)]

      const result = calculateStreaks('1', matches)

      expect(result.currentStreak).toBe(1)
      expect(result.streakType).toBe('win')
    })

    it('should handle no matches', () => {
      const matches: Match[] = []

      const result = calculateStreaks('1', matches)

      expect(result.currentStreak).toBe(0)
      expect(result.streakType).toBe(null)
      expect(result.bestStreak).toBe(0)
      expect(result.worstStreak).toBe(0)
    })
  })

  describe('best streak calculation', () => {
    it('should find the longest winning streak in history', () => {
      const matches: Match[] = [
        // Current: 2 wins
        createMockMatch(player1, player2, player3, player4, 10, 5), // Win
        createMockMatch(player1, player2, player3, player4, 10, 6), // Win
        // Break
        createMockMatch(player3, player4, player1, player2, 10, 5), // Loss
        // Best streak: 5 wins
        createMockMatch(player1, player2, player3, player4, 10, 5), // Win
        createMockMatch(player1, player2, player3, player4, 10, 6), // Win
        createMockMatch(player1, player2, player3, player4, 10, 7), // Win
        createMockMatch(player1, player2, player3, player4, 10, 8), // Win
        createMockMatch(player1, player2, player3, player4, 10, 9), // Win
        // Break
        createMockMatch(player3, player4, player1, player2, 10, 5), // Loss
        // Earlier: 3 wins
        createMockMatch(player1, player2, player3, player4, 10, 5), // Win
        createMockMatch(player1, player2, player3, player4, 10, 6), // Win
        createMockMatch(player1, player2, player3, player4, 10, 7), // Win
      ]

      const result = calculateStreaks('1', matches)

      expect(result.bestStreak).toBe(5)
      expect(result.currentStreak).toBe(2)
    })

    it('should use current streak if it is the best', () => {
      const matches: Match[] = [
        // Current: 5 wins (also best)
        createMockMatch(player1, player2, player3, player4, 10, 5), // Win
        createMockMatch(player1, player2, player3, player4, 10, 6), // Win
        createMockMatch(player1, player2, player3, player4, 10, 7), // Win
        createMockMatch(player1, player2, player3, player4, 10, 8), // Win
        createMockMatch(player1, player2, player3, player4, 10, 9), // Win
        // Break
        createMockMatch(player3, player4, player1, player2, 10, 5), // Loss
        // Earlier: 2 wins
        createMockMatch(player1, player2, player3, player4, 10, 5), // Win
        createMockMatch(player1, player2, player3, player4, 10, 6), // Win
      ]

      const result = calculateStreaks('1', matches)

      expect(result.bestStreak).toBe(5)
      expect(result.currentStreak).toBe(5)
      expect(result.streakType).toBe('win')
    })

    it('should handle all losses with no win streaks', () => {
      const matches: Match[] = [
        createMockMatch(player3, player4, player1, player2, 10, 5), // Loss
        createMockMatch(player3, player4, player1, player2, 10, 6), // Loss
        createMockMatch(player3, player4, player1, player2, 10, 7), // Loss
      ]

      const result = calculateStreaks('1', matches)

      expect(result.bestStreak).toBe(0)
      expect(result.currentStreak).toBe(3)
      expect(result.streakType).toBe('loss')
    })
  })

  describe('worst streak calculation', () => {
    it('should find the longest losing streak in history', () => {
      const matches: Match[] = [
        // Current: 1 win
        createMockMatch(player1, player2, player3, player4, 10, 5), // Win
        // Worst streak: 4 losses
        createMockMatch(player3, player4, player1, player2, 10, 5), // Loss
        createMockMatch(player3, player4, player1, player2, 10, 6), // Loss
        createMockMatch(player3, player4, player1, player2, 10, 7), // Loss
        createMockMatch(player3, player4, player1, player2, 10, 8), // Loss
        // Break
        createMockMatch(player1, player2, player3, player4, 10, 5), // Win
        // Earlier: 2 losses
        createMockMatch(player3, player4, player1, player2, 10, 5), // Loss
        createMockMatch(player3, player4, player1, player2, 10, 6), // Loss
      ]

      const result = calculateStreaks('1', matches)

      expect(result.worstStreak).toBe(4)
      expect(result.currentStreak).toBe(1)
      expect(result.streakType).toBe('win')
    })

    it('should use current streak if it is the worst', () => {
      const matches: Match[] = [
        // Current: 4 losses (also worst)
        createMockMatch(player3, player4, player1, player2, 10, 5), // Loss
        createMockMatch(player3, player4, player1, player2, 10, 6), // Loss
        createMockMatch(player3, player4, player1, player2, 10, 7), // Loss
        createMockMatch(player3, player4, player1, player2, 10, 8), // Loss
        // Break
        createMockMatch(player1, player2, player3, player4, 10, 5), // Win
        // Earlier: 2 losses
        createMockMatch(player3, player4, player1, player2, 10, 5), // Loss
        createMockMatch(player3, player4, player1, player2, 10, 6), // Loss
      ]

      const result = calculateStreaks('1', matches)

      expect(result.worstStreak).toBe(4)
      expect(result.currentStreak).toBe(4)
      expect(result.streakType).toBe('loss')
    })

    it('should handle all wins with no loss streaks', () => {
      const matches: Match[] = [
        createMockMatch(player1, player2, player3, player4, 10, 5), // Win
        createMockMatch(player1, player2, player3, player4, 10, 6), // Win
        createMockMatch(player1, player2, player3, player4, 10, 7), // Win
      ]

      const result = calculateStreaks('1', matches)

      expect(result.worstStreak).toBe(0)
      expect(result.currentStreak).toBe(3)
      expect(result.streakType).toBe('win')
    })
  })

  describe('complex scenarios', () => {
    it('should handle alternating wins and losses', () => {
      const matches: Match[] = [
        createMockMatch(player1, player2, player3, player4, 10, 5), // Win
        createMockMatch(player3, player4, player1, player2, 10, 5), // Loss
        createMockMatch(player1, player2, player3, player4, 10, 5), // Win
        createMockMatch(player3, player4, player1, player2, 10, 5), // Loss
        createMockMatch(player1, player2, player3, player4, 10, 5), // Win
      ]

      const result = calculateStreaks('1', matches)

      expect(result.currentStreak).toBe(1)
      expect(result.streakType).toBe('win')
      expect(result.bestStreak).toBe(1)
      expect(result.worstStreak).toBe(1)
    })

    it('should correctly handle player in team2', () => {
      const matches: Match[] = [
        // Player1 in team2, team2 wins
        createMockMatch(player3, player4, player1, player2, 5, 10), // Win for player1
        createMockMatch(player3, player4, player1, player2, 6, 10), // Win for player1
        createMockMatch(player3, player4, player1, player2, 7, 10), // Win for player1
      ]

      const result = calculateStreaks('1', matches)

      expect(result.currentStreak).toBe(3)
      expect(result.streakType).toBe('win')
      expect(result.bestStreak).toBe(3)
    })

    it('should handle the example from the issue (5 win streak, 4 loss streak)', () => {
      const matches: Match[] = [
        // Current: 2 wins
        createMockMatch(player1, player2, player3, player4, 10, 5), // Win
        createMockMatch(player1, player2, player3, player4, 10, 6), // Win
        // Break
        createMockMatch(player3, player4, player1, player2, 10, 5), // Loss
        // Best streak: 5 wins
        createMockMatch(player1, player2, player3, player4, 10, 5), // Win
        createMockMatch(player1, player2, player3, player4, 10, 6), // Win
        createMockMatch(player1, player2, player3, player4, 10, 7), // Win
        createMockMatch(player1, player2, player3, player4, 10, 8), // Win
        createMockMatch(player1, player2, player3, player4, 10, 9), // Win
        // Break - Worst streak: 4 losses
        createMockMatch(player3, player4, player1, player2, 10, 5), // Loss
        createMockMatch(player3, player4, player1, player2, 10, 6), // Loss
        createMockMatch(player3, player4, player1, player2, 10, 7), // Loss
        createMockMatch(player3, player4, player1, player2, 10, 8), // Loss
      ]

      const result = calculateStreaks('1', matches)

      expect(result.bestStreak).toBe(5)
      expect(result.worstStreak).toBe(4)
      // Current streak should be 2 wins (most recent)
      expect(result.currentStreak).toBe(2)
      expect(result.streakType).toBe('win')
    })
  })

  describe('edge cases', () => {
    it('should handle player not in any matches', () => {
      const matches: Match[] = [
        createMockMatch(player2, player3, player4, createMockPlayer('5', 'Eve'), 10, 5),
      ]

      const result = calculateStreaks('1', matches)

      expect(result.currentStreak).toBe(0)
      expect(result.streakType).toBe(null)
      expect(result.bestStreak).toBe(0)
      expect(result.worstStreak).toBe(0)
    })

    it('should handle draws (if score1 equals score2)', () => {
      // In this implementation, draws are not possible as we check score1 > score2
      // But this test ensures we don't crash with equal scores
      const matches: Match[] = [
        createMockMatch(player1, player2, player3, player4, 10, 10), // Draw treated as loss
        createMockMatch(player1, player2, player3, player4, 10, 5), // Win
      ]

      const result = calculateStreaks('1', matches)

      // Draw is treated as loss, so current streak should be 1 loss
      expect(result.currentStreak).toBe(1)
      expect(result.streakType).toBe('loss')
    })
  })
})
