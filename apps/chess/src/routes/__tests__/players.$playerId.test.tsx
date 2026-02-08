import type { Match, Player } from '@foos/shared'
import { describe, expect, test } from 'vitest'

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
  createdAtOffset: number = 0,
): Match => {
  const baseDate = new Date('2024-01-01T12:00:00Z')
  const createdAt = new Date(baseDate.getTime() + createdAtOffset * 60000) // Add minutes
  return {
    id,
    team1: [team1Player1, team1Player2],
    team2: [team2Player1, team2Player2],
    score1,
    score2,
    date: createdAt.toISOString().split('T')[0],
    time: '12:00',
    createdAt: createdAt.toISOString(),
    groupId: 'group1',
  }
}

// Function to calculate recent form (extracted logic from players.$playerId.tsx)
const calculateRecentForm = (playerId: string, matches: Match[]) => {
  const playerMatches = matches
    .filter((match) => {
      return (
        match.team1[0].id === playerId ||
        match.team1[1].id === playerId ||
        match.team2[0].id === playerId ||
        match.team2[1].id === playerId
      )
    })
    .sort((a, b) => {
      // Sort by createdAt in ascending order (oldest first)
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return timeA - timeB
    })

  // Recent form (last 5 matches)
  const recentMatches = playerMatches.slice(-5)
  const recentForm = recentMatches.map((match) => {
    const wasInTeam1 = match.team1[0].id === playerId || match.team1[1].id === playerId
    const won = wasInTeam1 ? match.score1 > match.score2 : match.score2 > match.score1
    return won ? 'W' : 'L'
  })

  return recentForm
}

describe('PlayerProfile - Recent Form', () => {
  const player1 = createPlayer('player1', 'Test Player')
  const player2 = createPlayer('player2', 'Partner 1')
  const player3 = createPlayer('player3', 'Opponent 1')
  const player4 = createPlayer('player4', 'Opponent 2')

  test('calculates recent form correctly with chronological matches', () => {
    const matches = [
      createMatch('match1', player1, player2, player3, player4, 10, 5, 0), // Win at t=0
      createMatch('match2', player1, player2, player3, player4, 3, 10, 10), // Loss at t=10
      createMatch('match3', player1, player2, player3, player4, 10, 8, 20), // Win at t=20
      createMatch('match4', player1, player2, player3, player4, 10, 7, 30), // Win at t=30
      createMatch('match5', player1, player2, player3, player4, 5, 10, 40), // Loss at t=40
    ]

    const recentForm = calculateRecentForm('player1', matches)

    // Should show last 5 games in order: W, L, W, W, L
    expect(recentForm).toEqual(['W', 'L', 'W', 'W', 'L'])
  })

  test('calculates recent form correctly with non-chronological input order', () => {
    // This is the key test for the bug fix - matches provided in random order
    const matches = [
      createMatch('match3', player1, player2, player3, player4, 10, 8, 20), // Win at t=20
      createMatch('match1', player1, player2, player3, player4, 10, 5, 0), // Win at t=0
      createMatch('match5', player1, player2, player3, player4, 5, 10, 40), // Loss at t=40
      createMatch('match4', player1, player2, player3, player4, 10, 7, 30), // Win at t=30
      createMatch('match2', player1, player2, player3, player4, 3, 10, 10), // Loss at t=10
    ]

    const recentForm = calculateRecentForm('player1', matches)

    // Should still show chronologically correct order: W, L, W, W, L
    // NOT the order they were provided: W, W, L, W, L
    expect(recentForm).toEqual(['W', 'L', 'W', 'W', 'L'])
  })

  test('shows only last 5 matches when player has more than 5 matches', () => {
    const matches = [
      createMatch('match1', player1, player2, player3, player4, 10, 5, 0), // Win at t=0
      createMatch('match2', player1, player2, player3, player4, 10, 5, 10), // Win at t=10
      createMatch('match3', player1, player2, player3, player4, 10, 5, 20), // Win at t=20
      createMatch('match4', player1, player2, player3, player4, 3, 10, 30), // Loss at t=30
      createMatch('match5', player1, player2, player3, player4, 10, 5, 40), // Win at t=40
      createMatch('match6', player1, player2, player3, player4, 3, 10, 50), // Loss at t=50
      createMatch('match7', player1, player2, player3, player4, 10, 5, 60), // Win at t=60
    ]

    const recentForm = calculateRecentForm('player1', matches)

    // Should show only last 5: W (t=20), L (t=30), W (t=40), L (t=50), W (t=60)
    expect(recentForm).toEqual(['W', 'L', 'W', 'L', 'W'])
    expect(recentForm.length).toBe(5)
  })

  test('shows all matches when player has fewer than 5 matches', () => {
    const matches = [
      createMatch('match1', player1, player2, player3, player4, 10, 5, 0), // Win
      createMatch('match2', player1, player2, player3, player4, 3, 10, 10), // Loss
      createMatch('match3', player1, player2, player3, player4, 10, 8, 20), // Win
    ]

    const recentForm = calculateRecentForm('player1', matches)

    expect(recentForm).toEqual(['W', 'L', 'W'])
    expect(recentForm.length).toBe(3)
  })

  test('handles empty match list', () => {
    const recentForm = calculateRecentForm('player1', [])

    expect(recentForm).toEqual([])
  })
})
