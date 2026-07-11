import type { BadgeMilestone, Player } from '@foos/shared'
import { useEffect } from 'react'
import './MilestoneCelebration.css'

export interface ReachedMilestone {
  player: Player
  milestone: BadgeMilestone
}

const MILESTONE_TITLES: Record<BadgeMilestone, string> = {
  50: 'Half century!',
  100: 'Century club!',
  250: 'Table regular!',
  500: 'Table legend!',
  1000: 'One in a thousand!',
}

const AUTO_DISMISS_MS = 3200

const PARTICLE_COLORS = [
  'var(--th-sport-from)',
  'var(--th-sport-to)',
  'var(--th-trophy-gold-1)',
  '#ffffff',
]

interface MilestoneCelebrationProps {
  reached: ReachedMilestone | null
  onDismiss: () => void
}

export function MilestoneCelebration({ reached, onDismiss }: MilestoneCelebrationProps) {
  useEffect(() => {
    if (!reached) return
    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS)
    return () => clearTimeout(timer)
  }, [reached, onDismiss])

  if (!reached) return null

  const { player, milestone } = reached

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: the dismiss button handles keyboard; the backdrop is a bonus tap target
    <div
      className="milestone-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`${player.name} reached ${milestone} games`}
      onClick={onDismiss}
    >
      <div className="milestone-celebration">
        <div className="milestone-ring" />
        <div className="milestone-medal">
          <div>
            <div className="milestone-medal-number">{milestone >= 1000 ? '1K' : milestone}</div>
            <div className="milestone-medal-label">games</div>
          </div>
        </div>
        {Array.from({ length: 26 }, (_, i) => {
          const angle = (i / 26) * Math.PI * 2 + (i % 3) * 0.19
          const distance = 110 + (i % 5) * 26
          return (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: particles are purely decorative and never reorder
              key={i}
              className="milestone-particle"
              style={
                {
                  '--particle-dx': `${Math.cos(angle) * distance}px`,
                  '--particle-dy': `${Math.sin(angle) * distance - 40}px`,
                  '--particle-color': PARTICLE_COLORS[i % PARTICLE_COLORS.length],
                  '--particle-delay': `${0.25 + (i % 4) * 0.05}s`,
                } as React.CSSProperties
              }
            />
          )
        })}
        <h2 className="milestone-title">
          {MILESTONE_TITLES[milestone]} {player.avatar}
        </h2>
        <p className="milestone-subtitle">
          {player.name} just played their {milestone}th game
        </p>
        <button type="button" className="milestone-dismiss" onClick={onDismiss}>
          Nice
        </button>
      </div>
    </div>
  )
}
