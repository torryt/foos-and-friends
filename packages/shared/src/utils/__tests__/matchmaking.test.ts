import { describe, expect, it } from 'vitest'
import type { Match, Player } from '../../types/index.ts'
import { findBestMatchup, findRareMatchup } from '../matchmaking.ts'

const makePlayer = (id: string, name: string, ranking = 1200): Player => ({
  id,
  name,
  ranking,
  matchesPlayed: 0,
  wins: 0,
  losses: 0,
  avatar: '',
  department: '',
})

describe('findRareMatchup', () => {
  it('does not always pick the same combination when every pairing is equally rare', () => {
    // Four players who have never played together: every team combination has
    // an identical rarity score of 0, so results should vary across calls
    // instead of always favoring the alphabetically-first combination.
    const players = [
      makePlayer('a', 'Alice'),
      makePlayer('b', 'Bob'),
      makePlayer('c', 'Charlie'),
      makePlayer('d', 'Diana'),
    ]
    const matches: Match[] = []

    const seenPairings = new Set<string>()
    for (let i = 0; i < 100; i++) {
      const result = findRareMatchup(players, matches)
      const pairing = [result.team1.attacker.id, result.team1.defender.id].sort().join(',')
      seenPairings.add(pairing)
    }

    expect(seenPairings.size).toBeGreaterThan(1)
  })

  it('still prefers the objectively rarest teammate pairing when one exists', () => {
    const players = [
      makePlayer('a', 'Alice'),
      makePlayer('b', 'Bob'),
      makePlayer('c', 'Charlie'),
      makePlayer('d', 'Diana'),
    ]

    // Alice+Bob and Charlie+Diana have played together many times;
    // Alice+Charlie / Bob+Diana and Alice+Diana / Bob+Charlie have not.
    const matches: Match[] = Array.from({ length: 5 }, (_, i) => ({
      id: `m${i}`,
      matchType: '2v2' as const,
      team1: [players[0], players[1]] as [Player, Player],
      team2: [players[2], players[3]] as [Player, Player],
      score1: 10,
      score2: 5,
      date: '2026-07-01',
      time: '18:00',
    }))

    for (let i = 0; i < 20; i++) {
      const result = findRareMatchup(players, matches)
      const team1Ids = [result.team1.attacker.id, result.team1.defender.id].sort()
      const team2Ids = [result.team2.attacker.id, result.team2.defender.id].sort()

      // The rare-teammate pairing should never reproduce the frequent pairing
      expect(team1Ids).not.toEqual(['a', 'b'])
      expect(team2Ids).not.toEqual(['c', 'd'])
    }
  })
})

describe('findBestMatchup', () => {
  it('does not always pick the same combination when multiple pairings are equally balanced', () => {
    // Four players with identical rankings: every pairing is equally balanced,
    // so the chosen teams should vary across calls rather than always being
    // the first combination generated.
    const players = [
      makePlayer('a', 'Alice', 1200),
      makePlayer('b', 'Bob', 1200),
      makePlayer('c', 'Charlie', 1200),
      makePlayer('d', 'Diana', 1200),
    ]

    const seenPairings = new Set<string>()
    for (let i = 0; i < 100; i++) {
      const result = findBestMatchup(players)
      const pairing = [result.team1.attacker.id, result.team1.defender.id].sort().join(',')
      seenPairings.add(pairing)
    }

    expect(seenPairings.size).toBeGreaterThan(1)
  })
})
