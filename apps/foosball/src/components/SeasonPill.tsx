import { Archive, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { useSeasonContext } from '@/contexts/SeasonContext'
import { SeasonSheet } from './SeasonSheet'

/**
 * Compact season indicator in the header. Shows the selected season
 * (green dot = live, archive icon = viewing an archived season) and
 * opens the season sheet on tap.
 */
export const SeasonPill = () => {
  const { currentSeason, seasons, loading } = useSeasonContext()
  const [showSheet, setShowSheet] = useState(false)

  if (loading || !currentSeason || seasons.length === 0) {
    return null
  }

  const isLive = currentSeason.isActive

  return (
    <>
      <button
        type="button"
        onClick={() => setShowSheet(true)}
        title={`${currentSeason.name}${isLive ? ' (live)' : ' (ended)'}`}
        className={`min-h-11 px-2.5 md:px-3 py-2 rounded-[var(--th-radius-md)] border transition-colors flex items-center gap-1.5 ${
          isLive
            ? 'bg-accent-subtle border-[var(--th-sport-primary)] text-[var(--th-sport-primary)] hover:opacity-80'
            : 'bg-card border-[var(--th-border-subtle)] text-secondary hover:bg-card-hover'
        }`}
      >
        {isLive ? (
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--th-win)]" aria-hidden="true" />
        ) : (
          <Archive size={12} aria-hidden="true" />
        )}
        <span className="text-xs md:text-sm font-semibold whitespace-nowrap">
          <span className="sm:hidden">S{currentSeason.seasonNumber}</span>
          <span className="hidden sm:inline max-w-28 truncate">{currentSeason.name}</span>
        </span>
        <ChevronDown size={12} className="opacity-70" />
      </button>

      <SeasonSheet isOpen={showSheet} onClose={() => setShowSheet(false)} />
    </>
  )
}
