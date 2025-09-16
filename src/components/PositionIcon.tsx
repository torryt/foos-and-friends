import { Shield, Sword } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PlayerPosition } from '@/types'

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

  const Icon = isAttacker ? Sword : Shield
  const color = isAttacker ? 'text-orange-500' : 'text-blue-500'
  const label = isAttacker ? 'Attacker' : 'Defender'

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Icon size={size} className={color} />
      {showLabel && <span className={cn('text-xs font-medium', color)}>{label}</span>}
    </div>
  )
}

export const getPositionColor = (position: PlayerPosition): string => {
  return position === 'attacker' ? 'orange' : 'blue'
}

export const getPositionLabel = (position: PlayerPosition): string => {
  return position === 'attacker' ? 'Attacker' : 'Defender'
}
