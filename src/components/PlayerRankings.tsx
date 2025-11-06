import { ArrowUpDown, ChevronDown, Medal, Trophy } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { Match, Player, PlayerSeasonStats } from '@/types'

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

const PlayerCard = ({ player, index, sortBy }: PlayerCardProps) => (
  <>
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        {index === 0 && <Trophy className="text-yellow-500" size={16} />}
        {index === 1 && <Medal className="text-gray-400" size={14} />}
        {index === 2 && <Medal className="text-amber-600" size={14} />}
        <span className="font-bold text-slate-700 text-sm w-6">{index + 1}</span>
      </div>
      <span className="text-2xl">{player.avatar}</span>
      <div>
        <div className="font-semibold text-slate-800 text-sm">{player.name}</div>
        <div className="text-xs text-slate-500">
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
          <div className="text-xs text-slate-600 mt-1">
            {player.matchesPlayed > 0
              ? `${Math.round((player.wins / player.matchesPlayed) * 100)}% win rate`
              : 'No matches'}
          </div>
        </>
      )}
      {sortBy === 'goalDifference' && (
        <>
          <span
            className={`px-2 py-1 rounded-full text-xs font-bold ${
              player.goalDifference > 10
                ? 'bg-gradient-to-r from-purple-100 to-violet-200 text-purple-800'
                : player.goalDifference > 5
                  ? 'bg-gradient-to-r from-emerald-100 to-green-200 text-emerald-800'
                  : player.goalDifference > 0
                    ? 'bg-gradient-to-r from-blue-100 to-cyan-200 text-blue-800'
                    : player.goalDifference >= -5
                      ? 'bg-gradient-to-r from-amber-100 to-yellow-200 text-amber-800'
                      : 'bg-gradient-to-r from-rose-100 to-pink-200 text-rose-800'
            }`}
          >
            {player.goalDifference > 0 ? '+' : ''}
            {player.goalDifference}
          </span>
          <div className="text-xs text-slate-600 mt-1">Goal diff</div>
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
          <div className="text-xs text-slate-600 mt-1">Win rate</div>
        </>
      )}
    </div>
  </>
)

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
            match.team1[1].id === player.id ||
            match.team2[0].id === player.id ||
            match.team2[1].id === player.id,
        )

        goalDifference = playerMatches.reduce((diff, match) => {
          const wasInTeam1 = match.team1[0].id === player.id || match.team1[1].id === player.id
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
    <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/50">
      <div className="p-4 border-b border-slate-200/50">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Trophy className="text-orange-500" />
              Friend Rankings
            </h2>
            <p className="text-sm text-slate-600">See how you stack up against your friends!</p>
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
              aria-label={`Sort by ${SORT_OPTIONS.find((opt) => opt.value === sortBy)?.label}`}
            >
              <span className="hidden sm:inline">
                {SORT_OPTIONS.find((opt) => opt.value === sortBy)?.label}
              </span>
              <ArrowUpDown className="w-4 h-4 sm:hidden" />
              <ChevronDown className="w-4 h-4 hidden sm:inline-block" />
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 mt-1 w-44 bg-white rounded-lg shadow-lg border border-slate-200 z-10">
                {SORT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setSortBy(option.value)
                      setDropdownOpen(false)
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 first:rounded-t-lg last:rounded-b-lg ${
                      sortBy === option.value ? 'bg-slate-50 font-medium' : ''
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
                className="w-full flex items-center justify-between bg-gradient-to-r from-white to-slate-50 p-3 rounded-lg border border-slate-200/50 cursor-pointer hover:from-blue-50 hover:to-slate-100 transition-colors text-left"
                onClick={() => onPlayerClick(player.id)}
                aria-label={`View match history for ${player.name}`}
              >
                <PlayerCard player={player} index={index} sortBy={sortBy} />
              </button>
            ) : (
              <div
                key={player.id}
                className="flex items-center justify-between bg-gradient-to-r from-white to-slate-50 p-3 rounded-lg border border-slate-200/50"
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
