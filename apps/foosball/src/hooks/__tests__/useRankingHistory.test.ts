import type { Match, Player } from '@foos/shared'
import { renderHook } from '@testing-library/react'
import { useContinuousRankingHistory, useRankingHistory } from '../useRankingHistory'

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

const player1 = createPlayer('1', 'Alice')
const player2 = createPlayer('2', 'Bob')
const player3 = createPlayer('3', 'Charlie')
const players = [player1, player2, player3]

// Newest-first, matching the source order used elsewhere in the app.
const matches: Match[] = [
  {
    id: 'm3',
    team1: [player1, null],
    team2: [player3, null],
    score1: 10,
    score2: 8,
    date: '2024-01-03',
    time: '10:00',
    createdAt: '2024-01-03T10:00:00Z',
    playerStats: [
      { playerId: '1', preGameRanking: 1250, postGameRanking: 1265 },
      { playerId: '3', preGameRanking: 1500, postGameRanking: 1485 },
    ],
  },
  {
    id: 'm2',
    team1: [player2, null],
    team2: [player1, null],
    score1: 5,
    score2: 10,
    date: '2024-01-02',
    time: '10:00',
    createdAt: '2024-01-02T10:00:00Z',
    playerStats: [
      { playerId: '2', preGameRanking: 1200, postGameRanking: 1185 },
      { playerId: '1', preGameRanking: 1200, postGameRanking: 1250 },
    ],
  },
  {
    id: 'm1',
    team1: [player1, null],
    team2: [player2, null],
    score1: 3,
    score2: 10,
    date: '2024-01-01',
    time: '10:00',
    createdAt: '2024-01-01T10:00:00Z',
    playerStats: [
      { playerId: '1', preGameRanking: 1210, postGameRanking: 1200 },
      { playerId: '2', preGameRanking: 1200, postGameRanking: 1210 },
    ],
  },
] as unknown as Match[]

describe('useRankingHistory', () => {
  test('builds chronological (oldest first) history per player', () => {
    const { result } = renderHook(() => useRankingHistory(['1', '2', '3'], matches, players))

    const alice = result.current.find((h) => h.playerId === '1')
    expect(alice?.data.map((d) => d.matchId)).toEqual(['m1', 'm2', 'm3'])
    expect(alice?.data.map((d) => d.ranking)).toEqual([1200, 1250, 1265])
    expect(alice?.data.map((d) => d.result)).toEqual(['loss', 'win', 'win'])

    const bob = result.current.find((h) => h.playerId === '2')
    expect(bob?.data.map((d) => d.matchId)).toEqual(['m1', 'm2'])

    const charlie = result.current.find((h) => h.playerId === '3')
    expect(charlie?.data.map((d) => d.matchId)).toEqual(['m3'])
  })

  test('skips unknown player ids', () => {
    const { result } = renderHook(() => useRankingHistory(['missing'], matches, players))
    expect(result.current).toEqual([])
  })

  test('supports a single playerId (non-array) argument', () => {
    const { result } = renderHook(() => useRankingHistory('1', matches, players))
    expect(result.current).toHaveLength(1)
    expect(result.current[0].playerId).toBe('1')
  })
})

describe('useContinuousRankingHistory', () => {
  test('returns one continuous chain per player, unaffected by season resets', () => {
    const { result } = renderHook(() =>
      useContinuousRankingHistory(['1', '2', '3'], matches, players),
    )

    const alice = result.current.find((h) => h.playerId === '1')
    expect(alice?.data.map((d) => d.matchId)).toEqual(['m1', 'm2', 'm3'])
  })
})
