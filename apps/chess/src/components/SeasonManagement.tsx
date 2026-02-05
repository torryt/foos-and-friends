import { Calendar, CheckCircle, PlusCircle, XCircle } from 'lucide-react'
import { useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSeasonContext } from '@/contexts/SeasonContext'

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
    <>
      {/* Backdrop */}
      <button
        type="button"
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
        aria-label="Close modal"
        tabIndex={-1}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full my-8 flex flex-col max-h-[calc(100vh-4rem)]">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-orange-500 to-red-500">
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
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Active Season</h3>
              {activeSeason ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-green-900">
                          {activeSeason.name}
                        </span>
                        <span className="text-green-600">🟢</span>
                      </div>
                      <p className="text-sm text-green-700 mt-1">
                        Started: {activeSeason.startDate}
                      </p>
                      {activeSeason.description && (
                        <p className="text-sm text-green-600 mt-2">{activeSeason.description}</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">No active season</p>
              )}
            </div>

            {/* Create New Season Form */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Create New Season</h3>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <p className="text-sm text-orange-800 mb-4">
                  ⚠️ Creating a new season will end the current active season and reset all player
                  rankings to 1200.
                </p>

                <form onSubmit={handleCreateSeason} className="space-y-4">
                  <div>
                    <label
                      htmlFor={seasonNameId}
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Season Name *
                    </label>
                    <input
                      type="text"
                      id={seasonNameId}
                      value={newSeasonName}
                      onChange={(e) => setNewSeasonName(e.target.value)}
                      placeholder="e.g., Spring 2024, Season 2"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      disabled={isCreating}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor={seasonDescriptionId}
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Description (optional)
                    </label>
                    <textarea
                      id={seasonDescriptionId}
                      value={newSeasonDescription}
                      onChange={(e) => setNewSeasonDescription(e.target.value)}
                      placeholder="Add a description for this season..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                      disabled={isCreating}
                    />
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                      <XCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-800">{error}</p>
                    </div>
                  )}

                  {success && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
                      <CheckCircle size={20} className="text-green-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-green-800">Season created successfully!</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isCreating || !newSeasonName.trim()}
                    className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2 rounded-lg font-medium hover:from-orange-600 hover:to-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Archived Seasons</h3>
                <div className="space-y-2">
                  {archivedSeasons.map((season) => (
                    <div
                      key={season.id}
                      className="bg-gray-50 border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">{season.name}</span>
                            <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded">
                              Archived
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {season.startDate} - {season.endDate || 'Unknown'}
                          </p>
                          {season.description && (
                            <p className="text-sm text-gray-500 mt-2">{season.description}</p>
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
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  )

  return isOpen ? createPortal(modalContent, document.body) : null
}
