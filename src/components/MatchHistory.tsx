import { Clock, Filter, Plus, Target, TrendingDown, TrendingUp, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { Match, Player } from '@/types'
import { calculateRankingChange } from '@/types'

interface MatchHistoryProps {
  matches: Match[]
  players: Player[]
  onRecordMatch: () => void
  initialSelectedPlayer?: string
  onPlayerClick?: (playerId: string) => void
}

const MatchHistory = ({
  matches,
  players,
  onRecordMatch,
  initialSelectedPlayer,
  onPlayerClick,
}: MatchHistoryProps) => {
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
  // Helper function to get player stats for a specific player in a match
  const getPlayerStats = (match: Match, playerId: string) => {
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

  // Helper function to render player with stats
  const renderPlayerWithStats = (player: Player, match: Match, teamColor: string) => {
    const stats = getPlayerStats(match, player.id)
    const hasStats = !!stats

    return (
      <div key={player.id} className="flex flex-col items-center">
        <button
          type="button"
          className="flex flex-col items-center gap-0.5 cursor-pointer hover:opacity-80 transition-opacity bg-transparent border-none p-0"
          onClick={() => onPlayerClick?.(player.id)}
        >
          <span className="text-lg md:text-sm">{player.avatar}</span>
          <div
            className={`text-[10px] md:text-xs font-medium ${teamColor} text-center truncate max-w-[60px] md:max-w-none`}
          >
            {player.name}
          </div>
        </button>
        {hasStats ? (
          <div className="text-[10px] md:text-xs text-gray-600">
            <div className="flex items-center justify-center gap-0.5">
              <span className="font-medium">{stats.postGameRanking}</span>
              <span className="scale-75 md:scale-100">
                {formatRankingChange(calculateRankingChange(stats))}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-[10px] md:text-xs text-gray-600">
            <span className="font-medium">{player.ranking}</span>
          </div>
        )}
      </div>
    )
  }
  return (
    <div
      className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/50"
      data-testid="match-history"
    >
      <div className="p-4 border-b border-slate-200/50">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              {selectedPlayerData ? `${selectedPlayerData.name}'s Games` : 'Recent Games'}
            </h2>
            <p className="text-sm text-slate-600">
              {selectedPlayerData
                ? `Match history for ${selectedPlayerData.name}`
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
              onClick={onRecordMatch}
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
          <div className="space-y-2 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
            {filteredMatches.map((match) => (
              <div
                key={match.id}
                className="bg-gradient-to-br from-white to-slate-50 border border-white/50 rounded-lg md:rounded-xl p-2 md:p-3 shadow-sm"
              >
                <div className="flex justify-between items-start mb-2 md:mb-3">
                  <div className="text-[10px] md:text-xs text-slate-600 flex items-center gap-1">
                    <Clock size={10} className="md:w-3 md:h-3" />
                    <span className="hidden md:inline">
                      {match.date} at {match.time}
                    </span>
                    <span className="md:hidden">
                      {match.date.split(' ').pop()} {match.time}
                    </span>
                  </div>
                  <span className="bg-gradient-to-r from-emerald-100 to-green-200 text-emerald-800 px-1.5 md:px-2 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-bold">
                    Done
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1 md:gap-3 items-center">
                  <div className="text-center bg-gradient-to-br from-blue-50 to-cyan-50 p-1 md:p-2 rounded md:rounded-lg border border-blue-200/50">
                    <div className="font-bold text-blue-800 text-[10px] md:text-xs md:mb-1">T1</div>
                    <div className="flex flex-col gap-1 md:space-y-1">
                      {renderPlayerWithStats(match.team1[0], match, 'text-blue-700')}
                      {renderPlayerWithStats(match.team1[1], match, 'text-blue-700')}
                    </div>
                    <div className="text-[9px] md:text-xs bg-blue-100 text-blue-600 px-1 py-0.5 rounded-full mt-1 hidden md:block">
                      {match.playerStats ? (
                        <>
                          Pre:{' '}
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

                  <div className="text-center">
                    <div
                      className={`text-lg md:text-2xl font-bold ${
                        match.score1 > match.score2
                          ? 'text-green-600'
                          : match.score2 > match.score1
                            ? 'text-red-600'
                            : 'text-slate-600'
                      }`}
                    >
                      {match.score1}-{match.score2}
                    </div>
                    <div className="text-[9px] md:text-xs text-slate-500 hidden md:block">
                      Final
                    </div>
                  </div>

                  <div className="text-center bg-gradient-to-br from-purple-50 to-violet-50 p-1 md:p-2 rounded md:rounded-lg border border-purple-200/50">
                    <div className="font-bold text-purple-800 text-[10px] md:text-xs md:mb-1">
                      T2
                    </div>
                    <div className="flex flex-col gap-1 md:space-y-1">
                      {renderPlayerWithStats(match.team2[0], match, 'text-purple-700')}
                      {renderPlayerWithStats(match.team2[1], match, 'text-purple-700')}
                    </div>
                    <div className="text-[9px] md:text-xs bg-purple-100 text-purple-600 px-1 py-0.5 rounded-full mt-1 hidden md:block">
                      {match.playerStats ? (
                        <>
                          Pre:{' '}
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
                  <div className="mt-1 md:mt-2 text-center">
                    <span className="text-[10px] md:text-xs font-medium text-green-600">
                      Team {match.score1 > match.score2 ? '1' : '2'} wins!
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
