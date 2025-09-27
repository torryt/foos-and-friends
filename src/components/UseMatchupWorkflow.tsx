import { ArrowLeft, Brain, Clock, Sparkles, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { useToast } from '@/hooks/useToast'
import type { SavedMatchup } from '@/services/savedMatchupsService'
import { savedMatchupsService } from '@/services/savedMatchupsService'
import { ScoreEntryStep } from './ScoreEntryStep'

interface UseMatchupWorkflowProps {
  savedMatchups: SavedMatchup[]
  addMatch: (
    team1Player1Id: string,
    team1Player2Id: string,
    team2Player1Id: string,
    team2Player2Id: string,
    score1: string,
    score2: string,
  ) => Promise<{ success: boolean; error?: string }>
  onBack: () => void
  onClose: () => void
  onSuccess: () => void
  groupId: string
}

type Step = 'selection' | 'score'

export const UseMatchupWorkflow = ({
  savedMatchups: initialMatchups,
  addMatch,
  onBack,
  onClose,
  onSuccess,
  groupId,
}: UseMatchupWorkflowProps) => {
  const [step, setStep] = useState<Step>('selection')
  const [selectedMatchup, setSelectedMatchup] = useState<SavedMatchup | null>(null)
  const [savedMatchups, setSavedMatchups] = useState(initialMatchups)
  const { toast } = useToast()

  const handleSelectMatchup = (matchup: SavedMatchup) => {
    setSelectedMatchup(matchup)
    setStep('score')
  }

  const handleDeleteMatchup = (matchupId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    savedMatchupsService.deleteMatchup(matchupId, groupId)
    setSavedMatchups((prev) => prev.filter((m) => m.id !== matchupId))
    toast().success('Matchup deleted')
  }

  const handleAddMatch = async (score1: string, score2: string) => {
    if (!selectedMatchup) return

    const { teams } = selectedMatchup
    const result = await addMatch(
      teams.team1.attacker.id,
      teams.team1.defender.id,
      teams.team2.attacker.id,
      teams.team2.defender.id,
      score1,
      score2,
    )

    if (result.success) {
      toast().success('Match added successfully!')
      // Optionally delete the used matchup
      savedMatchupsService.deleteMatchup(selectedMatchup.id, groupId)
      onSuccess()
    } else {
      toast().error(result.error || 'Failed to add match')
    }
  }

  if (step === 'score' && selectedMatchup) {
    return (
      <ScoreEntryStep
        teams={selectedMatchup.teams}
        onBack={() => setStep('selection')}
        onClose={onClose}
        onSubmit={handleAddMatch}
        title="Register Score"
      />
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
          <h2 className="text-lg font-bold text-gray-900">Use Previous Matchup</h2>
          <p className="text-sm text-gray-600">
            {savedMatchups.length === 0
              ? 'No saved matchups available'
              : `Select from ${savedMatchups.length} saved matchup${savedMatchups.length === 1 ? '' : 's'}`}
          </p>
        </div>

        {savedMatchups.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="text-gray-400" size={24} />
            </div>
            <h3 className="font-medium text-gray-900 mb-2">No Saved Matchups</h3>
            <p className="text-sm text-gray-600 mb-4">Generate some teams first to see them here</p>
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Pick Teams Smartly
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {savedMatchups.map((matchup) => {
              const summary = savedMatchupsService.getMatchupSummary(matchup)

              return (
                <button
                  type="button"
                  key={matchup.id}
                  onClick={() => handleSelectMatchup(matchup)}
                  className="w-full text-left p-4 border border-gray-200 rounded-xl hover:border-purple-300 hover:bg-purple-50 transition-colors group focus:ring-2 focus:ring-purple-300 focus:outline-none"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex items-center gap-1">
                          {matchup.mode === 'balanced' ? (
                            <Brain className="text-blue-500" size={14} />
                          ) : (
                            <Sparkles className="text-purple-500" size={14} />
                          )}
                          <span className="text-xs font-medium text-gray-600">{summary.mode}</span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {summary.confidence} confidence
                        </span>
                      </div>

                      <div className="font-medium text-gray-900 text-sm mb-2">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          {matchup.teams.team1.attacker.name} + {matchup.teams.team1.defender.name}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                          {matchup.teams.team2.attacker.name} + {matchup.teams.team2.defender.name}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">{summary.timeAgo}</span>
                        {matchup.teams.rankingDifference > 0 && (
                          <span className="text-xs text-gray-500">
                            ±{matchup.teams.rankingDifference} pts
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleDeleteMatchup(matchup.id, e)}
                      className="ml-3 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete matchup"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </button>
              )
            })}

            <div className="pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center">
                Matchups auto-expire after 48 hours
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
