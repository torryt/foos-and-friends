import type { SeasonTrophy, TrophyRank } from '@foos/shared'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { ChevronRight, X } from 'lucide-react'
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
// placeholder slots. Tapping it opens a bottom sheet listing every trophy.
export function TrophyChips({ trophies }: TrophyChipsProps) {
  if (trophies.length === 0) {
    return null
  }

  const wonRanks = RANKS.filter((rank) => trophies.some((t) => t.rank === rank))

  return (
    <DialogPrimitive.Root>
      {/* Taller than the pill it contains so the touch target clears 44px */}
      <DialogPrimitive.Trigger className="flex min-h-11 items-center" aria-label="View trophies">
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
      </DialogPrimitive.Trigger>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[var(--th-bg-overlay)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        {/* Bottom sheet; inset-x-0 + max-w keeps it centered on wide screens without transforms */}
        <DialogPrimitive.Content className="fixed inset-x-0 bottom-0 z-50 max-h-[80dvh] overflow-y-auto rounded-t-2xl border-t border-[var(--th-border)] bg-card p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-theme-card data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom sm:mx-auto sm:mb-6 sm:max-w-md sm:rounded-2xl sm:border">
          <DialogPrimitive.Title className="text-lg font-semibold text-primary">
            Trophy Case
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="text-sm text-muted">
            {trophies.length} season {trophies.length === 1 ? 'trophy' : 'trophies'}
          </DialogPrimitive.Description>
          <DialogPrimitive.Close className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full text-muted transition-colors hover:bg-card-hover hover:text-primary">
            <X size={18} />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>

          <ul className="mt-4 space-y-2">
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
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
