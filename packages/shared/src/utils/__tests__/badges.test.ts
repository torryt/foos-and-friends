import { describe, expect, it } from 'vitest'
import {
  BADGE_MILESTONES,
  getCrossedMilestone,
  getEarnedBadges,
  getNextMilestone,
} from '../badges.ts'

describe('BADGE_MILESTONES', () => {
  it('is ascending', () => {
    const sorted = [...BADGE_MILESTONES].sort((a, b) => a - b)
    expect([...BADGE_MILESTONES]).toEqual(sorted)
  })
})

describe('getEarnedBadges', () => {
  it('returns no badges below the first milestone', () => {
    expect(getEarnedBadges(0)).toEqual([])
    expect(getEarnedBadges(49)).toEqual([])
  })

  it('includes a badge exactly at its threshold', () => {
    expect(getEarnedBadges(50)).toEqual([50])
    expect(getEarnedBadges(100)).toEqual([50, 100])
  })

  it('returns all badges at or past the final milestone', () => {
    expect(getEarnedBadges(1000)).toEqual([50, 100, 250, 500, 1000])
    expect(getEarnedBadges(1234)).toEqual([50, 100, 250, 500, 1000])
  })
})

describe('getNextMilestone', () => {
  it('targets the first milestone for new players', () => {
    expect(getNextMilestone(0)).toBe(50)
  })

  it('moves to the next milestone once one is reached', () => {
    expect(getNextMilestone(50)).toBe(100)
    expect(getNextMilestone(249)).toBe(250)
    expect(getNextMilestone(250)).toBe(500)
  })

  it('returns null when every badge is earned', () => {
    expect(getNextMilestone(1000)).toBeNull()
    expect(getNextMilestone(5000)).toBeNull()
  })
})

describe('getCrossedMilestone', () => {
  it('detects crossing a milestone by one game', () => {
    expect(getCrossedMilestone(49, 50)).toBe(50)
    expect(getCrossedMilestone(99, 100)).toBe(100)
    expect(getCrossedMilestone(999, 1000)).toBe(1000)
  })

  it('returns null when no milestone is crossed', () => {
    expect(getCrossedMilestone(48, 49)).toBeNull()
    expect(getCrossedMilestone(50, 51)).toBeNull()
    expect(getCrossedMilestone(1000, 1001)).toBeNull()
  })

  it('returns null when the count does not change', () => {
    expect(getCrossedMilestone(50, 50)).toBeNull()
  })

  it('returns the highest milestone when several are crossed at once', () => {
    expect(getCrossedMilestone(40, 120)).toBe(100)
  })
})
