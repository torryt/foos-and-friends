import { cn } from '@foos/shared'
import { TrendingDown, TrendingUp, Trophy } from 'lucide-react'
import { Card } from '@/components/ui/Card'

interface PlayerStatsCardsProps {
  winRate: number
  wins: number
  losses: number
  currentStreak: number
  streakType: 'win' | 'loss' | null
  bestStreak: number
  worstStreak: number
}

export function PlayerStatsCards({
  winRate,
  wins,
  losses,
  currentStreak,
  streakType,
  bestStreak,
  worstStreak,
}: PlayerStatsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

      {/* Current Streak Card */}
      <Card className="p-4 bg-white/80 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Current Streak</p>
            <p className="text-2xl font-bold text-gray-900">
              {streakType === 'win' ? `${currentStreak} Wins` : 'None'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Best: {bestStreak}W | Worst: {worstStreak}L
            </p>
          </div>
          <div
            className={cn(
              'p-3 rounded-full',
              streakType === 'win' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600',
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
