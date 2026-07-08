import { describe, expect, it } from 'vitest'
import { buildMockSeed } from '../mock-data.ts'

describe('buildMockSeed', () => {
  it('includes at least one player with more than 50 all-time games', () => {
    // The profile ranking-history chart switches to horizontal scrolling on
    // desktop past 50 games — the seed must let us exercise that path.
    const seed = buildMockSeed()
    const counts = new Map<string, number>()
    for (const match of seed.matches) {
      for (const player of [...match.team1, ...match.team2]) {
        if (player) counts.set(player.id, (counts.get(player.id) ?? 0) + 1)
      }
    }
    expect(Math.max(...counts.values())).toBeGreaterThan(50)
  })
})
