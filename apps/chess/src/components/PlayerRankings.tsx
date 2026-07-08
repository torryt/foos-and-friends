import type { Player, PlayerSeasonStats } from '@foos/shared'
import { ArrowUpDown, ChevronDown, Medal, Trophy } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

type SortOption = 'elo' | 'winRate'

interface PlayerRankingsProps {
  players: Player[]
  seasonStats?: PlayerSeasonStats[]
  onPlayerClick?: (playerId: string) => void
  title?: string
  subtitle?: string
}

interface PlayerWithStats extends Player {
  winRate: number
}

interface PlayerCardProps {
  player: PlayerWithStats
  index: number
  sortBy: SortOption
}

const PlayerCard = ({ player, index, sortBy }: PlayerCardProps) => (
  <>
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        {index === 0 && <Trophy className="text-yellow-500" size={16} />}
        {index === 1 && <Medal className="text-gray-400" size={14} />}
        {index === 2 && <Medal className="text-amber-600" size={14} />}
        <span className="font-bold text-primary text-sm w-6">{index + 1}</span>
      </div>
      <span className="text-2xl">{player.avatar}</span>
      <div>
        <div className="font-semibold text-primary text-sm">{player.name}</div>
        <div className="text-xs text-muted">
          {player.wins}W - {player.losses}L ({player.matchesPlayed} total)
        </div>
      </div>
    </div>
    <div className="text-right">
      {sortBy === 'elo' && (
        <>
          <span
            className={`px-2 py-1 rounded-full text-xs font-bold ${
              player.ranking >= 1800
                ? 'bg-gradient-to-r from-purple-100 to-violet-200 text-purple-800'
                : player.ranking >= 1600
                  ? 'bg-gradient-to-r from-emerald-100 to-green-200 text-emerald-800'
                  : player.ranking >= 1400
                    ? 'bg-gradient-to-r from-blue-100 to-cyan-200 text-blue-800'
                    : player.ranking >= 1200
                      ? 'bg-gradient-to-r from-amber-100 to-yellow-200 text-amber-800'
                      : 'bg-gradient-to-r from-rose-100 to-pink-200 text-rose-800'
            }`}
          >
            {player.ranking}
          </span>
          <div className="text-xs text-secondary mt-1">
            {player.matchesPlayed > 0
              ? `${Math.round((player.wins / player.matchesPlayed) * 100)}% win rate`
              : 'No matches'}
          </div>
        </>
      )}
      {sortBy === 'winRate' && (
        <>
          <span
            className={`px-2 py-1 rounded-full text-xs font-bold ${
              player.winRate >= 70
                ? 'bg-gradient-to-r from-purple-100 to-violet-200 text-purple-800'
                : player.winRate >= 60
                  ? 'bg-gradient-to-r from-emerald-100 to-green-200 text-emerald-800'
                  : player.winRate >= 50
                    ? 'bg-gradient-to-r from-blue-100 to-cyan-200 text-blue-800'
                    : player.winRate >= 40
                      ? 'bg-gradient-to-r from-amber-100 to-yellow-200 text-amber-800'
                      : 'bg-gradient-to-r from-rose-100 to-pink-200 text-rose-800'
            }`}
          >
            {player.winRate}%
          </span>
          <div className="text-xs text-secondary mt-1">Win rate</div>
        </>
      )}
    </div>
  </>
)

const SORT_OPTIONS = [
  { value: 'elo' as const, label: 'ELO Ranking' },
  { value: 'winRate' as const, label: 'Win Rate' },
]

const PlayerRankings = ({
  players,
  seasonStats,
  onPlayerClick,
  title = 'Friend Rankings',
  subtitle = 'See how you stack up against your friends!',
}: PlayerRankingsProps) => {
  const [sortBy, setSortBy] = useState<SortOption>('elo')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [showInactive, setShowInactive] = useState(false)

  // Load saved preference from localStorage
  useEffect(() => {
    const savedSort = localStorage.getItem('rankingSortPreference') as SortOption
    if (savedSort && SORT_OPTIONS.some((opt) => opt.value === savedSort)) {
      setSortBy(savedSort)
    }
  }, [])

  // Save preference to localStorage
  useEffect(() => {
    localStorage.setItem('rankingSortPreference', sortBy)
  }, [sortBy])

  // Calculate additional stats for each player.
  // When seasonStats is provided we are in season scope: players without a
  // stat row simply haven't played this season yet, so they show the 1200
  // baseline — not their all-time numbers. Without seasonStats (all-time
  // scope) global player stats are used.
  const playersWithStats = useMemo(() => {
    const seasonScope = seasonStats !== undefined
    return players.map((player) => {
      // Find season-specific stats for this player
      const seasonStat = seasonStats?.find((stat) => stat.playerId === player.id)

      const ranking = seasonScope ? (seasonStat?.ranking ?? 1200) : player.ranking
      const wins = seasonScope ? (seasonStat?.wins ?? 0) : player.wins
      const losses = seasonScope ? (seasonStat?.losses ?? 0) : player.losses
      const matchesPlayed = seasonScope ? (seasonStat?.matchesPlayed ?? 0) : player.matchesPlayed

      const winRate = matchesPlayed > 0 ? Math.round((wins / matchesPlayed) * 100) : 0

      return {
        ...player,
        ranking,
        wins,
        losses,
        matchesPlayed,
        winRate,
      }
    })
  }, [players, seasonStats])

  // Sort players based on selected criteria
  const sortedPlayers = useMemo(() => {
    const sorted = [...playersWithStats]

    switch (sortBy) {
      case 'elo':
        return sorted.toSorted((a, b) => b.ranking - a.ranking)
      case 'winRate':
        return sorted.toSorted((a, b) => {
          // Sort by win rate first, then by matches played, then by ELO
          if (b.winRate !== a.winRate) {
            return b.winRate - a.winRate
          }
          if (b.matchesPlayed !== a.matchesPlayed) {
            return b.matchesPlayed - a.matchesPlayed
          }
          return b.ranking - a.ranking
        })
      default:
        return sorted
    }
  }, [playersWithStats, sortBy])

  // Players with no games in the current scope are hidden by default; a
  // footer button reveals them below the active list.
  const activePlayers = sortedPlayers.filter((player) => player.matchesPlayed > 0)
  const inactivePlayers = sortedPlayers.filter((player) => player.matchesPlayed === 0)
  const visiblePlayers = showInactive ? [...activePlayers, ...inactivePlayers] : activePlayers

  return (
    <div className="bg-card backdrop-blur-sm rounded-[var(--th-radius-lg)] shadow-theme-card border border-[var(--th-border-subtle)]">
      <div className="p-4 border-b border-[var(--th-border)]">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-primary flex items-center gap-2">
              <Trophy className="text-[var(--th-sport-primary)]" />
              {title}
            </h2>
            <p className="text-sm text-secondary">{subtitle}</p>
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="px-3 py-1.5 bg-card border border-[var(--th-border)] rounded-[var(--th-radius-md)] text-sm font-medium text-primary hover:bg-card-hover flex items-center gap-1.5"
              aria-label={`Sort by ${SORT_OPTIONS.find((opt) => opt.value === sortBy)?.label}`}
            >
              <span className="hidden sm:inline">
                {SORT_OPTIONS.find((opt) => opt.value === sortBy)?.label}
              </span>
              <ArrowUpDown className="w-4 h-4 sm:hidden" />
              <ChevronDown className="w-4 h-4 hidden sm:inline-block" />
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 mt-1 w-44 bg-card rounded-[var(--th-radius-md)] shadow-theme-card border border-[var(--th-border)] z-10">
                {SORT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setSortBy(option.value)
                      setDropdownOpen(false)
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-card-hover first:rounded-t-lg last:rounded-b-lg ${
                      sortBy === option.value ? 'bg-card-hover font-medium' : ''
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="flex flex-col gap-2 max-w-4xl mx-auto">
          {visiblePlayers.map((player, index) =>
            onPlayerClick ? (
              <button
                key={player.id}
                type="button"
                className="w-full flex items-center justify-between bg-card p-3 rounded-[var(--th-radius-md)] border border-[var(--th-border)] cursor-pointer hover:bg-card-hover transition-colors text-left"
                onClick={() => onPlayerClick(player.id)}
                aria-label={`View match history for ${player.name}`}
              >
                <PlayerCard player={player} index={index} sortBy={sortBy} />
              </button>
            ) : (
              <div
                key={player.id}
                className="flex items-center justify-between bg-card p-3 rounded-[var(--th-radius-md)] border border-[var(--th-border)]"
              >
                <PlayerCard player={player} index={index} sortBy={sortBy} />
              </div>
            ),
          )}
          {inactivePlayers.length > 0 && (
            <button
              type="button"
              onClick={() => setShowInactive(!showInactive)}
              className="w-full py-3 text-sm text-secondary hover:bg-card-hover rounded-[var(--th-radius-md)] transition-colors"
            >
              {showInactive
                ? 'Hide players without games'
                : `Show ${inactivePlayers.length} ${inactivePlayers.length === 1 ? 'player' : 'players'} without games`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default PlayerRankings
