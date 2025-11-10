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
      <div className="flex items-center gap-2 text-sm text-gray-400">
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
          className="hidden md:block text-xs md:text-sm font-medium text-gray-700"
        >
          Season:
        </label>
        <select
          id={seasonSelectId}
          value={currentSeason.id}
          onChange={(e) => switchSeason(e.target.value)}
          className="bg-white/80 px-2 md:px-3 py-1.5 md:py-2 rounded-lg border border-white/50 hover:bg-white transition-colors text-xs md:text-sm text-gray-700 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
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
          className="bg-white/80 p-1.5 md:p-2 rounded-lg border border-white/50 hover:bg-white transition-colors"
          title="Manage seasons"
        >
          <Settings size={14} className="text-gray-600" />
        </button>

        {!currentSeason.isActive && (
          <span className="text-xs text-orange-600" title="Viewing archived season">
            📦
          </span>
        )}
      </div>

      <SeasonManagement isOpen={showManagement} onClose={() => setShowManagement(false)} />
    </>
  )
}
