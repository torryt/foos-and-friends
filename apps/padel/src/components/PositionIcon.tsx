import type { PlayerPosition } from '@foos/shared'
import { cn } from '@foos/shared'
import { ArrowLeft, ArrowRight } from 'lucide-react'

interface PositionIconProps {
  position: PlayerPosition
  size?: number
  className?: string
  showLabel?: boolean
}

export const PositionIcon = ({
  position,
  size = 14,
  className,
  showLabel = false,
}: PositionIconProps) => {
  const isAttacker = position === 'attacker'

  const Icon = isAttacker ? ArrowLeft : ArrowRight
  const color = isAttacker ? 'text-emerald-500' : 'text-blue-500'
  const label = isAttacker ? 'Left' : 'Right'

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Icon size={size} className={color} />
      {showLabel && <span className={cn('text-xs font-medium', color)}>{label}</span>}
    </div>
  )
}

export const getPositionColor = (position: PlayerPosition): string => {
  return position === 'attacker' ? 'emerald' : 'blue'
}

export const getPositionLabel = (position: PlayerPosition): string => {
  return position === 'attacker' ? 'Left' : 'Right'
}
