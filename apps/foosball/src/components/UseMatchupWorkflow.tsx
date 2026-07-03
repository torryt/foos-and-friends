import type { Player, SavedMatchup, TeamAssignment } from '@foos/shared'
import { savedMatchupsService } from '@foos/shared'
import {
  ArrowLeft,
  ArrowLeftRight,
  Brain,
  ChevronRight,
  Clock,
  Shield,
  Sparkles,
  Sword,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { useToast } from '@/hooks/useToast'
import { ModalOrBottomDrawer } from './ModalOrBottomDrawer'
import { PlayerPickerSheet } from './PlayerPickerSheet'
import { ScoreEntryStep } from './ScoreEntryStep'

interface UseMatchupWorkflowProps {
  savedMatchups: SavedMatchup[]
  players: Player[]
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

type Step = 'selection' | 'edit' | 'score'
type Slot = 'team1Attacker' | 'team1Defender' | 'team2Attacker' | 'team2Defender'

type SlotPlayers = Record<Slot, Player>

interface SlotButtonProps {
  position: 'attacker' | 'defender'
  player: Player
  onClick: () => void
}

const SlotButton = ({ position, player, onClick }: SlotButtonProps) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full flex items-center justify-between gap-2 p-3 min-h-12 rounded-[var(--th-radius-md)] border border-[var(--th-border)] bg-card hover:bg-card-hover text-left transition-colors"
  >
    <span className="flex items-center gap-2 truncate">
      {position === 'attacker' ? (
        <Sword className="text-[var(--th-sport-primary)] shrink-0" size={16} />
      ) : (
        <Shield className="text-[var(--th-accent)] shrink-0" size={16} />
      )}
      <span className="truncate text-primary">
        {player.avatar} {player.name} ({player.ranking})
      </span>
    </span>
    <ChevronRight className="text-muted shrink-0" size={16} />
  </button>
)

const modeIcon = (mode: SavedMatchup['mode']) => {
  if (mode === 'balanced') return <Brain className="text-[var(--th-accent)]" size={14} />
  if (mode === 'rare') return <Sparkles className="text-[var(--th-sport-primary)]" size={14} />
  return <Users className="text-[var(--th-win)]" size={14} />
}

export const UseMatchupWorkflow = ({
  savedMatchups: initialMatchups,
  players,
  addMatch,
  onBack,
  onClose,
  onSuccess,
  groupId,
}: UseMatchupWorkflowProps) => {
  const [step, setStep] = useState<Step>('selection')
  const [selectedMatchup, setSelectedMatchup] = useState<SavedMatchup | null>(null)
  const [savedMatchups, setSavedMatchups] = useState(initialMatchups)
  const [slotPlayers, setSlotPlayers] = useState<SlotPlayers | null>(null)
  const [activeSlot, setActiveSlot] = useState<Slot | null>(null)
  const { toast } = useToast()

  const slotConfig: Record<Slot, { title: string; position: 'attacker' | 'defender' }> = {
    team1Attacker: { title: 'Team 1 Attacker', position: 'attacker' },
    team1Defender: { title: 'Team 1 Defender', position: 'defender' },
    team2Attacker: { title: 'Team 2 Attacker', position: 'attacker' },
    team2Defender: { title: 'Team 2 Defender', position: 'defender' },
  }

  const buildTeams = (slots: SlotPlayers): TeamAssignment => ({
    team1: {
      attacker: slots.team1Attacker,
      defender: slots.team1Defender,
    },
    team2: {
      attacker: slots.team2Attacker,
      defender: slots.team2Defender,
    },
    rankingDifference: Math.abs(
      slots.team1Attacker.ranking +
        slots.team1Defender.ranking -
        (slots.team2Attacker.ranking + slots.team2Defender.ranking),
    ),
    confidence: selectedMatchup?.confidence ?? 1,
  })

  // Update slot state and persist the edited lineup back to the saved matchup
  const applySlots = (slots: SlotPlayers) => {
    setSlotPlayers(slots)
    if (selectedMatchup) {
      savedMatchupsService.updateMatchup(selectedMatchup.id, groupId, buildTeams(slots))
    }
  }

  const handleSelectMatchup = (matchup: SavedMatchup) => {
    // Resolve stored players against the current roster so names/rankings are fresh
    const resolve = (p: Player) => players.find((current) => current.id === p.id) ?? p
    setSelectedMatchup(matchup)
    setSlotPlayers({
      team1Attacker: resolve(matchup.teams.team1.attacker),
      team1Defender: resolve(matchup.teams.team1.defender),
      team2Attacker: resolve(matchup.teams.team2.attacker),
      team2Defender: resolve(matchup.teams.team2.defender),
    })
    setStep('edit')
  }

  const handleDeleteMatchup = (matchupId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    savedMatchupsService.deleteMatchup(matchupId, groupId)
    setSavedMatchups((prev) => prev.filter((m) => m.id !== matchupId))
    toast().success('Matchup deleted')
  }

  // Selecting a player already in another slot swaps the two slots
  const handlePickPlayer = (slot: Slot, playerId: string) => {
    if (!slotPlayers) return
    const picked = players.find((p) => p.id === playerId)
    if (!picked) return

    const next = { ...slotPlayers }
    const occupiedSlot = (Object.keys(next) as Slot[]).find(
      (s) => s !== slot && next[s].id === playerId,
    )
    if (occupiedSlot) {
      next[occupiedSlot] = next[slot]
    }
    next[slot] = picked
    applySlots(next)
    setActiveSlot(null)
  }

  const handleSwapTeam = (team: 1 | 2) => {
    if (!slotPlayers) return
    const next = { ...slotPlayers }
    if (team === 1) {
      ;[next.team1Attacker, next.team1Defender] = [next.team1Defender, next.team1Attacker]
    } else {
      ;[next.team2Attacker, next.team2Defender] = [next.team2Defender, next.team2Attacker]
    }
    applySlots(next)
  }

  const handleAddMatch = async (score1: string, score2: string) => {
    if (!slotPlayers) return

    const result = await addMatch(
      slotPlayers.team1Attacker.id,
      slotPlayers.team1Defender.id,
      slotPlayers.team2Attacker.id,
      slotPlayers.team2Defender.id,
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

  if (step === 'score' && slotPlayers) {
    return (
      <ScoreEntryStep
        teams={buildTeams(slotPlayers)}
        onBack={() => setStep('edit')}
        onClose={onClose}
        onSubmit={handleAddMatch}
        title="Register Score"
        onSwapTeam1={() => handleSwapTeam(1)}
        onSwapTeam2={() => handleSwapTeam(2)}
      />
    )
  }

  // Full-screen player picker for the active slot
  if (step === 'edit' && slotPlayers && activeSlot) {
    return (
      <PlayerPickerSheet
        players={players}
        title={slotConfig[activeSlot].title}
        selectedId={slotPlayers[activeSlot].id}
        onSelect={(id) => handlePickPlayer(activeSlot, id)}
        onBack={() => setActiveSlot(null)}
        onClose={onClose}
      />
    )
  }

  // Edit step - adjust players and positions before entering the score
  if (step === 'edit' && slotPlayers) {
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
                onClick={() => {
                  setActiveSlot(null)
                  setStep('selection')
                }}
                className="flex items-center gap-2 text-secondary hover:text-primary transition-colors"
              >
                <ArrowLeft size={20} />
                <span>Back</span>
              </button>
              <h2 className="text-lg font-bold text-primary">Adjust Matchup</h2>
              <button
                type="button"
                onClick={onClose}
                className="text-muted hover:text-secondary p-1 rounded-full hover:bg-card-hover"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 px-6">
            <p className="text-sm text-secondary text-center mb-4">
              Tap a player to change them — picking someone already in the matchup swaps their
              positions
            </p>
            <div className="space-y-4">
              {/* Team 1 */}
              <div className="bg-card-hover rounded-xl p-4 border border-[var(--th-border)]">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Users className="text-[var(--th-accent)]" size={18} />
                    <h3 className="font-semibold text-[var(--th-accent)]">Team 1</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSwapTeam(1)}
                    className="p-1.5 text-[var(--th-accent)] hover:text-primary hover:bg-card rounded transition-colors"
                    title="Swap positions for Team 1"
                  >
                    <ArrowLeftRight size={18} />
                  </button>
                </div>
                <div className="space-y-3">
                  <SlotButton
                    position="attacker"
                    player={slotPlayers.team1Attacker}
                    onClick={() => setActiveSlot('team1Attacker')}
                  />
                  <SlotButton
                    position="defender"
                    player={slotPlayers.team1Defender}
                    onClick={() => setActiveSlot('team1Defender')}
                  />
                </div>
              </div>

              {/* VS Divider */}
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-card-hover rounded-full border-4 border-[var(--th-border)] shadow-md">
                  <span className="font-bold text-secondary">VS</span>
                </div>
              </div>

              {/* Team 2 */}
              <div className="bg-card-hover rounded-xl p-4 border border-[var(--th-border)]">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Users className="text-[var(--th-sport-primary)]" size={18} />
                    <h3 className="font-semibold text-[var(--th-sport-primary)]">Team 2</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSwapTeam(2)}
                    className="p-1.5 text-[var(--th-sport-primary)] hover:text-primary hover:bg-card rounded transition-colors"
                    title="Swap positions for Team 2"
                  >
                    <ArrowLeftRight size={18} />
                  </button>
                </div>
                <div className="space-y-3">
                  <SlotButton
                    position="attacker"
                    player={slotPlayers.team2Attacker}
                    onClick={() => setActiveSlot('team2Attacker')}
                  />
                  <SlotButton
                    position="defender"
                    player={slotPlayers.team2Defender}
                    onClick={() => setActiveSlot('team2Defender')}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Sticky Footer */}
          <div
            className="flex-shrink-0 px-6 pt-4"
            style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
          >
            <button
              type="button"
              onClick={() => setStep('score')}
              className="w-full bg-[var(--th-sport-primary)] hover:opacity-90 text-white py-3 px-4 rounded-[var(--th-radius-lg)] font-semibold shadow-theme-card transition-colors"
            >
              Register Score
            </button>
          </div>
        </div>
      </ModalOrBottomDrawer>
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
                          {modeIcon(matchup.mode)}
                          <span className="text-xs font-medium text-secondary">{summary.mode}</span>
                        </div>
                        {matchup.mode !== 'manual' && (
                          <span className="text-xs text-muted">
                            {summary.confidence} confidence
                          </span>
                        )}
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
              <p className="text-xs text-muted text-center">Matchups auto-expire after 7 days</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
