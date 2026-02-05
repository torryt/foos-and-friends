import type { Match, Player, PlayerMatchStats, PlayerPosition } from '@foos/shared'
import { calculateRankingChange } from '@foos/shared'
import { Calendar, Clock, Filter, Plus, Target, TrendingDown, TrendingUp, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { PositionIcon } from '@/components/PositionIcon'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useSeasonContext } from '@/contexts/SeasonContext'

interface MatchHistoryProps {
  matches: Match[]
  players: Player[]
  onAddMatch: () => void
  initialSelectedPlayer?: string
  onPlayerClick?: (playerId: string) => void
}

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
      <span className="text-green-600 flex items-center gap-0.5">
        <TrendingUp size={10} />+{change}
      </span>
    )
  } else if (change < 0) {
    return (
      <span className="text-red-600 flex items-center gap-0.5">
        <TrendingDown size={10} />
        {change}
      </span>
    )
  } else {
    return <span className="text-gray-500">0</span>
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
        <div className="text-xs text-gray-600">
          <div className="flex items-center gap-1">
            <span className="font-medium">{stats.postGameRanking}</span>
            {formatRankingChange(calculateRankingChange(stats))}
          </div>
        </div>
      ) : (
        <div className="text-xs text-gray-600">
          <div className="flex items-center">
            <span className="font-medium">{player.ranking}</span>
          </div>
        </div>
      )}
    </div>
  )
}

const MatchHistory = ({
  matches,
  players,
  onAddMatch,
  initialSelectedPlayer,
  onPlayerClick,
}: MatchHistoryProps) => {
  const { currentSeason } = useSeasonContext()
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(initialSelectedPlayer || null)
  const [showPlayerFilter, setShowPlayerFilter] = useState(false)

  useEffect(() => {
    if (initialSelectedPlayer) {
      setSelectedPlayer(initialSelectedPlayer)
    }
  }, [initialSelectedPlayer])

  // Helper function to check if a player participated in a match
  const playerInMatch = (match: Match, playerId: string): boolean => {
    return (
      match.team1[0].id === playerId ||
      match.team1[1].id === playerId ||
      match.team2[0].id === playerId ||
      match.team2[1].id === playerId
    )
  }

  // Filter matches based on selected player
  const filteredMatches = selectedPlayer
    ? matches.filter((match) => playerInMatch(match, selectedPlayer))
    : matches

  const selectedPlayerData = selectedPlayer ? players.find((p) => p.id === selectedPlayer) : null
  const isArchived = !!currentSeason && !currentSeason.isActive

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/50">
      {/* Archived Season Indicator */}
      {isArchived && (
        <div className="bg-gradient-to-r from-orange-100 to-amber-100 border-b border-orange-200 px-4 py-2 flex items-center gap-2">
          <Calendar size={16} className="text-orange-600" />
          <span className="text-sm font-medium text-orange-800">
            Viewing archived season: {currentSeason.name} ({currentSeason.startDate} -{' '}
            {currentSeason.endDate || 'Unknown'})
          </span>
        </div>
      )}

      <div className="p-4 border-b border-slate-200/50">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              {selectedPlayerData ? `${selectedPlayerData.name}'s Games` : 'Recent Games'}
            </h2>
            <p className="text-sm text-slate-600">
              {selectedPlayerData
                ? `Match history for ${selectedPlayerData.name}`
                : isArchived
                  ? `Historical matches from ${currentSeason?.name || 'archived season'}`
                  : 'Latest foos battles with friends'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPlayerFilter(!showPlayerFilter)}
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-2 rounded-lg hover:from-blue-600 hover:to-purple-700"
              title="Filter by player"
            >
              <Filter size={16} />
            </button>
            <button
              type="button"
              onClick={onAddMatch}
              className="bg-gradient-to-r from-orange-500 to-red-600 text-white p-2 rounded-lg hover:from-orange-600 hover:to-red-700"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* Player Filter Dropdown */}
        {showPlayerFilter && (
          <div className="mt-4 relative">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-3 rounded-lg border border-blue-200/50">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-blue-800">Filter by Player</span>
                <button
                  type="button"
                  onClick={() => setShowPlayerFilter(false)}
                  className="text-slate-400 hover:text-slate-600"
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
                      ? 'bg-blue-200 text-blue-800'
                      : 'bg-white/60 text-slate-600 hover:bg-blue-100'
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
                        ? 'bg-blue-200 text-blue-800'
                        : 'bg-white/60 text-slate-600 hover:bg-blue-100'
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

      <div className="p-4">
        {filteredMatches.length === 0 ? (
          <Alert className="bg-gradient-to-r from-orange-50 to-red-50 border-orange-200/50">
            <Target className="h-4 w-4 text-orange-500" />
            <AlertDescription className="text-slate-600 font-medium text-sm">
              No games recorded yet. Tap + to record your first foos battle!
            </AlertDescription>
          </Alert>
        ) : (
          <div className="grid grid-cols-1 gap-3 max-w-2xl mx-auto">
            {filteredMatches.map((match) => (
              <div
                key={match.id}
                className="bg-gradient-to-br from-white to-slate-50 border border-white/50 rounded-xl p-3 shadow-sm"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="text-xs text-slate-600 flex items-center gap-1">
                    <Clock size={12} />
                    {match.date} at {match.time}
                  </div>
                  <span className="bg-gradient-to-r from-emerald-100 to-green-200 text-emerald-800 px-2 py-1 rounded-full text-xs font-bold">
                    Completed
                  </span>
                </div>

                <div className="flex flex-col sm:grid sm:grid-cols-3 gap-3 sm:items-center">
                  <div className="text-center bg-gradient-to-br from-blue-50 to-cyan-50 p-2 rounded-lg border border-blue-200/50">
                    <div className="font-bold text-blue-800 mb-1 text-xs">Team 1</div>
                    <div className="space-y-1">
                      <PlayerWithStats
                        player={match.team1[0]}
                        match={match}
                        teamColor="text-blue-700"
                        position="attacker"
                        onPlayerClick={onPlayerClick}
                      />
                      <PlayerWithStats
                        player={match.team1[1]}
                        match={match}
                        teamColor="text-blue-700"
                        position="defender"
                        onPlayerClick={onPlayerClick}
                      />
                    </div>
                    <div className="text-xs bg-blue-100 text-blue-600 px-1 py-0.5 rounded-full mt-1">
                      {match.playerStats ? (
                        <>
                          Pre-Avg:{' '}
                          {Math.round(
                            (getPlayerStats(match, match.team1[0].id)?.preGameRanking ||
                              match.team1[0].ranking) +
                              (getPlayerStats(match, match.team1[1].id)?.preGameRanking ||
                                match.team1[1].ranking),
                          ) / 2}
                        </>
                      ) : (
                        <>
                          Avg: {Math.round((match.team1[0].ranking + match.team1[1].ranking) / 2)}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-center order-first sm:order-none">
                    <div
                      className={`text-2xl font-bold mb-1 ${
                        match.score1 > match.score2
                          ? 'text-green-600'
                          : match.score2 > match.score1
                            ? 'text-red-600'
                            : 'text-slate-600'
                      }`}
                    >
                      {match.score1} - {match.score2}
                    </div>
                    <div className="text-xs text-slate-500">Final Score</div>
                  </div>

                  <div className="text-center bg-gradient-to-br from-purple-50 to-violet-50 p-2 rounded-lg border border-purple-200/50">
                    <div className="font-bold text-purple-800 mb-1 text-xs">Team 2</div>
                    <div className="space-y-1">
                      <PlayerWithStats
                        player={match.team2[0]}
                        match={match}
                        teamColor="text-purple-700"
                        position="attacker"
                        onPlayerClick={onPlayerClick}
                      />
                      <PlayerWithStats
                        player={match.team2[1]}
                        match={match}
                        teamColor="text-purple-700"
                        position="defender"
                        onPlayerClick={onPlayerClick}
                      />
                    </div>
                    <div className="text-xs bg-purple-100 text-purple-600 px-1 py-0.5 rounded-full mt-1">
                      {match.playerStats ? (
                        <>
                          Pre-Avg:{' '}
                          {Math.round(
                            (getPlayerStats(match, match.team2[0].id)?.preGameRanking ||
                              match.team2[0].ranking) +
                              (getPlayerStats(match, match.team2[1].id)?.preGameRanking ||
                                match.team2[1].ranking),
                          ) / 2}
                        </>
                      ) : (
                        <>
                          Avg: {Math.round((match.team2[0].ranking + match.team2[1].ranking) / 2)}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {match.score1 !== match.score2 && (
                  <div className="mt-2 text-center">
                    <span className="text-xs font-medium text-green-600">
                      🎉 Team {match.score1 > match.score2 ? '1' : '2'} wins! Great game, friends!
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default MatchHistory
