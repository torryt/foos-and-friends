import type { SavedMatchup, TeamAssignment } from '@foos/shared'
import { savedMatchupsService } from '@foos/shared'
import { ArrowLeft, Brain, Clock, Sparkles, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { useToast } from '@/hooks/useToast'
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
  const [team1Swapped, setTeam1Swapped] = useState(false)
  const [team2Swapped, setTeam2Swapped] = useState(false)
  const { toast } = useToast()

  const handleSelectMatchup = (matchup: SavedMatchup) => {
    setSelectedMatchup(matchup)
    setTeam1Swapped(false) // Reset swap states when selecting a new matchup
    setTeam2Swapped(false)
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

    // Apply swap if needed for each team independently
    const team1Attacker = team1Swapped ? teams.team1.defender : teams.team1.attacker
    const team1Defender = team1Swapped ? teams.team1.attacker : teams.team1.defender
    const team2Attacker = team2Swapped ? teams.team2.defender : teams.team2.attacker
    const team2Defender = team2Swapped ? teams.team2.attacker : teams.team2.defender

    const result = await addMatch(
      team1Attacker.id,
      team1Defender.id,
      team2Attacker.id,
      team2Defender.id,
      score1,
      score2,
    )

    if (result.success) {
      toast().success('Match added successfully!')
      onSuccess()
    } else {
      toast().error(result.error || 'Failed to add match')
    }
  }

  if (step === 'score' && selectedMatchup) {
    // Apply swap if needed for display
    const displayTeams: TeamAssignment = {
      team1: {
        attacker: team1Swapped
          ? selectedMatchup.teams.team1.defender
          : selectedMatchup.teams.team1.attacker,
        defender: team1Swapped
          ? selectedMatchup.teams.team1.attacker
          : selectedMatchup.teams.team1.defender,
      },
      team2: {
        attacker: team2Swapped
          ? selectedMatchup.teams.team2.defender
          : selectedMatchup.teams.team2.attacker,
        defender: team2Swapped
          ? selectedMatchup.teams.team2.attacker
          : selectedMatchup.teams.team2.defender,
      },
      rankingDifference: selectedMatchup.teams.rankingDifference,
      confidence: selectedMatchup.teams.confidence,
    }

    return (
      <ScoreEntryStep
        teams={displayTeams}
        onBack={() => setStep('selection')}
        onClose={onClose}
        onSubmit={handleAddMatch}
        title="Register Score"
        onSwapTeam1={() => setTeam1Swapped(!team1Swapped)}
        onSwapTeam2={() => setTeam2Swapped(!team2Swapped)}
      />
    )
  }

  // Selection step
  return (
    <div className="fixed inset-0 bg-[var(--th-bg-overlay)] backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-card rounded-2xl p-6 w-full max-w-md shadow-2xl border border-[var(--th-border)] max-h-[85vh] overflow-y-auto">
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
          <h2 className="text-lg font-bold text-primary">Use Previous Matchup</h2>
          <p className="text-sm text-secondary">
            {savedMatchups.length === 0
              ? 'No saved matchups available'
              : `Select from ${savedMatchups.length} saved matchup${savedMatchups.length === 1 ? '' : 's'}`}
          </p>
        </div>

        {savedMatchups.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-card-hover rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="text-muted" size={24} />
            </div>
            <h3 className="font-medium text-primary mb-2">No Saved Matchups</h3>
            <p className="text-sm text-secondary mb-4">
              Generate some teams first to see them here
            </p>
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2 bg-[var(--th-sport-primary)] hover:opacity-90 text-white rounded-[var(--th-radius-md)] transition-colors"
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
                  className="w-full text-left p-4 border border-[var(--th-border)] rounded-[var(--th-radius-lg)] hover:border-[var(--th-border)] hover:bg-card-hover transition-colors group focus:ring-2 focus:ring-[var(--th-sport-primary)] focus:outline-none"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex items-center gap-1">
                          {matchup.mode === 'balanced' ? (
                            <Brain className="text-[var(--th-accent)]" size={14} />
                          ) : (
                            <Sparkles className="text-[var(--th-sport-primary)]" size={14} />
                          )}
                          <span className="text-xs font-medium text-secondary">{summary.mode}</span>
                        </div>
                        <span className="text-xs text-muted">{summary.confidence} confidence</span>
                      </div>

                      <div className="font-medium text-primary text-sm mb-2">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-2 h-2 bg-[var(--th-accent)] rounded-full"></div>
                          {matchup.teams.team1.attacker.name} + {matchup.teams.team1.defender.name}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-[var(--th-sport-primary)] rounded-full"></div>
                          {matchup.teams.team2.attacker.name} + {matchup.teams.team2.defender.name}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted">{summary.timeAgo}</span>
                        {matchup.teams.rankingDifference > 0 && (
                          <span className="text-xs text-muted">
                            ±{matchup.teams.rankingDifference} pts
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleDeleteMatchup(matchup.id, e)}
                      className="ml-3 p-2 text-muted hover:text-[var(--th-loss)] hover:bg-accent-subtle rounded-[var(--th-radius-md)] transition-colors"
                      title="Delete matchup"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </button>
              )
            })}

            <div className="pt-4 border-t border-[var(--th-border)]">
              <p className="text-xs text-muted text-center">Matchups auto-expire after 48 hours</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
