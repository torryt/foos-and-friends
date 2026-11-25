import type { Player } from '@foos/shared'
import { getPlayerActivity, sortAndFilterPlayers } from '@foos/shared'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useGroupContext } from '@/contexts/GroupContext'
import { matchesService } from '@/lib/init'
import { gameLogicKeys } from './useGameLogic'
import { usePlayerPickerPrefs } from './usePlayerPickerPrefs'

// Shared by every player list in the match-entry flows: applies the user's saved
// sort/filter preference and reports how many players the Active-only filter hides.
export const usePlayerPickerList = (players: Player[]) => {
  const { currentGroup } = useGroupContext()
  const { prefs, setPrefs } = usePlayerPickerPrefs()

  // Full match history (all seasons) drives "recently active"; shares the cache with the
  // all-time views. Only fetched when a setting actually needs it.
  const groupId = currentGroup?.id
  const needsActivity = prefs.sort === 'recent' || prefs.activeOnly
  const { data: allMatches, isLoading: activityLoading } = useQuery({
    queryKey: gameLogicKeys.allMatches(groupId ?? ''),
    queryFn: async () => {
      const result = await matchesService.getMatchesByGroup(groupId as string)
      if (result.error) throw new Error(result.error)
      return result.data
    },
    enabled: !!groupId && needsActivity,
    staleTime: 60_000,
  })

  const activity = useMemo(() => getPlayerActivity(allMatches ?? []), [allMatches])

  // While activity is still loading, show everyone rather than an empty list
  const activeOnly = prefs.activeOnly && !activityLoading
  const visiblePlayers = sortAndFilterPlayers(players, activity, { ...prefs, activeOnly })

  return {
    prefs,
    setPrefs,
    visiblePlayers,
    hiddenCount: players.length - visiblePlayers.length,
  }
}
