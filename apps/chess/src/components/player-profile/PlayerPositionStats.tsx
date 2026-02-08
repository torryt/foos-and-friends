import { cn } from '@foos/shared'
import { Card } from '@/components/ui/Card'

interface PositionStats {
  gamesAsWhite: number
  gamesAsBlack: number
  winsAsWhite: number
  winsAsBlack: number
  lossesAsWhite: number
  lossesAsBlack: number
  winRateAsWhite: number
  winRateAsBlack: number
  preferredColor: string | null
}

interface PlayerPositionStatsProps {
  positionStats: PositionStats
}

export function PlayerPositionStats({ positionStats }: PlayerPositionStatsProps) {
  const whitePercentage =
    positionStats.gamesAsWhite + positionStats.gamesAsBlack > 0
      ? Math.round(
          (positionStats.gamesAsWhite / (positionStats.gamesAsWhite + positionStats.gamesAsBlack)) *
            100,
        )
      : 50
  const blackPercentage = 100 - whitePercentage

  return (
    <Card className="p-4 bg-white/80 backdrop-blur-sm">
      <h3 className="font-semibold text-gray-900 mb-4">Color Performance</h3>

      {/* Color breakdown */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-base">♔</span>
            <span className="text-sm font-medium text-gray-700">White</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-gray-900">
              {positionStats.winsAsWhite}W - {positionStats.lossesAsWhite}L
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-1">{positionStats.winRateAsWhite}% win rate</div>
        </div>

        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-base">♚</span>
            <span className="text-sm font-medium text-gray-700">Black</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-gray-900">
              {positionStats.winsAsBlack}W - {positionStats.lossesAsBlack}L
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-1">{positionStats.winRateAsBlack}% win rate</div>
        </div>
      </div>

      {/* Preferred color indicator */}
      <div className="border-t pt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Color Preference</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <span className={cn('text-base', whitePercentage > 50 ? 'opacity-100' : 'opacity-40')}>
              ♔
            </span>
            <span className="text-sm text-gray-600">White</span>
            <span className="text-sm font-bold text-gray-900">{whitePercentage}%</span>
          </div>
          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="flex h-full">
              <div
                className="bg-amber-400 transition-all duration-300"
                style={{ width: `${whitePercentage}%` }}
              />
              <div
                className="bg-slate-700 transition-all duration-300"
                style={{ width: `${blackPercentage}%` }}
              />
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-sm font-bold text-gray-900">{blackPercentage}%</span>
            <span className="text-sm text-gray-600">Black</span>
            <span className={cn('text-base', blackPercentage > 50 ? 'opacity-100' : 'opacity-40')}>
              ♚
            </span>
          </div>
        </div>
      </div>
    </Card>
  )
}
