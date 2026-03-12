import { Calendar, CheckCircle, PlusCircle, XCircle } from 'lucide-react'
import { useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSeasonContext } from '@/contexts/SeasonContext'
import { ModalOrBottomDrawer } from './ModalOrBottomDrawer'

interface SeasonManagementProps {
  isOpen: boolean
  onClose: () => void
}

export const SeasonManagement = ({ isOpen, onClose }: SeasonManagementProps) => {
  const { seasons, endSeasonAndCreateNew, refreshSeasons } = useSeasonContext()
  const [newSeasonName, setNewSeasonName] = useState('')
  const [newSeasonDescription, setNewSeasonDescription] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const seasonNameId = useId()
  const seasonDescriptionId = useId()

  const handleCreateSeason = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (!newSeasonName.trim()) {
      setError('Season name is required')
      return
    }

    setIsCreating(true)

    try {
      const result = await endSeasonAndCreateNew(
        newSeasonName.trim(),
        newSeasonDescription.trim() || undefined,
      )

      if (result.success) {
        setSuccess(true)
        setNewSeasonName('')
        setNewSeasonDescription('')
        await refreshSeasons()

        // Close modal after short delay to show success message
        setTimeout(() => {
          setSuccess(false)
          onClose()
        }, 1500)
      } else {
        setError(result.error || 'Failed to create new season')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create new season')
    } finally {
      setIsCreating(false)
    }
  }

  const activeSeason = seasons.find((s) => s.isActive)
  const archivedSeasons = seasons
    .filter((s) => !s.isActive)
    .sort((a, b) => b.seasonNumber - a.seasonNumber)

  const modalContent = (
    <ModalOrBottomDrawer isOpen={isOpen} onClose={onClose} className="sm:max-w-2xl">
      <div className="bg-card shadow-2xl w-full flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--th-border)] bg-sport-gradient">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Calendar size={24} />
              Season Management
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
              aria-label="Close"
            >
              <XCircle size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Current Active Season */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-primary mb-3">Active Season</h3>
            {activeSeason ? (
              <div className="bg-accent-subtle border border-[var(--th-border)] rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-primary">{activeSeason.name}</span>
                      <span className="text-[var(--th-win)]">🟢</span>
                    </div>
                    <p className="text-sm text-secondary mt-1">Started: {activeSeason.startDate}</p>
                    {activeSeason.description && (
                      <p className="text-sm text-secondary mt-2">{activeSeason.description}</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-muted">No active season</p>
            )}
          </div>

          {/* Create New Season Form */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-primary mb-3">Create New Season</h3>
            <div className="bg-accent-subtle border border-[var(--th-border)] rounded-[var(--th-radius-md)] p-4">
              <p className="text-sm text-primary mb-4">
                ⚠️ Creating a new season will end the current active season and reset all player
                rankings to 1200.
              </p>

              <form onSubmit={handleCreateSeason} className="space-y-4">
                <div>
                  <label
                    htmlFor={seasonNameId}
                    className="block text-sm font-medium text-primary mb-1"
                  >
                    Season Name *
                  </label>
                  <input
                    type="text"
                    id={seasonNameId}
                    value={newSeasonName}
                    onChange={(e) => setNewSeasonName(e.target.value)}
                    placeholder="e.g., Spring 2024, Season 2"
                    className="w-full px-3 py-2 border border-[var(--th-border)] rounded-[var(--th-radius-md)] focus:ring-2 focus:ring-[var(--th-sport-primary)] focus:border-transparent"
                    disabled={isCreating}
                  />
                </div>

                <div>
                  <label
                    htmlFor={seasonDescriptionId}
                    className="block text-sm font-medium text-primary mb-1"
                  >
                    Description (optional)
                  </label>
                  <textarea
                    id={seasonDescriptionId}
                    value={newSeasonDescription}
                    onChange={(e) => setNewSeasonDescription(e.target.value)}
                    placeholder="Add a description for this season..."
                    rows={3}
                    className="w-full px-3 py-2 border border-[var(--th-border)] rounded-[var(--th-radius-md)] focus:ring-2 focus:ring-[var(--th-sport-primary)] focus:border-transparent resize-none"
                    disabled={isCreating}
                  />
                </div>

                {error && (
                  <div className="bg-card-hover border border-[var(--th-border)] rounded-lg p-3 flex items-start gap-2">
                    <XCircle size={20} className="text-[var(--th-loss)] flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-primary">{error}</p>
                  </div>
                )}

                {success && (
                  <div className="bg-accent-subtle border border-[var(--th-border)] rounded-lg p-3 flex items-start gap-2">
                    <CheckCircle size={20} className="text-[var(--th-win)] flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-primary">Season created successfully!</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isCreating || !newSeasonName.trim()}
                  className="w-full bg-sport-gradient text-white px-4 py-2 rounded-[var(--th-radius-md)] font-medium hover:bg-sport-gradient-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isCreating ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating Season...
                    </>
                  ) : (
                    <>
                      <PlusCircle size={20} />
                      Create New Season
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Archived Seasons */}
          {archivedSeasons.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-primary mb-3">Archived Seasons</h3>
              <div className="space-y-2">
                {archivedSeasons.map((season) => (
                  <div
                    key={season.id}
                    className="bg-card-hover border border-[var(--th-border)] rounded-[var(--th-radius-md)] p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-primary">{season.name}</span>
                          <span className="text-xs bg-card-hover text-secondary px-2 py-0.5 rounded">
                            Archived
                          </span>
                        </div>
                        <p className="text-sm text-secondary mt-1">
                          {season.startDate} - {season.endDate || 'Unknown'}
                        </p>
                        {season.description && (
                          <p className="text-sm text-muted mt-2">{season.description}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--th-border)] bg-card-hover">
          <button
            type="button"
            onClick={onClose}
            className="w-full px-4 py-2 bg-card border border-[var(--th-border)] text-primary rounded-[var(--th-radius-md)] font-medium hover:bg-card-hover transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </ModalOrBottomDrawer>
  )

  return createPortal(modalContent, document.body)
}
