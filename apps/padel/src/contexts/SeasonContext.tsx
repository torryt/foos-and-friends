import type { Season } from '@foos/shared'
import type { ReactNode } from 'react'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { seasonsService } from '@/lib/init'
import { useGroupContext } from './GroupContext'

interface SeasonContextType {
  currentSeason: Season | null
  seasons: Season[]
  loading: boolean
  error: string | null
  switchSeason: (seasonId: string) => void
  refreshSeasons: () => Promise<void>
  endSeasonAndCreateNew: (
    newSeasonName: string,
    newSeasonDescription?: string,
  ) => Promise<{ success: boolean; error?: string }>
}

const SeasonContext = createContext<SeasonContextType | null>(null)

export const useSeasonContext = () => {
  const context = useContext(SeasonContext)
  if (!context) {
    throw new Error('useSeasonContext must be used within a SeasonProvider')
  }
  return context
}

interface SeasonProviderProps {
  children: ReactNode
}

// Helper functions for localStorage season persistence (per group)
const getStorageKey = (groupId: string) => `selectedSeasonId_${groupId}`

const getStoredSeasonId = (groupId: string): string | null => {
  try {
    return localStorage.getItem(getStorageKey(groupId))
  } catch {
    return null
  }
}

const setStoredSeasonId = (groupId: string, seasonId: string) => {
  try {
    localStorage.setItem(getStorageKey(groupId), seasonId)
  } catch {
    // Ignore localStorage errors (e.g., private browsing)
  }
}

const removeStoredSeasonId = (groupId: string) => {
  try {
    localStorage.removeItem(getStorageKey(groupId))
  } catch {
    // Ignore localStorage errors
  }
}

export const SeasonProvider = ({ children }: SeasonProviderProps) => {
  const { currentGroup } = useGroupContext()
  const [currentSeason, setCurrentSeason] = useState<Season | null>(null)
  const [seasons, setSeasons] = useState<Season[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load seasons for the current group
  const refreshSeasons = useCallback(async () => {
    if (!currentGroup) {
      setSeasons([])
      setCurrentSeason(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await seasonsService.getSeasonsByGroup(currentGroup.id)

      if (result.error) {
        setError(result.error)
        setSeasons([])
        setCurrentSeason(null)
      } else {
        setSeasons(result.data)

        // Always select a season from the fetched data.
        // This ensures we pick a valid season for the current group,
        // even if a previous group's season was still set.
        if (result.data.length > 0) {
          // Try to restore the previously selected season
          const storedSeasonId = getStoredSeasonId(currentGroup.id)
          if (storedSeasonId) {
            const storedSeason = result.data.find((s) => s.id === storedSeasonId)
            if (storedSeason) {
              setCurrentSeason(storedSeason)
            } else {
              // Stored season no longer exists, clean up localStorage
              removeStoredSeasonId(currentGroup.id)
              // Try to find the active season
              const activeSeason = result.data.find((s) => s.isActive)
              setCurrentSeason(activeSeason || result.data[0])
            }
          } else {
            // Try to find the active season
            const activeSeason = result.data.find((s) => s.isActive)
            setCurrentSeason(activeSeason || result.data[0])
          }
        } else {
          setCurrentSeason(null)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load seasons')
      setSeasons([])
      setCurrentSeason(null)
    } finally {
      setLoading(false)
    }
  }, [currentGroup])

  // Switch to a different season
  const switchSeason = useCallback(
    (seasonId: string) => {
      const season = seasons.find((s) => s.id === seasonId)
      if (season && currentGroup) {
        setCurrentSeason(season)
        // Save the selected season to localStorage
        setStoredSeasonId(currentGroup.id, seasonId)
      }
    },
    [seasons, currentGroup],
  )

  // End current season and create a new one
  const endSeasonAndCreateNew = async (newSeasonName: string, newSeasonDescription?: string) => {
    if (!currentGroup) {
      return { success: false, error: 'No group selected' }
    }

    setError(null)

    try {
      const result = await seasonsService.endSeasonAndCreateNew(
        currentGroup.id,
        newSeasonName,
        newSeasonDescription,
      )

      if (result.success && result.newSeasonId) {
        // Refresh seasons to get the updated list
        await refreshSeasons()

        // Switch to the new season
        if (result.newSeasonId) {
          const newSeason = seasons.find((s) => s.id === result.newSeasonId)
          if (newSeason) {
            switchSeason(result.newSeasonId)
          }
        }

        return { success: true }
      } else {
        setError(result.error || 'Failed to create new season')
        return { success: false, error: result.error }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create new season'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  // Load seasons when group changes
  useEffect(() => {
    if (currentGroup) {
      // Immediately clear stale season state from previous group
      // before async fetch begins, preventing cross-group data bleed
      setCurrentSeason(null)
      setSeasons([])
      setError(null)
      refreshSeasons()
    } else {
      // Clear state when no group is selected
      setSeasons([])
      setCurrentSeason(null)
      setError(null)
    }
  }, [currentGroup, refreshSeasons])

  return (
    <SeasonContext.Provider
      value={{
        currentSeason,
        seasons,
        loading,
        error,
        switchSeason,
        refreshSeasons,
        endSeasonAndCreateNew,
      }}
    >
      {children}
    </SeasonContext.Provider>
  )
}
