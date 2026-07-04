import { Archive, Check, Flame, Plus, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useGroupContext } from '@/contexts/GroupContext'
import { useSeasonContext } from '@/contexts/SeasonContext'
import { matchesService } from '@/lib/init'
import { ModalOrBottomDrawer } from './ModalOrBottomDrawer'
import { NewSeasonWizard } from './NewSeasonWizard'

interface SeasonSheetProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * Bottom sheet listing all seasons of the current group as a timeline —
 * live season first, archived below. Tapping a season switches the whole
 * app to it. Group owners get a "Start new season" action.
 */
export const SeasonSheet = ({ isOpen, onClose }: SeasonSheetProps) => {
  const { currentGroup } = useGroupContext()
  const { currentSeason, seasons, switchSeason } = useSeasonContext()
  const [matchCounts, setMatchCounts] = useState<Record<string, number>>({})
  const [showWizard, setShowWizard] = useState(false)

  const isOwner = !!currentGroup?.isOwner

  // Count matches per season with a single all-matches fetch when the sheet opens
  useEffect(() => {
    if (!isOpen || !currentGroup) return

    let stale = false
    matchesService.getMatchesByGroup(currentGroup.id).then((result) => {
      if (stale || result.error) return
      const counts: Record<string, number> = {}
      for (const match of result.data) {
        if (match.seasonId) {
          counts[match.seasonId] = (counts[match.seasonId] || 0) + 1
        }
      }
      setMatchCounts(counts)
    })

    return () => {
      stale = true
    }
  }, [isOpen, currentGroup])

  if (!isOpen) return null

  const sortedSeasons = seasons.toSorted((a, b) => b.seasonNumber - a.seasonNumber)

  const handleSelect = (seasonId: string) => {
    switchSeason(seasonId)
    onClose()
  }

  const sheet = (
    <ModalOrBottomDrawer isOpen={isOpen} onClose={onClose} className="sm:max-w-md">
      <div className="bg-card shadow-2xl w-full flex flex-col max-h-[85vh] pb-[env(safe-area-inset-bottom)]">
        {/* Grab handle (mobile) + header */}
        <div className="pt-2 sm:pt-0">
          <div className="w-9 h-1 rounded-full bg-[var(--th-border)] mx-auto sm:hidden" />
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--th-border-subtle)]">
            <h2 className="text-base font-bold text-primary">Seasons</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="min-h-11 min-w-11 flex items-center justify-center text-muted hover:text-secondary transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Season timeline */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {sortedSeasons.map((season) => {
            const isSelected = season.id === currentSeason?.id
            const count = matchCounts[season.id]

            return (
              <button
                key={season.id}
                type="button"
                onClick={() => handleSelect(season.id)}
                className={`w-full min-h-14 flex items-center gap-3 px-3 py-2.5 rounded-[var(--th-radius-md)] border text-left transition-colors ${
                  isSelected
                    ? 'bg-accent-subtle border-[var(--th-sport-primary)]'
                    : 'border-transparent hover:bg-card-hover'
                }`}
              >
                <span
                  className={`w-9 h-9 rounded-[var(--th-radius-sm)] flex items-center justify-center flex-none ${
                    season.isActive
                      ? 'bg-sport-gradient text-white'
                      : 'bg-card-hover text-secondary'
                  }`}
                >
                  {season.isActive ? <Flame size={16} /> : <Archive size={16} />}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-primary truncate">
                      {season.name}
                    </span>
                    {season.isActive ? (
                      <span className="text-[10px] font-bold tracking-wide text-[var(--th-win)] border border-[var(--th-win)] rounded-full px-1.5 py-px flex-none">
                        LIVE
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold tracking-wide text-muted border border-[var(--th-border)] rounded-full px-1.5 py-px flex-none">
                        ENDED
                      </span>
                    )}
                  </span>
                  <span className="block text-xs text-muted truncate">
                    {season.startDate} → {season.endDate || 'now'}
                    {count !== undefined && ` · ${count} ${count === 1 ? 'match' : 'matches'}`}
                  </span>
                </span>
                {isSelected && (
                  <Check size={18} className="text-[var(--th-sport-primary)] flex-none" />
                )}
              </button>
            )
          })}
        </div>

        {/* Owner action */}
        {isOwner && (
          <div className="p-3 border-t border-[var(--th-border-subtle)]">
            <button
              type="button"
              onClick={() => setShowWizard(true)}
              className="w-full min-h-12 bg-sport-gradient hover:bg-sport-gradient-hover text-white rounded-[var(--th-radius-md)] font-semibold text-sm flex items-center justify-center gap-2 transition-all"
            >
              <Plus size={18} />
              Start new season
            </button>
            <p className="text-xs text-muted text-center mt-2">
              Only visible to you as group owner
            </p>
          </div>
        )}
      </div>

      {showWizard && (
        <NewSeasonWizard
          onClose={() => setShowWizard(false)}
          onDone={() => {
            setShowWizard(false)
            onClose()
          }}
        />
      )}
    </ModalOrBottomDrawer>
  )

  return createPortal(sheet, document.body)
}
