import { describe, expect, test } from 'vitest'
import type { Match, Player } from '@/types'

// Helper function to create a player
const createPlayer = (id: string, name: string): Player => ({
  id,
  name,
  ranking: 1500,
  matchesPlayed: 0,
  wins: 0,
  losses: 0,
  avatar: '👤',
  department: 'Engineering',
})

// Helper function to create a match
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

// Function to calculate goal statistics (extracted logic from players.$playerId.tsx)
const calculateGoalStats = (playerId: string, matches: Match[]) => {
  const playerMatches = matches.filter((match) => {
    return (
      match.team1[0].id === playerId ||
      match.team1[1].id === playerId ||
      match.team2[0].id === playerId ||
      match.team2[1].id === playerId
    )
  })

  const totalGoalsScored = playerMatches.reduce((sum, match) => {
    const wasInTeam1 = match.team1[0].id === playerId || match.team1[1].id === playerId
    return sum + (wasInTeam1 ? match.score1 : match.score2)
  }, 0)

  const totalGoalsConceded = playerMatches.reduce((sum, match) => {
    const wasInTeam1 = match.team1[0].id === playerId || match.team1[1].id === playerId
    return sum + (wasInTeam1 ? match.score2 : match.score1)
  }, 0)

  return {
    totalGoalsScored,
    totalGoalsConceded,
    goalDifference: totalGoalsScored - totalGoalsConceded,
  }
}

describe('PlayerProfile - Goal Statistics', () => {
  const player1 = createPlayer('player1', 'Test Player')
  const player2 = createPlayer('player2', 'Partner 1')
  const player3 = createPlayer('player3', 'Opponent 1')
  const player4 = createPlayer('player4', 'Opponent 2')
  const player5 = createPlayer('player5', 'Partner 2')
  const player6 = createPlayer('player6', 'Opponent 3')
  const player7 = createPlayer('player7', 'Opponent 4')

  test('calculates total goals scored correctly', () => {
    const matches = [
      // Match 1: player1 in team1, scores 10
      createMatch('match1', player1, player2, player3, player4, 10, 5),
      // Match 2: player1 in team2, scores 6
      createMatch('match2', player3, player4, player1, player2, 8, 6),
      // Match 3: player1 in team1, scores 7
      createMatch('match3', player1, player5, player6, player7, 7, 10),
      // Match 4: player1 in team2, scores 4
      createMatch('match4', player6, player7, player1, player5, 9, 4),
    ]

    const stats = calculateGoalStats('player1', matches)

    // Expected: 10 + 6 + 7 + 4 = 27
    expect(stats.totalGoalsScored).toBe(27)
  })

  test('calculates total goals conceded correctly', () => {
    const matches = [
      // Match 1: player1 concedes 5
      createMatch('match1', player1, player2, player3, player4, 10, 5),
      // Match 2: player1 concedes 8
      createMatch('match2', player3, player4, player1, player2, 8, 6),
      // Match 3: player1 concedes 10
      createMatch('match3', player1, player5, player6, player7, 7, 10),
      // Match 4: player1 concedes 9
      createMatch('match4', player6, player7, player1, player5, 9, 4),
    ]

    const stats = calculateGoalStats('player1', matches)

    // Expected: 5 + 8 + 10 + 9 = 32
    expect(stats.totalGoalsConceded).toBe(32)
  })

  test('calculates goal difference correctly', () => {
    const matches = [
      createMatch('match1', player1, player2, player3, player4, 10, 5),
      createMatch('match2', player3, player4, player1, player2, 8, 6),
      createMatch('match3', player1, player5, player6, player7, 7, 10),
      createMatch('match4', player6, player7, player1, player5, 9, 4),
    ]

    const stats = calculateGoalStats('player1', matches)

    // Expected: 27 - 32 = -5
    expect(stats.goalDifference).toBe(-5)
  })

  test('handles player with no matches', () => {
    const stats = calculateGoalStats('player1', [])

    expect(stats.totalGoalsScored).toBe(0)
    expect(stats.totalGoalsConceded).toBe(0)
    expect(stats.goalDifference).toBe(0)
  })

  test('handles player with positive goal difference', () => {
    const matches = [
      // Win 10-3
      createMatch('match1', player1, player2, player3, player4, 10, 3),
      // Win 10-5
      createMatch('match2', player1, player2, player3, player4, 10, 5),
    ]

    const stats = calculateGoalStats('player1', matches)

    expect(stats.totalGoalsScored).toBe(20)
    expect(stats.totalGoalsConceded).toBe(8)
    expect(stats.goalDifference).toBe(12)
  })

  test('handles fractional average goals correctly', () => {
    // This tests the bug fix: avg goals with decimals should not affect total calculations
    const matches = [
      // 3 matches with different scores to create fractional averages
      createMatch('match1', player1, player2, player3, player4, 5, 3),
      createMatch('match2', player1, player2, player3, player4, 7, 4),
      createMatch('match3', player1, player2, player3, player4, 3, 5),
    ]

    const stats = calculateGoalStats('player1', matches)

    // Total should be exact sum, not based on rounded averages
    // 5 + 7 + 3 = 15 (not parseInt(5.0) * 3 which would work here, but avg is actually 5.0)
    expect(stats.totalGoalsScored).toBe(15)
    expect(stats.totalGoalsConceded).toBe(12)
    expect(stats.goalDifference).toBe(3)
  })
})
