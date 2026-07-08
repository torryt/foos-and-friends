import type { FriendGroup } from '@foos/shared'
import { Flame, Loader, Plus, Settings, X } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { useGroupContext } from '@/contexts/GroupContext'
import { useSeasonContext } from '@/contexts/SeasonContext'
import { useToast } from '@/hooks/useToast'
import { ModalOrBottomDrawer } from './ModalOrBottomDrawer'
import { NewSeasonWizard } from './NewSeasonWizard'

const TARGET_SCORE_PRESETS = [5, 8, 10, 15]

interface GroupSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  group: FriendGroup | null
}

export const GroupSettingsModal = ({ isOpen, onClose, group }: GroupSettingsModalProps) => {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [targetScore, setTargetScore] = useState(10)
  const [customScore, setCustomScore] = useState('')
  const [useCustomScore, setUseCustomScore] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSeasonWizard, setShowSeasonWizard] = useState(false)
  const nameId = useId()
  const descriptionId = useId()
  const customScoreId = useId()

  const { updateGroup, currentGroup } = useGroupContext()
  const { seasons } = useSeasonContext()
  const { toast } = useToast()

  // The season wizard operates on the currently selected group (via
  // SeasonContext), so only offer it when editing that group.
  const activeSeason = seasons.find((s) => s.isActive)
  const canManageSeasons = !!group && group.id === currentGroup?.id && !!group.isOwner

  // Sync form state when the modal opens for a group
  useEffect(() => {
    if (isOpen && group) {
      setName(group.name)
      setDescription(group.description || '')
      setTargetScore(group.targetScore)
      const isPreset = TARGET_SCORE_PRESETS.includes(group.targetScore)
      setUseCustomScore(!isPreset)
      setCustomScore(isPreset ? '' : String(group.targetScore))
      setError(null)
    }
  }, [isOpen, group])

  if (!group) return null

  const effectiveTargetScore = useCustomScore ? Number.parseInt(customScore, 10) : targetScore
  const isTargetScoreValid =
    Number.isInteger(effectiveTargetScore) &&
    effectiveTargetScore >= 1 &&
    effectiveTargetScore <= 100

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim() || name.trim().length < 3 || name.trim().length > 50) {
      setError('Group name must be 3–50 characters')
      return
    }

    if (!isTargetScoreValid) {
      setError('Target score must be between 1 and 100')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await updateGroup(group.id, {
        name: name.trim(),
        description: description.trim() || null,
        targetScore: effectiveTargetScore,
      })

      if (result.success) {
        toast().success('Group settings saved')
        onClose()
      } else {
        setError(result.error || 'Failed to save group settings')
      }
    } catch (_err) {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      setError(null)
      onClose()
    }
  }

  return (
    <ModalOrBottomDrawer isOpen={isOpen} onClose={handleClose} className="sm:max-w-md">
      <div className="bg-card shadow-xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-[var(--th-border)]">
          <div className="flex items-center gap-2">
            <Settings size={20} className="text-[var(--th-sport-primary)]" />
            <h2 className="text-lg font-semibold text-primary">Group Settings</h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="text-muted hover:text-secondary transition-colors disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor={nameId} className="block text-sm font-medium text-primary mb-1">
              Group Name *
            </label>
            <input
              type="text"
              id={nameId}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--th-border)] rounded-[var(--th-radius-md)] focus:outline-none focus:ring-2 focus:ring-[var(--th-sport-primary)] focus:border-transparent"
              disabled={isLoading}
              maxLength={50}
              required
            />
          </div>

          <div>
            <label htmlFor={descriptionId} className="block text-sm font-medium text-primary mb-1">
              Description (optional)
            </label>
            <textarea
              id={descriptionId}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-[var(--th-border)] rounded-[var(--th-radius-md)] focus:outline-none focus:ring-2 focus:ring-[var(--th-sport-primary)] focus:border-transparent resize-none"
              disabled={isLoading}
              maxLength={200}
            />
          </div>

          <div>
            <span className="block text-sm font-medium text-primary mb-1">Points to win</span>
            <p className="text-xs text-secondary mb-2">
              Used to pre-fill the winner's score when registering matches
            </p>
            <div className="flex flex-wrap gap-2">
              {TARGET_SCORE_PRESETS.map((preset) => {
                const isSelected = !useCustomScore && targetScore === preset
                return (
                  <button
                    key={preset}
                    type="button"
                    disabled={isLoading}
                    onClick={() => {
                      setTargetScore(preset)
                      setUseCustomScore(false)
                    }}
                    className={`min-w-12 min-h-11 px-4 py-2 rounded-[var(--th-radius-md)] border font-semibold transition-colors disabled:opacity-50 ${
                      isSelected
                        ? 'bg-[var(--th-sport-primary)] text-white border-transparent'
                        : 'bg-card border-[var(--th-border)] text-primary hover:bg-card-hover'
                    }`}
                  >
                    {preset}
                  </button>
                )
              })}
              <button
                type="button"
                disabled={isLoading}
                onClick={() => setUseCustomScore(true)}
                className={`min-h-11 px-4 py-2 rounded-[var(--th-radius-md)] border font-semibold transition-colors disabled:opacity-50 ${
                  useCustomScore
                    ? 'bg-[var(--th-sport-primary)] text-white border-transparent'
                    : 'bg-card border-[var(--th-border)] text-primary hover:bg-card-hover'
                }`}
              >
                Custom
              </button>
            </div>
            {useCustomScore && (
              <div className="mt-2">
                <label htmlFor={customScoreId} className="sr-only">
                  Custom points to win
                </label>
                <input
                  type="number"
                  id={customScoreId}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  min="1"
                  max="100"
                  value={customScore}
                  onChange={(e) => setCustomScore(e.target.value)}
                  placeholder="e.g. 12"
                  className="w-24 px-3 py-2 border border-[var(--th-border)] rounded-[var(--th-radius-md)] text-center font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--th-sport-primary)] focus:border-transparent"
                  disabled={isLoading}
                />
              </div>
            )}
          </div>

          {canManageSeasons && activeSeason && (
            <div className="pt-4 border-t border-[var(--th-border-subtle)]">
              <span className="block text-sm font-medium text-primary mb-1">Season</span>
              <p className="text-xs text-secondary mb-2 flex items-center gap-1.5">
                <Flame size={12} className="text-[var(--th-sport-primary)]" aria-hidden="true" />
                {activeSeason.name} is live
              </p>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => setShowSeasonWizard(true)}
                className="w-full min-h-11 px-4 py-2 border border-[var(--th-border)] text-primary rounded-[var(--th-radius-md)] font-semibold text-sm hover:bg-card-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Plus size={16} />
                Start new season
              </button>
              <p className="text-xs text-muted mt-2">
                Archives {activeSeason.name} and resets all rankings to 1200. Only visible to you as
                group owner.
              </p>
            </div>
          )}

          {error && (
            <div className="p-3 bg-card-hover border border-[var(--th-border)] rounded-[var(--th-radius-md)]">
              <p className="text-[var(--th-loss)] text-sm">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2 border border-[var(--th-border)] text-primary rounded-[var(--th-radius-md)] hover:bg-card-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !name.trim() || !isTargetScoreValid}
              className="flex-1 px-4 py-2 bg-[var(--th-sport-primary)] text-white rounded-[var(--th-radius-md)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader size={16} className="animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Settings'
              )}
            </button>
          </div>
        </form>
      </div>

      {showSeasonWizard && (
        <NewSeasonWizard
          onClose={() => setShowSeasonWizard(false)}
          onDone={() => {
            setShowSeasonWizard(false)
            onClose()
          }}
        />
      )}
    </ModalOrBottomDrawer>
  )
}
