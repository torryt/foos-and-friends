import type { Player } from '@foos/shared'
import { savedMatchupsService } from '@foos/shared'
import { ArrowLeft, ChevronRight, Shield, Sword, Users, X } from 'lucide-react'
import { useState } from 'react'
import { useToast } from '@/hooks/useToast'
import { ModalOrBottomDrawer } from './ModalOrBottomDrawer'
import { PlayerPickerSheet } from './PlayerPickerSheet'
import { ScoreEntryStep } from './ScoreEntryStep'

interface ManualTeamsWorkflowProps {
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

type Step = 'selection' | 'score'
type Slot = 'team1Attacker' | 'team1Defender' | 'team2Attacker' | 'team2Defender'

interface SlotButtonProps {
  position: 'attacker' | 'defender'
  player?: Player
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
      {player ? (
        <span className="truncate text-primary">
          {player.avatar} {player.name} ({player.ranking})
        </span>
      ) : (
        <span className="truncate text-muted">
          {position === 'attacker' ? 'Select Attacker' : 'Select Defender'}
        </span>
      )}
    </span>
    <ChevronRight className="text-muted shrink-0" size={16} />
  </button>
)

export const ManualTeamsWorkflow = ({
  players,
  addMatch,
  onBack,
  onClose,
  onSuccess,
  groupId,
}: ManualTeamsWorkflowProps) => {
  const [step, setStep] = useState<Step>('selection')
  const [activeSlot, setActiveSlot] = useState<Slot | null>(null)
  const [team1Player1Id, setTeam1Player1Id] = useState('')
  const [team1Player2Id, setTeam1Player2Id] = useState('')
  const [team2Player1Id, setTeam2Player1Id] = useState('')
  const [team2Player2Id, setTeam2Player2Id] = useState('')
  const { toast } = useToast()

  const getAvailablePlayers = (excludeIds: string[] = []) => {
    return players.filter((p) => !excludeIds.includes(p.id))
  }

  const getPlayerById = (id: string) => players.find((p) => p.id === id)

  const slots: Record<
    Slot,
    {
      title: string
      position: 'attacker' | 'defender'
      value: string
      setValue: (id: string) => void
      excludeIds: string[]
    }
  > = {
    team1Attacker: {
      title: 'Team 1 Attacker',
      position: 'attacker',
      value: team1Player1Id,
      setValue: setTeam1Player1Id,
      excludeIds: [team1Player2Id, team2Player1Id, team2Player2Id],
    },
    team1Defender: {
      title: 'Team 1 Defender',
      position: 'defender',
      value: team1Player2Id,
      setValue: setTeam1Player2Id,
      excludeIds: [team1Player1Id, team2Player1Id, team2Player2Id],
    },
    team2Attacker: {
      title: 'Team 2 Attacker',
      position: 'attacker',
      value: team2Player1Id,
      setValue: setTeam2Player1Id,
      excludeIds: [team1Player1Id, team1Player2Id, team2Player2Id],
    },
    team2Defender: {
      title: 'Team 2 Defender',
      position: 'defender',
      value: team2Player2Id,
      setValue: setTeam2Player2Id,
      excludeIds: [team1Player1Id, team1Player2Id, team2Player1Id],
    },
  }

  const validateTeamSelection = () => {
    const playerIds = [team1Player1Id, team1Player2Id, team2Player1Id, team2Player2Id]
    const allSelected = playerIds.every((id) => id !== '')
    const allUnique = new Set(playerIds).size === 4

    if (!allSelected) {
      toast().error('Please select all players')
      return false
    }

    if (!allUnique) {
      toast().error('Each player can only be selected once')
      return false
    }

    return true
  }

  const handleContinueToScore = () => {
    if (!validateTeamSelection()) return
    setStep('score')
  }

  const handleAddMatch = async (score1: string, score2: string) => {
    const result = await addMatch(
      team1Player1Id,
      team1Player2Id,
      team2Player1Id,
      team2Player2Id,
      score1,
      score2,
    )

    if (result.success) {
      if (groupId) {
        savedMatchupsService.saveMatchup(getSelectedTeams(), 'manual', groupId)
      }
      toast().success('Match added successfully!')
      onSuccess()
    } else {
      toast().error(result.error || 'Failed to add match')
    }
  }

  // Create mock TeamAssignment for ScoreEntryStep
  const getSelectedTeams = () => {
    const getPlayer = (id: string) => {
      const player = players.find((p) => p.id === id)
      if (!player) {
        throw new Error(`Player not found: ${id}`)
      }
      return player
    }

    return {
      team1: {
        attacker: getPlayer(team1Player1Id),
        defender: getPlayer(team1Player2Id),
      },
      team2: {
        attacker: getPlayer(team2Player1Id),
        defender: getPlayer(team2Player2Id),
      },
      rankingDifference: 0, // Not relevant for manual selection
      confidence: 1, // Always confident in manual selection
    }
  }

  if (step === 'score') {
    return (
      <ScoreEntryStep
        teams={getSelectedTeams()}
        onBack={() => setStep('selection')}
        onClose={onClose}
        onSubmit={handleAddMatch}
        title="Enter Score"
      />
    )
  }

  // Full-screen player picker for the active slot
  if (activeSlot) {
    const slot = slots[activeSlot]
    return (
      <PlayerPickerSheet
        players={getAvailablePlayers(slot.excludeIds)}
        title={slot.title}
        selectedId={slot.value || undefined}
        onSelect={(id) => {
          slot.setValue(id)
          setActiveSlot(null)
        }}
        onBack={() => setActiveSlot(null)}
        onClose={onClose}
      />
    )
  }

  // Team selection step
  const isValid =
    [team1Player1Id, team1Player2Id, team2Player1Id, team2Player2Id].every((id) => id !== '') &&
    new Set([team1Player1Id, team1Player2Id, team2Player1Id, team2Player2Id]).size === 4

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
              className="flex items-center gap-2 text-secondary hover:text-primary transition-colors"
            >
              <ArrowLeft size={20} />
              <span>Back</span>
            </button>
            <h2 className="text-lg font-bold text-primary">Select Teams Manually</h2>
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
          <div className="space-y-4">
            {/* Team 1 */}
            <div className="bg-card-hover rounded-xl p-4 border border-[var(--th-border)]">
              <div className="flex items-center gap-2 mb-3">
                <Users className="text-[var(--th-accent)]" size={18} />
                <h3 className="font-semibold text-[var(--th-accent)]">Team 1</h3>
              </div>
              <div className="space-y-3">
                <SlotButton
                  position="attacker"
                  player={getPlayerById(team1Player1Id)}
                  onClick={() => setActiveSlot('team1Attacker')}
                />
                <SlotButton
                  position="defender"
                  player={getPlayerById(team1Player2Id)}
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
              <div className="flex items-center gap-2 mb-3">
                <Users className="text-[var(--th-sport-primary)]" size={18} />
                <h3 className="font-semibold text-[var(--th-sport-primary)]">Team 2</h3>
              </div>
              <div className="space-y-3">
                <SlotButton
                  position="attacker"
                  player={getPlayerById(team2Player1Id)}
                  onClick={() => setActiveSlot('team2Attacker')}
                />
                <SlotButton
                  position="defender"
                  player={getPlayerById(team2Player2Id)}
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
            onClick={handleContinueToScore}
            disabled={!isValid}
            className="w-full bg-[var(--th-sport-primary)] hover:opacity-90 text-white py-3 px-4 rounded-[var(--th-radius-lg)] font-semibold shadow-theme-card transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Register Score
          </button>

          {!isValid && (
            <p className="text-sm text-[var(--th-loss)] text-center mt-2">
              {[team1Player1Id, team1Player2Id, team2Player1Id, team2Player2Id].some(
                (id) => id === '',
              )
                ? 'Please select all players'
                : 'Each player can only be selected once'}
            </p>
          )}
        </div>
      </div>
    </ModalOrBottomDrawer>
  )
}
