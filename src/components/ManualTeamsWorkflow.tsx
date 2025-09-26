import { ArrowLeft, Shield, Sword, Users, X } from 'lucide-react'
import { useState } from 'react'
import { useToast } from '@/hooks/useToast'
import type { Player } from '@/types'
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
}

type Step = 'selection' | 'score'

export const ManualTeamsWorkflow = ({
  players,
  addMatch,
  onBack,
  onClose,
  onSuccess,
}: ManualTeamsWorkflowProps) => {
  const [step, setStep] = useState<Step>('selection')
  const [team1Player1Id, setTeam1Player1Id] = useState('')
  const [team1Player2Id, setTeam1Player2Id] = useState('')
  const [team2Player1Id, setTeam2Player1Id] = useState('')
  const [team2Player2Id, setTeam2Player2Id] = useState('')
  const { toast } = useToast()

  const getAvailablePlayers = (excludeIds: string[] = []) => {
    return players.filter((p) => !excludeIds.includes(p.id))
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

  // Team selection step
  const isValid =
    [team1Player1Id, team1Player2Id, team2Player1Id, team2Player2Id].every((id) => id !== '') &&
    new Set([team1Player1Id, team1Player2Id, team2Player1Id, team2Player2Id]).size === 4

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
          <h2 className="text-lg font-bold text-gray-900">Select Teams Manually</h2>
          <p className="text-sm text-gray-600">Choose players and their positions</p>
        </div>

        <div className="space-y-6">
          {/* Team 1 */}
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <div className="flex items-center gap-2 mb-3">
              <Users className="text-blue-600" size={18} />
              <h3 className="font-semibold text-blue-900">Team 1</h3>
            </div>
            <div className="space-y-3">
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <Sword className="text-orange-500" size={16} />
                </div>
                <select
                  value={team1Player1Id}
                  onChange={(e) => setTeam1Player1Id(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-blue-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Attacker</option>
                  {getAvailablePlayers([team1Player2Id, team2Player1Id, team2Player2Id]).map(
                    (p) => (
                      <option key={p.id} value={p.id}>
                        {p.avatar} {p.name} ({p.ranking})
                      </option>
                    ),
                  )}
                </select>
              </div>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <Shield className="text-blue-500" size={16} />
                </div>
                <select
                  value={team1Player2Id}
                  onChange={(e) => setTeam1Player2Id(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-blue-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Defender</option>
                  {getAvailablePlayers([team1Player1Id, team2Player1Id, team2Player2Id]).map(
                    (p) => (
                      <option key={p.id} value={p.id}>
                        {p.avatar} {p.name} ({p.ranking})
                      </option>
                    ),
                  )}
                </select>
              </div>
            </div>
          </div>

          {/* VS Divider */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-full border-4 border-white shadow-md">
              <span className="font-bold text-gray-600">VS</span>
            </div>
          </div>

          {/* Team 2 */}
          <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
            <div className="flex items-center gap-2 mb-3">
              <Users className="text-purple-600" size={18} />
              <h3 className="font-semibold text-purple-900">Team 2</h3>
            </div>
            <div className="space-y-3">
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <Sword className="text-orange-500" size={16} />
                </div>
                <select
                  value={team2Player1Id}
                  onChange={(e) => setTeam2Player1Id(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-purple-300 rounded-lg bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">Select Attacker</option>
                  {getAvailablePlayers([team1Player1Id, team1Player2Id, team2Player2Id]).map(
                    (p) => (
                      <option key={p.id} value={p.id}>
                        {p.avatar} {p.name} ({p.ranking})
                      </option>
                    ),
                  )}
                </select>
              </div>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <Shield className="text-blue-500" size={16} />
                </div>
                <select
                  value={team2Player2Id}
                  onChange={(e) => setTeam2Player2Id(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-purple-300 rounded-lg bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">Select Defender</option>
                  {getAvailablePlayers([team1Player1Id, team1Player2Id, team2Player1Id]).map(
                    (p) => (
                      <option key={p.id} value={p.id}>
                        {p.avatar} {p.name} ({p.ranking})
                      </option>
                    ),
                  )}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <button
            type="button"
            onClick={handleContinueToScore}
            disabled={!isValid}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-xl font-semibold shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Register Score
          </button>

          {!isValid && (
            <p className="text-sm text-red-600 text-center mt-2">
              {[team1Player1Id, team1Player2Id, team2Player1Id, team2Player2Id].some(
                (id) => id === '',
              )
                ? 'Please select all players'
                : 'Each player can only be selected once'}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
