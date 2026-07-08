import { useClickOutside } from '@foos/shared'
import { Archive, Check, ChevronDown, Flame, Infinity as InfinityIcon } from 'lucide-react'
import { useRef, useState } from 'react'
import { useSeasonContext } from '@/contexts/SeasonContext'

export type RankingScope = 'season' | 'allTime'

interface SeasonScopePickerProps {
  scope: RankingScope
  onScopeChange: (scope: RankingScope) => void
}

/**
 * Season picker for the rankings page — a pill-styled trigger that opens a
 * timeline of every season plus an all-time entry. Selecting a season
 * switches the whole app to it (via SeasonContext); "All time" is a local
 * ranking scope on top of the selected season.
 */
export const SeasonScopePicker = ({ scope, onScopeChange }: SeasonScopePickerProps) => {
  const { currentSeason, seasons, switchSeason } = useSeasonContext()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  useClickOutside(containerRef, () => setOpen(false), open)

  if (seasons.length === 0) return null

  const allTime = scope === 'allTime'
  const sortedSeasons = seasons.toSorted((a, b) => b.seasonNumber - a.seasonNumber)

  const handleSelectSeason = (seasonId: string) => {
    switchSeason(seasonId)
    onScopeChange('season')
    setOpen(false)
  }

  const handleSelectAllTime = () => {
    onScopeChange('allTime')
    setOpen(false)
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="min-h-11 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors flex items-center gap-2 bg-accent-subtle border-[var(--th-sport-primary)] text-[var(--th-sport-primary)] hover:opacity-85"
      >
        {allTime ? (
          <InfinityIcon size={14} aria-hidden="true" />
        ) : currentSeason?.isActive ? (
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--th-win)]" aria-hidden="true" />
        ) : (
          <Archive size={13} aria-hidden="true" />
        )}
        <span className="max-w-40 truncate">
          {allTime ? 'All time' : currentSeason?.name || 'Season'}
        </span>
        <ChevronDown
          size={14}
          className={`opacity-70 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Ranking scope"
          className="absolute left-0 mt-2 w-72 max-w-[calc(100vw-2rem)] bg-card rounded-[var(--th-radius-lg)] shadow-theme-card border border-[var(--th-border)] z-30 overflow-hidden"
        >
          <div className="p-1.5 space-y-0.5">
            <button
              type="button"
              role="option"
              aria-selected={allTime}
              onClick={handleSelectAllTime}
              className={`w-full min-h-12 flex items-center gap-3 px-2.5 py-2 rounded-[var(--th-radius-md)] border text-left transition-colors ${
                allTime
                  ? 'bg-accent-subtle border-[var(--th-sport-primary)]'
                  : 'border-transparent hover:bg-card-hover'
              }`}
            >
              <span className="w-8 h-8 rounded-[var(--th-radius-sm)] bg-card-hover text-secondary flex items-center justify-center flex-none">
                <InfinityIcon size={15} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block font-semibold text-sm text-primary">All time</span>
                <span className="block text-xs text-muted">Latest ELO across all seasons</span>
              </span>
              {allTime && <Check size={16} className="text-[var(--th-sport-primary)] flex-none" />}
            </button>
          </div>

          <div className="border-t border-[var(--th-border-subtle)] p-1.5 space-y-0.5 max-h-72 overflow-y-auto">
            {sortedSeasons.map((season) => {
              const isSelected = !allTime && season.id === currentSeason?.id

              return (
                <button
                  key={season.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelectSeason(season.id)}
                  className={`w-full min-h-12 flex items-center gap-3 px-2.5 py-2 rounded-[var(--th-radius-md)] border text-left transition-colors ${
                    isSelected
                      ? 'bg-accent-subtle border-[var(--th-sport-primary)]'
                      : 'border-transparent hover:bg-card-hover'
                  }`}
                >
                  <span
                    className={`w-8 h-8 rounded-[var(--th-radius-sm)] flex items-center justify-center flex-none ${
                      season.isActive
                        ? 'bg-sport-gradient text-white'
                        : 'bg-card-hover text-secondary'
                    }`}
                  >
                    {season.isActive ? <Flame size={15} /> : <Archive size={15} />}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-primary truncate">
                        {season.name}
                      </span>
                      {season.isActive && (
                        <span className="text-[10px] font-bold tracking-wide text-[var(--th-win)] border border-[var(--th-win)] rounded-full px-1.5 py-px flex-none">
                          LIVE
                        </span>
                      )}
                    </span>
                    <span className="block text-xs text-muted truncate">
                      {season.startDate} → {season.endDate || 'now'}
                    </span>
                  </span>
                  {isSelected && (
                    <Check size={16} className="text-[var(--th-sport-primary)] flex-none" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
