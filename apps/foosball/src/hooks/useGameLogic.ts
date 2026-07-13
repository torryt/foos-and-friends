import type { Match, MatchType, Player, PlayerSeasonStats } from '@foos/shared'
import { getCrossedMilestone, getRandomAvatar } from '@foos/shared'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import type { ReachedMilestone } from '@/components/MilestoneCelebration'
import { useGroupContext } from '@/contexts/GroupContext'
import { useSeasonContext } from '@/contexts/SeasonContext'
import { matchesService, playerSeasonStatsService, playersService } from '@/lib/init'
import { useAuth } from './useAuth'

// Query keys for the group-scoped data. Shared with mutations below so cache
// updates and invalidations always hit the same entries.
export const gameLogicKeys = {
  players: (groupId: string) => ['players', groupId] as const,
  seasonLeaderboard: (seasonId: string) => ['seasonLeaderboard', seasonId] as const,
  seasonMatches: (seasonId: string) => ['seasonMatches', seasonId] as const,
  allMatches: (groupId: string) => ['allMatches', groupId] as const,
}

interface UseGameLogicOptions {
  // The full cross-season match history is only fetched where a view actually
  // needs it (all-time rankings/history). Everything else runs on season data.
  includeAllMatches?: boolean
}

export const useGameLogic = (options: UseGameLogicOptions = {}) => {
  const { includeAllMatches = false } = options
  const queryClient = useQueryClient()
  // Queue of games-played milestones reached by the latest match (usually 0–1 entries)
  const [reachedMilestones, setReachedMilestones] = useState<ReachedMilestone[]>([])

  const { currentGroup } = useGroupContext()
  const { currentSeason } = useSeasonContext()
  const { user } = useAuth()

  const groupId = currentGroup?.id
  const seasonId = currentSeason?.id
  const groupReady = !!groupId && !!user
  const seasonReady = groupReady && !!seasonId

  // Determine which match types the current group supports
  const supportedMatchTypes: MatchType[] = currentGroup?.supportedMatchTypes || ['2v2']

  const playersQuery = useQuery({
    queryKey: gameLogicKeys.players(groupId ?? ''),
    queryFn: async () => {
      const result = await playersService.getPlayersByGroup(groupId as string)
      if (result.error) throw new Error(result.error)
      return result.data
    },
    enabled: groupReady,
    staleTime: 60_000,
  })

  const seasonStatsQuery = useQuery({
    queryKey: gameLogicKeys.seasonLeaderboard(seasonId ?? ''),
    queryFn: async () => {
      const result = await playerSeasonStatsService.getSeasonLeaderboard(seasonId as string)
      if (result.error) throw new Error(result.error)
      return result.data
    },
    enabled: seasonReady,
    staleTime: 60_000,
  })

  const matchesQuery = useQuery({
    queryKey: gameLogicKeys.seasonMatches(seasonId ?? ''),
    queryFn: async () => {
      const result = await matchesService.getMatchesBySeason(seasonId as string)
      if (result.error) throw new Error(result.error)
      return result.data
    },
    enabled: seasonReady,
    staleTime: 60_000,
  })

  const allMatchesQuery = useQuery({
    queryKey: gameLogicKeys.allMatches(groupId ?? ''),
    queryFn: async () => {
      const result = await matchesService.getMatchesByGroup(groupId as string)
      if (result.error) throw new Error(result.error)
      return result.data
    },
    enabled: groupReady && includeAllMatches,
    staleTime: 60_000,
  })

  const players: Player[] = playersQuery.data ?? []
  const seasonStats: PlayerSeasonStats[] = seasonStatsQuery.data ?? []
  const matches: Match[] = matchesQuery.data ?? []
  const allMatches: Match[] = allMatchesQuery.data ?? []

  const loading =
    playersQuery.isLoading ||
    seasonStatsQuery.isLoading ||
    matchesQuery.isLoading ||
    allMatchesQuery.isLoading

  const error =
    (playersQuery.error && `Failed to load players: ${playersQuery.error.message}`) ||
    (seasonStatsQuery.error && `Failed to load season stats: ${seasonStatsQuery.error.message}`) ||
    (matchesQuery.error && `Failed to load matches: ${matchesQuery.error.message}`) ||
    (allMatchesQuery.error && `Failed to load match history: ${allMatchesQuery.error.message}`) ||
    null

  // Force a reload of everything for the current group (e.g. the auto-refreshing TV page)
  const refresh = useCallback(() => {
    if (groupId) {
      queryClient.invalidateQueries({ queryKey: gameLogicKeys.players(groupId) })
      queryClient.invalidateQueries({ queryKey: gameLogicKeys.allMatches(groupId) })
    }
    if (seasonId) {
      queryClient.invalidateQueries({ queryKey: gameLogicKeys.seasonLeaderboard(seasonId) })
      queryClient.invalidateQueries({ queryKey: gameLogicKeys.seasonMatches(seasonId) })
    }
  }, [queryClient, groupId, seasonId])

  const addPlayer = async (
    name: string,
    avatar?: string,
  ): Promise<{ success: boolean; error?: string }> => {
    if (!currentGroup || !user) {
      return { success: false, error: 'No group selected or user not authenticated' }
    }

    const selectedAvatar = avatar || getRandomAvatar()

    try {
      const result = await playersService.addPlayer(
        currentGroup.id,
        name.trim(),
        selectedAvatar,
        'Office',
        user.id,
      )

      if (result.error) {
        return { success: false, error: result.error }
      }

      if (result.data) {
        const newPlayer = result.data
        queryClient.setQueryData<Player[]>(gameLogicKeys.players(currentGroup.id), (prev) =>
          prev ? [...prev, newPlayer] : prev,
        )
      }

      return { success: true }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to add player' }
    }
  }

  const addMatch = async (
    matchType: MatchType,
    team1Player1Id: string,
    team1Player2Id: string | null,
    team2Player1Id: string,
    team2Player2Id: string | null,
    score1: string,
    score2: string,
  ): Promise<{ success: boolean; error?: string }> => {
    if (!currentGroup || !currentSeason || !user) {
      return { success: false, error: 'No group or season selected, or user not authenticated' }
    }

    try {
      const result = await matchesService.addMatch(
        currentGroup.id,
        currentSeason.id,
        matchType,
        team1Player1Id,
        team1Player2Id,
        team2Player1Id,
        team2Player2Id,
        parseInt(score1, 10),
        parseInt(score2, 10),
        user.id,
      )

      if (result.error) {
        return { success: false, error: result.error }
      }

      if (result.data) {
        // Prepend the new match to whatever match caches exist; untouched
        // caches stay unset and load fresh when their query is next enabled
        const newMatch = result.data
        queryClient.setQueryData<Match[]>(gameLogicKeys.seasonMatches(currentSeason.id), (prev) =>
          prev ? [newMatch, ...prev] : prev,
        )
        queryClient.setQueryData<Match[]>(gameLogicKeys.allMatches(currentGroup.id), (prev) =>
          prev ? [newMatch, ...prev] : prev,
        )

        // Refresh players and season stats to get updated data
        const [playersResult, seasonStatsResult] = await Promise.all([
          playersService.getPlayersByGroup(currentGroup.id),
          playerSeasonStatsService.getSeasonLeaderboard(currentSeason.id),
        ])

        if (playersResult.data) {
          // Celebrate any participant whose career games count crossed a badge milestone
          const participantIds = [
            team1Player1Id,
            team1Player2Id,
            team2Player1Id,
            team2Player2Id,
          ].filter((id): id is string => id !== null)

          const reached: ReachedMilestone[] = []
          for (const participantId of participantIds) {
            const before = players.find((p) => p.id === participantId)?.matchesPlayed ?? 0
            const updated = playersResult.data.find((p) => p.id === participantId)
            const milestone = updated ? getCrossedMilestone(before, updated.matchesPlayed) : null
            if (updated && milestone) {
              reached.push({ player: updated, milestone })
            }
          }
          if (reached.length > 0) {
            setReachedMilestones((prev) => [...prev, ...reached])
          }

          queryClient.setQueryData(gameLogicKeys.players(currentGroup.id), playersResult.data)
        }

        if (seasonStatsResult.data) {
          queryClient.setQueryData(
            gameLogicKeys.seasonLeaderboard(currentSeason.id),
            seasonStatsResult.data,
          )
        }
      }

      return { success: true }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to add match',
      }
    }
  }

  const updatePlayer = async (
    playerId: string,
    updates: { name?: string; avatar?: string },
  ): Promise<{ success: boolean; error?: string }> => {
    if (!currentGroup || !user) {
      return { success: false, error: 'No group selected or user not authenticated' }
    }

    try {
      const result = await playersService.updatePlayerProfile(playerId, updates)

      if (result.error) {
        return { success: false, error: result.error }
      }

      if (result.data) {
        queryClient.setQueryData<Player[]>(gameLogicKeys.players(currentGroup.id), (prev) =>
          prev?.map((player) => (player.id === playerId && result.data ? result.data : player)),
        )
      }

      return { success: true }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to update player',
      }
    }
  }

  const deletePlayer = async (playerId: string): Promise<{ success: boolean; error?: string }> => {
    if (!currentGroup || !user) {
      return { success: false, error: 'No group selected or user not authenticated' }
    }

    try {
      const result = await playersService.deletePlayer(playerId)

      if (result.error) {
        return { success: false, error: result.error }
      }

      queryClient.setQueryData<Player[]>(gameLogicKeys.players(currentGroup.id), (prev) =>
        prev?.filter((player) => player.id !== playerId),
      )

      return { success: true }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to delete player',
      }
    }
  }

  // Show one celebration at a time; dismissing advances the queue
  const currentMilestone = reachedMilestones[0] ?? null
  const dismissMilestone = useCallback(() => {
    setReachedMilestones((prev) => prev.slice(1))
  }, [])

  return {
    players,
    seasonStats,
    matches,
    allMatches,
    allMatchesLoading: allMatchesQuery.isLoading,
    supportedMatchTypes,
    loading,
    error,
    refresh,
    addPlayer,
    addMatch,
    updatePlayer,
    deletePlayer,
    currentMilestone,
    dismissMilestone,
  }
}
