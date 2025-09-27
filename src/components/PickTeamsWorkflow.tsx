import {
  ArrowLeft,
  ArrowLeftRight,
  Brain,
  Check,
  Loader2,
  Shuffle,
  Sparkles,
  Users,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { useToast } from '@/hooks/useToast'
import { savedMatchupsService } from '@/services/savedMatchupsService'
import type { Match, Player } from '@/types'
import type { TeamAssignment } from '@/utils/matchmaking'
import { calculatePositionPreferences, findBestMatchup, findRareMatchup } from '@/utils/matchmaking'
import { ScoreEntryStep } from './ScoreEntryStep'

interface PickTeamsWorkflowProps {
  players: Player[]
  matches: Match[]
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

type Step = 'selection' | 'result' | 'score'

export const PickTeamsWorkflow = ({
  players,
  matches,
  addMatch,
  onBack,
  onClose,
  onSuccess,
}: PickTeamsWorkflowProps) => {
  const [step, setStep] = useState<Step>('selection')
  const [matchmakingMode, setMatchmakingMode] = useState<'balanced' | 'rare'>('rare')
  const [selectedPlayerPool, setSelectedPlayerPool] = useState<string[]>([])
  const [matchmakingResult, setMatchmakingResult] = useState<TeamAssignment | null>(null)
  const [savedMatchupId, setSavedMatchupId] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [team1Swapped, setTeam1Swapped] = useState(false)
  const [team2Swapped, setTeam2Swapped] = useState(false)
  const { toast } = useToast()

  const handlePlayerPoolToggle = (playerId: string) => {
    setSelectedPlayerPool((prev) => {
      return prev.includes(playerId) ? prev.filter((id) => id !== playerId) : [...prev, playerId]
    })
  }

  const selectAllPlayers = () => {
    setSelectedPlayerPool(players.map((p) => p.id))
  }

  const clearAllPlayers = () => {
    setSelectedPlayerPool([])
  }

  const handleGenerateMatchup = async () => {
    if (selectedPlayerPool.length < 4) {
      toast().error('Player pool must contain 4 or more players')
      return
    }

    setIsGenerating(true)

    try {
      const poolPlayers = players.filter((p) => selectedPlayerPool.includes(p.id))

      // Generate position preferences for balanced matchmaking
      const positionPreferences = poolPlayers.map((player) => {
        const playerMatches = matches.filter((match) => {
          return (
            match.team1[0].id === player.id ||
            match.team1[1].id === player.id ||
            match.team2[0].id === player.id ||
            match.team2[1].id === player.id
          )
        })

        let gamesAsAttacker = 0
        let gamesAsDefender = 0
        let winsAsAttacker = 0
        let winsAsDefender = 0

        for (const match of playerMatches) {
          const wasInTeam1 = match.team1[0].id === player.id || match.team1[1].id === player.id
          const wasAttacker = wasInTeam1
            ? match.team1[0].id === player.id
            : match.team2[0].id === player.id
          const won = wasInTeam1 ? match.score1 > match.score2 : match.score2 > match.score1

          if (wasAttacker) {
            gamesAsAttacker++
            if (won) {
              winsAsAttacker++
            }
          } else {
            gamesAsDefender++
            if (won) {
              winsAsDefender++
            }
          }
        }

        const winRateAsAttacker = gamesAsAttacker > 0 ? (winsAsAttacker / gamesAsAttacker) * 100 : 0
        const winRateAsDefender = gamesAsDefender > 0 ? (winsAsDefender / gamesAsDefender) * 100 : 0

        return calculatePositionPreferences(player, {
          gamesAsAttacker,
          gamesAsDefender,
          winRateAsAttacker,
          winRateAsDefender,
        })
      })

      const result =
        matchmakingMode === 'balanced'
          ? findBestMatchup(poolPlayers, positionPreferences)
          : findRareMatchup(poolPlayers, matches)

      setMatchmakingResult(result)
      // Reset swap states when generating new matchup
      setTeam1Swapped(false)
      setTeam2Swapped(false)

      // Auto-save the matchup immediately
      const savedMatchup = savedMatchupsService.saveMatchup(result, matchmakingMode)
      setSavedMatchupId(savedMatchup.id)

      setStep('result')

      const modeText = matchmakingMode === 'balanced' ? 'Balanced teams' : 'Rare matchup'
      toast().success(`${modeText} generated! ${Math.round(result.confidence * 100)}% confidence`)
    } catch (error) {
      toast().error(error instanceof Error ? error.message : 'Failed to generate matchup')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleContinueToScore = () => {
    if (!matchmakingResult) return
    setStep('score')
  }

  const handleSwapTeam = (teamNumber: 1 | 2) => {
    if (!matchmakingResult) return

    if (teamNumber === 1) {
      setTeam1Swapped(!team1Swapped)
    } else {
      setTeam2Swapped(!team2Swapped)
    }

    // Update the saved matchup with swapped positions
    const updatedResult: TeamAssignment = {
      team1: {
        attacker:
          teamNumber === 1 && !team1Swapped
            ? matchmakingResult.team1.defender
            : teamNumber === 1 && team1Swapped
              ? matchmakingResult.team1.attacker
              : team1Swapped
                ? matchmakingResult.team1.defender
                : matchmakingResult.team1.attacker,
        defender:
          teamNumber === 1 && !team1Swapped
            ? matchmakingResult.team1.attacker
            : teamNumber === 1 && team1Swapped
              ? matchmakingResult.team1.defender
              : team1Swapped
                ? matchmakingResult.team1.attacker
                : matchmakingResult.team1.defender,
      },
      team2: {
        attacker:
          teamNumber === 2 && !team2Swapped
            ? matchmakingResult.team2.defender
            : teamNumber === 2 && team2Swapped
              ? matchmakingResult.team2.attacker
              : team2Swapped
                ? matchmakingResult.team2.defender
                : matchmakingResult.team2.attacker,
        defender:
          teamNumber === 2 && !team2Swapped
            ? matchmakingResult.team2.attacker
            : teamNumber === 2 && team2Swapped
              ? matchmakingResult.team2.defender
              : team2Swapped
                ? matchmakingResult.team2.attacker
                : matchmakingResult.team2.defender,
      },
      rankingDifference: matchmakingResult.rankingDifference,
      confidence: matchmakingResult.confidence,
    }

    if (savedMatchupId) {
      savedMatchupsService.deleteMatchup(savedMatchupId)
      const newSavedMatchup = savedMatchupsService.saveMatchup(updatedResult, matchmakingMode)
      setSavedMatchupId(newSavedMatchup.id)
    }
  }

  const handleAddMatch = async (score1: string, score2: string) => {
    if (!matchmakingResult) return

    // Get the actual positions after swapping
    const team1Attacker = team1Swapped
      ? matchmakingResult.team1.defender
      : matchmakingResult.team1.attacker
    const team1Defender = team1Swapped
      ? matchmakingResult.team1.attacker
      : matchmakingResult.team1.defender
    const team2Attacker = team2Swapped
      ? matchmakingResult.team2.defender
      : matchmakingResult.team2.attacker
    const team2Defender = team2Swapped
      ? matchmakingResult.team2.attacker
      : matchmakingResult.team2.defender

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

  if (step === 'score' && matchmakingResult) {
    return (
      <ScoreEntryStep
        teams={matchmakingResult}
        onBack={() => setStep('result')}
        onClose={onClose}
        onSubmit={handleAddMatch}
      />
    )
  }

  if (step === 'result' && matchmakingResult) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <button
              type="button"
              onClick={() => {
                // Remove the saved matchup when going back
                if (savedMatchupId) {
                  savedMatchupsService.deleteMatchup(savedMatchupId)
                  setSavedMatchupId(null)
                }
                setTeam1Swapped(false)
                setTeam2Swapped(false)
                setStep('selection')
              }}
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
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium mb-3">
              <Check size={16} />
              Teams Generated
            </div>
            <h2 className="text-lg font-bold text-gray-900">
              {matchmakingMode === 'balanced' ? 'Balanced' : 'Rare'} Matchup
            </h2>
            <p className="text-sm text-gray-600">
              {Math.round(matchmakingResult.confidence * 100)}% confidence
            </p>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <div className="space-y-3">
              <div className="bg-blue-100 rounded-lg p-3">
                <div className="font-medium text-blue-900 text-sm mb-1">Team 1</div>
                <div className="flex items-center text-blue-800">
                  <span>
                    {team1Swapped
                      ? matchmakingResult.team1.defender.name
                      : matchmakingResult.team1.attacker.name}{' '}
                    (A)
                  </span>
                  <button
                    type="button"
                    onClick={() => handleSwapTeam(1)}
                    className="mx-2 p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-200 rounded transition-colors"
                    title="Swap positions for Team 1"
                  >
                    <ArrowLeftRight size={18} />
                  </button>
                  <span>
                    {team1Swapped
                      ? matchmakingResult.team1.attacker.name
                      : matchmakingResult.team1.defender.name}{' '}
                    (D)
                  </span>
                </div>
              </div>
              <div className="text-center font-bold text-gray-600">VS</div>
              <div className="bg-purple-100 rounded-lg p-3">
                <div className="font-medium text-purple-900 text-sm mb-1">Team 2</div>
                <div className="flex items-center text-purple-800">
                  <span>
                    {team2Swapped
                      ? matchmakingResult.team2.defender.name
                      : matchmakingResult.team2.attacker.name}{' '}
                    (A)
                  </span>
                  <button
                    type="button"
                    onClick={() => handleSwapTeam(2)}
                    className="mx-2 p-1.5 text-purple-600 hover:text-purple-800 hover:bg-purple-200 rounded transition-colors"
                    title="Swap positions for Team 2"
                  >
                    <ArrowLeftRight size={18} />
                  </button>
                  <span>
                    {team2Swapped
                      ? matchmakingResult.team2.attacker.name
                      : matchmakingResult.team2.defender.name}{' '}
                    (D)
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-200">
              <span className="text-xs text-gray-600">
                Ranking diff: {matchmakingResult.rankingDifference} pts
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleContinueToScore}
              className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-xl font-semibold transition-colors"
            >
              Register Score
            </button>

            <button
              type="button"
              onClick={() => {
                // Remove the previously saved matchup when regenerating
                if (savedMatchupId) {
                  savedMatchupsService.deleteMatchup(savedMatchupId)
                  setSavedMatchupId(null)
                }
                setTeam1Swapped(false)
                setTeam2Swapped(false)
                setStep('selection')
              }}
              className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <Shuffle size={16} />
              Regenerate
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Selection step
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-100 max-h-[95vh] overflow-y-auto">
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
          <h2 className="text-lg font-bold text-gray-900">Pick Teams Smartly</h2>
          <p className="text-sm text-gray-600">Select players and matchmaking style</p>
        </div>

        {/* Matchmaking Mode Toggle */}
        <div className="mb-6">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setMatchmakingMode('rare')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                matchmakingMode === 'rare'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Sparkles size={14} />
              Rare Matchup
            </button>
            <button
              type="button"
              onClick={() => setMatchmakingMode('balanced')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                matchmakingMode === 'balanced'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Brain size={14} />
              Balanced
            </button>
          </div>
          <p className="text-xs text-gray-600 mt-2 text-center">
            {matchmakingMode === 'balanced'
              ? 'Creates evenly matched teams based on rankings'
              : 'Pairs players who rarely team up together'}
          </p>
        </div>

        {/* Player Selection */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="text-gray-500" size={16} />
              <span className="font-medium text-gray-900">
                Player Pool ({selectedPlayerPool.length})
              </span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={selectAllPlayers}
                disabled={selectedPlayerPool.length === players.length}
                className="text-xs text-blue-600 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={clearAllPlayers}
                disabled={selectedPlayerPool.length === 0}
                className="text-xs text-gray-600 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Clear All
              </button>
            </div>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {players
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((player) => (
                <label
                  key={player.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedPlayerPool.includes(player.id)}
                    onChange={() => handlePlayerPoolToggle(player.id)}
                    disabled={false}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                  />
                  <span className="text-lg">{player.avatar}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">{player.name}</div>
                    <div className="text-sm text-gray-500">{player.ranking} pts</div>
                  </div>
                </label>
              ))}
          </div>
        </div>

        <button
          type="button"
          onClick={handleGenerateMatchup}
          disabled={isGenerating || selectedPlayerPool.length < 4}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-xl font-semibold shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isGenerating ? (
            <>
              <Loader2 className="animate-spin" size={16} />
              Generating...
            </>
          ) : (
            <>
              <Shuffle size={16} />
              {matchmakingMode === 'balanced' ? 'Generate Balanced Teams' : 'Generate Rare Matchup'}
            </>
          )}
        </button>

        {selectedPlayerPool.length < 4 && (
          <p className="text-sm text-red-600 text-center mt-2">
            Select 4 or more players to generate teams
          </p>
        )}
      </div>
    </div>
  )
}
