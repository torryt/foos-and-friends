import type { Match, Player, PlayerSeasonStats, PillSelectOption } from '@foos/shared'
import { Medal, Trophy } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

export type SortOption = 'elo' | 'winRate' | 'longestWinStreak' | 'longestLoseStreak'

interface PlayerRankingsProps {
  players: Player[]
  seasonStats?: PlayerSeasonStats[]
  matches?: Match[]
  onPlayerClick?: (playerId: string) => void
  title?: string
  subtitle?: string
  sortBy?: SortOption
}

interface PlayerWithStats extends Player {
  winRate: number
  longestWinStreak: number
  longestLoseStreak: number
}

// Computes the longest run of consecutive wins/losses from a player's match
// history. Draws break both streaks without counting toward either.
const computeStreaks = (
  playerId: string,
  matches: Match[],
): { longestWinStreak: number; longestLoseStreak: number } => {
  const playerMatches = matches
    .filter(
      (match) =>
        match.team1[0].id === playerId ||
        match.team1[1]?.id === playerId ||
        match.team2[0].id === playerId ||
        match.team2[1]?.id === playerId,
    )
    .toReversed() // oldest first

  let longestWinStreak = 0
  let longestLoseStreak = 0
  let currentWinStreak = 0
  let currentLoseStreak = 0

  for (const match of playerMatches) {
    const wasInTeam1 = match.team1[0].id === playerId || match.team1[1]?.id === playerId
    const playerScore = wasInTeam1 ? match.score1 : match.score2
    const opponentScore = wasInTeam1 ? match.score2 : match.score1

    if (playerScore > opponentScore) {
      currentWinStreak += 1
      currentLoseStreak = 0
    } else if (playerScore < opponentScore) {
      currentLoseStreak += 1
      currentWinStreak = 0
    } else {
      currentWinStreak = 0
      currentLoseStreak = 0
    }

    longestWinStreak = Math.max(longestWinStreak, currentWinStreak)
    longestLoseStreak = Math.max(longestLoseStreak, currentLoseStreak)
  }

  return { longestWinStreak, longestLoseStreak }
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
      {sortBy === 'longestWinStreak' && (
        <>
          <span
            className={`px-2 py-1 rounded-full text-xs font-bold ${
              player.longestWinStreak >= 8
                ? 'bg-gradient-to-r from-purple-100 to-violet-200 text-purple-800'
                : player.longestWinStreak >= 5
                  ? 'bg-gradient-to-r from-emerald-100 to-green-200 text-emerald-800'
                  : player.longestWinStreak >= 3
                    ? 'bg-gradient-to-r from-blue-100 to-cyan-200 text-blue-800'
                    : player.longestWinStreak >= 1
                      ? 'bg-gradient-to-r from-amber-100 to-yellow-200 text-amber-800'
                      : 'bg-gradient-to-r from-rose-100 to-pink-200 text-rose-800'
            }`}
          >
            {player.longestWinStreak}
          </span>
          <div className="text-xs text-secondary mt-1">Longest win streak</div>
        </>
      )}
      {sortBy === 'longestLoseStreak' && (
        <>
          <span
            className={`px-2 py-1 rounded-full text-xs font-bold ${
              player.longestLoseStreak >= 8
                ? 'bg-gradient-to-r from-purple-100 to-violet-200 text-purple-800'
                : player.longestLoseStreak >= 5
                  ? 'bg-gradient-to-r from-emerald-100 to-green-200 text-emerald-800'
                  : player.longestLoseStreak >= 3
                    ? 'bg-gradient-to-r from-blue-100 to-cyan-200 text-blue-800'
                    : player.longestLoseStreak >= 1
                      ? 'bg-gradient-to-r from-amber-100 to-yellow-200 text-amber-800'
                      : 'bg-gradient-to-r from-rose-100 to-pink-200 text-rose-800'
            }`}
          >
            {player.longestLoseStreak}
          </span>
          <div className="text-xs text-secondary mt-1">Longest lose streak</div>
        </>
      )}
    </div>
  </>
)

export const SORT_OPTIONS: PillSelectOption<SortOption>[] = [
  { value: 'elo', label: 'ELO Ranking' },
  { value: 'winRate', label: 'Win Rate' },
  { value: 'longestWinStreak', label: 'Longest Win Streak' },
  { value: 'longestLoseStreak', label: 'Longest Lose Streak' },
]

// Ranking sort selection persisted to localStorage, for the picker that
// sits next to the SeasonScopePicker on the rankings page.
export const useRankingSort = () => {
  const [sortBy, setSortBy] = useState<SortOption>(() => {
    const saved = localStorage.getItem('rankingSortPreference') as SortOption | null
    return saved && SORT_OPTIONS.some((opt) => opt.value === saved) ? saved : 'elo'
  })

  useEffect(() => {
    localStorage.setItem('rankingSortPreference', sortBy)
  }, [sortBy])

  return [sortBy, setSortBy] as const
}

const PlayerRankings = ({
  players,
  seasonStats,
  matches = [],
  onPlayerClick,
  title = 'Friend Rankings',
  subtitle = 'See how you stack up against your friends!',
  sortBy = 'elo',
}: PlayerRankingsProps) => {
  const [showInactive, setShowInactive] = useState(false)

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
      const { longestWinStreak, longestLoseStreak } = computeStreaks(player.id, matches)

      return {
        ...player,
        ranking,
        wins,
        losses,
        matchesPlayed,
        winRate,
        longestWinStreak,
        longestLoseStreak,
      }
    })
  }, [players, seasonStats, matches])

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
      case 'longestWinStreak':
        return sorted.toSorted((a, b) => {
          if (b.longestWinStreak !== a.longestWinStreak) {
            return b.longestWinStreak - a.longestWinStreak
          }
          return b.ranking - a.ranking
        })
      case 'longestLoseStreak':
        return sorted.toSorted((a, b) => {
          if (b.longestLoseStreak !== a.longestLoseStreak) {
            return b.longestLoseStreak - a.longestLoseStreak
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
    <div className="-mx-4 sm:mx-0 sm:bg-card sm:backdrop-blur-sm sm:rounded-[var(--th-radius-lg)] sm:shadow-theme-card sm:border sm:border-[var(--th-border-subtle)]">
      <div className="p-4 border-b border-[var(--th-border)]">
        <h2 className="text-lg font-bold text-primary flex items-center gap-2">
          <Trophy className="text-[var(--th-sport-primary)]" />
          {title}
        </h2>
        <p className="text-sm text-secondary">{subtitle}</p>
      </div>

      <div className="sm:p-4">
        <div className="flex flex-col sm:gap-2 max-w-4xl mx-auto">
          {visiblePlayers.map((player, index) =>
            onPlayerClick ? (
              <button
                key={player.id}
                type="button"
                className="w-full flex items-center justify-between px-4 py-3 border-b border-[var(--th-border-subtle)] sm:bg-card sm:px-3 sm:rounded-[var(--th-radius-md)] sm:border sm:border-[var(--th-border)] cursor-pointer hover:bg-card-hover transition-colors text-left"
                onClick={() => onPlayerClick(player.id)}
                aria-label={`View match history for ${player.name}`}
              >
                <PlayerCard player={player} index={index} sortBy={sortBy} />
              </button>
            ) : (
              <div
                key={player.id}
                className="flex items-center justify-between px-4 py-3 border-b border-[var(--th-border-subtle)] sm:bg-card sm:px-3 sm:rounded-[var(--th-radius-md)] sm:border sm:border-[var(--th-border)]"
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
