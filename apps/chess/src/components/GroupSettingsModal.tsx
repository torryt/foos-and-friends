import type { FriendGroup, JoinPolicy } from '@foos/shared'
import { Flame, Link2, Loader, Monitor, Plus, RefreshCw, Settings, X } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { useGroupContext } from '@/contexts/GroupContext'
import { useSeasonContext } from '@/contexts/SeasonContext'
import { useToast } from '@/hooks/useToast'
import { groupService } from '@/lib/init'
import { ModalOrBottomDrawer } from './ModalOrBottomDrawer'
import { NewSeasonWizard } from './NewSeasonWizard'

interface GroupSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  group: FriendGroup | null
}

export const GroupSettingsModal = ({ isOpen, onClose, group }: GroupSettingsModalProps) => {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSeasonWizard, setShowSeasonWizard] = useState(false)
  const nameId = useId()
  const descriptionId = useId()

  // Sharing settings (owner + admins)
  const [isPublic, setIsPublic] = useState(false)
  const [publicToken, setPublicToken] = useState<string | null>(null)
  const [joinPolicy, setJoinPolicy] = useState<JoinPolicy>('open')
  const [sharingBusy, setSharingBusy] = useState(false)

  const { updateGroup, currentGroup, refreshGroups } = useGroupContext()
  const { seasons } = useSeasonContext()
  const { toast } = useToast()

  // The season wizard operates on the currently selected group (via
  // SeasonContext), so only offer it when editing that group.
  const activeSeason = seasons.find((s) => s.isActive)
  const canManageSeasons = !!group && group.id === currentGroup?.id && !!group.isOwner
  // Base settings are owner-only (RLS enforces this); sharing settings are
  // also open to admins via role-checked RPCs.
  const isOwner = !!group?.isOwner
  const canManageSharing = !!group && (group.isOwner || group.currentUserRole === 'admin')

  // Sync form state when the modal opens for a group
  useEffect(() => {
    if (isOpen && group) {
      setName(group.name)
      setDescription(group.description || '')
      setIsPublic(group.isPublic)
      setPublicToken(group.publicToken)
      setJoinPolicy(group.joinPolicy)
      setError(null)
    }
  }, [isOpen, group])

  if (!group) return null

  const publicUrl = publicToken ? `${window.location.origin}/public/${publicToken}` : null

  const handleTogglePublic = async () => {
    setSharingBusy(true)
    try {
      const result = await groupService.setGroupSharing(group.id, !isPublic)
      if (result.data) {
        setIsPublic(result.data.isPublic)
        setPublicToken(result.data.publicToken)
        toast().success(result.data.isPublic ? 'Public page enabled' : 'Public page disabled')
        await refreshGroups()
      } else {
        toast().error(result.error || 'Failed to update sharing')
      }
    } finally {
      setSharingBusy(false)
    }
  }

  const handleRegenerateToken = async () => {
    if (
      !window.confirm('Generate a new public link? The old link will stop working immediately.')
    ) {
      return
    }
    setSharingBusy(true)
    try {
      const result = await groupService.regeneratePublicToken(group.id)
      if (result.data) {
        setPublicToken(result.data.publicToken)
        toast().success('New public link generated')
        await refreshGroups()
      } else {
        toast().error(result.error || 'Failed to regenerate link')
      }
    } finally {
      setSharingBusy(false)
    }
  }

  const handleJoinPolicyChange = async (policy: JoinPolicy) => {
    if (policy === joinPolicy) return
    setSharingBusy(true)
    try {
      const result = await groupService.setGroupJoinPolicy(group.id, policy)
      if (result.success) {
        setJoinPolicy(policy)
        toast().success(
          policy === 'approval' ? 'New members now need approval' : 'Anyone with the link can join',
        )
        await refreshGroups()
      } else {
        toast().error(result.error || 'Failed to update join policy')
      }
    } finally {
      setSharingBusy(false)
    }
  }

  const copyToClipboard = async (value: string, message: string) => {
    try {
      await navigator.clipboard.writeText(value)
      toast().success(message)
    } catch {
      toast().error('Could not copy to clipboard')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Base settings are owner-only; admins use the modal for sharing settings
    if (!isOwner) {
      onClose()
      return
    }

    if (!name.trim() || name.trim().length < 3 || name.trim().length > 50) {
      setError('Group name must be 3–50 characters')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await updateGroup(group.id, {
        name: name.trim(),
        description: description.trim() || null,
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
              className="w-full px-3 py-2 border border-[var(--th-border)] rounded-[var(--th-radius-md)] focus:outline-none focus:ring-2 focus:ring-[var(--th-sport-primary)] focus:border-transparent disabled:opacity-60"
              disabled={isLoading || !isOwner}
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
              className="w-full px-3 py-2 border border-[var(--th-border)] rounded-[var(--th-radius-md)] focus:outline-none focus:ring-2 focus:ring-[var(--th-sport-primary)] focus:border-transparent resize-none disabled:opacity-60"
              disabled={isLoading || !isOwner}
              maxLength={200}
            />
          </div>

          {canManageSharing && (
            <div className="pt-4 border-t border-[var(--th-border-subtle)] space-y-3">
              <span className="block text-sm font-medium text-primary">Sharing</span>

              {/* Public page toggle */}
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-primary">Public page</p>
                  <p className="text-xs text-secondary">
                    Anyone with the link can view rankings and matches — no account needed
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isPublic}
                  aria-label="Enable public page"
                  disabled={sharingBusy}
                  onClick={handleTogglePublic}
                  className={`relative w-12 h-7 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
                    isPublic
                      ? 'bg-[var(--th-sport-primary)]'
                      : 'bg-card-hover border border-[var(--th-border)]'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${
                      isPublic ? 'left-6' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              {isPublic && publicUrl && (
                <div className="space-y-2">
                  <button
                    type="button"
                    disabled={sharingBusy}
                    onClick={() => copyToClipboard(publicUrl, 'Public link copied')}
                    className="w-full min-h-11 px-4 py-2 border border-[var(--th-border)] text-primary rounded-[var(--th-radius-md)] text-sm font-medium hover:bg-card-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Link2 size={16} />
                    Copy public link
                  </button>
                  <button
                    type="button"
                    disabled={sharingBusy}
                    onClick={() => copyToClipboard(`${publicUrl}/tv`, 'TV leaderboard link copied')}
                    className="w-full min-h-11 px-4 py-2 border border-[var(--th-border)] text-primary rounded-[var(--th-radius-md)] text-sm font-medium hover:bg-card-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Monitor size={16} />
                    Copy TV leaderboard link
                  </button>
                  <button
                    type="button"
                    disabled={sharingBusy}
                    onClick={handleRegenerateToken}
                    className="w-full min-h-11 px-4 py-2 text-secondary rounded-[var(--th-radius-md)] text-sm hover:bg-card-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <RefreshCw size={14} />
                    Generate new link
                  </button>
                </div>
              )}

              {/* Join policy */}
              <div>
                <p className="text-sm text-primary mb-1">Joining via invite link</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={sharingBusy}
                    onClick={() => handleJoinPolicyChange('open')}
                    aria-pressed={joinPolicy === 'open'}
                    className={`flex-1 min-h-11 px-3 py-2 rounded-[var(--th-radius-md)] border text-sm font-medium transition-colors disabled:opacity-50 ${
                      joinPolicy === 'open'
                        ? 'bg-[var(--th-sport-primary)] text-white border-transparent'
                        : 'bg-card border-[var(--th-border)] text-primary hover:bg-card-hover'
                    }`}
                  >
                    Anyone can join
                  </button>
                  <button
                    type="button"
                    disabled={sharingBusy}
                    onClick={() => handleJoinPolicyChange('approval')}
                    aria-pressed={joinPolicy === 'approval'}
                    className={`flex-1 min-h-11 px-3 py-2 rounded-[var(--th-radius-md)] border text-sm font-medium transition-colors disabled:opacity-50 ${
                      joinPolicy === 'approval'
                        ? 'bg-[var(--th-sport-primary)] text-white border-transparent'
                        : 'bg-card border-[var(--th-border)] text-primary hover:bg-card-hover'
                    }`}
                  >
                    Needs approval
                  </button>
                </div>
                {isPublic && joinPolicy === 'open' && (
                  <p className="text-xs text-muted mt-2">
                    Heads up: the public page shows a Join button, so anyone with the public link
                    can also join.
                  </p>
                )}
              </div>
            </div>
          )}

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
            {isOwner && (
              <button
                type="submit"
                disabled={isLoading || !name.trim()}
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
            )}
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
