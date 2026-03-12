import type { TeamAssignment } from '@foos/shared'
import { ArrowLeft, ArrowLeftRight, CloudOff, Loader2, Target, X } from 'lucide-react'
import { useId, useState } from 'react'
import { useOfflineStatus } from '@/hooks/useOfflineStatus'
import { ModalOrBottomDrawer } from './ModalOrBottomDrawer'

interface ScoreEntryStepProps {
  teams: TeamAssignment
  onBack: () => void
  onClose: () => void
  onSubmit: (score1: string, score2: string) => Promise<void>
  title?: string
  onSwapTeam1?: () => void
  onSwapTeam2?: () => void
}

export const ScoreEntryStep = ({
  teams,
  onBack,
  onClose,
  onSubmit,
  title = 'Enter Score',
  onSwapTeam1,
  onSwapTeam2,
}: ScoreEntryStepProps) => {
  const [score1, setScore1] = useState('')
  const [score2, setScore2] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { isOnline } = useOfflineStatus()
  const team1Id = useId()
  const team2Id = useId()

  const handleSubmit = async () => {
    if (score1 === '' || score2 === '') return

    setIsSubmitting(true)
    try {
      await onSubmit(score1, score2)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleScoreChange = (value: string, setter: (value: string) => void) => {
    // Only allow positive integers
    if (value === '' || (/^\d+$/.test(value) && Number.parseInt(value, 10) >= 0)) {
      setter(value)
    }
  }

  const isValid = score1 !== '' && score2 !== ''

  return (
    <ModalOrBottomDrawer onClose={onClose} className="sm:max-w-md">
      <div className="bg-card p-6 w-full shadow-2xl border border-[var(--th-border)]">
        <div className="flex justify-between items-center mb-6">
          <button
            type="button"
            onClick={onBack}
            disabled={isSubmitting}
            className="flex items-center gap-2 text-secondary hover:text-primary transition-colors disabled:opacity-50"
          >
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-muted hover:text-secondary p-1 rounded-full hover:bg-card-hover disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <div className="text-center mb-6">
          <Target className="mx-auto text-[var(--th-sport-primary)] mb-2" size={24} />
          <h2 className="text-lg font-bold text-primary">{title}</h2>
          <p className="text-sm text-secondary">Enter the final score of the match</p>
        </div>

        {/* Teams Display */}
        <div className="mb-6">
          <div className="space-y-3">
            <div className="bg-card-hover rounded-lg p-3 border border-[var(--th-border)]">
              <div className="font-medium text-[var(--th-accent)] text-sm mb-1">Team 1</div>
              <div className="grid grid-cols-3 items-center text-primary">
                <span className="text-left">{teams.team1.attacker.name} (A)</span>
                <div className="flex justify-center">
                  {onSwapTeam1 && (
                    <button
                      type="button"
                      onClick={onSwapTeam1}
                      disabled={isSubmitting}
                      className="p-1.5 text-[var(--th-accent)] hover:text-primary hover:bg-card-hover rounded transition-colors disabled:opacity-50"
                      title="Swap positions for Team 1"
                    >
                      <ArrowLeftRight size={18} />
                    </button>
                  )}
                </div>
                <span className="text-right">{teams.team1.defender.name} (D)</span>
              </div>
            </div>
            <div className="bg-card-hover rounded-lg p-3 border border-[var(--th-border)]">
              <div className="font-medium text-[var(--th-sport-primary)] text-sm mb-1">Team 2</div>
              <div className="grid grid-cols-3 items-center text-primary">
                <span className="text-left">{teams.team2.attacker.name} (A)</span>
                <div className="flex justify-center">
                  {onSwapTeam2 && (
                    <button
                      type="button"
                      onClick={onSwapTeam2}
                      disabled={isSubmitting}
                      className="p-1.5 text-[var(--th-sport-primary)] hover:text-primary hover:bg-card-hover rounded transition-colors disabled:opacity-50"
                      title="Swap positions for Team 2"
                    >
                      <ArrowLeftRight size={18} />
                    </button>
                  )}
                </div>
                <span className="text-right">{teams.team2.defender.name} (D)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Score Input */}
        <div className="mb-6">
          <div className="bg-accent-subtle rounded-[var(--th-radius-lg)] p-4 border border-[var(--th-border)]">
            <div className="font-medium text-primary text-sm mb-3">Final Score</div>
            <div className="grid grid-cols-3 gap-3 items-center">
              <div>
                <label htmlFor={team1Id} className="block text-xs text-secondary mb-1">
                  Team 1
                </label>
                <input
                  id={team1Id}
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  min="0"
                  max="15"
                  value={score1}
                  onChange={(e) => handleScoreChange(e.target.value, setScore1)}
                  disabled={isSubmitting}
                  placeholder="0"
                  className="w-full p-3 border border-[var(--th-border)] rounded-[var(--th-radius-md)] bg-card text-center font-semibold text-lg focus:ring-2 focus:ring-[var(--th-sport-primary)] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
              <div className="text-center font-bold text-primary text-lg">VS</div>
              <div>
                <label htmlFor={team2Id} className="block text-xs text-secondary mb-1">
                  Team 2
                </label>
                <input
                  id={team2Id}
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  min="0"
                  max="15"
                  value={score2}
                  onChange={(e) => handleScoreChange(e.target.value, setScore2)}
                  disabled={isSubmitting}
                  placeholder="0"
                  className="w-full p-3 border border-[var(--th-border)] rounded-[var(--th-radius-md)] bg-card text-center font-semibold text-lg focus:ring-2 focus:ring-[var(--th-sport-primary)] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>
            <p className="text-xs text-secondary mt-2 text-center">
              Games are typically played to 10 points
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!isValid || isSubmitting || !isOnline}
          className="w-full bg-[var(--th-sport-primary)] hover:opacity-90 text-white py-3 px-4 rounded-[var(--th-radius-lg)] font-semibold shadow-theme-card transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          title={!isOnline ? 'Cannot register score while offline' : undefined}
        >
          {!isOnline ? (
            <>
              <CloudOff size={16} />
              Offline - Cannot Register
            </>
          ) : isSubmitting ? (
            <>
              <Loader2 className="animate-spin" size={16} />
              Registering Score...
            </>
          ) : (
            'Register Score'
          )}
        </button>

        {!isValid && (
          <p className="text-sm text-[var(--th-loss)] text-center mt-2">
            Please enter scores for both teams
          </p>
        )}
      </div>
    </ModalOrBottomDrawer>
  )
}
