import { cn } from '@foos/shared'
import { Target, TrendingDown, TrendingUp, Trophy } from 'lucide-react'
import { Card } from '@/components/ui/Card'

interface PlayerStatsCardsProps {
  winRate: number
  wins: number
  losses: number
  goalDifference: number
  goalsFor: number
  goalsAgainst: number
  currentStreak: number
  streakType: 'win' | 'loss' | null
  bestStreak: number
  worstStreak: number
}

export function PlayerStatsCards({
  winRate,
  wins,
  losses,
  goalDifference,
  goalsFor,
  goalsAgainst,
  currentStreak,
  streakType,
  bestStreak,
  worstStreak,
}: PlayerStatsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Win Rate Card */}
      <Card className="p-4 bg-white/80 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Win Rate</p>
            <p className="text-2xl font-bold text-gray-900">{winRate}%</p>
            <p className="text-xs text-gray-500 mt-1">
              {wins}W - {losses}L
            </p>
          </div>
          <div
            className={cn(
              'p-3 rounded-full',
              winRate >= 60
                ? 'bg-green-100 text-green-600'
                : winRate >= 40
                  ? 'bg-yellow-100 text-yellow-600'
                  : 'bg-red-100 text-red-600',
            )}
          >
            <Trophy className="w-6 h-6" />
          </div>
        </div>
      </Card>

      {/* Point Difference Card */}
      <Card className="p-4 bg-white/80 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Point Difference</p>
            <p className="text-2xl font-bold text-gray-900">
              {goalDifference > 0 ? '+' : ''}
              {goalDifference}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {goalsFor} PF - {goalsAgainst} PA
            </p>
          </div>
          <div
            className={cn(
              'p-3 rounded-full',
              goalDifference > 0
                ? 'bg-green-100 text-green-600'
                : goalDifference === 0
                  ? 'bg-gray-100 text-gray-600'
                  : 'bg-red-100 text-red-600',
            )}
          >
            <Target className="w-6 h-6" />
          </div>
        </div>
      </Card>

      {/* Current Streak Card */}
      <Card className="p-4 bg-white/80 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Current Streak</p>
            <p className="text-2xl font-bold text-gray-900">
              {currentStreak} {streakType === 'win' ? 'Wins' : 'Losses'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Best: {bestStreak}W | Worst: {worstStreak}L
            </p>
          </div>
          <div
            className={cn(
              'p-3 rounded-full',
              streakType === 'win' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600',
            )}
          >
            {streakType === 'win' ? (
              <TrendingUp className="w-6 h-6" />
            ) : (
              <TrendingDown className="w-6 h-6" />
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}
