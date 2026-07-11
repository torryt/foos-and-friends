import type { SeasonTrophy, TrophyRank } from '@foos/shared'
import { BADGE_MILESTONES, getNextMilestone } from '@foos/shared'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { type TrophyMetal, TrophyIcon } from '@/components/TrophyIcon'
import { Card } from '@/components/ui/Card'

const METALS: Array<{ rank: TrophyRank; metal: TrophyMetal; label: string }> = [
  { rank: 1, metal: 'gold', label: 'Gold' },
  { rank: 2, metal: 'silver', label: 'Silver' },
  { rank: 3, metal: 'bronze', label: 'Bronze' },
]

interface PlayerTrophiesProps {
  // Trophies won by this player, newest season first
  trophies: SeasonTrophy[]
  matchesPlayed: number
}

export function PlayerTrophies({ trophies, matchesPlayed }: PlayerTrophiesProps) {
  const [expandedMetal, setExpandedMetal] = useState<TrophyRank | null>(null)

  const nextMilestone = getNextMilestone(matchesPlayed)
  const previousMilestone = BADGE_MILESTONES.filter((m) => m <= matchesPlayed).at(-1) ?? 0
  const progressPercent = nextMilestone
    ? Math.round(((matchesPlayed - previousMilestone) / (nextMilestone - previousMilestone)) * 100)
    : 100

  const expandedTrophies = expandedMetal ? trophies.filter((t) => t.rank === expandedMetal) : []

  return (
    // Stacked on mobile; trophy case and milestones share one row on larger screens
    <div className={trophies.length > 0 ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : ''}>
      {/* Trophy case — hidden until the player owns at least one trophy */}
      {trophies.length > 0 && (
        <Card className="p-4 bg-card backdrop-blur-sm">
          <h3 className="font-semibold text-primary mb-4">Trophy Case</h3>
          <div className="flex gap-3">
            {METALS.map(({ rank, metal, label }) => {
              const metalTrophies = trophies.filter((t) => t.rank === rank)
              const latest = metalTrophies[0]
              const isExpandable = metalTrophies.length > 1
              const isExpanded = expandedMetal === rank

              if (!latest) {
                // Unclaimed metal: dimmed slot, mirrors the locked-badge treatment
                return (
                  <div
                    key={rank}
                    className="flex-1 min-w-0 rounded-[var(--th-radius-md)] border-2 border-dashed border-[var(--th-border)] p-3 text-center opacity-60"
                  >
                    <TrophyIcon metal={metal} size={36} className="mx-auto opacity-30 grayscale" />
                    <p className="text-xs font-bold uppercase tracking-wide text-muted mt-1.5">
                      {label}
                    </p>
                    <p className="text-xs text-muted mt-0.5">—</p>
                  </div>
                )
              }

              const slotContent = (
                <>
                  <TrophyIcon metal={metal} size={36} className="mx-auto" />
                  <p
                    className="text-xs font-bold uppercase tracking-wide mt-1.5"
                    style={{ color: `var(--th-trophy-${metal}-text)` }}
                  >
                    {label}
                    {metalTrophies.length > 1 && ` ×${metalTrophies.length}`}
                  </p>
                  <p className="text-xs text-secondary mt-0.5 truncate">
                    {latest.seasonName}
                    {isExpandable && !isExpanded && (
                      <span className="text-muted"> +{metalTrophies.length - 1} more</span>
                    )}
                  </p>
                </>
              )

              // Multiple wins of one metal: the slot expands to list every season
              return isExpandable ? (
                <button
                  key={rank}
                  type="button"
                  aria-expanded={isExpanded}
                  onClick={() => setExpandedMetal(isExpanded ? null : rank)}
                  className={`flex-1 min-w-0 rounded-[var(--th-radius-md)] border p-3 text-center transition-colors min-h-[44px] ${
                    isExpanded
                      ? 'border-[var(--th-accent)] bg-accent-subtle'
                      : 'border-[var(--th-border)] bg-card-hover hover:bg-accent-subtle'
                  }`}
                >
                  {slotContent}
                  <ChevronDown
                    size={14}
                    className={`mx-auto mt-1 text-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  />
                </button>
              ) : (
                <div
                  key={rank}
                  className="flex-1 min-w-0 rounded-[var(--th-radius-md)] border border-[var(--th-border)] bg-card-hover p-3 text-center"
                >
                  {slotContent}
                </div>
              )
            })}
          </div>

          {expandedMetal !== null && expandedTrophies.length > 0 && (
            <ul className="mt-3 space-y-1 border-t border-[var(--th-border)] pt-3">
              {expandedTrophies.map((trophy) => (
                <li
                  key={trophy.id}
                  className="flex items-center justify-between text-sm px-1 py-1.5"
                >
                  <span className="text-primary">{trophy.seasonName}</span>
                  <span className="text-muted text-xs">Season {trophy.seasonNumber}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {/* Games-played milestones */}
      <Card className="p-4 bg-card backdrop-blur-sm">
        <div className="flex items-baseline justify-between mb-4">
          <h3 className="font-semibold text-primary">Milestones</h3>
          <span className="text-xs text-muted">
            {matchesPlayed} game{matchesPlayed === 1 ? '' : 's'}
          </span>
        </div>
        <div className="flex justify-between gap-2">
          {BADGE_MILESTONES.map((milestone) => {
            const earned = matchesPlayed >= milestone
            return (
              <div key={milestone} className="flex-1 text-center">
                <div
                  className={`w-11 h-11 mx-auto rounded-full flex items-center justify-center text-xs font-extrabold tabular-nums ${
                    earned ? '' : 'border-2 border-dashed border-[var(--th-border)] text-muted'
                  }`}
                  style={
                    earned
                      ? {
                          background:
                            'radial-gradient(circle at 30% 25%, var(--th-trophy-gold-1), var(--th-trophy-gold-2))',
                          color: '#3a2703',
                          boxShadow: 'inset 0 0 0 3px rgba(255, 255, 255, 0.35)',
                        }
                      : undefined
                  }
                >
                  {milestone >= 1000 ? '1K' : milestone}
                </div>
                <p
                  className={`text-[11px] mt-1 ${earned ? 'text-primary font-medium' : 'text-muted'}`}
                >
                  {milestone}
                </p>
              </div>
            )
          })}
        </div>
        {nextMilestone && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-muted mb-1 tabular-nums">
              <span>Next: {nextMilestone} games</span>
              <span>
                {matchesPlayed} / {nextMilestone}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-card-hover overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[var(--th-sport-from)] to-[var(--th-sport-to)]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
