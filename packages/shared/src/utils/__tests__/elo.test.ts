import { describe, expect, it } from 'vitest'
import type { Match, Player } from '../../types/index.ts'
import { calculateNewRanking, replayContinuousElo } from '../elo.ts'

const player = (id: string): Player =>
  ({
    id,
    name: id,
    avatar: '👤',
    department: 'Office',
    ranking: 1200,
    matchesPlayed: 0,
    wins: 0,
    losses: 0,
  }) as Player

const match2v2 = (
  id: string,
  team1: [string, string],
  team2: [string, string],
  score1: number,
  score2: number,
  createdAt: string,
): Match =>
  ({
    id,
    matchType: '2v2',
    team1: [player(team1[0]), player(team1[1])],
    team2: [player(team2[0]), player(team2[1])],
    score1,
    score2,
    date: createdAt.slice(0, 10),
    time: '12:00',
    createdAt,
  }) as Match

const match1v1 = (
  id: string,
  p1: string,
  p2: string,
  score1: number,
  score2: number,
  createdAt: string,
): Match =>
  ({
    id,
    matchType: '1v1',
    team1: [player(p1), null],
    team2: [player(p2), null],
    score1,
    score2,
    date: createdAt.slice(0, 10),
    time: '12:00',
    createdAt,
  }) as Match

describe('calculateNewRanking (season ELO)', () => {
  it('awards K/2 for a win between equals (K_WINNER=35)', () => {
    expect(calculateNewRanking(1200, 1200, 'win')).toBe(1218) // 1200 + 35*0.5, rounded
  })

  it('deducts K/2 for a loss between equals (K_LOSER=29)', () => {
    expect(calculateNewRanking(1200, 1200, 'loss')).toBe(1186) // 1200 - 29*0.5, rounded
  })

  it('leaves equals unchanged on a draw', () => {
    expect(calculateNewRanking(1200, 1200, 'draw')).toBe(1200)
  })

  it('clamps to the 800-2400 range', () => {
    expect(calculateNewRanking(2395, 2395, 'win')).toBe(2400) // +17.5 clamped
    expect(calculateNewRanking(805, 805, 'loss')).toBe(800) // -14.5 clamped
  })
})

describe('replayContinuousElo (all-time ELO)', () => {
  it('uses symmetric K=32: equal 1v1 opponents gain/lose 16', () => {
    const series = replayContinuousElo([match1v1('m1', 'a', 'b', 8, 5, '2026-01-01T10:00:00Z')])
    expect(series.get('a')).toEqual([{ matchId: 'm1', ranking: 1216 }])
    expect(series.get('b')).toEqual([{ matchId: 'm1', ranking: 1184 }])
  })

  it('scores a draw as half a win for both sides', () => {
    const series = replayContinuousElo([match1v1('m1', 'a', 'b', 3, 3, '2026-01-01T10:00:00Z')])
    expect(series.get('a')).toEqual([{ matchId: 'm1', ranking: 1200 }])
    expect(series.get('b')).toEqual([{ matchId: 'm1', ranking: 1200 }])
  })

  it('rates 2v2 players against the opposing team average, from pre-match values', () => {
    const series = replayContinuousElo([
      match2v2('m1', ['a', 'b'], ['c', 'd'], 8, 3, '2026-01-01T10:00:00Z'),
      match2v2('m2', ['a', 'c'], ['b', 'd'], 8, 3, '2026-01-02T10:00:00Z'),
    ])
    // m1: all at 1200, winners +16, losers -16
    expect(series.get('a')?.[0].ranking).toBe(1216)
    expect(series.get('d')?.[0].ranking).toBe(1184)
    // m2: a(1216)+c(1184) beat b(1216)+d(1184); both teams average 1200,
    // so a gains slightly less than 16 (expected > 0.5), c slightly more
    expect(series.get('a')?.[1].ranking).toBe(1216 + 15)
    expect(series.get('c')?.[1].ranking).toBe(1184 + 17)
    expect(series.get('b')?.[1].ranking).toBe(1216 - 17)
    expect(series.get('d')?.[1].ranking).toBe(1184 - 15)
  })

  it('does not clamp: chains can drift past the season 800/2400 bounds', () => {
    // b loses 100 straight 1v1s, each against a fresh 1200-rated opponent
    // (losses shrink as the gap grows, so it takes a while to sink below 800)
    const matches = Array.from({ length: 100 }, (_, i) =>
      match1v1(
        `m${i}`,
        `opp${i}`,
        'b',
        8,
        0,
        `2026-01-01T10:${String(i).padStart(2, '0')}:00Z`,
      ),
    )
    const series = replayContinuousElo(matches)
    const bFinal = series.get('b')?.at(-1)?.ranking ?? 1200
    expect(bFinal).toBeLessThan(800)
  })

  it('ignores season boundaries: the chain never resets to 1200', () => {
    const series = replayContinuousElo([
      { ...match1v1('m1', 'a', 'b', 8, 2, '2026-01-01T10:00:00Z'), seasonId: 's1' },
      { ...match1v1('m2', 'a', 'b', 8, 2, '2026-02-01T10:00:00Z'), seasonId: 's2' },
    ])
    const aPoints = series.get('a')
    expect(aPoints?.[1].ranking).toBeGreaterThan(aPoints?.[0].ranking ?? 0)
  })

  it('replays in createdAt order regardless of input order', () => {
    const m1 = match1v1('m1', 'a', 'b', 8, 2, '2026-01-01T10:00:00Z')
    const m2 = match1v1('m2', 'a', 'b', 2, 8, '2026-01-02T10:00:00Z')
    const forward = replayContinuousElo([m1, m2])
    const reversed = replayContinuousElo([m2, m1])
    expect(forward.get('a')).toEqual(reversed.get('a'))
    expect(forward.get('a')?.map((p) => p.matchId)).toEqual(['m1', 'm2'])
  })
})
