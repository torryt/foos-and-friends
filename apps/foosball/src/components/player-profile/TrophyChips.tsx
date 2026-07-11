import type { SeasonTrophy, TrophyRank } from '@foos/shared'
import { ChevronRight, X } from 'lucide-react'
import { useState } from 'react'
import { ModalOrBottomDrawer } from '@/components/ModalOrBottomDrawer'
import { type TrophyMetal, TrophyIcon } from '@/components/TrophyIcon'

const METAL_BY_RANK: Record<TrophyRank, { metal: TrophyMetal; label: string }> = {
  1: { metal: 'gold', label: 'Gold' },
  2: { metal: 'silver', label: 'Silver' },
  3: { metal: 'bronze', label: 'Bronze' },
}

const RANKS: TrophyRank[] = [1, 2, 3]

interface TrophyChipsProps {
  // Trophies won by this player, newest season first
  trophies: SeasonTrophy[]
}

// Compact trophy pill for the profile header — only metals actually won, no
// placeholder slots. Tapping it opens a drawer listing every trophy.
export function TrophyChips({ trophies }: TrophyChipsProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (trophies.length === 0) {
    return null
  }

  const wonRanks = RANKS.filter((rank) => trophies.some((t) => t.rank === rank))

  return (
    <>
      {/* Taller than the pill it contains so the touch target clears 44px */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="View trophies"
        className="flex min-h-11 items-center"
      >
        <span className="flex items-center gap-2 rounded-full bg-card px-3 py-1 text-sm transition-colors hover:bg-card-hover">
          {wonRanks.map((rank) => {
            const count = trophies.filter((t) => t.rank === rank).length
            return (
              <span key={rank} className="flex items-center gap-0.5">
                <TrophyIcon metal={METAL_BY_RANK[rank].metal} size={18} />
                {count > 1 && (
                  <span className="text-xs font-medium text-secondary tabular-nums">×{count}</span>
                )}
              </span>
            )
          })}
          <ChevronRight size={14} className="text-muted" />
        </span>
      </button>

      <ModalOrBottomDrawer isOpen={isOpen} onClose={() => setIsOpen(false)} className="sm:max-w-md">
        <div className="w-full max-h-[80dvh] overflow-y-auto bg-card shadow-xl pb-[env(safe-area-inset-bottom)]">
          <div className="flex items-center justify-between p-4 border-b border-[var(--th-border)]">
            <div>
              <h2 className="text-lg font-semibold text-primary">Trophy Case</h2>
              <p className="text-sm text-muted">
                {trophies.length} season {trophies.length === 1 ? 'trophy' : 'trophies'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close"
              className="flex h-11 w-11 -my-2 -mr-2 items-center justify-center rounded-full text-muted transition-colors hover:bg-card-hover hover:text-primary"
            >
              <X size={20} />
            </button>
          </div>

          <ul className="p-4 space-y-2">
            {trophies.map((trophy) => {
              const { metal, label } = METAL_BY_RANK[trophy.rank]
              return (
                <li
                  key={trophy.id}
                  className="flex items-center gap-3 rounded-[var(--th-radius-md)] bg-card-hover px-3 py-2.5"
                >
                  <TrophyIcon metal={metal} size={28} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-primary">{trophy.seasonName}</p>
                    {/* Skip the subtitle when the season is literally named "Season N" */}
                    {trophy.seasonName !== `Season ${trophy.seasonNumber}` && (
                      <p className="text-xs text-muted">Season {trophy.seasonNumber}</p>
                    )}
                  </div>
                  <span
                    className="text-xs font-bold uppercase tracking-wide"
                    style={{ color: `var(--th-trophy-${metal}-text)` }}
                  >
                    {label}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      </ModalOrBottomDrawer>
    </>
  )
}
