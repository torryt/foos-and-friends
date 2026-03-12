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
      <Card className="p-4 bg-card backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted">Win Rate</p>
            <p className="text-2xl font-bold text-primary">{winRate}%</p>
            <p className="text-xs text-muted mt-1">
              {wins}W - {losses}L
            </p>
          </div>
          <div
            className={cn(
              'p-3 rounded-full',
              winRate >= 60
                ? 'bg-card-hover text-[var(--th-win)]'
                : winRate >= 40
                  ? 'bg-card-hover text-[var(--th-draw)]'
                  : 'bg-card-hover text-[var(--th-loss)]',
            )}
          >
            <Trophy className="w-6 h-6" />
          </div>
        </div>
      </Card>

      {/* Goal Difference Card */}
      <Card className="p-4 bg-card backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted">Goal Difference</p>
            <p className="text-2xl font-bold text-primary">
              {goalDifference > 0 ? '+' : ''}
              {goalDifference}
            </p>
            <p className="text-xs text-muted mt-1">
              {goalsFor} GF - {goalsAgainst} GA
            </p>
          </div>
          <div
            className={cn(
              'p-3 rounded-full',
              goalDifference > 0
                ? 'bg-card-hover text-[var(--th-win)]'
                : goalDifference === 0
                  ? 'bg-card-hover text-secondary'
                  : 'bg-card-hover text-[var(--th-loss)]',
            )}
          >
            <Target className="w-6 h-6" />
          </div>
        </div>
      </Card>

      {/* Current Streak Card */}
      <Card className="p-4 bg-card backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted">Current Streak</p>
            <p className="text-2xl font-bold text-primary">
              {currentStreak} {streakType === 'win' ? 'Wins' : 'Losses'}
            </p>
            <p className="text-xs text-muted mt-1">
              Best: {bestStreak}W | Worst: {worstStreak}L
            </p>
          </div>
          <div
            className={cn(
              'p-3 rounded-full',
              streakType === 'win'
                ? 'bg-card-hover text-[var(--th-win)]'
                : 'bg-card-hover text-[var(--th-loss)]',
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
