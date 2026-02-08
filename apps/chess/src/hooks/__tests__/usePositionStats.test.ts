import type { Match, Player } from '@foos/shared'
import { renderHook } from '@testing-library/react'
import { usePositionStats } from '../usePositionStats'

// Mock data for testing
const createPlayer = (id: string, name: string): Player => ({
  id,
  name,
  ranking: 1500,
  matchesPlayed: 0,
  wins: 0,
  losses: 0,
  avatar: '🎯',
  department: 'Engineering',
})

const createMatch = (
  id: string,
  team1Player1: Player,
  team1Player2: Player,
  team2Player1: Player,
  team2Player2: Player,
  score1: number,
  score2: number,
): Match => ({
  id,
  team1: [team1Player1, team1Player2],
  team2: [team2Player1, team2Player2],
  score1,
  score2,
  date: '2024-01-01',
  time: '10:00',
})

describe('usePositionStats', () => {
  const player1 = createPlayer('1', 'Alice')
  const player2 = createPlayer('2', 'Bob')
  const player3 = createPlayer('3', 'Charlie')
  const player4 = createPlayer('4', 'David')

  test('returns zero stats when no matches', () => {
    const { result } = renderHook(() => usePositionStats('1', []))

    expect(result.current).toEqual({
      gamesAsAttacker: 0,
      gamesAsDefender: 0,
      winsAsAttacker: 0,
      winsAsDefender: 0,
      lossesAsAttacker: 0,
      lossesAsDefender: 0,
      winRateAsAttacker: 0,
      winRateAsDefender: 0,
      preferredPosition: null,
    })
  })

  test('calculates stats when player only plays as attacker', () => {
    const matches = [
      // Player 1 is attacker (team1[0]) and wins
      createMatch('1', player1, player2, player3, player4, 10, 5),
      // Player 1 is attacker (team2[0]) and loses
      createMatch('2', player3, player4, player1, player2, 10, 8),
      // Player 1 is attacker (team1[0]) and wins
      createMatch('3', player1, player2, player3, player4, 10, 7),
    ]

    const { result } = renderHook(() => usePositionStats('1', matches))

    expect(result.current).toEqual({
      gamesAsAttacker: 3,
      gamesAsDefender: 0,
      winsAsAttacker: 2,
      winsAsDefender: 0,
      lossesAsAttacker: 1,
      lossesAsDefender: 0,
      winRateAsAttacker: 67,
      winRateAsDefender: 0,
      preferredPosition: 'attacker',
    })
  })

  test('calculates stats when player only plays as defender', () => {
    const matches = [
      // Player 1 is defender (team1[1]) and wins
      createMatch('1', player2, player1, player3, player4, 10, 5),
      // Player 1 is defender (team2[1]) and loses (team2 score 8 < team1 score 10)
      createMatch('2', player3, player4, player2, player1, 10, 8),
      // Player 1 is defender (team1[1]) and loses
      createMatch('3', player2, player1, player3, player4, 5, 10),
    ]

    const { result } = renderHook(() => usePositionStats('1', matches))

    expect(result.current).toEqual({
      gamesAsAttacker: 0,
      gamesAsDefender: 3,
      winsAsAttacker: 0,
      winsAsDefender: 1, // Only first match is a win
      lossesAsAttacker: 0,
      lossesAsDefender: 2, // Second and third matches are losses
      winRateAsAttacker: 0,
      winRateAsDefender: 33, // 1/3 = 33.33 rounded to 33
      preferredPosition: 'defender',
    })
  })

  test('calculates mixed position stats', () => {
    const matches = [
      // Player 1 as attacker (team1[0]) - wins (10 > 5)
      createMatch('1', player1, player2, player3, player4, 10, 5),
      // Player 1 as defender (team1[1]) - wins (10 > 3)
      createMatch('2', player2, player1, player3, player4, 10, 3),
      // Player 1 as attacker (team2[0]) - loses (team2 score 8 < team1 score 10)
      createMatch('3', player3, player4, player1, player2, 10, 8),
      // Player 1 as defender (team2[1]) - loses (team2 score 7 < team1 score 10)
      createMatch('4', player3, player4, player2, player1, 10, 7),
      // Player 1 as attacker (team1[0]) - wins (10 > 6)
      createMatch('5', player1, player2, player3, player4, 10, 6),
    ]

    const { result } = renderHook(() => usePositionStats('1', matches))

    expect(result.current).toEqual({
      gamesAsAttacker: 3,
      gamesAsDefender: 2,
      winsAsAttacker: 2, // Matches 1 and 5 are wins
      winsAsDefender: 1, // Match 2 is a win
      lossesAsAttacker: 1, // Match 3 is a loss
      lossesAsDefender: 1, // Match 4 is a loss
      winRateAsAttacker: 67, // 2/3 = 66.67 rounded to 67
      winRateAsDefender: 50, // 1/2 = 50
      preferredPosition: 'attacker', // More games as attacker
    })
  })

  test('determines preferred position when equal games but different win rates', () => {
    const matches = [
      // Player 1 as attacker - wins
      createMatch('1', player1, player2, player3, player4, 10, 5),
      // Player 1 as attacker - loses
      createMatch('2', player1, player2, player3, player4, 5, 10),
      // Player 1 as defender - wins
      createMatch('3', player2, player1, player3, player4, 10, 3),
      // Player 1 as defender - wins
      createMatch('4', player2, player1, player3, player4, 10, 4),
    ]

    const { result } = renderHook(() => usePositionStats('1', matches))

    expect(result.current.gamesAsAttacker).toBe(2)
    expect(result.current.gamesAsDefender).toBe(2)
    expect(result.current.winRateAsAttacker).toBe(50) // 1/2
    expect(result.current.winRateAsDefender).toBe(100) // 2/2
    expect(result.current.preferredPosition).toBe('defender') // Better win rate
  })

  test('defaults to attacker when everything is equal', () => {
    const matches = [
      // Player 1 as attacker - wins
      createMatch('1', player1, player2, player3, player4, 10, 5),
      // Player 1 as defender - wins
      createMatch('2', player2, player1, player3, player4, 10, 3),
    ]

    const { result } = renderHook(() => usePositionStats('1', matches))

    expect(result.current.gamesAsAttacker).toBe(1)
    expect(result.current.gamesAsDefender).toBe(1)
    expect(result.current.winRateAsAttacker).toBe(100)
    expect(result.current.winRateAsDefender).toBe(100)
    expect(result.current.preferredPosition).toBe('attacker') // Default when equal
  })

  test('ignores matches where player does not participate', () => {
    const otherPlayer1 = createPlayer('5', 'Eve')
    const otherPlayer2 = createPlayer('6', 'Frank')

    const matches = [
      // Player 1 participates - should be counted
      createMatch('1', player1, player2, player3, player4, 10, 5),
      // Player 1 does not participate - should be ignored
      createMatch('2', otherPlayer1, otherPlayer2, player3, player4, 8, 10),
      // Player 1 participates again - should be counted
      createMatch('3', player2, player1, player3, player4, 10, 7),
    ]

    const { result } = renderHook(() => usePositionStats('1', matches))

    expect(result.current.gamesAsAttacker).toBe(1)
    expect(result.current.gamesAsDefender).toBe(1)
    expect(result.current.winsAsAttacker).toBe(1)
    expect(result.current.winsAsDefender).toBe(1)
  })

  test('handles perfect win rates correctly', () => {
    const matches = [
      // Player 1 as attacker - wins
      createMatch('1', player1, player2, player3, player4, 10, 5),
      // Player 1 as attacker - wins
      createMatch('2', player1, player2, player3, player4, 10, 3),
    ]

    const { result } = renderHook(() => usePositionStats('1', matches))

    expect(result.current.winRateAsAttacker).toBe(100)
    expect(result.current.winRateAsDefender).toBe(0)
    expect(result.current.lossesAsAttacker).toBe(0)
    expect(result.current.lossesAsDefender).toBe(0)
  })

  test('handles perfect loss rates correctly', () => {
    const matches = [
      // Player 1 as defender - loses
      createMatch('1', player2, player1, player3, player4, 5, 10),
      // Player 1 as defender - loses
      createMatch('2', player2, player1, player3, player4, 3, 10),
    ]

    const { result } = renderHook(() => usePositionStats('1', matches))

    expect(result.current.winRateAsDefender).toBe(0)
    expect(result.current.winsAsDefender).toBe(0)
    expect(result.current.lossesAsDefender).toBe(2)
  })
})
