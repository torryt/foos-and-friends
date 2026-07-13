import type {
  Match,
  Player,
  PlayerSeasonStats,
  PublicGroupInfo,
  Season,
  SeasonTrophy,
} from '@foos/shared'
import type { ReactNode } from 'react'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { groupService } from '@/lib/init'

interface PublicGroupContextType {
  groupId: string
  group: PublicGroupInfo | null
  seasons: Season[]
  players: Player[]
  trophies: SeasonTrophy[]
  allMatches: Match[]
  currentSeason: Season | null
  seasonMatches: Match[]
  seasonStats: PlayerSeasonStats[]
  selectSeason: (seasonId: string) => void
  loading: boolean
  notFound: boolean
  refresh: () => Promise<void>
}

const PublicGroupContext = createContext<PublicGroupContextType | null>(null)

export const usePublicGroup = () => {
  const context = useContext(PublicGroupContext)
  if (!context) {
    throw new Error('usePublicGroup must be used within a PublicGroupProvider')
  }
  return context
}

interface PublicGroupProviderProps {
  groupId: string
  children: ReactNode
}

// Data provider for the read-only group pages shown to non-members (and
// logged-out visitors). Everything comes from the is_public-gated RPCs — no
// auth, GroupContext, or SeasonContext here. notFound means the group is not
// publicly readable (private or nonexistent).
export const PublicGroupProvider = ({ groupId, children }: PublicGroupProviderProps) => {
  const [group, setGroup] = useState<PublicGroupInfo | null>(null)
  const [seasons, setSeasons] = useState<Season[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [trophies, setTrophies] = useState<SeasonTrophy[]>([])
  const [allMatches, setAllMatches] = useState<Match[]>([])
  const [currentSeason, setCurrentSeason] = useState<Season | null>(null)
  const [seasonStats, setSeasonStats] = useState<PlayerSeasonStats[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const refresh = useCallback(async () => {
    const [dataResult, matchesResult] = await Promise.all([
      groupService.getPublicGroupData(groupId),
      groupService.getPublicMatches(groupId),
    ])

    if (!dataResult.data) {
      setNotFound(true)
      setLoading(false)
      return
    }

    setGroup(dataResult.data.group)
    setSeasons(dataResult.data.seasons)
    setPlayers(dataResult.data.players)
    setTrophies(dataResult.data.trophies)
    setAllMatches(matchesResult.data)
    setNotFound(false)

    // Keep the selected season if it still exists; default to the active one
    setCurrentSeason((prev) => {
      const stillExists = prev && dataResult.data?.seasons.find((s) => s.id === prev.id)
      if (stillExists) return stillExists
      const active = dataResult.data?.seasons.find((s) => s.isActive)
      return active ?? dataResult.data?.seasons[0] ?? null
    })

    setLoading(false)
  }, [groupId])

  useEffect(() => {
    setLoading(true)
    setNotFound(false)
    refresh()
  }, [refresh])

  // Load the leaderboard whenever the selected season changes
  useEffect(() => {
    if (!currentSeason) {
      setSeasonStats([])
      return
    }
    let stale = false
    groupService.getPublicSeasonStats(groupId, currentSeason.id).then((result) => {
      if (!stale) {
        setSeasonStats(result.data?.overall ?? [])
      }
    })
    return () => {
      stale = true
    }
  }, [groupId, currentSeason])

  const selectSeason = useCallback(
    (seasonId: string) => {
      setCurrentSeason((prev) => seasons.find((s) => s.id === seasonId) ?? prev)
    },
    [seasons],
  )

  const seasonMatches = currentSeason
    ? allMatches.filter((m) => m.seasonId === currentSeason.id)
    : []

  return (
    <PublicGroupContext.Provider
      value={{
        groupId,
        group,
        seasons,
        players,
        trophies,
        allMatches,
        currentSeason,
        seasonMatches,
        seasonStats,
        selectSeason,
        loading,
        notFound,
        refresh,
      }}
    >
      {children}
    </PublicGroupContext.Provider>
  )
}
