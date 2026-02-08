import type { Player } from '@foos/shared'
import { ArrowLeft, CloudOff, Loader2, Target, User, X } from 'lucide-react'
import { useId, useState } from 'react'
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

type Step = 'selection' | 'score'

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
  const [score1, setScore1] = useState('')
  const [score2, setScore2] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()
  const { isOnline } = useOfflineStatus()
  const score1InputId = useId()
  const score2InputId = useId()

  const getAvailablePlayers = (excludeIds: string[] = []) => {
    return players.filter((p) => !excludeIds.includes(p.id))
  }

  const isSelectionValid = player1Id !== '' && player2Id !== '' && player1Id !== player2Id

  const handleContinueToScore = () => {
    if (!isSelectionValid) {
      toast().error('Please select two different players')
      return
    }
    setStep('score')
  }

  const handleScoreChange = (value: string, setter: (value: string) => void) => {
    if (value === '' || (/^\d+$/.test(value) && Number.parseInt(value, 10) >= 0)) {
      setter(value)
    }
  }

  const handleSubmit = async () => {
    if (score1 === '' || score2 === '') return

    setIsSubmitting(true)
    try {
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

  if (step === 'score') {
    const p1 = getPlayer(player1Id)
    const p2 = getPlayer(player2Id)
    const isScoreValid = score1 !== '' && score2 !== ''

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <button
              type="button"
              onClick={() => setStep('selection')}
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
            <Target className="mx-auto text-orange-500 mb-2" size={24} />
            <h2 className="text-lg font-bold text-gray-900">Enter Score</h2>
            <p className="text-sm text-gray-600">Enter the final score of the 1v1 match</p>
          </div>

          {/* Players Display */}
          <div className="mb-6 space-y-3">
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
              <div className="flex items-center gap-2 text-blue-800">
                <span className="text-lg">{p1?.avatar}</span>
                <span className="font-medium">{p1?.name}</span>
              </div>
            </div>
            <div className="text-center font-bold text-gray-600">VS</div>
            <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
              <div className="flex items-center gap-2 text-purple-800">
                <span className="text-lg">{p2?.avatar}</span>
                <span className="font-medium">{p2?.name}</span>
              </div>
            </div>
          </div>

          {/* Score Input */}
          <div className="mb-6">
            <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
              <div className="font-medium text-orange-800 text-sm mb-3">Final Score</div>
              <div className="grid grid-cols-3 gap-3 items-center">
                <div>
                  <label htmlFor={score1InputId} className="block text-xs text-gray-600 mb-1">
                    {p1?.name}
                  </label>
                  <input
                    id={score1InputId}
                    type="number"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    min="0"
                    max="15"
                    value={score1}
                    onChange={(e) => handleScoreChange(e.target.value, setScore1)}
                    disabled={isSubmitting}
                    placeholder="0"
                    className="w-full p-3 border border-orange-200 rounded-lg bg-white text-center font-semibold text-lg focus:ring-2 focus:ring-orange-300 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
                <div className="text-center font-bold text-orange-800 text-lg">VS</div>
                <div>
                  <label htmlFor={score2InputId} className="block text-xs text-gray-600 mb-1">
                    {p2?.name}
                  </label>
                  <input
                    id={score2InputId}
                    type="number"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    min="0"
                    max="15"
                    value={score2}
                    onChange={(e) => handleScoreChange(e.target.value, setScore2)}
                    disabled={isSubmitting}
                    placeholder="0"
                    className="w-full p-3 border border-orange-200 rounded-lg bg-white text-center font-semibold text-lg focus:ring-2 focus:ring-orange-300 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
              <p className="text-xs text-orange-600 mt-2 text-center">
                Games are typically played to 10 points
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isScoreValid || isSubmitting || !isOnline}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 px-4 rounded-xl font-semibold shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

          {!isScoreValid && (
            <p className="text-sm text-red-600 text-center mt-2">
              Please enter scores for both players
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
          {/* Player 1 */}
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <div className="flex items-center gap-2 mb-3">
              <User className="text-blue-600" size={18} />
              <h3 className="font-semibold text-blue-900">Player 1</h3>
            </div>
            <PlayerCombobox
              players={getAvailablePlayers([player2Id])}
              value={player1Id}
              onChange={setPlayer1Id}
              placeholder="Select Player"
              className="border-blue-300 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* VS Divider */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-full border-4 border-white shadow-md">
              <span className="font-bold text-gray-600">VS</span>
            </div>
          </div>

          {/* Player 2 */}
          <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
            <div className="flex items-center gap-2 mb-3">
              <User className="text-purple-600" size={18} />
              <h3 className="font-semibold text-purple-900">Player 2</h3>
            </div>
            <PlayerCombobox
              players={getAvailablePlayers([player1Id])}
              value={player2Id}
              onChange={setPlayer2Id}
              placeholder="Select Player"
              className="border-purple-300 focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        <div className="mt-6">
          <button
            type="button"
            onClick={handleContinueToScore}
            disabled={!isSelectionValid}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-xl font-semibold shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Register Score
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
