import { Archive, ArrowLeft, RotateCcw, Trophy } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { useGroupContext } from '@/contexts/GroupContext'
import { useSeasonContext } from '@/contexts/SeasonContext'
import { useToast } from '@/hooks/useToast'
import { matchesService, playersService, playerSeasonStatsService } from '@/lib/init'
import { ModalOrBottomDrawer } from './ModalOrBottomDrawer'

type Step = 'consequences' | 'name' | 'confirm'

interface NewSeasonWizardProps {
  onClose: () => void
  onDone: () => void
}

/**
 * Owner-only 3-step flow for ending the active season and starting a new one:
 * 1. consequences (what gets archived / reset), 2. naming, 3. explicit confirm.
 * The server RPC enforces ownership; the entry point is additionally gated in the UI.
 */
export const NewSeasonWizard = ({ onClose, onDone }: NewSeasonWizardProps) => {
  const { currentGroup } = useGroupContext()
  const { seasons, endSeasonAndCreateNew } = useSeasonContext()
  const { toast } = useToast()
  const nameId = useId()
  const descriptionId = useId()

  const activeSeason = seasons.find((s) => s.isActive)
  const nextSeasonNumber = Math.max(0, ...seasons.map((s) => s.seasonNumber)) + 1

  const [step, setStep] = useState<Step>('consequences')
  const [name, setName] = useState(`Season ${nextSeasonNumber}`)
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Live context for the consequences step: how many matches get archived
  // and who ends the season on top.
  const [matchCount, setMatchCount] = useState<number | null>(null)
  const [leaderName, setLeaderName] = useState<string | null>(null)

  useEffect(() => {
    if (!currentGroup || !activeSeason) return

    let stale = false
    Promise.all([
      matchesService.getMatchesBySeason(activeSeason.id),
      playerSeasonStatsService.getSeasonLeaderboard(activeSeason.id),
      playersService.getPlayersByGroup(currentGroup.id),
    ]).then(([matchesResult, leaderboardResult, playersResult]) => {
      if (stale) return
      if (!matchesResult.error) {
        setMatchCount(matchesResult.data.length)
      }
      if (!leaderboardResult.error && !playersResult.error && leaderboardResult.data.length > 0) {
        const top = leaderboardResult.data.toSorted((a, b) => b.ranking - a.ranking)[0]
        const player = playersResult.data.find((p) => p.id === top.playerId)
        if (player) setLeaderName(player.name)
      }
    })

    return () => {
      stale = true
    }
  }, [currentGroup, activeSeason])

  if (!activeSeason) return null

  const handleConfirm = async () => {
    setSubmitting(true)
    setError(null)

    const result = await endSeasonAndCreateNew(name.trim(), description.trim() || undefined)

    setSubmitting(false)
    if (result.success) {
      toast().success(`${activeSeason.name} archived — ${name.trim()} has begun! 🎉`)
      onDone()
    } else {
      setError(result.error || 'Failed to start the new season')
    }
  }

  const stepIndex = step === 'consequences' ? 0 : step === 'name' ? 1 : 2

  const wizard = (
    <ModalOrBottomDrawer isOpen onClose={onClose} className="sm:max-w-md">
      <div className="bg-card shadow-2xl w-full flex flex-col max-h-[85vh] pb-[env(safe-area-inset-bottom)]">
        {/* Progress header */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-3">
          <button
            type="button"
            onClick={() => {
              if (step === 'consequences') onClose()
              else setStep(step === 'confirm' ? 'name' : 'consequences')
            }}
            aria-label={step === 'consequences' ? 'Cancel' : 'Back'}
            className="min-h-11 min-w-11 flex items-center justify-center text-muted hover:text-secondary transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 flex gap-1.5" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className={`h-1 flex-1 rounded-full ${
                  i <= stepIndex ? 'bg-sport-gradient' : 'bg-[var(--th-border)]'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
          {step === 'consequences' && (
            <>
              <div>
                <h2 className="text-lg font-bold text-primary">Start a new season?</h2>
                <p className="text-sm text-secondary">Here's what happens:</p>
              </div>
              <div className="bg-card-hover border border-[var(--th-border-subtle)] rounded-[var(--th-radius-lg)] divide-y divide-[var(--th-border-subtle)]">
                <div className="flex gap-3 p-3">
                  <span className="w-9 h-9 rounded-[var(--th-radius-sm)] bg-accent-subtle text-[var(--th-sport-primary)] flex items-center justify-center flex-none">
                    <Archive size={16} />
                  </span>
                  <div className="text-sm">
                    <p className="font-semibold text-primary">{activeSeason.name} ends today</p>
                    <p className="text-secondary">
                      {matchCount !== null
                        ? `${matchCount} ${matchCount === 1 ? 'match' : 'matches'} and final standings are archived — nothing is deleted.`
                        : 'All matches and final standings are archived — nothing is deleted.'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 p-3">
                  <span className="w-9 h-9 rounded-[var(--th-radius-sm)] bg-accent-subtle text-[var(--th-sport-primary)] flex items-center justify-center flex-none">
                    <RotateCcw size={16} />
                  </span>
                  <div className="text-sm">
                    <p className="font-semibold text-primary">All rankings reset to 1200</p>
                    <p className="text-secondary">
                      Everyone starts the new season from scratch. There is no carry-over.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 p-3">
                  <span className="w-9 h-9 rounded-[var(--th-radius-sm)] bg-accent-subtle text-[var(--th-sport-primary)] flex items-center justify-center flex-none">
                    <Trophy size={16} />
                  </span>
                  <div className="text-sm">
                    <p className="font-semibold text-primary">
                      {leaderName ? `${leaderName} is crowned champion` : 'The leader is crowned'}
                    </p>
                    <p className="text-secondary">
                      Final standings stay browsable from the season switcher.
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 min-h-12 border border-[var(--th-border)] text-secondary rounded-[var(--th-radius-md)] font-semibold text-sm hover:bg-card-hover transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setStep('name')}
                  className="flex-1 min-h-12 bg-sport-gradient hover:bg-sport-gradient-hover text-white rounded-[var(--th-radius-md)] font-semibold text-sm transition-all"
                >
                  Continue
                </button>
              </div>
            </>
          )}

          {step === 'name' && (
            <>
              <h2 className="text-lg font-bold text-primary">Name the new season</h2>
              <div>
                <label
                  htmlFor={nameId}
                  className="block text-xs font-semibold text-secondary uppercase tracking-wide mb-1"
                >
                  Season name
                </label>
                <input
                  type="text"
                  id={nameId}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                  autoComplete="off"
                  className="w-full px-3 py-3 text-base bg-[var(--th-bg-input)] border border-[var(--th-border)] rounded-[var(--th-radius-md)] text-primary focus:ring-2 focus:ring-[var(--th-sport-primary)] focus:border-transparent focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor={descriptionId}
                  className="block text-xs font-semibold text-secondary uppercase tracking-wide mb-1"
                >
                  Description · optional
                </label>
                <textarea
                  id={descriptionId}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Summer showdown ☀️"
                  rows={2}
                  className="w-full px-3 py-3 text-base bg-[var(--th-bg-input)] border border-[var(--th-border)] rounded-[var(--th-radius-md)] text-primary focus:ring-2 focus:ring-[var(--th-sport-primary)] focus:border-transparent focus:outline-none resize-none"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setStep('consequences')}
                  className="flex-1 min-h-12 border border-[var(--th-border)] text-secondary rounded-[var(--th-radius-md)] font-semibold text-sm hover:bg-card-hover transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep('confirm')}
                  disabled={!name.trim()}
                  className="flex-1 min-h-12 bg-sport-gradient hover:bg-sport-gradient-hover text-white rounded-[var(--th-radius-md)] font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              </div>
            </>
          )}

          {step === 'confirm' && (
            <>
              <h2 className="text-lg font-bold text-primary">Ready?</h2>
              <div className="bg-card-hover border border-[var(--th-border-subtle)] rounded-[var(--th-radius-lg)] p-5 text-center space-y-1">
                <p className="text-2xl" aria-hidden="true">
                  🍂 → 🌱
                </p>
                <p className="font-bold text-primary">
                  {activeSeason.name} ends · {name.trim()} begins
                </p>
                <p className="text-xs text-secondary">
                  This can't be undone. The old season stays browsable forever.
                </p>
              </div>
              {error && (
                <p className="text-sm text-[var(--th-loss)] text-center" role="alert">
                  {error}
                </p>
              )}
              <div className="flex flex-col gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={submitting}
                  className="w-full min-h-12 bg-[var(--th-loss)] text-white rounded-[var(--th-radius-md)] font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting && (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  )}
                  End {activeSeason.name} &amp; start {name.trim()}
                </button>
                <button
                  type="button"
                  onClick={() => setStep('name')}
                  disabled={submitting}
                  className="w-full min-h-12 border border-[var(--th-border)] text-secondary rounded-[var(--th-radius-md)] font-semibold text-sm hover:bg-card-hover transition-colors disabled:opacity-50"
                >
                  Back
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </ModalOrBottomDrawer>
  )

  return createPortal(wizard, document.body)
}
