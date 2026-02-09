import type { Match, Player, PlayerMatchStats } from '@foos/shared'
import { calculateRankingChange } from '@foos/shared'
import {
  Calendar,
  Clock,
  Crown,
  Filter,
  Plus,
  Target,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
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
      match.team1[1]?.id === playerId ||
      match.team2[0].id === playerId ||
      match.team2[1]?.id === playerId
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
        <div className="bg-gradient-to-r from-[#F0EFF4] to-[#E8D5E0] border-b border-[#832161]/20 px-4 py-2 flex items-center gap-2">
          <Calendar size={16} className="text-[#832161]" />
          <span className="text-sm font-medium text-[#3D2645]">
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
                  : 'Latest chess battles with friends'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPlayerFilter(!showPlayerFilter)}
              className="bg-gradient-to-r from-[#3D2645] to-[#5a3a66] text-white p-2 rounded-lg hover:from-[#2d1c33] hover:to-[#4a2e55]"
              title="Filter by player"
            >
              <Filter size={16} />
            </button>
            <button
              type="button"
              onClick={onAddMatch}
              className="bg-gradient-to-r from-[#832161] to-[#DA4167] text-white p-2 rounded-lg hover:from-[#6e1b52] hover:to-[#c93558]"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* Player Filter Dropdown */}
        {showPlayerFilter && (
          <div className="mt-4 relative">
            <div className="bg-gradient-to-r from-[#F0EFF4] to-[#E8D5E0] p-3 rounded-lg border border-[#832161]/20">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-[#3D2645]">Filter by Player</span>
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
                      ? 'bg-[#832161]/20 text-[#3D2645]'
                      : 'bg-white/60 text-slate-600 hover:bg-[#832161]/10'
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
                        ? 'bg-[#832161]/20 text-[#3D2645]'
                        : 'bg-white/60 text-slate-600 hover:bg-[#832161]/10'
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
          <Alert className="bg-gradient-to-r from-[#F0EFF4] to-[#E8D5E0] border-[#832161]/20">
            <Target className="h-4 w-4 text-[#832161]" />
            <AlertDescription className="text-slate-600 font-medium text-sm">
              No games recorded yet. Tap + to record your first chess match!
            </AlertDescription>
          </Alert>
        ) : (
          <div className="grid grid-cols-1 gap-2 max-w-2xl mx-auto">
            {filteredMatches.map((match) => (
              <div
                key={match.id}
                className="bg-gradient-to-br from-white to-slate-50 border border-white/50 rounded-xl p-2 shadow-sm"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="text-xs text-slate-600 flex items-center gap-1">
                    <Clock size={12} />
                    {match.date} at {match.time}
                  </div>
                  <span className="bg-gradient-to-r from-emerald-100 to-green-200 text-emerald-800 px-2 py-1 rounded-full text-xs font-bold">
                    Completed
                  </span>
                </div>

                <div className="flex flex-col sm:grid sm:grid-cols-3 gap-2 sm:items-center">
                  <div
                    className={`text-center p-2 rounded-lg border ${
                      match.score1 > match.score2
                        ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200/50'
                        : 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200/50'
                    }`}
                  >
                    <div
                      className={`font-bold mb-1 text-xs ${match.score1 > match.score2 ? 'text-green-800' : 'text-amber-800'}`}
                    >
                      White ♔
                    </div>
                    <div className="space-y-1">
                      <PlayerWithStats
                        player={match.team1[0]}
                        match={match}
                        teamColor={
                          match.score1 > match.score2 ? 'text-green-700' : 'text-amber-700'
                        }
                        onPlayerClick={onPlayerClick}
                      />
                    </div>
                  </div>

                  <div className="text-center order-first sm:order-none">
                    <Crown
                      className={`mx-auto mb-0.5 ${
                        match.score1 > match.score2 ? 'text-green-500' : 'text-slate-500'
                      }`}
                      size={20}
                    />
                    <div className="text-xs font-medium text-green-600">
                      {match.score1 > match.score2 ? match.team1[0].name : match.team2[0].name}{' '}
                      wins!
                    </div>
                  </div>

                  <div
                    className={`text-center p-2 rounded-lg border ${
                      match.score2 > match.score1
                        ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200/50'
                        : 'bg-gradient-to-br from-slate-100 to-slate-50 border-slate-300/50'
                    }`}
                  >
                    <div
                      className={`font-bold mb-1 text-xs ${match.score2 > match.score1 ? 'text-green-800' : 'text-slate-800'}`}
                    >
                      Black ♚
                    </div>
                    <div className="space-y-1">
                      <PlayerWithStats
                        player={match.team2[0]}
                        match={match}
                        teamColor={
                          match.score2 > match.score1 ? 'text-green-700' : 'text-slate-700'
                        }
                        onPlayerClick={onPlayerClick}
                      />
                    </div>
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
