import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Match, Player } from '@/types'
import { useRelationshipStats } from '../useRelationshipStats'

const mockPlayers: Player[] = [
  {
    id: 'player1',
    name: 'Alice',
    avatar: '👩',
    ranking: 1200,
    matchesPlayed: 0,
    wins: 0,
    losses: 0,
    department: 'Engineering',
    createdAt: '2024-01-01',
    groupId: 'group1',
  },
  {
    id: 'player2',
    name: 'Bob',
    avatar: '👨',
    ranking: 1300,
    matchesPlayed: 0,
    wins: 0,
    losses: 0,
    department: 'Engineering',
    createdAt: '2024-01-01',
    groupId: 'group1',
  },
  {
    id: 'player3',
    name: 'Charlie',
    avatar: '👦',
    ranking: 1100,
    matchesPlayed: 0,
    wins: 0,
    losses: 0,
    department: 'Engineering',
    createdAt: '2024-01-01',
    groupId: 'group1',
  },
  {
    id: 'player4',
    name: 'Diana',
    avatar: '👧',
    ranking: 1400,
    matchesPlayed: 0,
    wins: 0,
    losses: 0,
    department: 'Engineering',
    createdAt: '2024-01-01',
    groupId: 'group1',
  },
]

const createMatch = (
  id: string,
  team1: [Player, Player],
  team2: [Player, Player],
  score1: number,
  score2: number,
): Match => ({
  id,
  team1,
  team2,
  score1,
  score2,
  date: new Date().toISOString().split('T')[0],
  time: '12:00',
  createdAt: new Date().toISOString(),
  groupId: 'group1',
})

describe('useRelationshipStats', () => {
  it('should return empty arrays when no matches include the player', () => {
    const matches: Match[] = [
      createMatch(
        'match1',
        [mockPlayers[1], mockPlayers[2]],
        [mockPlayers[3], mockPlayers[0]],
        5,
        3,
      ),
    ]

    const { result } = renderHook(() =>
      useRelationshipStats('nonexistent-player', matches, mockPlayers),
    )

    expect(result.current.teammates).toEqual([])
    expect(result.current.opponents).toEqual([])
    expect(result.current.topTeammate).toBeNull()
    expect(result.current.worstTeammate).toBeNull()
    expect(result.current.biggestRival).toBeNull()
    expect(result.current.easiestOpponent).toBeNull()
  })

  it('should calculate teammate stats correctly', () => {
    const matches: Match[] = [
      // Alice + Bob vs Charlie + Diana (Alice team wins)
      createMatch(
        'match1',
        [mockPlayers[0], mockPlayers[1]],
        [mockPlayers[2], mockPlayers[3]],
        5,
        3,
      ),
      // Alice + Bob vs Charlie + Diana (Alice team loses)
      createMatch(
        'match2',
        [mockPlayers[0], mockPlayers[1]],
        [mockPlayers[2], mockPlayers[3]],
        2,
        5,
      ),
      // Alice + Charlie vs Bob + Diana (Alice team wins)
      createMatch(
        'match3',
        [mockPlayers[0], mockPlayers[2]],
        [mockPlayers[1], mockPlayers[3]],
        5,
        4,
      ),
    ]

    const { result } = renderHook(() => useRelationshipStats('player1', matches, mockPlayers))

    const teammates = result.current.teammates
    expect(teammates).toHaveLength(2)

    // Bob should be teammate with 2 games, 1 win, 1 loss
    const bobStats = teammates.find((t) => t.playerId === 'player2')
    expect(bobStats).toBeDefined()
    expect(bobStats?.gamesPlayed).toBe(2)
    expect(bobStats?.wins).toBe(1)
    expect(bobStats?.losses).toBe(1)
    expect(bobStats?.winRate).toBe(50)

    // Charlie should be teammate with 1 game, 1 win, 0 losses
    const charlieStats = teammates.find((t) => t.playerId === 'player3')
    expect(charlieStats).toBeDefined()
    expect(charlieStats?.gamesPlayed).toBe(1)
    expect(charlieStats?.wins).toBe(1)
    expect(charlieStats?.losses).toBe(0)
    expect(charlieStats?.winRate).toBe(100)
  })

  it('should calculate opponent stats correctly', () => {
    const matches: Match[] = [
      // Alice + Bob vs Charlie + Diana (Alice team wins)
      createMatch(
        'match1',
        [mockPlayers[0], mockPlayers[1]],
        [mockPlayers[2], mockPlayers[3]],
        5,
        3,
      ),
      // Alice + Bob vs Charlie + Diana (Alice team loses)
      createMatch(
        'match2',
        [mockPlayers[0], mockPlayers[1]],
        [mockPlayers[2], mockPlayers[3]],
        2,
        5,
      ),
      // Alice + Charlie vs Bob + Diana (Alice team wins)
      createMatch(
        'match3',
        [mockPlayers[0], mockPlayers[2]],
        [mockPlayers[1], mockPlayers[3]],
        5,
        4,
      ),
    ]

    const { result } = renderHook(() => useRelationshipStats('player1', matches, mockPlayers))

    const opponents = result.current.opponents
    expect(opponents).toHaveLength(3)

    // Charlie should be opponent with 2 games, 1 win, 1 loss
    const charlieStats = opponents.find((o) => o.playerId === 'player3')
    expect(charlieStats).toBeDefined()
    expect(charlieStats?.gamesPlayed).toBe(2)
    expect(charlieStats?.wins).toBe(1)
    expect(charlieStats?.losses).toBe(1)
    expect(charlieStats?.winRate).toBe(50)

    // Diana should be opponent with 3 games
    const dianaStats = opponents.find((o) => o.playerId === 'player4')
    expect(dianaStats).toBeDefined()
    expect(dianaStats?.gamesPlayed).toBe(3)

    // Bob should be opponent with 1 game
    const bobStats = opponents.find((o) => o.playerId === 'player2')
    expect(bobStats).toBeDefined()
    expect(bobStats?.gamesPlayed).toBe(1)
  })

  it('should calculate goal difference correctly', () => {
    const matches: Match[] = [
      // Alice + Bob vs Charlie + Diana: 5-3 (Alice gets +2 goal diff)
      createMatch(
        'match1',
        [mockPlayers[0], mockPlayers[1]],
        [mockPlayers[2], mockPlayers[3]],
        5,
        3,
      ),
      // Alice + Bob vs Charlie + Diana: 2-5 (Alice gets -3 goal diff)
      createMatch(
        'match2',
        [mockPlayers[0], mockPlayers[1]],
        [mockPlayers[2], mockPlayers[3]],
        2,
        5,
      ),
    ]

    const { result } = renderHook(() => useRelationshipStats('player1', matches, mockPlayers))

    const bobTeammate = result.current.teammates.find((t) => t.playerId === 'player2')
    expect(bobTeammate?.goalDifference).toBe(-1) // +2 - 3 = -1

    const charlieOpponent = result.current.opponents.find((o) => o.playerId === 'player3')
    expect(charlieOpponent?.goalDifference).toBe(-1) // +2 - 3 = -1
  })

  it('should calculate recent form correctly', () => {
    const matches: Match[] = [
      createMatch(
        'match1',
        [mockPlayers[0], mockPlayers[1]],
        [mockPlayers[2], mockPlayers[3]],
        5,
        3,
      ), // W
      createMatch(
        'match2',
        [mockPlayers[0], mockPlayers[1]],
        [mockPlayers[2], mockPlayers[3]],
        2,
        5,
      ), // L
      createMatch(
        'match3',
        [mockPlayers[0], mockPlayers[1]],
        [mockPlayers[2], mockPlayers[3]],
        5,
        2,
      ), // W
    ]

    const { result } = renderHook(() => useRelationshipStats('player1', matches, mockPlayers))

    const bobTeammate = result.current.teammates.find((t) => t.playerId === 'player2')
    expect(bobTeammate?.recentForm).toEqual(['W', 'L', 'W'])
  })

  it('should limit recent form to last 5 games', () => {
    const matches: Match[] = [
      createMatch(
        'match1',
        [mockPlayers[0], mockPlayers[1]],
        [mockPlayers[2], mockPlayers[3]],
        5,
        3,
      ), // W
      createMatch(
        'match2',
        [mockPlayers[0], mockPlayers[1]],
        [mockPlayers[2], mockPlayers[3]],
        2,
        5,
      ), // L
      createMatch(
        'match3',
        [mockPlayers[0], mockPlayers[1]],
        [mockPlayers[2], mockPlayers[3]],
        5,
        2,
      ), // W
      createMatch(
        'match4',
        [mockPlayers[0], mockPlayers[1]],
        [mockPlayers[2], mockPlayers[3]],
        1,
        5,
      ), // L
      createMatch(
        'match5',
        [mockPlayers[0], mockPlayers[1]],
        [mockPlayers[2], mockPlayers[3]],
        5,
        1,
      ), // W
      createMatch(
        'match6',
        [mockPlayers[0], mockPlayers[1]],
        [mockPlayers[2], mockPlayers[3]],
        2,
        5,
      ), // L
      createMatch(
        'match7',
        [mockPlayers[0], mockPlayers[1]],
        [mockPlayers[2], mockPlayers[3]],
        5,
        0,
      ), // W
    ]

    const { result } = renderHook(() => useRelationshipStats('player1', matches, mockPlayers))

    const bobTeammate = result.current.teammates.find((t) => t.playerId === 'player2')
    expect(bobTeammate?.recentForm).toHaveLength(5)
    expect(bobTeammate?.recentForm).toEqual(['W', 'L', 'W', 'L', 'W'])
  })

  it('should identify top teammate correctly', () => {
    const matches: Match[] = [
      // Alice + Bob: 2 wins, 1 loss (66% win rate)
      createMatch(
        'match1',
        [mockPlayers[0], mockPlayers[1]],
        [mockPlayers[2], mockPlayers[3]],
        5,
        3,
      ),
      createMatch(
        'match2',
        [mockPlayers[0], mockPlayers[1]],
        [mockPlayers[2], mockPlayers[3]],
        2,
        5,
      ),
      createMatch(
        'match3',
        [mockPlayers[0], mockPlayers[1]],
        [mockPlayers[2], mockPlayers[3]],
        5,
        2,
      ),
      // Alice + Charlie: 3 wins, 0 losses (100% win rate)
      createMatch(
        'match4',
        [mockPlayers[0], mockPlayers[2]],
        [mockPlayers[1], mockPlayers[3]],
        5,
        4,
      ),
      createMatch(
        'match5',
        [mockPlayers[0], mockPlayers[2]],
        [mockPlayers[1], mockPlayers[3]],
        5,
        3,
      ),
      createMatch(
        'match6',
        [mockPlayers[0], mockPlayers[2]],
        [mockPlayers[1], mockPlayers[3]],
        5,
        1,
      ),
    ]

    const { result } = renderHook(() => useRelationshipStats('player1', matches, mockPlayers))

    expect(result.current.topTeammate?.playerId).toBe('player3') // Charlie has 100% win rate
    expect(result.current.topTeammate?.winRate).toBe(100)
  })

  it('should identify worst teammate correctly', () => {
    const matches: Match[] = [
      // Alice + Bob: 2 wins, 1 loss (66% win rate)
      createMatch(
        'match1',
        [mockPlayers[0], mockPlayers[1]],
        [mockPlayers[2], mockPlayers[3]],
        5,
        3,
      ),
      createMatch(
        'match2',
        [mockPlayers[0], mockPlayers[1]],
        [mockPlayers[2], mockPlayers[3]],
        2,
        5,
      ),
      createMatch(
        'match3',
        [mockPlayers[0], mockPlayers[1]],
        [mockPlayers[2], mockPlayers[3]],
        5,
        2,
      ),
      // Alice + Charlie: 1 win, 2 losses (33% win rate)
      createMatch(
        'match4',
        [mockPlayers[0], mockPlayers[2]],
        [mockPlayers[1], mockPlayers[3]],
        5,
        4,
      ),
      createMatch(
        'match5',
        [mockPlayers[0], mockPlayers[2]],
        [mockPlayers[1], mockPlayers[3]],
        2,
        5,
      ),
      createMatch(
        'match6',
        [mockPlayers[0], mockPlayers[2]],
        [mockPlayers[1], mockPlayers[3]],
        1,
        5,
      ),
    ]

    const { result } = renderHook(() => useRelationshipStats('player1', matches, mockPlayers))

    expect(result.current.worstTeammate?.playerId).toBe('player3') // Charlie has 33% win rate
    expect(result.current.worstTeammate?.winRate).toBe(33)
  })

  it('should identify biggest rival correctly', () => {
    const matches: Match[] = [
      // Alice vs Charlie: 5 games (Charlie and Diana are opponents in these matches)
      createMatch(
        'match1',
        [mockPlayers[0], mockPlayers[1]],
        [mockPlayers[2], mockPlayers[3]],
        5,
        3,
      ),
      createMatch(
        'match2',
        [mockPlayers[0], mockPlayers[1]],
        [mockPlayers[2], mockPlayers[3]],
        2,
        5,
      ),
      createMatch(
        'match3',
        [mockPlayers[0], mockPlayers[1]],
        [mockPlayers[2], mockPlayers[3]],
        5,
        2,
      ),
      createMatch(
        'match4',
        [mockPlayers[0], mockPlayers[1]],
        [mockPlayers[2], mockPlayers[3]],
        1,
        5,
      ),
      createMatch(
        'match5',
        [mockPlayers[0], mockPlayers[1]],
        [mockPlayers[2], mockPlayers[3]],
        5,
        1,
      ),
      // Alice vs Bob: 3 games (Bob and Diana are opponents in these matches)
      createMatch(
        'match6',
        [mockPlayers[0], mockPlayers[2]],
        [mockPlayers[1], mockPlayers[3]],
        5,
        4,
      ),
      createMatch(
        'match7',
        [mockPlayers[0], mockPlayers[2]],
        [mockPlayers[1], mockPlayers[3]],
        2,
        5,
      ),
      createMatch(
        'match8',
        [mockPlayers[0], mockPlayers[2]],
        [mockPlayers[1], mockPlayers[3]],
        5,
        3,
      ),
    ]

    const { result } = renderHook(() => useRelationshipStats('player1', matches, mockPlayers))

    // Diana (player4) appears as opponent in all 8 matches, making her the biggest rival
    expect(result.current.biggestRival?.playerId).toBe('player4') // Diana with 8 games
    expect(result.current.biggestRival?.gamesPlayed).toBe(8)
  })

  it('should identify easiest opponent correctly', () => {
    const matches: Match[] = [
      // Alice vs Charlie: 3 wins, 0 losses (100% win rate)
      createMatch(
        'match1',
        [mockPlayers[0], mockPlayers[1]],
        [mockPlayers[2], mockPlayers[3]],
        5,
        3,
      ),
      createMatch(
        'match2',
        [mockPlayers[0], mockPlayers[1]],
        [mockPlayers[2], mockPlayers[3]],
        5,
        2,
      ),
      createMatch(
        'match3',
        [mockPlayers[0], mockPlayers[1]],
        [mockPlayers[2], mockPlayers[3]],
        5,
        1,
      ),
      // Alice vs Bob: 2 wins, 1 loss (66% win rate)
      createMatch(
        'match4',
        [mockPlayers[0], mockPlayers[2]],
        [mockPlayers[1], mockPlayers[3]],
        5,
        4,
      ),
      createMatch(
        'match5',
        [mockPlayers[0], mockPlayers[2]],
        [mockPlayers[1], mockPlayers[3]],
        2,
        5,
      ),
      createMatch(
        'match6',
        [mockPlayers[0], mockPlayers[2]],
        [mockPlayers[1], mockPlayers[3]],
        5,
        3,
      ),
    ]

    const { result } = renderHook(() => useRelationshipStats('player1', matches, mockPlayers))

    expect(result.current.easiestOpponent?.playerId).toBe('player3') // Charlie with 100% win rate
    expect(result.current.easiestOpponent?.winRate).toBe(100)
  })

  it('should require minimum 3 games for notable relationships', () => {
    const matches: Match[] = [
      // Only 2 games with Bob (below minimum)
      createMatch(
        'match1',
        [mockPlayers[0], mockPlayers[1]],
        [mockPlayers[2], mockPlayers[3]],
        5,
        3,
      ),
      createMatch(
        'match2',
        [mockPlayers[0], mockPlayers[1]],
        [mockPlayers[2], mockPlayers[3]],
        5,
        2,
      ),
    ]

    const { result } = renderHook(() => useRelationshipStats('player1', matches, mockPlayers))

    // Should have stats but no notable relationships due to minimum game requirement
    expect(result.current.teammates).toHaveLength(1)
    expect(result.current.opponents).toHaveLength(2)
    expect(result.current.topTeammate).toBeNull()
    expect(result.current.worstTeammate).toBeNull()
    expect(result.current.biggestRival).toBeNull()
    expect(result.current.easiestOpponent).toBeNull()
  })

  it('should sort teammates and opponents by games played descending', () => {
    const matches: Match[] = [
      // Alice + Bob: 1 game
      createMatch(
        'match1',
        [mockPlayers[0], mockPlayers[1]],
        [mockPlayers[2], mockPlayers[3]],
        5,
        3,
      ),
      // Alice + Charlie: 2 games
      createMatch(
        'match2',
        [mockPlayers[0], mockPlayers[2]],
        [mockPlayers[1], mockPlayers[3]],
        5,
        4,
      ),
      createMatch(
        'match3',
        [mockPlayers[0], mockPlayers[2]],
        [mockPlayers[1], mockPlayers[3]],
        2,
        5,
      ),
    ]

    const { result } = renderHook(() => useRelationshipStats('player1', matches, mockPlayers))

    // Charlie should be first (2 games), Bob second (1 game)
    expect(result.current.teammates[0].playerId).toBe('player3') // Charlie
    expect(result.current.teammates[0].gamesPlayed).toBe(2)
    expect(result.current.teammates[1].playerId).toBe('player2') // Bob
    expect(result.current.teammates[1].gamesPlayed).toBe(1)

    // Diana should be first (3 games - appears in all matches), Bob second (2 games), Charlie third (1 game)
    expect(result.current.opponents[0].playerId).toBe('player4') // Diana
    expect(result.current.opponents[0].gamesPlayed).toBe(3)
    expect(result.current.opponents[1].playerId).toBe('player2') // Bob
    expect(result.current.opponents[1].gamesPlayed).toBe(2)
    expect(result.current.opponents[2].playerId).toBe('player3') // Charlie
    expect(result.current.opponents[2].gamesPlayed).toBe(1)
  })
})
