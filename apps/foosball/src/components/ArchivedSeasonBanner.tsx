import { Archive } from 'lucide-react'
import { useSeasonContext } from '@/contexts/SeasonContext'

/**
 * "Time travel" indicator shown while an archived season is selected.
 * Makes the state obvious and offers a one-tap way back to the live season.
 */
export const ArchivedSeasonBanner = () => {
  const { currentSeason, seasons, switchSeason } = useSeasonContext()

  if (!currentSeason || currentSeason.isActive) return null

  const activeSeason = seasons.find((s) => s.isActive)

  return (
    <div className="bg-accent-subtle border border-[var(--th-border)] rounded-[var(--th-radius-lg)] px-4 py-2.5 flex items-center gap-2">
      <Archive size={16} className="text-[var(--th-sport-primary)] flex-none" />
      <span className="text-sm text-primary min-w-0 truncate">
        <span className="font-semibold">{currentSeason.name}</span>
        <span className="text-secondary">
          {' · '}ended {currentSeason.endDate || 'earlier'}
        </span>
      </span>
      {activeSeason && (
        <button
          type="button"
          onClick={() => switchSeason(activeSeason.id)}
          className="ml-auto min-h-11 px-2 text-sm font-semibold text-[var(--th-sport-primary)] hover:opacity-80 transition-opacity whitespace-nowrap"
        >
          Back to live ›
        </button>
      )}
    </div>
  )
}
