import type { Player } from '@foos/shared'
import { ArrowLeft, ChevronRight, CloudOff, Crown, Loader2, Minus, X } from 'lucide-react'
import { useState } from 'react'
import { useOfflineStatus } from '@/hooks/useOfflineStatus'
import { useToast } from '@/hooks/useToast'
import { ModalOrBottomDrawer } from './ModalOrBottomDrawer'
import { PlayerPickerSheet } from './PlayerPickerSheet'

interface Manual1v1WorkflowProps {
  players: Player[]
  addMatch: (
    player1Id: string,
    player2Id: string,
    score1: string,
    score2: string,
  ) => Promise<{ success: boolean; error?: string }>
  onBack: () => void
  onClose: () => void
  onSuccess: () => void
}

type Step = 'selection' | 'winner'

export const Manual1v1Workflow = ({
  players,
  addMatch,
  onBack,
  onClose,
  onSuccess,
}: Manual1v1WorkflowProps) => {
  const [step, setStep] = useState<Step>('selection')
  const [activeSlot, setActiveSlot] = useState<'player1' | 'player2' | null>(null)
  const [player1Id, setPlayer1Id] = useState('')
  const [player2Id, setPlayer2Id] = useState('')
  const [winnerId, setWinnerId] = useState<string | 'draw' | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()
  const { isOnline } = useOfflineStatus()

  const getAvailablePlayers = (excludeIds: string[] = []) => {
    return players.filter((p) => !excludeIds.includes(p.id))
  }

  const isSelectionValid = player1Id !== '' && player2Id !== '' && player1Id !== player2Id

  const handleContinueToWinner = () => {
    if (!isSelectionValid) {
      toast().error('Please select two different players')
      return
    }
    setStep('winner')
  }

  const handleSubmit = async () => {
    if (!winnerId) return

    setIsSubmitting(true)
    try {
      // Draw: both get score 1 (equal scores). Winner gets 1, loser gets 0.
      const score1 = winnerId === 'draw' ? '1' : winnerId === player1Id ? '1' : '0'
      const score2 = winnerId === 'draw' ? '1' : winnerId === player2Id ? '1' : '0'
      const result = await addMatch(player1Id, player2Id, score1, score2)
      if (result.success) {
        toast().success('Match added successfully!')
        onSuccess()
      } else {
        toast().error(result.error || 'Failed to add match')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const getPlayer = (id: string) => players.find((p) => p.id === id)

  if (step === 'winner') {
    const p1 = getPlayer(player1Id)
    const p2 = getPlayer(player2Id)

    return (
      <ModalOrBottomDrawer onClose={onClose} className="sm:max-w-md">
        <div className="bg-card p-6 w-full shadow-2xl border border-[var(--th-border)]">
          <div className="flex justify-between items-center mb-6">
            <button
              type="button"
              onClick={() => {
                setStep('selection')
                setWinnerId(null)
              }}
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
            <Crown className="mx-auto text-[var(--th-sport-primary)] mb-2" size={24} />
            <h2 className="text-lg font-bold text-primary">Result?</h2>
            <p className="text-sm text-secondary">Select winner or draw</p>
          </div>

          {/* Result Selection */}
          <div className="mb-6 space-y-3">
            <button
              type="button"
              onClick={() => setWinnerId(player1Id)}
              disabled={isSubmitting}
              className={`w-full rounded-[var(--th-radius-md)] p-4 border-2 transition-all ${
                winnerId === player1Id
                  ? 'border-[var(--th-win)] bg-[var(--th-win)]/10 ring-2 ring-[var(--th-win)]/30'
                  : 'border-[var(--th-border)] bg-card hover:border-[var(--th-sport-primary)]'
              } disabled:opacity-50`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-primary">
                  <span className="text-lg">{p1?.avatar}</span>
                  <span className="font-medium">{p1?.name} (White ♔)</span>
                </div>
                {winnerId === player1Id && <Crown className="text-[var(--th-win)]" size={20} />}
              </div>
            </button>

            <button
              type="button"
              onClick={() => setWinnerId('draw')}
              disabled={isSubmitting}
              className={`w-full rounded-[var(--th-radius-md)] p-3 border-2 transition-all ${
                winnerId === 'draw'
                  ? 'border-[var(--th-draw)] bg-[var(--th-draw)]/10 ring-2 ring-[var(--th-draw)]/30'
                  : 'border-[var(--th-border)] bg-card-hover hover:border-[var(--th-sport-primary)]'
              } disabled:opacity-50`}
            >
              <div className="flex items-center justify-center gap-2 text-primary">
                <Minus
                  size={16}
                  className={winnerId === 'draw' ? 'text-[var(--th-draw)]' : 'text-muted'}
                />
                <span className="font-semibold text-sm">½ Draw ½</span>
                <Minus
                  size={16}
                  className={winnerId === 'draw' ? 'text-[var(--th-draw)]' : 'text-muted'}
                />
              </div>
            </button>

            <button
              type="button"
              onClick={() => setWinnerId(player2Id)}
              disabled={isSubmitting}
              className={`w-full rounded-[var(--th-radius-md)] p-4 border-2 transition-all ${
                winnerId === player2Id
                  ? 'border-[var(--th-win)] bg-[var(--th-win)]/10 ring-2 ring-[var(--th-win)]/30'
                  : 'border-[var(--th-border)] bg-card hover:border-[var(--th-sport-primary)]'
              } disabled:opacity-50`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-primary">
                  <span className="text-lg">{p2?.avatar}</span>
                  <span className="font-medium">{p2?.name} (Black ♚)</span>
                </div>
                {winnerId === player2Id && <Crown className="text-[var(--th-win)]" size={20} />}
              </div>
            </button>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!winnerId || isSubmitting || !isOnline}
            className="w-full bg-[var(--th-sport-primary)] hover:opacity-90 text-white py-3 px-4 rounded-[var(--th-radius-lg)] font-semibold shadow-theme-card transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            title={!isOnline ? 'Cannot register match while offline' : undefined}
          >
            {!isOnline ? (
              <>
                <CloudOff size={16} />
                Offline - Cannot Register
              </>
            ) : isSubmitting ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                Registering Match...
              </>
            ) : (
              'Register Match'
            )}
          </button>

          {!winnerId && (
            <p className="text-sm text-muted text-center mt-2">Select winner or draw</p>
          )}
        </div>
      </ModalOrBottomDrawer>
    )
  }

  // Full-screen player picker for the active slot
  if (activeSlot) {
    const isPlayer1 = activeSlot === 'player1'
    return (
      <PlayerPickerSheet
        players={getAvailablePlayers([isPlayer1 ? player2Id : player1Id])}
        title={isPlayer1 ? 'Select White' : 'Select Black'}
        selectedId={(isPlayer1 ? player1Id : player2Id) || undefined}
        onSelect={(id) => {
          if (isPlayer1) {
            setPlayer1Id(id)
          } else {
            setPlayer2Id(id)
          }
          setActiveSlot(null)
        }}
        onBack={() => setActiveSlot(null)}
        onClose={onClose}
      />
    )
  }

  // Selection step
  return (
    <ModalOrBottomDrawer onClose={onClose} className="sm:max-w-md">
      <div className="bg-card p-6 w-full shadow-2xl border border-[var(--th-border)] max-h-[85vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 text-secondary hover:text-primary transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-secondary p-1 rounded-full hover:bg-card-hover"
          >
            <X size={20} />
          </button>
        </div>

        <div className="text-center mb-6">
          <h2 className="text-lg font-bold text-primary">1v1 Match</h2>
          <p className="text-sm text-secondary">Select two players for a head-to-head match</p>
        </div>

        <div className="space-y-6">
          {/* White */}
          <div className="bg-card-hover rounded-[var(--th-radius-lg)] p-4 border border-[var(--th-border)]">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">♔</span>
              <h3 className="font-semibold text-primary">White</h3>
            </div>
            <button
              type="button"
              onClick={() => setActiveSlot('player1')}
              className="w-full flex items-center justify-between gap-2 p-3 min-h-12 rounded-[var(--th-radius-md)] border border-[var(--th-border)] bg-card hover:bg-card-hover text-left transition-colors"
            >
              {getPlayer(player1Id) ? (
                <span className="truncate text-primary">
                  {getPlayer(player1Id)?.avatar} {getPlayer(player1Id)?.name} (
                  {getPlayer(player1Id)?.ranking})
                </span>
              ) : (
                <span className="truncate text-muted">Select Player</span>
              )}
              <ChevronRight className="text-muted shrink-0" size={16} />
            </button>
          </div>

          {/* VS Divider */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-card-hover rounded-full border-4 border-[var(--th-border)] shadow-md">
              <span className="font-bold text-secondary">VS</span>
            </div>
          </div>

          {/* Black */}
          <div className="bg-card-hover rounded-[var(--th-radius-lg)] p-4 border border-[var(--th-border)]">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">♚</span>
              <h3 className="font-semibold text-primary">Black</h3>
            </div>
            <button
              type="button"
              onClick={() => setActiveSlot('player2')}
              className="w-full flex items-center justify-between gap-2 p-3 min-h-12 rounded-[var(--th-radius-md)] border border-[var(--th-border)] bg-card hover:bg-card-hover text-left transition-colors"
            >
              {getPlayer(player2Id) ? (
                <span className="truncate text-primary">
                  {getPlayer(player2Id)?.avatar} {getPlayer(player2Id)?.name} (
                  {getPlayer(player2Id)?.ranking})
                </span>
              ) : (
                <span className="truncate text-muted">Select Player</span>
              )}
              <ChevronRight className="text-muted shrink-0" size={16} />
            </button>
          </div>
        </div>

        <div className="mt-6">
          <button
            type="button"
            onClick={handleContinueToWinner}
            disabled={!isSelectionValid}
            className="w-full bg-[var(--th-sport-primary)] hover:opacity-90 text-white py-3 px-4 rounded-[var(--th-radius-lg)] font-semibold shadow-theme-card transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue
          </button>

          {!isSelectionValid && player1Id !== '' && player2Id !== '' && (
            <p className="text-sm text-red-600 text-center mt-2">
              Please select two different players
            </p>
          )}
        </div>
      </div>
    </ModalOrBottomDrawer>
  )
}
