import { Settings } from 'lucide-react'
import { useId, useState } from 'react'
import { useSeasonContext } from '@/contexts/SeasonContext'
import { SeasonManagement } from './SeasonManagement'

export const SeasonSelector = () => {
  const { currentSeason, seasons, switchSeason, loading } = useSeasonContext()
  const [showManagement, setShowManagement] = useState(false)
  const seasonSelectId = useId()

  if (loading || !currentSeason) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted">
        <span>Loading seasons...</span>
      </div>
    )
  }

  if (seasons.length === 0) {
    return null
  }

  return (
    <>
      <div className="flex items-center gap-1 md:gap-2">
        <label
          htmlFor={seasonSelectId}
          className="hidden md:block text-xs md:text-sm font-medium text-primary"
        >
          Season:
        </label>
        <select
          id={seasonSelectId}
          value={currentSeason.id}
          onChange={(e) => switchSeason(e.target.value)}
          className="bg-card px-2 md:px-3 py-1.5 md:py-2 rounded-[var(--th-radius-md)] border border-[var(--th-border-subtle)] hover:bg-card-hover transition-colors text-xs md:text-sm text-primary focus:border-[var(--th-sport-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--th-sport-primary)]"
        >
          {seasons.map((season) => (
            <option key={season.id} value={season.id}>
              {season.name}
              {season.isActive ? ' 🟢' : ''}
              {' • '}
              {season.startDate}
              {season.endDate ? ` - ${season.endDate}` : ' - Present'}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => setShowManagement(true)}
          className="bg-card p-1.5 md:p-2 rounded-[var(--th-radius-md)] border border-[var(--th-border-subtle)] hover:bg-card-hover transition-colors"
          title="Manage seasons"
        >
          <Settings size={14} className="text-secondary" />
        </button>

        {!currentSeason.isActive && (
          <span className="text-xs text-[var(--th-sport-primary)]" title="Viewing archived season">
            📦
          </span>
        )}
      </div>

      <SeasonManagement isOpen={showManagement} onClose={() => setShowManagement(false)} />
    </>
  )
}
