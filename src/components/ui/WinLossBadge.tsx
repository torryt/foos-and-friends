import { cn } from '@/lib/utils'

interface WinLossBadgeProps {
  result: 'W' | 'L'
  size?: 'sm' | 'md'
  className?: string
}

export function WinLossBadge({ result, size = 'md', className }: WinLossBadgeProps) {
  const isWin = result === 'W'

  const sizeClasses = {
    sm: 'w-4 h-4 sm:w-5 sm:h-5 text-xs',
    md: 'w-6 h-6 text-xs',
  }

  return (
    <span
      className={cn(
        'rounded font-bold flex items-center justify-center text-white',
        sizeClasses[size],
        isWin ? 'bg-green-600' : 'bg-red-400',
        className,
      )}
    >
      {result}
    </span>
  )
}
