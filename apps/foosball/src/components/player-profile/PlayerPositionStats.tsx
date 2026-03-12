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
    <Card className="p-4 bg-card backdrop-blur-sm">
      <h3 className="font-semibold text-primary mb-4">Position Performance</h3>

      {/* Position breakdown */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-card-hover rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Sword className="w-4 h-4 text-[var(--th-sport-primary)]" />
            <span className="text-sm font-medium text-primary">Attacker</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-primary">
              {positionStats.winsAsAttacker}W - {positionStats.lossesAsAttacker}L
            </span>
          </div>
          <div className="text-xs text-muted mt-1">{positionStats.winRateAsAttacker}% win rate</div>
        </div>

        <div className="bg-card-hover rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-primary">Defender</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-primary">
              {positionStats.winsAsDefender}W - {positionStats.lossesAsDefender}L
            </span>
          </div>
          <div className="text-xs text-muted mt-1">{positionStats.winRateAsDefender}% win rate</div>
        </div>
      </div>

      {/* Preferred position indicator */}
      <div className="border-t pt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-primary">Position Preference</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Sword
              className={cn(
                'w-4 h-4',
                attackPercentage > 50 ? 'text-[var(--th-sport-primary)]' : 'text-muted',
              )}
            />
            <span className="text-sm text-secondary">Attack</span>
            <span className="text-sm font-bold text-primary">{attackPercentage}%</span>
          </div>
          <div className="flex-1 h-2 bg-[var(--th-border)] rounded-full overflow-hidden">
            <div className="flex h-full">
              <div
                className="bg-[var(--th-sport-primary)] transition-all duration-300"
                style={{ width: `${attackPercentage}%` }}
              />
              <div
                className="bg-blue-500 transition-all duration-300"
                style={{ width: `${defensePercentage}%` }}
              />
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-sm font-bold text-primary">{defensePercentage}%</span>
            <span className="text-sm text-secondary">Defense</span>
            <Shield
              className={cn('w-4 h-4', defensePercentage > 50 ? 'text-blue-600' : 'text-muted')}
            />
          </div>
        </div>
      </div>
    </Card>
  )
}
