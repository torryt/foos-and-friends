import { useId } from 'react'

export type TrophyMetal = 'gold' | 'silver' | 'bronze'

interface TrophyIconProps {
  metal: TrophyMetal
  size?: number
  className?: string
}

export function TrophyIcon({ metal, size = 40, className }: TrophyIconProps) {
  const gradientId = useId()
  const fill = `url(#${gradientId})`

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      aria-hidden="true"
      className={className}
      style={{ filter: `var(--th-trophy-${metal}-glow)` }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={`var(--th-trophy-${metal}-1)`} />
          <stop offset="1" stopColor={`var(--th-trophy-${metal}-2)`} />
        </linearGradient>
      </defs>
      <path d="M16 14 C7 14 7 27 17 29" fill="none" stroke={fill} strokeWidth="3.5" />
      <path d="M48 14 C57 14 57 27 47 29" fill="none" stroke={fill} strokeWidth="3.5" />
      <path d="M18 10 h28 v11 a14 14 0 0 1 -28 0 z" fill={fill} />
      <rect x="29" y="34" width="6" height="9" fill={fill} />
      <rect x="23" y="43" width="18" height="5" rx="2" fill={fill} />
      <rect x="18" y="49" width="28" height="6" rx="2" fill={fill} />
    </svg>
  )
}
