import { useEffect, useState } from 'react'
import { useGroupContext } from '@/contexts/GroupContext'
import { matchesService } from '@/services/matchesService'
import { playersService } from '@/services/playersService'
import type { Match, Player } from '@/types'
import { useAuth } from './useAuth'

export const useGameLogic = () => {
  const [players, setPlayers] = useState<Player[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { currentGroup } = useGroupContext()
  const { user } = useAuth()

  // Load data when group changes
  useEffect(() => {
    if (!currentGroup || !user) {
      setPlayers([])
      setMatches([])
      return
    }

    const loadGroupData = async () => {
      setLoading(true)
      setError(null)

      try {
        // Load players and matches for the current group
        const [playersResult, matchesResult] = await Promise.all([
          playersService.getPlayersByGroup(currentGroup.id),
          matchesService.getMatchesByGroup(currentGroup.id),
        ])

        if (playersResult.error) {
          setError(`Failed to load players: ${playersResult.error}`)
          setPlayers([])
        } else {
          setPlayers(playersResult.data)
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
        setMatches([])
      } finally {
        setLoading(false)
      }
    }

    loadGroupData()
  }, [currentGroup, user])

  const addPlayer = async (
    name: string,
    avatar?: string,
  ): Promise<{ success: boolean; error?: string }> => {
    if (!currentGroup || !user) {
      return { success: false, error: 'No group selected or user not authenticated' }
    }

    const defaultAvatars = ['👨‍💻', '👩‍🎨', '🧔', '👩‍💼', '👨‍🔬', '👩‍🚀', '👨‍🎓', '👩‍⚕️']
    const selectedAvatar =
      avatar || defaultAvatars[Math.floor(Math.random() * defaultAvatars.length)]

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
        setPlayers((prev) => [...prev, result.data!])
      }

      return { success: true }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to add player' }
    }
  }

  const recordMatch = async (
    team1Player1Id: string,
    team1Player2Id: string,
    team2Player1Id: string,
    team2Player2Id: string,
    score1: string,
    score2: string,
  ): Promise<{ success: boolean; error?: string }> => {
    if (!currentGroup || !user) {
      return { success: false, error: 'No group selected or user not authenticated' }
    }

    try {
      const result = await matchesService.recordMatch(
        currentGroup.id,
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
        // Update local state - add new match and refresh players
        setMatches((prev) => [result.data!, ...prev])

        // Refresh players to get updated stats
        const playersResult = await playersService.getPlayersByGroup(currentGroup.id)
        if (playersResult.data) {
          setPlayers(playersResult.data)
        }
      }

      return { success: true }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to record match',
      }
    }
  }

  return {
    players,
    matches,
    loading,
    error,
    addPlayer,
    recordMatch,
  }
}
