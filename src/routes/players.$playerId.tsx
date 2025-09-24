import { createFileRoute, Link } from '@tanstack/react-router'
import {
  Calendar,
  ChartLine,
  ChevronDown,
  ChevronUp,
  Edit2,
  Minus,
  Save,
  Shield,
  Sword,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { PlayerComparisonChart } from '@/components/charts/PlayerComparisonChart'
import { RankingChart } from '@/components/charts/RankingChart'
import { PositionIcon } from '@/components/PositionIcon'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { AVAILABLE_AVATARS } from '@/constants/avatars'
import { useGameLogic } from '@/hooks/useGameLogic'
import { usePositionStats } from '@/hooks/usePositionStats'
import { useRankingHistory } from '@/hooks/useRankingHistory'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/players/$playerId')({
  component: PlayerProfile,
})

function PlayerProfile() {
  const { playerId } = Route.useParams()
  const { players, matches, updatePlayer, loading } = useGameLogic()
  const [isEditing, setIsEditing] = useState(false)
  const [editedName, setEditedName] = useState('')
  const [editedAvatar, setEditedAvatar] = useState('')
  const [showComparison, setShowComparison] = useState(false)
  const [comparePlayerIds, setComparePlayerIds] = useState<string[]>([])
  const [showPlayerSelector, setShowPlayerSelector] = useState(false)
  const [showRankingChart, setShowRankingChart] = useState(true)

  const player = players.find((p) => p.id === playerId)
  const positionStats = usePositionStats(playerId, matches)

  // Get ranking history for main player and comparison players
  const mainPlayerHistory = useRankingHistory(playerId, matches, players)
  const comparisonHistories = useRankingHistory(
    showComparison ? [playerId, ...comparePlayerIds] : [],
    matches,
    players,
  )

  // Scroll to top when navigating to a different player
  useEffect(() => {
    // Explicitly using playerId to track navigation between different players
    if (playerId) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [playerId])

  // Calculate player statistics
  const playerStats = useMemo(() => {
    if (!player) return null

    const playerMatches = matches.filter((match) => {
      return (
        match.team1[0].id === playerId ||
        match.team1[1].id === playerId ||
        match.team2[0].id === playerId ||
        match.team2[1].id === playerId
      )
    })

    // Recent form (last 5 matches)
    const recentMatches = playerMatches.slice(0, 5)
    const recentForm = recentMatches.map((match) => {
      const wasInTeam1 = match.team1[0].id === playerId || match.team1[1].id === playerId
      const won = wasInTeam1 ? match.score1 > match.score2 : match.score2 > match.score1
      return won ? 'W' : 'L'
    })

    // Win/loss streaks
    let currentStreak = 0
    let streakType: 'win' | 'loss' | null = null
    for (const match of playerMatches) {
      const wasInTeam1 = match.team1[0].id === playerId || match.team1[1].id === playerId
      const won = wasInTeam1 ? match.score1 > match.score2 : match.score2 > match.score1

      if (streakType === null) {
        streakType = won ? 'win' : 'loss'
        currentStreak = 1
      } else if ((won && streakType === 'win') || (!won && streakType === 'loss')) {
        currentStreak++
      } else {
        break
      }
    }

    // Goals statistics
    const totalGoalsScored = playerMatches.reduce((sum, match) => {
      const wasInTeam1 = match.team1[0].id === playerId || match.team1[1].id === playerId
      return sum + (wasInTeam1 ? match.score1 : match.score2)
    }, 0)

    const totalGoalsConceded = playerMatches.reduce((sum, match) => {
      const wasInTeam1 = match.team1[0].id === playerId || match.team1[1].id === playerId
      return sum + (wasInTeam1 ? match.score2 : match.score1)
    }, 0)

    const avgGoalsScored =
      playerMatches.length > 0 ? (totalGoalsScored / playerMatches.length).toFixed(1) : '0'
    const avgGoalsConceded =
      playerMatches.length > 0 ? (totalGoalsConceded / playerMatches.length).toFixed(1) : '0'

    // Get ranking history from player stats
    const rankingHistory: number[] = []
    for (const match of playerMatches) {
      if (match.playerStats) {
        const playerStat = match.playerStats.find((ps) => ps.playerId === playerId)
        if (playerStat) {
          rankingHistory.push(playerStat.postGameRanking)
        }
      }
    }

    const highestRanking =
      rankingHistory.length > 0 ? Math.max(player.ranking, ...rankingHistory) : player.ranking
    const lowestRanking =
      rankingHistory.length > 0 ? Math.min(player.ranking, ...rankingHistory) : player.ranking

    return {
      totalMatches: playerMatches.length,
      recentForm,
      currentStreak,
      streakType,
      avgGoalsScored,
      avgGoalsConceded,
      goalDifference: totalGoalsScored - totalGoalsConceded,
      highestRanking,
      lowestRanking,
      playerMatches,
    }
  }, [player, matches, playerId])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading player data...</div>
      </div>
    )
  }

  if (!player || !playerStats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Player not found</div>
      </div>
    )
  }

  const handleSave = async () => {
    if (editedName.trim()) {
      await updatePlayer(player.id, {
        name: editedName.trim(),
        avatar: editedAvatar.trim() || player.avatar,
      })
      setIsEditing(false)
    }
  }

  const handleCancel = () => {
    setEditedName(player.name)
    setEditedAvatar(player.avatar)
    setIsEditing(false)
  }

  const startEdit = () => {
    setEditedName(player.name)
    setEditedAvatar(player.avatar)
    setIsEditing(true)
  }

  const handleToggleComparison = () => {
    setShowComparison(!showComparison)
    if (!showComparison) {
      setComparePlayerIds([])
    }
    setShowPlayerSelector(false)
  }

  const handleAddComparePlayer = (playerId: string) => {
    if (!comparePlayerIds.includes(playerId) && comparePlayerIds.length < 5) {
      setComparePlayerIds([...comparePlayerIds, playerId])
    }
    setShowPlayerSelector(false)
  }

  const handleRemoveComparePlayer = (playerId: string) => {
    setComparePlayerIds(comparePlayerIds.filter((id) => id !== playerId))
  }

  const getRankIcon = () => {
    const position =
      players.sort((a, b) => b.ranking - a.ranking).findIndex((p) => p.id === player.id) + 1
    if (position === 1) return <Trophy className="w-5 h-5 text-yellow-500" />
    if (position === 2) return <Trophy className="w-5 h-5 text-gray-400" />
    if (position === 3) return <Trophy className="w-5 h-5 text-orange-500" />
    return null
  }

  const getRankingBadgeColor = (ranking: number) => {
    if (ranking >= 1800) return 'bg-purple-100 text-purple-800 border-purple-200'
    if (ranking >= 1600) return 'bg-green-100 text-green-800 border-green-200'
    if (ranking >= 1400) return 'bg-blue-100 text-blue-800 border-blue-200'
    if (ranking >= 1200) return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    return 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const winRate =
    player.matchesPlayed > 0 ? Math.round((player.wins / player.matchesPlayed) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Player Header Card */}
      <Card className="p-6 bg-white/80 backdrop-blur-sm">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white text-2xl font-bold">
                {player.avatar}
              </div>
              {getRankIcon() && (
                <div className="absolute -top-1 -right-1 bg-white rounded-full p-1 shadow-lg">
                  {getRankIcon()}
                </div>
              )}
            </div>

            <div>
              {isEditing ? (
                <div className="space-y-3">
                  <div>
                    <Label>Name</Label>
                    <Input
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Choose Avatar</Label>
                    <div className="mt-2 bg-gradient-to-r from-orange-50 to-yellow-50 p-3 rounded-lg border border-orange-200/50">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">{editedAvatar}</span>
                        <span className="text-sm text-orange-800">Current</span>
                      </div>
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-1 max-h-32 overflow-y-auto">
                        {AVAILABLE_AVATARS.map((avatar) => (
                          <button
                            key={avatar}
                            type="button"
                            onClick={() => setEditedAvatar(avatar)}
                            className={`text-xl p-1.5 rounded hover:bg-orange-100 transition-colors ${
                              editedAvatar === avatar
                                ? 'bg-orange-200 border-2 border-orange-400'
                                : 'bg-white/60 border-2 border-transparent'
                            }`}
                          >
                            {avatar}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button onClick={handleSave} size="sm">
                      <Save className="w-4 h-4 mr-1" />
                      Save
                    </Button>
                    <Button onClick={handleCancel} variant="outline" size="sm">
                      <X className="w-4 h-4 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <h1 className="text-2xl font-bold text-gray-900">{player.name}</h1>
                  <div className="flex items-center space-x-3 mt-2">
                    <span
                      className={cn(
                        'px-3 py-1 rounded-full text-sm font-medium border',
                        getRankingBadgeColor(player.ranking),
                      )}
                    >
                      {player.ranking} pts
                    </span>
                    <span className="text-sm text-gray-500">
                      Rank #
                      {players
                        .sort((a, b) => b.ranking - a.ranking)
                        .findIndex((p) => p.id === player.id) + 1}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {!isEditing && (
            <Button onClick={startEdit} variant="outline" size="sm" className="whitespace-normal">
              <Edit2 className="w-4 h-4 mr-1" />
              Edit Profile
            </Button>
          )}
        </div>
      </Card>

      {/* Position Statistics */}
      <Card className="p-4 md:p-6 bg-white/80 backdrop-blur-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Position Statistics</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg border border-orange-200/50">
            <div className="flex items-center gap-2 mb-2">
              <Sword className="w-5 h-5 text-orange-500" />
              <span className="font-medium text-orange-800">Attacker</span>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-600">
                Games: <span className="font-semibold">{positionStats.gamesAsAttacker}</span>
              </p>
              <p className="text-sm text-gray-600">
                Wins:{' '}
                <span className="font-semibold text-green-600">{positionStats.winsAsAttacker}</span>
              </p>
              <p className="text-sm text-gray-600">
                Losses:{' '}
                <span className="font-semibold text-red-600">{positionStats.lossesAsAttacker}</span>
              </p>
              <p className="text-sm text-gray-600">
                Win Rate: <span className="font-semibold">{positionStats.winRateAsAttacker}%</span>
              </p>
            </div>
          </div>
          <div className="p-3 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border border-blue-200/50">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-5 h-5 text-blue-500" />
              <span className="font-medium text-blue-800">Defender</span>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-600">
                Games: <span className="font-semibold">{positionStats.gamesAsDefender}</span>
              </p>
              <p className="text-sm text-gray-600">
                Wins:{' '}
                <span className="font-semibold text-green-600">{positionStats.winsAsDefender}</span>
              </p>
              <p className="text-sm text-gray-600">
                Losses:{' '}
                <span className="font-semibold text-red-600">{positionStats.lossesAsDefender}</span>
              </p>
              <p className="text-sm text-gray-600">
                Win Rate: <span className="font-semibold">{positionStats.winRateAsDefender}%</span>
              </p>
            </div>
          </div>
        </div>
        {positionStats.preferredPosition && (
          <div className="mt-4 p-2 bg-gradient-to-r from-gray-50 to-slate-50 rounded-lg border border-gray-200/50">
            <p className="text-sm text-gray-600 flex items-center gap-2">
              <span>Preferred Position:</span>
              <PositionIcon position={positionStats.preferredPosition} size={14} showLabel />
            </p>
          </div>
        )}
      </Card>

      {/* Ranking Visualization */}
      <Card className="p-4 md:p-6 bg-white/80 backdrop-blur-sm">
        <div className="flex flex-col gap-4">
          {/* Header with toggle and comparison controls */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowRankingChart(!showRankingChart)}
              className="flex items-center gap-2 text-lg font-semibold text-gray-900 hover:text-gray-700 transition-colors"
            >
              <ChartLine className="w-5 h-5" />
              <span>Ranking History</span>
              {showRankingChart ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {showRankingChart && (
              <Button
                onClick={handleToggleComparison}
                variant={showComparison ? 'default' : 'outline'}
                size="sm"
                className="whitespace-normal"
              >
                <Users className="w-4 h-4 mr-1" />
                {showComparison ? 'Hide' : 'Compare'}
              </Button>
            )}
          </div>

          {/* Chart Content */}
          {showRankingChart && (
            <>
              {showComparison ? (
                <div className="space-y-4">
                  {/* Player selector for comparison */}
                  <div className="flex flex-wrap gap-2">
                    {comparePlayerIds.map((id) => {
                      const comparePlayer = players.find((p) => p.id === id)
                      if (!comparePlayer) return null
                      return (
                        <div
                          key={id}
                          className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-lg"
                        >
                          <span className="text-sm">{comparePlayer.avatar}</span>
                          <span className="text-xs text-gray-600">{comparePlayer.name}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveComparePlayer(id)}
                            className="ml-1 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )
                    })}
                    {comparePlayerIds.length < 5 && (
                      <div className="relative">
                        <Button
                          onClick={() => setShowPlayerSelector(!showPlayerSelector)}
                          variant="outline"
                          size="sm"
                        >
                          <UserPlus className="w-4 h-4 mr-1" />
                          Add Player
                        </Button>

                        {showPlayerSelector && (
                          <div className="absolute top-full mt-1 left-0 z-50 w-48 bg-white rounded-lg shadow-lg border border-gray-200 max-h-64 overflow-y-auto">
                            {players
                              .filter(
                                (p) =>
                                  p.id !== playerId &&
                                  !comparePlayerIds.includes(p.id) &&
                                  p.matchesPlayed > 0,
                              )
                              .sort((a, b) => b.ranking - a.ranking)
                              .map((p) => (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => handleAddComparePlayer(p.id)}
                                  className="w-full px-3 py-2 flex items-center gap-2 hover:bg-gray-50 transition-colors text-left"
                                >
                                  <span className="text-sm">{p.avatar}</span>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm text-gray-900 truncate">{p.name}</div>
                                    <div className="text-xs text-gray-500">{p.ranking} pts</div>
                                  </div>
                                </button>
                              ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Comparison chart */}
                  <PlayerComparisonChart histories={comparisonHistories} height={300} />
                </div>
              ) : (
                /* Single player chart */
                mainPlayerHistory[0] && <RankingChart history={mainPlayerHistory[0]} height={250} />
              )}

              {/* Chart statistics */}
              {mainPlayerHistory[0] && mainPlayerHistory[0].data.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                  <div className="text-center p-2 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">Highest</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {mainPlayerHistory[0].highestRanking}
                    </p>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">Lowest</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {mainPlayerHistory[0].lowestRanking}
                    </p>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">Current</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {mainPlayerHistory[0].currentRanking}
                    </p>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">Change</p>
                    <p
                      className={cn(
                        'text-sm font-semibold',
                        mainPlayerHistory[0].currentRanking - mainPlayerHistory[0].initialRanking >
                          0
                          ? 'text-green-600'
                          : mainPlayerHistory[0].currentRanking -
                                mainPlayerHistory[0].initialRanking <
                              0
                            ? 'text-red-600'
                            : 'text-gray-900',
                      )}
                    >
                      {mainPlayerHistory[0].currentRanking - mainPlayerHistory[0].initialRanking > 0
                        ? '+'
                        : ''}
                      {mainPlayerHistory[0].currentRanking - mainPlayerHistory[0].initialRanking}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </Card>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-white/80 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Win Rate</p>
              <p className="text-2xl font-bold text-gray-900">{winRate}%</p>
              <p className="text-xs text-gray-500 mt-1">
                {player.wins}W - {player.losses}L
              </p>
            </div>
            <div
              className={cn(
                'w-12 h-12 rounded-full flex items-center justify-center',
                winRate >= 50 ? 'bg-green-100' : 'bg-red-100',
              )}
            >
              {winRate >= 50 ? (
                <TrendingUp className="w-6 h-6 text-green-600" />
              ) : (
                <TrendingDown className="w-6 h-6 text-red-600" />
              )}
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-white/80 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Current Streak</p>
              <p className="text-2xl font-bold text-gray-900">
                {playerStats.currentStreak > 0 ? playerStats.currentStreak : 0}
                {playerStats.streakType === 'win'
                  ? 'W'
                  : playerStats.streakType === 'loss'
                    ? 'L'
                    : ''}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Form: {playerStats.recentForm.join(' ') || 'No matches'}
              </p>
            </div>
            <div
              className={cn(
                'w-12 h-12 rounded-full flex items-center justify-center',
                playerStats.streakType === 'win'
                  ? 'bg-green-100'
                  : playerStats.streakType === 'loss'
                    ? 'bg-red-100'
                    : 'bg-gray-100',
              )}
            >
              {playerStats.streakType === 'win' ? (
                <TrendingUp className="w-6 h-6 text-green-600" />
              ) : playerStats.streakType === 'loss' ? (
                <TrendingDown className="w-6 h-6 text-red-600" />
              ) : (
                <Minus className="w-6 h-6 text-gray-600" />
              )}
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-white/80 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Goals (Avg)</p>
              <p className="text-2xl font-bold text-gray-900">
                {playerStats.avgGoalsScored} - {playerStats.avgGoalsConceded}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Diff: {playerStats.goalDifference > 0 ? '+' : ''}
                {playerStats.goalDifference}
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <Target className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4 bg-white/80 backdrop-blur-sm">
          <div className="flex items-center space-x-3">
            <Calendar className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-500">Total Matches</p>
              <p className="text-lg font-semibold text-gray-900">{player.matchesPlayed}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-white/80 backdrop-blur-sm">
          <div className="flex items-center space-x-3">
            <Users className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-500">Ranking Range</p>
              <p className="text-lg font-semibold text-gray-900">
                {playerStats.lowestRanking} - {playerStats.highestRanking}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Match History */}
      <Card className="p-4 md:p-6 bg-white/80 backdrop-blur-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Match History</h2>
        {playerStats.playerMatches.length > 0 ? (
          <div className="space-y-2 md:space-y-3">
            {playerStats.playerMatches.map((match) => {
              const wasInTeam1 = match.team1[0].id === playerId || match.team1[1].id === playerId
              const won = wasInTeam1 ? match.score1 > match.score2 : match.score2 > match.score1

              const playerRanking = match.playerStats?.find((pr) => pr.playerId === playerId)
              const rankingChange = playerRanking
                ? playerRanking.postGameRanking - playerRanking.preGameRanking
                : 0

              return (
                <div
                  key={match.id}
                  className={cn(
                    'p-3 md:p-4 rounded-lg border',
                    won ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200',
                  )}
                >
                  {/* Mobile-first responsive layout */}
                  <div className="flex flex-col gap-2">
                    {/* First Row: Result, Position, Date */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            'px-2 py-1 rounded text-xs font-medium',
                            won ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800',
                          )}
                        >
                          {won ? 'WIN' : 'LOSS'}
                        </div>
                        <div className="flex items-center gap-1">
                          <PositionIcon
                            position={
                              wasInTeam1
                                ? match.team1[0].id === playerId
                                  ? 'attacker'
                                  : 'defender'
                                : match.team2[0].id === playerId
                                  ? 'attacker'
                                  : 'defender'
                            }
                            size={12}
                          />
                          <span className="hidden sm:inline text-xs text-gray-500">
                            {wasInTeam1
                              ? match.team1[0].id === playerId
                                ? 'Attacker'
                                : 'Defender'
                              : match.team2[0].id === playerId
                                ? 'Attacker'
                                : 'Defender'}
                          </span>
                        </div>
                      </div>
                      <div className="text-xs text-gray-400">{match.date}</div>
                    </div>

                    {/* Second Row: Teams with prominent score */}
                    <div className="flex items-center justify-between gap-2">
                      {/* Team 1 */}
                      <div className="flex items-center gap-1 flex-1 min-w-0">
                        {match.team1.map((player, idx) => (
                          <div key={player.id} className="flex items-center gap-1 min-w-0">
                            {idx > 0 && <span className="text-gray-400 text-xs">+</span>}
                            <Link
                              to="/players/$playerId"
                              params={{ playerId: player.id }}
                              className="flex items-center gap-1 hover:opacity-80 transition-opacity min-w-0"
                            >
                              <span className="text-sm">{player.avatar}</span>
                              <span className="hidden sm:inline text-xs text-gray-600 truncate max-w-[80px] lg:max-w-none">
                                {player.name}
                              </span>
                            </Link>
                          </div>
                        ))}
                      </div>

                      {/* Score - More prominent on mobile */}
                      <div
                        className={cn(
                          'flex items-center gap-1 px-3 py-1 rounded-lg font-bold shrink-0',
                          won
                            ? 'bg-green-100 text-green-800 text-lg sm:text-base'
                            : 'bg-red-100 text-red-800 text-lg sm:text-base',
                        )}
                      >
                        <span>{match.score1}</span>
                        <span className="text-gray-500">-</span>
                        <span>{match.score2}</span>
                      </div>

                      {/* Team 2 */}
                      <div className="flex items-center gap-1 flex-1 min-w-0 justify-end">
                        {match.team2.map((player, idx) => (
                          <div key={player.id} className="flex items-center gap-1 min-w-0">
                            <Link
                              to="/players/$playerId"
                              params={{ playerId: player.id }}
                              className="flex items-center gap-1 hover:opacity-80 transition-opacity min-w-0"
                            >
                              <span className="text-sm">{player.avatar}</span>
                              <span className="hidden sm:inline text-xs text-gray-600 truncate max-w-[80px] lg:max-w-none">
                                {player.name}
                              </span>
                            </Link>
                            {idx === 0 && <span className="text-gray-400 text-xs">+</span>}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Third Row: Ranking (only if available) */}
                    {playerRanking && (
                      <div className="flex justify-center sm:justify-end">
                        <div className="bg-white/50 px-2 py-1 rounded text-xs">
                          <span className="text-gray-500">Ranking: </span>
                          <span className="font-medium">{playerRanking.preGameRanking}</span>
                          <span className="text-gray-400 mx-1">→</span>
                          <span className="font-medium">{playerRanking.postGameRanking}</span>
                          <span
                            className={cn(
                              'ml-1 font-medium',
                              rankingChange > 0
                                ? 'text-green-600'
                                : rankingChange < 0
                                  ? 'text-red-600'
                                  : 'text-gray-400',
                            )}
                          >
                            ({rankingChange > 0 ? '+' : ''}
                            {rankingChange})
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No matches played yet</p>
        )}
      </Card>
    </div>
  )
}
