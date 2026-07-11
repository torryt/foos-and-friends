import type { Match, Player, PlayerMatchStats, PlayerPosition } from '@foos/shared'
import { calculateRankingChange } from '@foos/shared'
import { Clock, Filter, Plus, Target, TrendingDown, TrendingUp, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { PositionIcon } from '@/components/PositionIcon'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useSeasonContext } from '@/contexts/SeasonContext'

interface MatchHistoryProps {
  matches: Match[]
  allMatches?: Match[]
  players: Player[]
  // Absent in read-only contexts (public pages) — hides the record button
  onAddMatch?: () => void
  initialSelectedPlayer?: string
  onPlayerClick?: (playerId: string) => void
}

type MatchScope = 'season' | 'allTime'

interface PlayerWithStatsProps {
  player: Player
  match: Match
  teamColor: string
  position: PlayerPosition
  onPlayerClick?: (playerId: string) => void
}

// Helper function to get player stats for a specific player in a match
const getPlayerStats = (match: Match, playerId: string): PlayerMatchStats | undefined => {
  return match.playerStats?.find((stats) => stats.playerId === playerId)
}

// Helper function to format ranking change display
const formatRankingChange = (change: number) => {
  if (change > 0) {
    return (
      <span className="text-[var(--th-win)] classic:text-green-600 flex items-center gap-0.5">
        <TrendingUp size={10} />+{change}
      </span>
    )
  } else if (change < 0) {
    return (
      <span className="text-[var(--th-loss)] classic:text-red-600 flex items-center gap-0.5">
        <TrendingDown size={10} />
        {change}
      </span>
    )
  } else {
    return <span className="text-muted">0</span>
  }
}

// Component to render player with stats
const PlayerWithStats = ({
  player,
  match,
  teamColor,
  position,
  onPlayerClick,
}: PlayerWithStatsProps) => {
  const stats = getPlayerStats(match, player.id)
  const hasStats = !!stats

  return (
    <div className="mb-1 flex items-center justify-between gap-2">
      <button
        type="button"
        className="flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity bg-transparent border-none p-0"
        onClick={() => onPlayerClick?.(player.id)}
      >
        <span className="text-sm">{player.avatar}</span>
        <div className="flex items-center gap-1">
          <PositionIcon position={position} size={12} />
          <div className={`text-xs font-medium ${teamColor}`}>{player.name}</div>
        </div>
      </button>
      {hasStats ? (
        <div className="text-xs text-secondary">
          <div className="flex items-center gap-1">
            <span className="font-medium">{stats.postGameRanking}</span>
            {formatRankingChange(calculateRankingChange(stats))}
          </div>
        </div>
      ) : (
        <div className="text-xs text-secondary">
          <div className="flex items-center">
            <span className="font-medium">{player.ranking}</span>
          </div>
        </div>
      )}
    </div>
  )
}

interface MobileMatchRowProps {
  match: Match
  seasonTag?: string
  onPlayerClick?: (playerId: string) => void
}

// Compact flat row shown below the sm breakpoint: winner team first (bold),
// loser muted, result stripe on the left edge, score in a fixed right column.
const MobileMatchRow = ({ match, seasonTag, onPlayerClick }: MobileMatchRowProps) => {
  const isDraw = match.score1 === match.score2
  const teams = [
    { players: match.team1.filter((p): p is Player => !!p), score: match.score1 },
    { players: match.team2.filter((p): p is Player => !!p), score: match.score2 },
  ]
  const ordered = isDraw ? teams : teams.toSorted((a, b) => b.score - a.score)

  const teamDelta = (teamPlayers: Player[]): number | null => {
    if (!match.playerStats) return null
    const stats = teamPlayers
      .map((p) => getPlayerStats(match, p.id))
      .filter((s): s is PlayerMatchStats => !!s)
    if (stats.length === 0) return null
    return stats.reduce((sum, s) => sum + calculateRankingChange(s), 0)
  }

  return (
    <div className="relative px-4 py-3 sm:hidden">
      <span
        className={`absolute left-1 top-3 bottom-3 w-[3px] rounded-full ${
          isDraw ? 'bg-[var(--th-draw)]' : 'bg-[var(--th-win)]'
        }`}
      />
      <div className="text-xs text-muted flex items-center gap-2 flex-wrap mb-1.5">
        <span className="flex items-center gap-1">
          <Clock size={12} />
          {match.date} at {match.time}
        </span>
        {seasonTag && (
          <span className="px-1.5 py-0.5 rounded border border-[var(--th-border)] text-[10px] font-semibold">
            {seasonTag}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          {ordered.map((team) => {
            const delta = teamDelta(team.players)
            const won = !isDraw && team === ordered[0]
            const nameClass = isDraw
              ? 'text-primary'
              : won
                ? 'text-primary font-semibold'
                : 'text-secondary'
            return (
              <div
                key={team.players[0].id}
                className="flex items-center justify-between gap-2 min-w-0"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  {team.players.map((p, j) => (
                    <span key={p.id} className="flex items-center gap-1.5 min-w-0">
                      {j > 0 && <span className="text-muted text-xs">&amp;</span>}
                      <button
                        type="button"
                        className="flex items-center gap-1 min-w-0 bg-transparent border-none p-0 cursor-pointer"
                        onClick={() => onPlayerClick?.(p.id)}
                      >
                        <span className="text-sm">{p.avatar}</span>
                        <span className={`text-sm truncate ${nameClass}`}>{p.name}</span>
                      </button>
                    </span>
                  ))}
                </div>
                {delta !== null && (
                  <span
                    className={`text-xs font-medium tabular-nums shrink-0 ${
                      delta >= 0 ? 'text-[var(--th-win)]' : 'text-[var(--th-loss)]'
                    }`}
                  >
                    {delta >= 0 ? '+' : ''}
                    {delta}
                  </span>
                )}
              </div>
            )
          })}
        </div>
        <div className="text-lg font-bold tabular-nums whitespace-nowrap shrink-0">
          <span className="text-primary">{ordered[0].score}</span>
          <span className="text-muted">–{ordered[1].score}</span>
        </div>
      </div>
    </div>
  )
}

const MatchHistory = ({
  matches,
  allMatches,
  players,
  onAddMatch,
  initialSelectedPlayer,
  onPlayerClick,
}: MatchHistoryProps) => {
  const { currentSeason, seasons } = useSeasonContext()
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(initialSelectedPlayer || null)
  const [showPlayerFilter, setShowPlayerFilter] = useState(false)
  const [scope, setScope] = useState<MatchScope>('season')

  useEffect(() => {
    if (initialSelectedPlayer) {
      setSelectedPlayer(initialSelectedPlayer)
    }
  }, [initialSelectedPlayer])

  // Reset player filter when the player list changes (e.g., group switch)
  // to prevent filtering by a player ID from the previous group
  useEffect(() => {
    if (selectedPlayer && players.length > 0 && !players.some((p) => p.id === selectedPlayer)) {
      setSelectedPlayer(null)
    }
  }, [players, selectedPlayer])

  // Helper function to check if a player participated in a match
  const playerInMatch = (match: Match, playerId: string): boolean => {
    return (
      match.team1[0].id === playerId ||
      match.team1[1]?.id === playerId ||
      match.team2[0].id === playerId ||
      match.team2[1]?.id === playerId
    )
  }

  const showScopeToggle = !!allMatches && seasons.length > 1
  const allTime = scope === 'allTime' && !!allMatches
  const sourceMatches = allTime && allMatches ? allMatches : matches

  // Look up a season name for the all-time view's per-match tags
  const seasonNameById = new Map(seasons.map((s) => [s.id, s.name]))

  // Filter matches based on selected player
  const filteredMatches = selectedPlayer
    ? sourceMatches.filter((match) => playerInMatch(match, selectedPlayer))
    : sourceMatches

  const selectedPlayerData = selectedPlayer ? players.find((p) => p.id === selectedPlayer) : null
  const isArchived = !!currentSeason && !currentSeason.isActive

  return (
    <div className="-mx-4 sm:mx-0 sm:bg-card sm:classic:bg-white/80 sm:backdrop-blur-sm sm:rounded-[var(--th-radius-lg)] sm:shadow-theme-card sm:border sm:border-[var(--th-border-subtle)]">
      <div className="p-4 border-b border-[var(--th-border)]">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-primary">
              {selectedPlayerData ? `${selectedPlayerData.name}'s Games` : 'Recent Games'}
            </h2>
            <p className="text-sm text-secondary">
              {selectedPlayerData
                ? `Match history for ${selectedPlayerData.name}`
                : allTime
                  ? 'Every match across all seasons'
                  : isArchived
                    ? `Historical matches from ${currentSeason?.name || 'archived season'}`
                    : 'Latest foos battles with friends'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPlayerFilter(!showPlayerFilter)}
              className="bg-sport-secondary-gradient text-white p-2 rounded-[var(--th-radius-md)] hover:bg-sport-secondary-gradient-hover"
              title="Filter by player"
            >
              <Filter size={16} />
            </button>
            {!isArchived && onAddMatch && (
              <button
                type="button"
                onClick={onAddMatch}
                className="bg-sport-gradient text-white p-2 rounded-lg hover:bg-sport-gradient-hover"
                title="Record match"
              >
                <Plus size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Season / all-time scope */}
        {showScopeToggle && (
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setScope('season')}
              className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
                !allTime
                  ? 'bg-accent-subtle border-[var(--th-sport-primary)] text-[var(--th-accent)]'
                  : 'bg-card/60 border-[var(--th-border-subtle)] text-secondary hover:bg-card-hover'
              }`}
            >
              {currentSeason?.name || 'This season'}
            </button>
            <button
              type="button"
              onClick={() => setScope('allTime')}
              className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
                allTime
                  ? 'bg-accent-subtle border-[var(--th-sport-primary)] text-[var(--th-accent)]'
                  : 'bg-card/60 border-[var(--th-border-subtle)] text-secondary hover:bg-card-hover'
              }`}
            >
              All time
            </button>
          </div>
        )}

        {/* Player Filter Dropdown */}
        {showPlayerFilter && (
          <div className="mt-4 relative">
            <div className="bg-card-hover classic:bg-gradient-to-r classic:from-blue-50 classic:to-purple-50 p-3 rounded-lg border border-[var(--th-border)] classic:border-blue-200/50">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-primary classic:text-blue-800">
                  Filter by Player
                </span>
                <button
                  type="button"
                  onClick={() => setShowPlayerFilter(false)}
                  className="text-muted hover:text-secondary"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPlayer(null)
                    setShowPlayerFilter(false)
                  }}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    !selectedPlayer
                      ? 'bg-accent-subtle classic:bg-blue-200 text-[var(--th-accent)] classic:text-blue-800'
                      : 'bg-card/60 text-secondary hover:bg-card-hover classic:hover:bg-blue-100'
                  }`}
                >
                  All Players
                </button>
                {players.map((player) => (
                  <button
                    key={player.id}
                    type="button"
                    onClick={() => {
                      setSelectedPlayer(player.id)
                      setShowPlayerFilter(false)
                    }}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors flex items-center gap-1 ${
                      selectedPlayer === player.id
                        ? 'bg-accent-subtle classic:bg-blue-200 text-[var(--th-accent)] classic:text-blue-800'
                        : 'bg-card/60 text-secondary hover:bg-card-hover classic:hover:bg-blue-100'
                    }`}
                  >
                    <span className="text-xs">{player.avatar}</span>
                    {player.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className={filteredMatches.length === 0 ? 'p-4' : 'sm:p-4'}>
        {filteredMatches.length === 0 ? (
          <Alert className="bg-accent-subtle classic:bg-gradient-to-r classic:from-orange-50 classic:to-red-50 border-[var(--th-border)] classic:border-orange-200/50">
            <Target className="h-4 w-4 text-[var(--th-sport-primary)]" />
            <AlertDescription className="text-secondary font-medium text-sm">
              No games recorded yet. Tap + to record your first foos battle!
            </AlertDescription>
          </Alert>
        ) : (
          <div className="grid grid-cols-1 sm:gap-3 max-w-2xl mx-auto">
            {filteredMatches.map((match) => (
              <div
                key={match.id}
                className="border-b border-[var(--th-border-subtle)] sm:bg-card sm:classic:bg-gradient-to-br sm:classic:from-white sm:classic:to-slate-50 sm:border sm:rounded-[var(--th-radius-lg)] sm:p-3 sm:shadow-sm"
              >
                <MobileMatchRow
                  match={match}
                  seasonTag={
                    allTime && match.seasonId ? seasonNameById.get(match.seasonId) : undefined
                  }
                  onPlayerClick={onPlayerClick}
                />
                <div className="hidden sm:block">
                  <div className="flex justify-between items-start mb-3">
                    <div className="text-xs text-secondary flex items-center gap-2 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {match.date} at {match.time}
                      </span>
                      {allTime && match.seasonId && seasonNameById.has(match.seasonId) && (
                        <span className="px-1.5 py-0.5 rounded border border-[var(--th-border)] text-muted text-[10px] font-semibold">
                          {seasonNameById.get(match.seasonId)}
                        </span>
                      )}
                    </div>
                    <span className="bg-accent-subtle classic:bg-gradient-to-r classic:from-emerald-100 classic:to-green-200 text-[var(--th-win)] classic:text-emerald-800 px-2 py-1 rounded-full text-xs font-bold border border-[var(--th-border)] classic:border-transparent">
                      Completed
                    </span>
                  </div>

                  <div className="flex flex-col sm:grid sm:grid-cols-3 gap-3 sm:items-center">
                    <div className="text-center bg-card-hover classic:bg-gradient-to-br classic:from-blue-50 classic:to-cyan-50 p-2 rounded-lg border border-[var(--th-border)] classic:border-blue-200/50">
                      <div className="font-bold text-[var(--th-accent)] classic:text-blue-800 mb-1 text-xs">
                        {match.matchType === '1v1' ? 'Player 1' : 'Team 1'}
                      </div>
                      <div className="space-y-1">
                        <PlayerWithStats
                          player={match.team1[0]}
                          match={match}
                          teamColor="text-[var(--th-accent)] classic:text-blue-700"
                          position={match.matchType === '1v1' ? 'attacker' : 'attacker'}
                          onPlayerClick={onPlayerClick}
                        />
                        {match.team1[1] && (
                          <PlayerWithStats
                            player={match.team1[1]}
                            match={match}
                            teamColor="text-[var(--th-accent)] classic:text-blue-700"
                            position="defender"
                            onPlayerClick={onPlayerClick}
                          />
                        )}
                      </div>
                      {match.team1[1] && (
                        <div className="text-xs bg-accent-subtle classic:bg-blue-100 text-[var(--th-accent)] classic:text-blue-600 px-1 py-0.5 rounded-full mt-1">
                          {match.playerStats ? (
                            <>
                              Pre-Avg:{' '}
                              {Math.round(
                                ((getPlayerStats(match, match.team1[0].id)?.preGameRanking ||
                                  match.team1[0].ranking) +
                                  (getPlayerStats(match, match.team1[1].id)?.preGameRanking ||
                                    match.team1[1].ranking)) /
                                  2,
                              )}
                            </>
                          ) : (
                            <>
                              Avg:{' '}
                              {Math.round((match.team1[0].ranking + match.team1[1].ranking) / 2)}
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="text-center order-first sm:order-none">
                      <div
                        className={`text-2xl font-bold mb-1 ${
                          match.score1 > match.score2
                            ? 'text-[var(--th-win)] classic:text-green-600'
                            : match.score2 > match.score1
                              ? 'text-[var(--th-loss)] classic:text-red-600'
                              : 'text-secondary'
                        }`}
                      >
                        {match.score1} - {match.score2}
                      </div>
                      <div className="text-xs text-muted">Final Score</div>
                    </div>

                    <div className="text-center bg-card-hover classic:bg-gradient-to-br classic:from-purple-50 classic:to-violet-50 p-2 rounded-lg border border-[var(--th-border)] classic:border-purple-200/50">
                      <div className="font-bold text-[var(--th-sport-primary)] classic:text-purple-800 mb-1 text-xs">
                        {match.matchType === '1v1' ? 'Player 2' : 'Team 2'}
                      </div>
                      <div className="space-y-1">
                        <PlayerWithStats
                          player={match.team2[0]}
                          match={match}
                          teamColor="text-[var(--th-sport-primary)] classic:text-purple-700"
                          position={match.matchType === '1v1' ? 'attacker' : 'attacker'}
                          onPlayerClick={onPlayerClick}
                        />
                        {match.team2[1] && (
                          <PlayerWithStats
                            player={match.team2[1]}
                            match={match}
                            teamColor="text-[var(--th-sport-primary)] classic:text-purple-700"
                            position="defender"
                            onPlayerClick={onPlayerClick}
                          />
                        )}
                      </div>
                      {match.team2[1] && (
                        <div className="text-xs bg-accent-subtle classic:bg-purple-100 text-[var(--th-sport-primary)] classic:text-purple-600 px-1 py-0.5 rounded-full mt-1">
                          {match.playerStats ? (
                            <>
                              Pre-Avg:{' '}
                              {Math.round(
                                ((getPlayerStats(match, match.team2[0].id)?.preGameRanking ||
                                  match.team2[0].ranking) +
                                  (getPlayerStats(match, match.team2[1].id)?.preGameRanking ||
                                    match.team2[1].ranking)) /
                                  2,
                              )}
                            </>
                          ) : (
                            <>
                              Avg:{' '}
                              {Math.round((match.team2[0].ranking + match.team2[1].ranking) / 2)}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {match.score1 !== match.score2 && (
                    <div className="mt-2 text-center">
                      <span className="text-xs font-medium text-[var(--th-win)] classic:text-green-600">
                        🎉{' '}
                        {match.matchType === '1v1'
                          ? `${match.score1 > match.score2 ? match.team1[0].name : match.team2[0].name} wins!`
                          : `Team ${match.score1 > match.score2 ? '1' : '2'} wins!`}{' '}
                        Great game, friends!
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default MatchHistory
