import type { Match, Player, PlayerSeasonStats, PillSelectOption } from '@foos/shared'
import { Medal, Trophy } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

export type SortOption =
  | 'elo'
  | 'goalDifference'
  | 'winRate'
  | 'longestWinStreak'
  | 'longestLoseStreak'

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
  goalDifference: number
  winRate: number
  longestWinStreak: number
  longestLoseStreak: number
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
  if (sortBy === 'winRate') {
    if (player.winRate >= 70) return 1
    if (player.winRate >= 60) return 2
    if (player.winRate >= 50) return 3
    if (player.winRate >= 40) return 4
    return 5
  }
  // longestWinStreak / longestLoseStreak
  const streak = sortBy === 'longestWinStreak' ? player.longestWinStreak : player.longestLoseStreak
  if (streak >= 8) return 1
  if (streak >= 5) return 2
  if (streak >= 3) return 3
  if (streak >= 1) return 4
  return 5
}

// Computes the longest run of consecutive wins/losses from a player's match
// history. Draws (chess only) break both streaks without counting toward either.
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
        {sortBy === 'longestWinStreak' && (
          <>
            <TierBadge tier={tier}>{player.longestWinStreak}</TierBadge>
            <div className="text-xs text-secondary mt-1">Longest win streak</div>
          </>
        )}
        {sortBy === 'longestLoseStreak' && (
          <>
            <TierBadge tier={tier}>{player.longestLoseStreak}</TierBadge>
            <div className="text-xs text-secondary mt-1">Longest lose streak</div>
          </>
        )}
      </div>
    </>
  )
}

export const SORT_OPTIONS: PillSelectOption<SortOption>[] = [
  { value: 'elo', label: 'ELO Ranking' },
  { value: 'goalDifference', label: 'Goal Difference' },
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
      const goalsFor = seasonStat?.goalsFor ?? 0
      const goalsAgainst = seasonStat?.goalsAgainst ?? 0

      // Calculate goal difference (use season stats if available, otherwise calculate from matches)
      let goalDifference: number
      if (seasonScope) {
        goalDifference = seasonStat ? goalsFor - goalsAgainst : 0
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
      const { longestWinStreak, longestLoseStreak } = computeStreaks(player.id, matches)

      return {
        ...player,
        ranking,
        wins,
        losses,
        matchesPlayed,
        goalDifference,
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
      case 'goalDifference':
        return sorted.toSorted((a, b) => {
          // Sort by goal difference first, then by ELO as tiebreaker
          if (b.goalDifference !== a.goalDifference) {
            return b.goalDifference - a.goalDifference
          }
          return b.ranking - a.ranking
        })
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
                className="w-full flex items-center justify-between px-4 py-3 border-b border-[var(--th-border-subtle)] sm:bg-card sm:px-3 sm:rounded-lg sm:border sm:border-[var(--th-border)] cursor-pointer hover:bg-card-hover transition-colors text-left"
                onClick={() => onPlayerClick(player.id)}
                aria-label={`View match history for ${player.name}`}
              >
                <PlayerCard player={player} index={index} sortBy={sortBy} />
              </button>
            ) : (
              <div
                key={player.id}
                className="flex items-center justify-between px-4 py-3 border-b border-[var(--th-border-subtle)] sm:bg-card sm:px-3 sm:rounded-lg sm:border sm:border-[var(--th-border)]"
              >
                <PlayerCard player={player} index={index} sortBy={sortBy} />
              </div>
            ),
          )}
          {inactivePlayers.length > 0 && (
            <button
              type="button"
              onClick={() => setShowInactive(!showInactive)}
              className="w-full py-3 text-sm text-secondary hover:bg-card-hover rounded-lg transition-colors"
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
