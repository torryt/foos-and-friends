import type { Match, MatchType, Player, PlayerSeasonStats } from '@foos/shared'
import { getRandomAvatar } from '@foos/shared'
import { useEffect, useState } from 'react'
import { useGroupContext } from '@/contexts/GroupContext'
import { useSeasonContext } from '@/contexts/SeasonContext'
import { matchesService, playerSeasonStatsService, playersService } from '@/lib/init'
import { useAuth } from './useAuth'

export const useGameLogic = () => {
  const [players, setPlayers] = useState<Player[]>([])
  const [seasonStats, setSeasonStats] = useState<PlayerSeasonStats[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { currentGroup } = useGroupContext()
  const { currentSeason } = useSeasonContext()
  const { user } = useAuth()

  // Determine which match types the current group supports
  const supportedMatchTypes: MatchType[] = currentGroup?.supportedMatchTypes || ['2v2']

  // Load data when group or season changes
  useEffect(() => {
    if (!currentGroup || !currentSeason || !user) {
      setPlayers([])
      setMatches([])
      return
    }

    const loadGroupData = async () => {
      setLoading(true)
      setError(null)

      try {
        // Load players, season stats, and matches for the current group and season
        const [playersResult, seasonStatsResult, matchesResult] = await Promise.all([
          playersService.getPlayersByGroup(currentGroup.id),
          playerSeasonStatsService.getSeasonLeaderboard(currentSeason.id),
          matchesService.getMatchesBySeason(currentSeason.id),
        ])

        if (playersResult.error) {
          setError(`Failed to load players: ${playersResult.error}`)
          setPlayers([])
        } else {
          setPlayers(playersResult.data)
        }

        if (seasonStatsResult.error) {
          setError(`Failed to load season stats: ${seasonStatsResult.error}`)
          setSeasonStats([])
        } else {
          setSeasonStats(seasonStatsResult.data)
        }

        if (matchesResult.error) {
          setError(`Failed to load matches: ${matchesResult.error}`)
          setMatches([])
        } else {
          setMatches(matchesResult.data)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load group data')
        setPlayers([])
        setSeasonStats([])
        setMatches([])
      } finally {
        setLoading(false)
      }
    }

    loadGroupData()
  }, [currentGroup, currentSeason, user])

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
        // Update local state
        const newPlayer = result.data
        setPlayers((prev) => [...prev, newPlayer])
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
        // Update local state - add new match and refresh players and season stats
        const newMatch = result.data
        setMatches((prev) => [newMatch, ...prev])

        // Refresh players and season stats to get updated data
        const [playersResult, seasonStatsResult] = await Promise.all([
          playersService.getPlayersByGroup(currentGroup.id),
          playerSeasonStatsService.getSeasonLeaderboard(currentSeason.id),
        ])

        if (playersResult.data) {
          setPlayers(playersResult.data)
        }

        if (seasonStatsResult.data) {
          setSeasonStats(seasonStatsResult.data)
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
        // Update local state
        setPlayers((prev) =>
          prev.map((player) => (player.id === playerId && result.data ? result.data : player)),
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

      // Update local state
      setPlayers((prev) => prev.filter((player) => player.id !== playerId))

      return { success: true }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to delete player',
      }
    }
  }

  return {
    players,
    seasonStats,
    matches,
    supportedMatchTypes,
    loading,
    error,
    addPlayer,
    addMatch,
    updatePlayer,
    deletePlayer,
  }
}
