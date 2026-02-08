import type { Player } from '@foos/shared'
import { ArrowLeft, CloudOff, Crown, Loader2, X } from 'lucide-react'
import { useState } from 'react'
import { PlayerCombobox } from '@/components/ui/PlayerCombobox'
import { useOfflineStatus } from '@/hooks/useOfflineStatus'
import { useToast } from '@/hooks/useToast'

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
  const [player1Id, setPlayer1Id] = useState('')
  const [player2Id, setPlayer2Id] = useState('')
  const [winnerId, setWinnerId] = useState<string | null>(null)
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
      // Winner gets score 1, loser gets score 0
      const score1 = winnerId === player1Id ? '1' : '0'
      const score2 = winnerId === player2Id ? '1' : '0'
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
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <button
              type="button"
              onClick={() => {
                setStep('selection')
                setWinnerId(null)
              }}
              disabled={isSubmitting}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50"
            >
              <ArrowLeft size={20} />
              <span>Back</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 disabled:opacity-50"
            >
              <X size={20} />
            </button>
          </div>

          <div className="text-center mb-6">
            <Crown className="mx-auto text-orange-500 mb-2" size={24} />
            <h2 className="text-lg font-bold text-gray-900">Who Won?</h2>
            <p className="text-sm text-gray-600">Select the winner of this match</p>
          </div>

          {/* Winner Selection */}
          <div className="mb-6 space-y-3">
            <button
              type="button"
              onClick={() => setWinnerId(player1Id)}
              disabled={isSubmitting}
              className={`w-full rounded-lg p-4 border-2 transition-all ${
                winnerId === player1Id
                  ? 'border-green-500 bg-green-50 ring-2 ring-green-200'
                  : 'border-amber-200 bg-amber-50 hover:border-amber-400'
              } disabled:opacity-50`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-800">
                  <span className="text-lg">{p1?.avatar}</span>
                  <span className="font-medium">{p1?.name} (White ♔)</span>
                </div>
                {winnerId === player1Id && <Crown className="text-green-600" size={20} />}
              </div>
            </button>

            <div className="text-center font-bold text-gray-600">VS</div>

            <button
              type="button"
              onClick={() => setWinnerId(player2Id)}
              disabled={isSubmitting}
              className={`w-full rounded-lg p-4 border-2 transition-all ${
                winnerId === player2Id
                  ? 'border-green-500 bg-green-50 ring-2 ring-green-200'
                  : 'border-slate-300 bg-slate-100 hover:border-slate-400'
              } disabled:opacity-50`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-800">
                  <span className="text-lg">{p2?.avatar}</span>
                  <span className="font-medium">{p2?.name} (Black ♚)</span>
                </div>
                {winnerId === player2Id && <Crown className="text-green-600" size={20} />}
              </div>
            </button>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!winnerId || isSubmitting || !isOnline}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 px-4 rounded-xl font-semibold shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
            <p className="text-sm text-gray-500 text-center mt-2">
              Tap on the winner to select them
            </p>
          )}
        </div>
      </div>
    )
  }

  // Selection step
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-100 max-h-[85vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        <div className="text-center mb-6">
          <h2 className="text-lg font-bold text-gray-900">1v1 Match</h2>
          <p className="text-sm text-gray-600">Select two players for a head-to-head match</p>
        </div>

        <div className="space-y-6">
          {/* White */}
          <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">♔</span>
              <h3 className="font-semibold text-amber-900">White</h3>
            </div>
            <PlayerCombobox
              players={getAvailablePlayers([player2Id])}
              value={player1Id}
              onChange={setPlayer1Id}
              placeholder="Select Player"
              className="border-amber-300 focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* VS Divider */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-full border-4 border-white shadow-md">
              <span className="font-bold text-gray-600">VS</span>
            </div>
          </div>

          {/* Black */}
          <div className="bg-slate-100 rounded-xl p-4 border border-slate-300">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">♚</span>
              <h3 className="font-semibold text-slate-900">Black</h3>
            </div>
            <PlayerCombobox
              players={getAvailablePlayers([player1Id])}
              value={player2Id}
              onChange={setPlayer2Id}
              placeholder="Select Player"
              className="border-slate-400 focus:ring-2 focus:ring-slate-500"
            />
          </div>
        </div>

        <div className="mt-6">
          <button
            type="button"
            onClick={handleContinueToWinner}
            disabled={!isSelectionValid}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-xl font-semibold shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
    </div>
  )
}
