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
      gamesAsWhite: 0,
      gamesAsBlack: 0,
      winsAsWhite: 0,
      winsAsBlack: 0,
      lossesAsWhite: 0,
      lossesAsBlack: 0,
      winRateAsWhite: 0,
      winRateAsBlack: 0,
      preferredColor: null,
    })
  })

  test('calculates stats when player only plays as white', () => {
    const matches = [
      // Player 1 is white (team1[0]) and wins
      createMatch('1', player1, player2, player3, player4, 10, 5),
      // Player 1 is white (team2[0]) and loses
      createMatch('2', player3, player4, player1, player2, 10, 8),
      // Player 1 is white (team1[0]) and wins
      createMatch('3', player1, player2, player3, player4, 10, 7),
    ]

    const { result } = renderHook(() => usePositionStats('1', matches))

    expect(result.current).toEqual({
      gamesAsWhite: 3,
      gamesAsBlack: 0,
      winsAsWhite: 2,
      winsAsBlack: 0,
      lossesAsWhite: 1,
      lossesAsBlack: 0,
      winRateAsWhite: 67,
      winRateAsBlack: 0,
      preferredColor: 'white',
    })
  })

  test('calculates stats when player only plays as black', () => {
    const matches = [
      // Player 1 is black (team1[1]) and wins
      createMatch('1', player2, player1, player3, player4, 10, 5),
      // Player 1 is black (team2[1]) and loses (team2 score 8 < team1 score 10)
      createMatch('2', player3, player4, player2, player1, 10, 8),
      // Player 1 is black (team1[1]) and loses
      createMatch('3', player2, player1, player3, player4, 5, 10),
    ]

    const { result } = renderHook(() => usePositionStats('1', matches))

    expect(result.current).toEqual({
      gamesAsWhite: 0,
      gamesAsBlack: 3,
      winsAsWhite: 0,
      winsAsBlack: 1, // Only first match is a win
      lossesAsWhite: 0,
      lossesAsBlack: 2, // Second and third matches are losses
      winRateAsWhite: 0,
      winRateAsBlack: 33, // 1/3 = 33.33 rounded to 33
      preferredColor: 'black',
    })
  })

  test('calculates mixed color stats', () => {
    const matches = [
      // Player 1 as white (team1[0]) - wins (10 > 5)
      createMatch('1', player1, player2, player3, player4, 10, 5),
      // Player 1 as black (team1[1]) - wins (10 > 3)
      createMatch('2', player2, player1, player3, player4, 10, 3),
      // Player 1 as white (team2[0]) - loses (team2 score 8 < team1 score 10)
      createMatch('3', player3, player4, player1, player2, 10, 8),
      // Player 1 as black (team2[1]) - loses (team2 score 7 < team1 score 10)
      createMatch('4', player3, player4, player2, player1, 10, 7),
      // Player 1 as white (team1[0]) - wins (10 > 6)
      createMatch('5', player1, player2, player3, player4, 10, 6),
    ]

    const { result } = renderHook(() => usePositionStats('1', matches))

    expect(result.current).toEqual({
      gamesAsWhite: 3,
      gamesAsBlack: 2,
      winsAsWhite: 2, // Matches 1 and 5 are wins
      winsAsBlack: 1, // Match 2 is a win
      lossesAsWhite: 1, // Match 3 is a loss
      lossesAsBlack: 1, // Match 4 is a loss
      winRateAsWhite: 67, // 2/3 = 66.67 rounded to 67
      winRateAsBlack: 50, // 1/2 = 50
      preferredColor: 'white', // More games as white
    })
  })

  test('determines preferred color when equal games but different win rates', () => {
    const matches = [
      // Player 1 as white - wins
      createMatch('1', player1, player2, player3, player4, 10, 5),
      // Player 1 as white - loses
      createMatch('2', player1, player2, player3, player4, 5, 10),
      // Player 1 as black - wins
      createMatch('3', player2, player1, player3, player4, 10, 3),
      // Player 1 as black - wins
      createMatch('4', player2, player1, player3, player4, 10, 4),
    ]

    const { result } = renderHook(() => usePositionStats('1', matches))

    expect(result.current.gamesAsWhite).toBe(2)
    expect(result.current.gamesAsBlack).toBe(2)
    expect(result.current.winRateAsWhite).toBe(50) // 1/2
    expect(result.current.winRateAsBlack).toBe(100) // 2/2
    expect(result.current.preferredColor).toBe('black') // Better win rate
  })

  test('defaults to white when everything is equal', () => {
    const matches = [
      // Player 1 as white - wins
      createMatch('1', player1, player2, player3, player4, 10, 5),
      // Player 1 as black - wins
      createMatch('2', player2, player1, player3, player4, 10, 3),
    ]

    const { result } = renderHook(() => usePositionStats('1', matches))

    expect(result.current.gamesAsWhite).toBe(1)
    expect(result.current.gamesAsBlack).toBe(1)
    expect(result.current.winRateAsWhite).toBe(100)
    expect(result.current.winRateAsBlack).toBe(100)
    expect(result.current.preferredColor).toBe('white') // Default when equal
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

    expect(result.current.gamesAsWhite).toBe(1)
    expect(result.current.gamesAsBlack).toBe(1)
    expect(result.current.winsAsWhite).toBe(1)
    expect(result.current.winsAsBlack).toBe(1)
  })

  test('handles perfect win rates correctly', () => {
    const matches = [
      // Player 1 as white - wins
      createMatch('1', player1, player2, player3, player4, 10, 5),
      // Player 1 as white - wins
      createMatch('2', player1, player2, player3, player4, 10, 3),
    ]

    const { result } = renderHook(() => usePositionStats('1', matches))

    expect(result.current.winRateAsWhite).toBe(100)
    expect(result.current.winRateAsBlack).toBe(0)
    expect(result.current.lossesAsWhite).toBe(0)
    expect(result.current.lossesAsBlack).toBe(0)
  })

  test('handles perfect loss rates correctly', () => {
    const matches = [
      // Player 1 as black - loses
      createMatch('1', player2, player1, player3, player4, 5, 10),
      // Player 1 as black - loses
      createMatch('2', player2, player1, player3, player4, 3, 10),
    ]

    const { result } = renderHook(() => usePositionStats('1', matches))

    expect(result.current.winRateAsBlack).toBe(0)
    expect(result.current.winsAsBlack).toBe(0)
    expect(result.current.lossesAsBlack).toBe(2)
  })
})
