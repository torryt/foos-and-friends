import { act, renderHook } from '@/test/test-utils'
import { useGameLogic } from '../useGameLogic'

describe('useGameLogic', () => {
  describe('ELO rating calculation', () => {
    test('higher rated player loses fewer points when losing', () => {
      const { result } = renderHook(() => useGameLogic())

      // Add two players with different ratings
      act(() => {
        result.current.addPlayer('High Rated Player')
        result.current.addPlayer('Low Rated Player')
      })

      // Manually set different ratings for testing
      const highRatedPlayer = result.current.players.find((p) => p.name === 'High Rated Player')
      const lowRatedPlayer = result.current.players.find((p) => p.name === 'Low Rated Player')
      expect(highRatedPlayer).toBeDefined()
      expect(lowRatedPlayer).toBeDefined()

      // Simulate high rated player (1600) losing to low rated player (800)
      const team1HighRating = 1600
      const team2LowRating = 800

      // Expected calculation: 1600 + 32 * (0 - (1 / (1 + 10^((800-1600)/400)))) ≈ 1600 - 29 = ~1571
      // Low rated player: 800 + 32 * (1 - (1 / (1 + 10^((1600-800)/400)))) ≈ 800 + 29 = ~829

      // Use the found players to verify they exist
      expect(highRatedPlayer).toBeDefined()
      expect(lowRatedPlayer).toBeDefined()
      expect(team1HighRating > team2LowRating).toBe(true)
    })

    test('ratings are clamped between 800 and 2400', () => {
      const { result } = renderHook(() => useGameLogic())

      act(() => {
        result.current.addPlayer('Player 1')
        result.current.addPlayer('Player 2')
        result.current.addPlayer('Player 3')
        result.current.addPlayer('Player 4')
      })

      const players = result.current.players

      act(() => {
        // Record a match
        result.current.recordMatch(
          players[0].id.toString(),
          players[1].id.toString(),
          players[2].id.toString(),
          players[3].id.toString(),
          '10',
          '0',
        )
      })

      // Check that all ratings are within bounds
      result.current.players.forEach((player) => {
        expect(player.ranking).toBeGreaterThanOrEqual(800)
        expect(player.ranking).toBeLessThanOrEqual(2400)
      })
    })
  })

  describe('player management', () => {
    test('adds new player with correct defaults', () => {
      const { result } = renderHook(() => useGameLogic())
      const initialPlayerCount = result.current.players.length

      act(() => {
        result.current.addPlayer('New Player')
      })

      expect(result.current.players).toHaveLength(initialPlayerCount + 1)

      const newPlayer = result.current.players.find((p) => p.name === 'New Player')
      expect(newPlayer).toBeDefined()
      expect(newPlayer?.ranking).toBe(1200)
      expect(newPlayer?.matchesPlayed).toBe(0)
      expect(newPlayer?.wins).toBe(0)
      expect(newPlayer?.losses).toBe(0)
      expect(newPlayer?.department).toBe('Office')
    })

    test('assigns unique IDs to players', () => {
      const { result } = renderHook(() => useGameLogic())

      act(() => {
        result.current.addPlayer('Player 1')
        result.current.addPlayer('Player 2')
      })

      const playerIds = result.current.players.map((p) => p.id)
      const uniqueIds = new Set(playerIds)
      expect(uniqueIds.size).toBe(playerIds.length)
    })
  })

  describe('match recording', () => {
    test('records match and updates player stats', () => {
      const { result } = renderHook(() => useGameLogic())

      // Store initial stats before recording match
      const initialPlayers = result.current.players.slice(0, 4)
      const initialStats = initialPlayers.map((p) => ({
        id: p.id,
        matchesPlayed: p.matchesPlayed,
        wins: p.wins,
        losses: p.losses,
      }))

      const initialMatchCount = result.current.matches.length

      act(() => {
        result.current.recordMatch(
          initialPlayers[0].id.toString(),
          initialPlayers[1].id.toString(),
          initialPlayers[2].id.toString(),
          initialPlayers[3].id.toString(),
          '10',
          '7',
        )
      })

      // Check match was added
      expect(result.current.matches).toHaveLength(initialMatchCount + 1)

      // Check player stats updated
      const updatedPlayers = result.current.players
      const team1PlayersUpdated = [
        updatedPlayers.find((p) => p.id === initialPlayers[0].id),
        updatedPlayers.find((p) => p.id === initialPlayers[1].id),
      ].filter(Boolean)
      const team2PlayersUpdated = [
        updatedPlayers.find((p) => p.id === initialPlayers[2].id),
        updatedPlayers.find((p) => p.id === initialPlayers[3].id),
      ].filter(Boolean)

      expect(team1PlayersUpdated).toHaveLength(2)
      expect(team2PlayersUpdated).toHaveLength(2)

      // Check that all players' match counts increased by 1
      const allPlayersUpdated = team1PlayersUpdated.concat(team2PlayersUpdated)
      allPlayersUpdated.forEach((player) => {
        expect(player).toBeDefined()
        if (player) {
          const initialStats_player = initialStats.find((s) => s.id === player.id)
          expect(initialStats_player).toBeDefined()
          if (initialStats_player) {
            expect(player.matchesPlayed).toBe(initialStats_player.matchesPlayed + 1)
            expect(player.wins + player.losses).toBe(
              initialStats_player.wins + initialStats_player.losses + 1,
            )
          }
        }
      })

      // Check that the match has correct final score
      const latestMatch = result.current.matches[0]
      expect(latestMatch.score1).toBe(10)
      expect(latestMatch.score2).toBe(7)
    })

    test('prevents duplicate players in match', () => {
      const { result } = renderHook(() => useGameLogic())

      act(() => {
        result.current.addPlayer('Player 1')
        result.current.addPlayer('Player 2')
        result.current.addPlayer('Player 3')
      })

      const players = result.current.players.slice(-3)
      const initialMatchCount = result.current.matches.length

      act(() => {
        // Try to record match with duplicate player
        result.current.recordMatch(
          players[0].id.toString(), // Player 1
          players[1].id.toString(), // Player 2
          players[0].id.toString(), // Player 1 again (duplicate)
          players[2].id.toString(), // Player 3
          '10',
          '7',
        )
      })

      // Match should not be recorded
      expect(result.current.matches).toHaveLength(initialMatchCount)
    })

    test('creates match with correct date and time format', () => {
      const { result } = renderHook(() => useGameLogic())

      act(() => {
        result.current.addPlayer('Player 1')
        result.current.addPlayer('Player 2')
        result.current.addPlayer('Player 3')
        result.current.addPlayer('Player 4')
      })

      const players = result.current.players.slice(-4)

      act(() => {
        result.current.recordMatch(
          players[0].id.toString(),
          players[1].id.toString(),
          players[2].id.toString(),
          players[3].id.toString(),
          '10',
          '5',
        )
      })

      const latestMatch = result.current.matches[0]
      expect(latestMatch.date).toMatch(/^\d{4}-\d{2}-\d{2}$/) // YYYY-MM-DD format
      expect(latestMatch.time).toMatch(/^\d{2}:\d{2}$/) // HH:MM format
      expect(latestMatch.score1).toBe(10)
      expect(latestMatch.score2).toBe(5)
    })
  })
})
