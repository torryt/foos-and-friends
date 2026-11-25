import { describe, expect, it } from 'vitest'
import type { Match, Player } from '../../types/index.ts'
import {
  DEFAULT_PLAYER_PICKER_PREFS,
  getPlayerActivity,
  isActivePlayer,
  sortAndFilterPlayers,
} from '../playerPicker.ts'

const NOW = Date.parse('2026-11-25T12:00:00Z')
const daysAgo = (d: number) => new Date(NOW - d * 24 * 60 * 60 * 1000).toISOString()

const player = (id: string, name: string, matchesPlayed = 0, ranking = 1200): Player => ({
  id,
  name,
  ranking,
  matchesPlayed,
  wins: 0,
  losses: 0,
  avatar: '🙂',
  department: '',
})

const match = (id: string, p1: Player, p2: Player, createdAt: string): Match => ({
  id,
  matchType: '1v1',
  team1: [p1, null],
  team2: [p2, null],
  score1: 10,
  score2: 5,
  date: createdAt.slice(0, 10),
  time: '12:00',
  createdAt,
})

const anna = player('a', 'Anna', 5, 1300)
const bob = player('b', 'bob', 20, 1100)
const cleo = player('c', 'Cleo', 12, 1500)
const dan = player('d', 'Dan', 0, 1200)
const all = [cleo, dan, bob, anna]

const matches = [
  match('m1', anna, bob, daysAgo(2)),
  match('m2', bob, cleo, daysAgo(45)),
  match('m3', anna, cleo, daysAgo(10)),
]

describe('getPlayerActivity', () => {
  it('records the latest match across all matches', () => {
    const activity = getPlayerActivity(matches)
    expect(activity.get('a')?.lastPlayedAt).toBe(Date.parse(daysAgo(2)))
    expect(activity.get('c')?.lastPlayedAt).toBe(Date.parse(daysAgo(10)))
    expect(activity.get('d')).toBeUndefined()
  })
})

describe('isActivePlayer', () => {
  it('is true within 30 days and false beyond or when never played', () => {
    expect(isActivePlayer({ lastPlayedAt: Date.parse(daysAgo(29)) }, NOW)).toBe(true)
    expect(isActivePlayer({ lastPlayedAt: Date.parse(daysAgo(31)) }, NOW)).toBe(false)
    expect(isActivePlayer(undefined, NOW)).toBe(false)
  })
})

describe('sortAndFilterPlayers', () => {
  const activity = getPlayerActivity(matches)
  const names = (ps: Player[]) => ps.map((p) => p.name)

  it('defaults to alphabetical (case-insensitive) with no filter', () => {
    expect(names(sortAndFilterPlayers(all, activity, DEFAULT_PLAYER_PICKER_PREFS, NOW))).toEqual([
      'Anna',
      'bob',
      'Cleo',
      'Dan',
    ])
  })

  it('uses Norwegian alphabet order: Æ, Ø, Å come after Z', () => {
    const list = [
      player('1', 'Åse'),
      player('2', 'Zoe'),
      player('3', 'Ola'),
      player('4', 'Øyvind'),
      player('5', 'Ægir'),
      player('6', 'Anna'),
    ]
    const out = sortAndFilterPlayers(list, new Map(), DEFAULT_PLAYER_PICKER_PREFS, NOW)
    expect(names(out)).toEqual(['Anna', 'Ola', 'Zoe', 'Ægir', 'Øyvind', 'Åse'])
  })

  it('sorts by recent activity, never-played last', () => {
    const out = sortAndFilterPlayers(all, activity, { sort: 'recent', activeOnly: false }, NOW)
    expect(names(out)).toEqual(['Anna', 'bob', 'Cleo', 'Dan'])
  })

  it('sorts by most games', () => {
    const out = sortAndFilterPlayers(all, activity, { sort: 'games', activeOnly: false }, NOW)
    expect(names(out)).toEqual(['bob', 'Cleo', 'Anna', 'Dan'])
  })

  it('sorts by rating', () => {
    const out = sortAndFilterPlayers(all, activity, { sort: 'rating', activeOnly: false }, NOW)
    expect(names(out)).toEqual(['Cleo', 'Anna', 'Dan', 'bob'])
  })

  it('active-only keeps players with a match in the last 30 days', () => {
    const out = sortAndFilterPlayers(all, activity, { sort: 'name', activeOnly: true }, NOW)
    // bob played 2 days ago (m1); Dan never played
    expect(names(out)).toEqual(['Anna', 'bob', 'Cleo'])
  })

  it('does not mutate the input', () => {
    const copy = [...all]
    sortAndFilterPlayers(all, activity, { sort: 'rating', activeOnly: true }, NOW)
    expect(all).toEqual(copy)
  })
})
