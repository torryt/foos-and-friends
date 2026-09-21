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

const TRANSIENT_RETRY_MS = 5_000

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
  // A transient fetch failure (network blip, 5xx) — as opposed to the group
  // genuinely not being publicly readable. Drives a retry; never flips the UI
  // to the private request-to-join card.
  const [transientError, setTransientError] = useState(false)

  const refresh = useCallback(async () => {
    const [dataResult, matchesResult] = await Promise.all([
      groupService.getPublicGroupData(groupId),
      groupService.getPublicMatches(groupId),
    ])

    if (!dataResult.data) {
      // Only a genuine 'not_found' means the group is private or nonexistent.
      // Any other error is transient — don't knock a working public page (e.g. a
      // TV on the 30s auto-refresh) over to the request-to-join card; keep the
      // last-good data and let the retry recover.
      if (dataResult.error === 'not_found') {
        setNotFound(true)
        setLoading(false)
      } else {
        setTransientError(true)
      }
      return
    }

    setGroup(dataResult.data.group)
    setSeasons(dataResult.data.seasons)
    setPlayers(dataResult.data.players)
    setTrophies(dataResult.data.trophies)
    setAllMatches(matchesResult.data)
    setNotFound(false)
    setTransientError(false)

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
    setTransientError(false)
    refresh()
  }, [refresh])

  // Recover from a transient failure. The child pages' auto-refresh only runs
  // once content mounts, so on a first-load blip (still showing the spinner)
  // recovery has to be driven from here.
  useEffect(() => {
    if (!transientError) return
    const timer = setTimeout(() => {
      setTransientError(false)
      refresh()
    }, TRANSIENT_RETRY_MS)
    return () => clearTimeout(timer)
  }, [transientError, refresh])

  // Load the leaderboard whenever the selected season changes
  useEffect(() => {
    if (!currentSeason) {
      setSeasonStats([])
      return
    }
    let stale = false
    groupService.getPublicSeasonStats(groupId, currentSeason.id).then((result) => {
      // Keep the last-good leaderboard on a transient failure (null data) rather
      // than blanking the TV to "No matches yet this season"; a real empty
      // season still comes back as data with an empty list.
      if (!stale && result.data) {
        setSeasonStats(result.data.overall)
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
