import type { Match, Player, PlayerSeasonStats } from '@foos/shared'
import { ArrowUpDown, ChevronDown, Medal, Trophy } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

type SortOption = 'elo' | 'goalDifference' | 'winRate'

interface PlayerRankingsProps {
  players: Player[]
  seasonStats?: PlayerSeasonStats[]
  matches?: Match[]
  onPlayerClick?: (playerId: string) => void
}

interface PlayerWithStats extends Player {
  goalDifference: number
  winRate: number
}

interface PlayerCardProps {
  player: PlayerWithStats
  index: number
  sortBy: SortOption
}

const getTier = (sortBy: SortOption, player: PlayerWithStats): number => {
  if (sortBy === 'elo') {
    if (player.ranking >= 1800) return 1
    if (player.ranking >= 1600) return 2
    if (player.ranking >= 1400) return 3
    if (player.ranking >= 1200) return 4
    return 5
  }
  if (sortBy === 'goalDifference') {
    if (player.goalDifference > 10) return 1
    if (player.goalDifference > 5) return 2
    if (player.goalDifference > 0) return 3
    if (player.goalDifference >= -5) return 4
    return 5
  }
  // winRate
  if (player.winRate >= 70) return 1
  if (player.winRate >= 60) return 2
  if (player.winRate >= 50) return 3
  if (player.winRate >= 40) return 4
  return 5
}

const TierBadge = ({ tier, children }: { tier: number; children: React.ReactNode }) => (
  <span
    className="px-2 py-1 rounded-full text-xs font-bold"
    style={{
      background: `var(--th-tier-${tier}-bg)`,
      color: `var(--th-tier-${tier}-text)`,
    }}
  >
    {children}
  </span>
)

const PlayerCard = ({ player, index, sortBy }: PlayerCardProps) => {
  const tier = getTier(sortBy, player)

  return (
    <>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          {index === 0 && <Trophy className="text-[var(--th-draw)]" size={16} />}
          {index === 1 && <Medal className="text-secondary" size={14} />}
          {index === 2 && <Medal className="text-[var(--th-sport-primary)]" size={14} />}
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
            <TierBadge tier={tier}>{player.ranking}</TierBadge>
            <div className="text-xs text-secondary mt-1">
              {player.matchesPlayed > 0
                ? `${Math.round((player.wins / player.matchesPlayed) * 100)}% win rate`
                : 'No matches'}
            </div>
          </>
        )}
        {sortBy === 'goalDifference' && (
          <>
            <TierBadge tier={tier}>
              {player.goalDifference > 0 ? '+' : ''}
              {player.goalDifference}
            </TierBadge>
            <div className="text-xs text-secondary mt-1">Goal diff</div>
          </>
        )}
        {sortBy === 'winRate' && (
          <>
            <TierBadge tier={tier}>{player.winRate}%</TierBadge>
            <div className="text-xs text-secondary mt-1">Win rate</div>
          </>
        )}
      </div>
    </>
  )
}

const SORT_OPTIONS = [
  { value: 'elo' as const, label: 'ELO Ranking' },
  { value: 'goalDifference' as const, label: 'Goal Difference' },
  { value: 'winRate' as const, label: 'Win Rate' },
]

const PlayerRankings = ({
  players,
  seasonStats,
  matches = [],
  onPlayerClick,
}: PlayerRankingsProps) => {
  const [sortBy, setSortBy] = useState<SortOption>('elo')
  const [dropdownOpen, setDropdownOpen] = useState(false)

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

  // Calculate additional stats for each player, using season stats if available
  const playersWithStats = useMemo(() => {
    return players.map((player) => {
      // Find season-specific stats for this player
      const seasonStat = seasonStats?.find((stat) => stat.playerId === player.id)

      // Use season stats if available, otherwise use global player stats
      const ranking = seasonStat?.ranking ?? player.ranking
      const wins = seasonStat?.wins ?? player.wins
      const losses = seasonStat?.losses ?? player.losses
      const matchesPlayed = seasonStat?.matchesPlayed ?? player.matchesPlayed
      const goalsFor = seasonStat?.goalsFor ?? 0
      const goalsAgainst = seasonStat?.goalsAgainst ?? 0

      // Calculate goal difference (use season stats if available, otherwise calculate from matches)
      let goalDifference: number
      if (seasonStat) {
        goalDifference = goalsFor - goalsAgainst
      } else {
        // Fallback: calculate from matches
        const playerMatches = matches.filter(
          (match) =>
            match.team1[0].id === player.id ||
            match.team1[1]?.id === player.id ||
            match.team2[0].id === player.id ||
            match.team2[1]?.id === player.id,
        )

        goalDifference = playerMatches.reduce((diff, match) => {
          const wasInTeam1 = match.team1[0].id === player.id || match.team1[1]?.id === player.id
          const goalsForMatch = wasInTeam1 ? match.score1 : match.score2
          const goalsAgainstMatch = wasInTeam1 ? match.score2 : match.score1
          return diff + (goalsForMatch - goalsAgainstMatch)
        }, 0)
      }

      const winRate = matchesPlayed > 0 ? Math.round((wins / matchesPlayed) * 100) : 0

      return {
        ...player,
        ranking,
        wins,
        losses,
        matchesPlayed,
        goalDifference,
        winRate,
      }
    })
  }, [players, seasonStats, matches])

  // Sort players based on selected criteria
  const sortedPlayers = useMemo(() => {
    const sorted = [...playersWithStats]

    switch (sortBy) {
      case 'elo':
        return sorted.sort((a, b) => b.ranking - a.ranking)
      case 'goalDifference':
        return sorted.sort((a, b) => {
          // Sort by goal difference first, then by ELO as tiebreaker
          if (b.goalDifference !== a.goalDifference) {
            return b.goalDifference - a.goalDifference
          }
          return b.ranking - a.ranking
        })
      case 'winRate':
        return sorted.sort((a, b) => {
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

  return (
    <div className="bg-card backdrop-blur-sm rounded-[var(--th-radius-lg)] shadow-theme-card border border-[var(--th-border-subtle)]">
      <div className="p-4 border-b border-[var(--th-border)]">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-primary flex items-center gap-2">
              <Trophy className="text-[var(--th-sport-primary)]" />
              Friend Rankings
            </h2>
            <p className="text-sm text-secondary">See how you stack up against your friends!</p>
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="px-3 py-1.5 bg-card border border-[var(--th-border)] rounded-lg text-sm font-medium text-primary hover:bg-card-hover flex items-center gap-1.5"
              aria-label={`Sort by ${SORT_OPTIONS.find((opt) => opt.value === sortBy)?.label}`}
            >
              <span className="hidden sm:inline">
                {SORT_OPTIONS.find((opt) => opt.value === sortBy)?.label}
              </span>
              <ArrowUpDown className="w-4 h-4 sm:hidden" />
              <ChevronDown className="w-4 h-4 hidden sm:inline-block" />
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 mt-1 w-44 bg-card rounded-lg shadow-theme-card border border-[var(--th-border)] z-10">
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
          {sortedPlayers.map((player, index) =>
            onPlayerClick ? (
              <button
                key={player.id}
                type="button"
                className="w-full flex items-center justify-between bg-card p-3 rounded-lg border border-[var(--th-border)] cursor-pointer hover:bg-card-hover transition-colors text-left"
                onClick={() => onPlayerClick(player.id)}
                aria-label={`View match history for ${player.name}`}
              >
                <PlayerCard player={player} index={index} sortBy={sortBy} />
              </button>
            ) : (
              <div
                key={player.id}
                className="flex items-center justify-between bg-card p-3 rounded-lg border border-[var(--th-border)]"
              >
                <PlayerCard player={player} index={index} sortBy={sortBy} />
              </div>
            ),
          )}
        </div>
      </div>
    </div>
  )
}

export default PlayerRankings
