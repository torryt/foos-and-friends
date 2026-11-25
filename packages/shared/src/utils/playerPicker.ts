import type { Match, Player, PlayerPickerPreferences } from '../types/index.ts'

export const ACTIVE_WINDOW_DAYS = 30

// Norwegian collation (Æ Ø Å after Z) regardless of the viewer's browser locale
const NAME_COLLATION_LOCALE = 'nb'

export const DEFAULT_PLAYER_PICKER_PREFS: PlayerPickerPreferences = {
  sort: 'name',
  activeOnly: false,
}

const DAY_MS = 24 * 60 * 60 * 1000

export interface PlayerActivity {
  // Epoch ms of the player's most recent match (undefined = never played)
  lastPlayedAt?: number
}

const matchTime = (match: Match): number => {
  const t = Date.parse(match.createdAt ?? `${match.date}T${match.time || '00:00'}`)
  return Number.isNaN(t) ? 0 : t
}

// Latest match time per player across the given matches (any season).
export const getPlayerActivity = (matches: Match[]): Map<string, PlayerActivity> => {
  const activity = new Map<string, PlayerActivity>()
  for (const match of matches) {
    const t = matchTime(match)
    for (const player of [...match.team1, ...match.team2]) {
      if (!player) continue
      const prev = activity.get(player.id)?.lastPlayedAt
      if (prev === undefined || t > prev) activity.set(player.id, { lastPlayedAt: t })
    }
  }
  return activity
}

export const isActivePlayer = (
  activity: PlayerActivity | undefined,
  now: number = Date.now(),
): boolean =>
  activity?.lastPlayedAt !== undefined && now - activity.lastPlayedAt <= ACTIVE_WINDOW_DAYS * DAY_MS

// Applies the picker's filter + sort. Ties always fall back to name so the order is stable.
export const sortAndFilterPlayers = (
  players: Player[],
  activity: Map<string, PlayerActivity>,
  prefs: PlayerPickerPreferences,
  now: number = Date.now(),
): Player[] => {
  const byName = (a: Player, b: Player) =>
    a.name.localeCompare(b.name, NAME_COLLATION_LOCALE, { sensitivity: 'base' })
  const last = (p: Player) => activity.get(p.id)?.lastPlayedAt ?? -1

  const visible = prefs.activeOnly
    ? players.filter((p) => isActivePlayer(activity.get(p.id), now))
    : players

  return [...visible].sort((a, b) => {
    switch (prefs.sort) {
      case 'recent':
        return last(b) - last(a) || byName(a, b)
      case 'games':
        return b.matchesPlayed - a.matchesPlayed || byName(a, b)
      case 'rating':
        return b.ranking - a.ranking || byName(a, b)
      default:
        return byName(a, b)
    }
  })
}
