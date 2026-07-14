import type { Match, Player, PlayerMatchStats } from '@foos/shared'
import { calculateRankingChange } from '@foos/shared'
import { Clock, Crown, Filter, Plus, Target, TrendingDown, TrendingUp, X } from 'lucide-react'
import { useEffect, useState } from 'react'
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
      <span className="text-[var(--th-win)] flex items-center gap-0.5">
        <TrendingUp size={10} />+{change}
      </span>
    )
  } else if (change < 0) {
    return (
      <span className="text-[var(--th-loss)] flex items-center gap-0.5">
        <TrendingDown size={10} />
        {change}
      </span>
    )
  } else {
    return <span className="text-muted">0</span>
  }
}

// Component to render player with stats
const PlayerWithStats = ({ player, match, teamColor, onPlayerClick }: PlayerWithStatsProps) => {
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
        <div className={`text-xs font-medium ${teamColor}`}>{player.name}</div>
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

// Compact flat row shown below the sm breakpoint: winner first (bold),
// loser muted, result stripe on the left edge, score in a fixed right column.
const MobileMatchRow = ({ match, seasonTag, onPlayerClick }: MobileMatchRowProps) => {
  const isDraw = match.score1 === match.score2
  const white = { player: match.team1[0], score: match.score1 }
  const black = { player: match.team2[0], score: match.score2 }
  const ordered = !isDraw && black.score > white.score ? [black, white] : [white, black]

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
          {ordered.map((side, i) => (
            <PlayerWithStats
              key={side.player.id}
              player={side.player}
              match={match}
              teamColor={
                isDraw ? 'text-primary' : i === 0 ? 'text-primary font-semibold' : 'text-secondary'
              }
              onPlayerClick={onPlayerClick}
            />
          ))}
        </div>
        <div className="text-lg font-bold tabular-nums whitespace-nowrap shrink-0">
          {isDraw ? (
            <span className="text-[var(--th-draw)]">½–½</span>
          ) : (
            <>
              <span className="text-primary">1</span>
              <span className="text-muted">–0</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Helper function to check if a player participated in a match
const playerInMatch = (match: Match, playerId: string): boolean => {
  return (
    match.team1[0].id === playerId ||
    match.team1[1]?.id === playerId ||
    match.team2[0].id === playerId ||
    match.team2[1]?.id === playerId
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
    <div className="-mx-4 sm:mx-0 sm:bg-card sm:backdrop-blur-sm sm:rounded-[var(--th-radius-lg)] sm:shadow-theme-card sm:border sm:border-[var(--th-border-subtle)]">
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
                  ? 'Every game across all seasons'
                  : isArchived
                    ? `Historical matches from ${currentSeason?.name || 'archived season'}`
                    : 'Latest chess battles with friends'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPlayerFilter(!showPlayerFilter)}
              className="bg-[var(--th-sport-primary)] text-white p-2 rounded-[var(--th-radius-md)] hover:opacity-90"
              title="Filter by player"
            >
              <Filter size={16} />
            </button>
            {!isArchived && onAddMatch && (
              <button
                type="button"
                onClick={onAddMatch}
                className="bg-sport-gradient text-white p-2 rounded-[var(--th-radius-md)] hover:bg-sport-gradient-hover"
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
            <div className="bg-accent-subtle p-3 rounded-[var(--th-radius-md)] border border-[var(--th-border)]">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-primary">Filter by Player</span>
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
                      ? 'bg-[var(--th-sport-primary)]/20 text-primary'
                      : 'bg-card text-secondary hover:bg-[var(--th-sport-primary)]/10'
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
                        ? 'bg-[var(--th-sport-primary)]/20 text-primary'
                        : 'bg-card text-secondary hover:bg-[var(--th-sport-primary)]/10'
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
          <Alert className="bg-accent-subtle border-[var(--th-border)]">
            <Target className="h-4 w-4 text-[var(--th-sport-primary)]" />
            <AlertDescription className="text-secondary font-medium text-sm">
              No games recorded yet. Tap + to record your first chess match!
            </AlertDescription>
          </Alert>
        ) : (
          <div className="grid grid-cols-1 sm:gap-3 max-w-2xl mx-auto">
            {filteredMatches.map((match) => (
              <div
                key={match.id}
                className="border-b border-[var(--th-border-subtle)] sm:bg-card sm:border sm:rounded-[var(--th-radius-lg)] sm:p-3 sm:shadow-sm"
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
                    <span className="bg-gradient-to-r from-emerald-100 to-green-200 text-emerald-800 px-2 py-1 rounded-full text-xs font-bold">
                      Completed
                    </span>
                  </div>

                  <div className="flex flex-col sm:grid sm:grid-cols-3 gap-3 sm:items-center">
                    {(() => {
                      const isDraw = match.score1 === match.score2
                      return (
                        <>
                          <div
                            className={`text-center p-2 rounded-[var(--th-radius-md)] border ${
                              isDraw
                                ? 'bg-[var(--th-draw)]/10 border-[var(--th-draw)]/30'
                                : match.score1 > match.score2
                                  ? 'bg-[var(--th-win)]/10 border-[var(--th-win)]/30'
                                  : 'bg-[var(--th-loss)]/10 border-[var(--th-loss)]/30'
                            }`}
                          >
                            <div
                              className={`font-bold mb-1 text-xs ${
                                isDraw
                                  ? 'text-[var(--th-draw)]'
                                  : match.score1 > match.score2
                                    ? 'text-[var(--th-win)]'
                                    : 'text-[var(--th-loss)]'
                              }`}
                            >
                              {isDraw ? 'Draw' : match.score1 > match.score2 ? 'Winner' : 'White ♔'}
                            </div>
                            <div className="space-y-1">
                              <PlayerWithStats
                                player={match.team1[0]}
                                match={match}
                                teamColor={
                                  isDraw
                                    ? 'text-[var(--th-draw)]'
                                    : match.score1 > match.score2
                                      ? 'text-[var(--th-win)]'
                                      : 'text-[var(--th-loss)]'
                                }
                                onPlayerClick={onPlayerClick}
                              />
                            </div>
                          </div>

                          <div className="text-center order-first sm:order-none">
                            {isDraw ? (
                              <>
                                <div className="mx-auto mb-1 text-xl font-bold text-[var(--th-draw)]">
                                  ½-½
                                </div>
                                <div className="text-xs font-medium text-[var(--th-draw)]">
                                  Draw
                                </div>
                              </>
                            ) : (
                              <>
                                <Crown
                                  className={`mx-auto mb-1 ${
                                    match.score1 > match.score2
                                      ? 'text-[var(--th-win)]'
                                      : 'text-muted'
                                  }`}
                                  size={24}
                                />
                                <div className="text-xs font-medium text-[var(--th-win)]">
                                  {match.score1 > match.score2
                                    ? match.team1[0].name
                                    : match.team2[0].name}{' '}
                                  wins!
                                </div>
                              </>
                            )}
                          </div>

                          <div
                            className={`text-center p-2 rounded-[var(--th-radius-md)] border ${
                              isDraw
                                ? 'bg-[var(--th-draw)]/10 border-[var(--th-draw)]/30'
                                : match.score2 > match.score1
                                  ? 'bg-[var(--th-win)]/10 border-[var(--th-win)]/30'
                                  : 'bg-[var(--th-loss)]/10 border-[var(--th-loss)]/30'
                            }`}
                          >
                            <div
                              className={`font-bold mb-1 text-xs ${
                                isDraw
                                  ? 'text-[var(--th-draw)]'
                                  : match.score2 > match.score1
                                    ? 'text-[var(--th-win)]'
                                    : 'text-[var(--th-loss)]'
                              }`}
                            >
                              {isDraw ? 'Draw' : match.score2 > match.score1 ? 'Winner' : 'Black ♚'}
                            </div>
                            <div className="space-y-1">
                              <PlayerWithStats
                                player={match.team2[0]}
                                match={match}
                                teamColor={
                                  isDraw
                                    ? 'text-[var(--th-draw)]'
                                    : match.score2 > match.score1
                                      ? 'text-[var(--th-win)]'
                                      : 'text-[var(--th-loss)]'
                                }
                                onPlayerClick={onPlayerClick}
                              />
                            </div>
                          </div>
                        </>
                      )
                    })()}
                  </div>
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
