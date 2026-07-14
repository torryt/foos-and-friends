import type { TeamAssignment } from '@foos/shared'
import { ArrowLeft, ArrowLeftRight, CloudOff, Loader2, Trophy, X } from 'lucide-react'
import { useId, useState } from 'react'
import { useGroupContext } from '@/contexts/GroupContext'
import { useOfflineStatus } from '@/hooks/useOfflineStatus'
import { ModalOrBottomDrawer } from './ModalOrBottomDrawer'

// Above this the loser-score chip grid gets unwieldy; fall back to free entry
const MAX_CHIP_TARGET = 16

interface ScoreEntryStepProps {
  teams: TeamAssignment
  onBack: () => void
  onClose: () => void
  onSubmit: (score1: string, score2: string) => Promise<void>
  title?: string
  onSwapTeam1?: () => void
  onSwapTeam2?: () => void
}

interface TeamCardProps {
  label: string
  accentVar: string
  attackerName: string
  defenderName: string
  isWinner: boolean
  disabled: boolean
  onSelect: () => void
  onSwap?: () => void
}

const TeamCard = ({
  label,
  accentVar,
  attackerName,
  defenderName,
  isWinner,
  disabled,
  onSelect,
  onSwap,
}: TeamCardProps) => (
  <div className="relative">
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={isWinner}
      className={`w-full text-left rounded-[var(--th-radius-lg)] p-4 border-2 transition-all disabled:opacity-50 ${
        isWinner
          ? 'border-[var(--th-win)] bg-[var(--th-win)]/10 ring-2 ring-[var(--th-win)]/30'
          : 'border-[var(--th-border)] bg-card-hover hover:border-[var(--th-sport-primary)]'
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span
          className={`font-medium text-sm ${isWinner ? 'text-[var(--th-win)]' : ''}`}
          style={isWinner ? undefined : { color: `var(${accentVar})` }}
        >
          {label}
        </span>
        {isWinner && <Trophy size={18} className="text-[var(--th-win)]" />}
      </div>
      <div className={`flex items-center justify-between text-primary ${onSwap ? 'pr-8' : ''}`}>
        <span className="truncate">{attackerName} (A)</span>
        <span className="truncate text-right">{defenderName} (D)</span>
      </div>
    </button>
    {onSwap && (
      <button
        type="button"
        onClick={onSwap}
        disabled={disabled}
        className="absolute bottom-3 right-3 p-1.5 text-muted hover:text-primary hover:bg-card-hover rounded transition-colors disabled:opacity-50"
        title={`Swap positions for ${label}`}
      >
        <ArrowLeftRight size={16} />
      </button>
    )}
  </div>
)

// Only allow positive integers
const handleScoreChange = (value: string, setter: (value: string) => void) => {
  if (value === '' || (/^\d+$/.test(value) && Number.parseInt(value, 10) >= 0)) {
    setter(value)
  }
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
  const { currentGroup } = useGroupContext()
  const targetScore = currentGroup?.targetScore ?? 10
  const chipsAvailable = targetScore <= MAX_CHIP_TARGET

  const [winner, setWinner] = useState<1 | 2 | null>(null)
  const [loserScore, setLoserScore] = useState<number | null>(null)
  const [freeEntry, setFreeEntry] = useState(!chipsAvailable)
  const [score1, setScore1] = useState('')
  const [score2, setScore2] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { isOnline } = useOfflineStatus()
  const team1Id = useId()
  const team2Id = useId()

  const isFreeEntryValid = score1 !== '' && score2 !== '' && score1 !== score2
  const isValid = freeEntry ? isFreeEntryValid : winner !== null && loserScore !== null

  const handleSubmit = async () => {
    if (!isValid) return

    let finalScore1 = score1
    let finalScore2 = score2
    if (!freeEntry && winner !== null && loserScore !== null) {
      finalScore1 = winner === 1 ? String(targetScore) : String(loserScore)
      finalScore2 = winner === 2 ? String(targetScore) : String(loserScore)
    }

    setIsSubmitting(true)
    try {
      await onSubmit(finalScore1, finalScore2)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <ModalOrBottomDrawer onClose={onClose} className="sm:max-w-md">
      <div className="bg-card w-full shadow-2xl border border-[var(--th-border)] flex flex-col max-h-full sm:max-h-[90vh]">
        <div
          className="px-6 flex-shrink-0"
          style={{ paddingTop: 'calc(1.5rem + env(safe-area-inset-top))' }}
        >
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
            <h2 className="text-lg font-bold text-primary">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-muted hover:text-secondary p-1 rounded-full hover:bg-card-hover disabled:opacity-50"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 px-6">
          {/* Winner Selection */}
          <div className="mb-6">
            <h3 className="font-medium text-primary text-sm mb-3">Who won?</h3>
            <div className="space-y-3">
              <TeamCard
                label="Team 1"
                accentVar="--th-accent"
                attackerName={teams.team1.attacker.name}
                defenderName={teams.team1.defender.name}
                isWinner={!freeEntry && winner === 1}
                disabled={isSubmitting}
                onSelect={() => {
                  setFreeEntry(false)
                  setWinner(1)
                }}
                onSwap={onSwapTeam1}
              />
              <TeamCard
                label="Team 2"
                accentVar="--th-sport-primary"
                attackerName={teams.team2.attacker.name}
                defenderName={teams.team2.defender.name}
                isWinner={!freeEntry && winner === 2}
                disabled={isSubmitting}
                onSelect={() => {
                  setFreeEntry(false)
                  setWinner(2)
                }}
                onSwap={onSwapTeam2}
              />
            </div>
          </div>

          {!freeEntry ? (
            <div className="mb-4">
              <h3 className="font-medium text-primary text-sm mb-1">
                {winner === null
                  ? "Loser's score"
                  : `${winner === 1 ? 'Team 2' : 'Team 1'}'s score`}
              </h3>
              <p className="text-xs text-secondary mb-3">Winner gets {targetScore} points</p>
              <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: targetScore }, (_, i) => i).map((n) => (
                  <button
                    key={n}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setLoserScore(n)}
                    className={`min-h-11 rounded-[var(--th-radius-md)] border font-semibold transition-colors disabled:opacity-50 ${
                      loserScore === n
                        ? 'bg-[var(--th-sport-primary)] text-white border-transparent'
                        : 'bg-card-hover border-[var(--th-border)] text-primary hover:border-[var(--th-sport-primary)]'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setFreeEntry(true)}
                className="mt-3 text-sm text-secondary hover:text-primary underline underline-offset-2 transition-colors disabled:opacity-50"
              >
                Other score…
              </button>
            </div>
          ) : (
            <div className="mb-4">
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
                      value={score2}
                      onChange={(e) => handleScoreChange(e.target.value, setScore2)}
                      disabled={isSubmitting}
                      placeholder="0"
                      className="w-full p-3 border border-[var(--th-border)] rounded-[var(--th-radius-md)] bg-card text-center font-semibold text-lg focus:ring-2 focus:ring-[var(--th-sport-primary)] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
                {score1 !== '' && score1 === score2 && (
                  <p className="text-xs text-[var(--th-loss)] mt-2 text-center">
                    Scores can't be equal — there are no draws
                  </p>
                )}
              </div>
              {chipsAvailable && (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => {
                    setFreeEntry(false)
                    setScore1('')
                    setScore2('')
                  }}
                  className="mt-3 text-sm text-secondary hover:text-primary underline underline-offset-2 transition-colors disabled:opacity-50"
                >
                  Back to quick entry
                </button>
              )}
            </div>
          )}
        </div>

        {/* Sticky Footer */}
        <div
          className="flex-shrink-0 px-6 pt-4"
          style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
        >
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
            ) : !freeEntry && winner !== null && loserScore !== null ? (
              `Register ${winner === 1 ? targetScore : loserScore} – ${winner === 2 ? targetScore : loserScore}`
            ) : (
              'Register Score'
            )}
          </button>
        </div>
      </div>
    </ModalOrBottomDrawer>
  )
}
