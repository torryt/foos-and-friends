import { ArrowLeft, ArrowLeftRight, Loader2, Target, X } from 'lucide-react'
import { useId, useState } from 'react'
import type { TeamAssignment } from '@/utils/matchmaking'

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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <button
            type="button"
            onClick={onBack}
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
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-600">Enter the final score of the match</p>
        </div>

        {/* Teams Display */}
        <div className="mb-6">
          <div className="space-y-3">
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
              <div className="font-medium text-blue-900 text-sm mb-1">Team 1</div>
              <div className="grid grid-cols-3 items-center text-blue-800">
                <span className="text-left">{teams.team1.attacker.name} (A)</span>
                <div className="flex justify-center">
                  {onSwapTeam1 && (
                    <button
                      type="button"
                      onClick={onSwapTeam1}
                      disabled={isSubmitting}
                      className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-200 rounded transition-colors disabled:opacity-50"
                      title="Swap positions for Team 1"
                    >
                      <ArrowLeftRight size={18} />
                    </button>
                  )}
                </div>
                <span className="text-right">{teams.team1.defender.name} (D)</span>
              </div>
            </div>
            <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
              <div className="font-medium text-purple-900 text-sm mb-1">Team 2</div>
              <div className="grid grid-cols-3 items-center text-purple-800">
                <span className="text-left">{teams.team2.attacker.name} (A)</span>
                <div className="flex justify-center">
                  {onSwapTeam2 && (
                    <button
                      type="button"
                      onClick={onSwapTeam2}
                      disabled={isSubmitting}
                      className="p-1.5 text-purple-600 hover:text-purple-800 hover:bg-purple-200 rounded transition-colors disabled:opacity-50"
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
          <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
            <div className="font-medium text-orange-800 text-sm mb-3">Final Score</div>
            <div className="grid grid-cols-3 gap-3 items-center">
              <div>
                <label htmlFor={team1Id} className="block text-xs text-gray-600 mb-1">
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
                  className="w-full p-3 border border-orange-200 rounded-lg bg-white text-center font-semibold text-lg focus:ring-2 focus:ring-orange-300 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
              <div className="text-center font-bold text-orange-800 text-lg">VS</div>
              <div>
                <label htmlFor={team2Id} className="block text-xs text-gray-600 mb-1">
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
          disabled={!isValid || isSubmitting}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 px-4 rounded-xl font-semibold shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin" size={16} />
              Registering Score...
            </>
          ) : (
            'Register Score'
          )}
        </button>

        {!isValid && (
          <p className="text-sm text-red-600 text-center mt-2">
            Please enter scores for both teams
          </p>
        )}
      </div>
    </div>
  )
}
