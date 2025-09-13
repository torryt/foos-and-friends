import { createFileRoute } from '@tanstack/react-router'
import {
  Calendar,
  Edit2,
  Minus,
  Save,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  Users,
  X,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { useGameLogic } from '@/hooks/useGameLogic'
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

  const player = players.find((p) => p.id === playerId)

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
                    <Label>Avatar Emoji</Label>
                    <Input
                      value={editedAvatar}
                      onChange={(e) => setEditedAvatar(e.target.value)}
                      placeholder={player.avatar}
                      className="mt-1 w-20"
                      maxLength={2}
                    />
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
            <Button onClick={startEdit} variant="outline" size="sm">
              <Edit2 className="w-4 h-4 mr-1" />
              Edit Profile
            </Button>
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
      <Card className="p-6 bg-white/80 backdrop-blur-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Match History</h2>
        {playerStats.playerMatches.length > 0 ? (
          <div className="space-y-3">
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
                    'p-4 rounded-lg border',
                    won ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div
                        className={cn(
                          'px-2 py-1 rounded text-xs font-medium',
                          won ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800',
                        )}
                      >
                        {won ? 'WIN' : 'LOSS'}
                      </div>

                      <div className="flex items-center space-x-2">
                        <div className="flex items-center">
                          <span className="text-sm">{match.team1[0].avatar}</span>
                          <span className="text-sm">{match.team1[1].avatar}</span>
                        </div>
                        <span className="font-semibold">{match.score1}</span>
                        <span className="text-gray-400">-</span>
                        <span className="font-semibold">{match.score2}</span>
                        <div className="flex items-center">
                          <span className="text-sm">{match.team2[0].avatar}</span>
                          <span className="text-sm">{match.team2[1].avatar}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      {playerRanking && (
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Ranking</p>
                          <div className="flex items-center space-x-1">
                            <span className="text-sm font-medium">
                              {playerRanking.preGameRanking}
                            </span>
                            <span className="text-gray-400">→</span>
                            <span className="text-sm font-medium">
                              {playerRanking.postGameRanking}
                            </span>
                            <span
                              className={cn(
                                'text-xs font-medium',
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

                      <div className="text-xs text-gray-400">{match.date}</div>
                    </div>
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
