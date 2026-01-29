import { cn } from '@foos/shared'
import { Shield, Sword } from 'lucide-react'
import { Card } from '@/components/ui/Card'

interface PositionStats {
  gamesAsAttacker: number
  gamesAsDefender: number
  winsAsAttacker: number
  winsAsDefender: number
  lossesAsAttacker: number
  lossesAsDefender: number
  winRateAsAttacker: number
  winRateAsDefender: number
  preferredPosition: string | null
}

interface PlayerPositionStatsProps {
  positionStats: PositionStats
}

export function PlayerPositionStats({ positionStats }: PlayerPositionStatsProps) {
  const attackPercentage =
    positionStats.gamesAsAttacker + positionStats.gamesAsDefender > 0
      ? Math.round(
          (positionStats.gamesAsAttacker /
            (positionStats.gamesAsAttacker + positionStats.gamesAsDefender)) *
            100,
        )
      : 50
  const defensePercentage = 100 - attackPercentage

  return (
    <Card className="p-4 bg-white/80 backdrop-blur-sm">
      <h3 className="font-semibold text-gray-900 mb-4">Position Performance</h3>

      {/* Position breakdown */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Sword className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-medium text-gray-700">Attacker</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-gray-900">
              {positionStats.winsAsAttacker}W - {positionStats.lossesAsAttacker}L
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {positionStats.winRateAsAttacker}% win rate
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-gray-700">Defender</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-gray-900">
              {positionStats.winsAsDefender}W - {positionStats.lossesAsDefender}L
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {positionStats.winRateAsDefender}% win rate
          </div>
        </div>
      </div>

      {/* Preferred position indicator */}
      <div className="border-t pt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Position Preference</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Sword
              className={cn('w-4 h-4', attackPercentage > 50 ? 'text-orange-600' : 'text-gray-400')}
            />
            <span className="text-sm text-gray-600">Attack</span>
            <span className="text-sm font-bold text-gray-900">{attackPercentage}%</span>
          </div>
          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="flex h-full">
              <div
                className="bg-orange-500 transition-all duration-300"
                style={{ width: `${attackPercentage}%` }}
              />
              <div
                className="bg-blue-500 transition-all duration-300"
                style={{ width: `${defensePercentage}%` }}
              />
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-sm font-bold text-gray-900">{defensePercentage}%</span>
            <span className="text-sm text-gray-600">Defense</span>
            <Shield
              className={cn('w-4 h-4', defensePercentage > 50 ? 'text-blue-600' : 'text-gray-400')}
            />
          </div>
        </div>
      </div>
    </Card>
  )
}
