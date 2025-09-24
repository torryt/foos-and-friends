import { Brain, Loader2, Shield, Shuffle, Sword, Target, Users, X } from 'lucide-react'
import { useState } from 'react'
import { useToast } from '@/hooks/useToast'
import type { Match, Player } from '@/types'
import {
  calculatePositionPreferences,
  findBestMatchup,
  formatTeamAssignment,
} from '@/utils/matchmaking'

interface RegisterGameFormProps {
  players: Player[]
  matches: Match[]
  recordMatch: (
    team1Player1Id: string,
    team1Player2Id: string,
    team2Player1Id: string,
    team2Player2Id: string,
    score1: string,
    score2: string,
  ) => Promise<{ success: boolean; error?: string }>
  setShowRecordMatch: (show: boolean) => void
}

const RegisterGameForm = ({
  players,
  matches,
  recordMatch,
  setShowRecordMatch,
}: RegisterGameFormProps) => {
  const [mode, setMode] = useState<'manual' | 'matchmaking'>('manual')
  const [team1Player1Id, setTeam1Player1Id] = useState('')
  const [team1Player2Id, setTeam1Player2Id] = useState('')
  const [team2Player1Id, setTeam2Player1Id] = useState('')
  const [team2Player2Id, setTeam2Player2Id] = useState('')
  const [score1, setScore1] = useState('')
  const [score2, setScore2] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedPlayerPool, setSelectedPlayerPool] = useState<string[]>([])
  const [matchmakingResult, setMatchmakingResult] = useState<ReturnType<
    typeof findBestMatchup
  > | null>(null)
  const { toast } = useToast()

  const handlePlayerPoolToggle = (playerId: string) => {
    setSelectedPlayerPool((prev) => {
      const newPool = prev.includes(playerId)
        ? prev.filter((id) => id !== playerId)
        : [...prev, playerId]

      // Clear matchmaking result when pool changes
      if (newPool.length !== prev.length) {
        setMatchmakingResult(null)
      }

      return newPool
    })
  }

  const handleGenerateMatchup = () => {
    if (selectedPlayerPool.length < 4 || selectedPlayerPool.length > 7) {
      toast().error('Player pool must contain 4-7 players')
      return
    }

    const poolPlayers = players.filter((p) => selectedPlayerPool.includes(p.id))

    // Generate position preferences for each player using manual calculation
    // (Can't use usePositionStats hook inside event handler)
    const positionPreferences = poolPlayers.map((player) => {
      // Calculate position stats manually
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

    try {
      const result = findBestMatchup(poolPlayers, positionPreferences)
      setMatchmakingResult(result)

      // Auto-populate the manual form with matchmaking results
      setTeam1Player1Id(result.team1.attacker.id)
      setTeam1Player2Id(result.team1.defender.id)
      setTeam2Player1Id(result.team2.attacker.id)
      setTeam2Player2Id(result.team2.defender.id)

      toast().success(`Teams generated! ${Math.round(result.confidence * 100)}% confidence`)
    } catch (error) {
      toast().error(error instanceof Error ? error.message : 'Failed to generate matchup')
    }
  }

  const resetForm = () => {
    setTeam1Player1Id('')
    setTeam1Player2Id('')
    setTeam2Player1Id('')
    setTeam2Player2Id('')
    setScore1('')
    setScore2('')
    setSelectedPlayerPool([])
    setMatchmakingResult(null)
  }

  const handleModeChange = (newMode: 'manual' | 'matchmaking') => {
    setMode(newMode)
    resetForm()
  }

  const handleSubmit = async () => {
    const playerIds = [team1Player1Id, team1Player2Id, team2Player1Id, team2Player2Id]
    const allSelected = playerIds.every((id) => id !== '')
    const allUnique = new Set(playerIds).size === 4
    const scoresValid = score1 !== '' && score2 !== ''

    if (allSelected && allUnique && scoresValid) {
      setIsSubmitting(true)
      const result = await recordMatch(
        team1Player1Id,
        team1Player2Id,
        team2Player1Id,
        team2Player2Id,
        score1,
        score2,
      )

      if (result.success) {
        toast().success('Match recorded successfully!')
        setShowRecordMatch(false)
        resetForm()
      } else {
        toast().error(result.error || 'Failed to record match')
      }

      setIsSubmitting(false)
    }
  }

  const getAvailablePlayers = (excludeIds: string[] = []) => {
    return players.filter((p) => !excludeIds.includes(p.id.toString()))
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl p-4 w-full max-w-sm shadow-2xl border border-white/20 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Target className="text-orange-500" size={20} />
            Record Match
          </h3>
          <button
            type="button"
            onClick={() => setShowRecordMatch(false)}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-slate-600  p-1 rounded-full hover:bg-white/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X size={20} />
          </button>
        </div>

        {/* Mode Switcher */}
        <div className="bg-white/60 rounded-xl p-3 mb-4 border border-gray-200/50">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              type="button"
              onClick={() => handleModeChange('manual')}
              disabled={isSubmitting}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                mode === 'manual'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <Users size={16} />
              Manual Selection
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('matchmaking')}
              disabled={isSubmitting}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                mode === 'matchmaking'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <Brain size={16} />
              Smart Matchmaking
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {/* Matchmaking Player Pool Selection */}
          {mode === 'matchmaking' && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded-xl border border-green-200/50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Users className="text-green-500" size={14} />
                  <span className="text-sm font-semibold text-green-800">
                    Player Pool ({selectedPlayerPool.length}/7)
                  </span>
                </div>
                <div className="text-xs text-green-600">Select 4-7 players</div>
              </div>
              <div className="space-y-2">
                {players
                  .slice()
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((player) => (
                    <label
                      key={player.id}
                      className="flex items-center gap-3 p-2 rounded-lg bg-white/60 hover:bg-white/80 cursor-pointer transition-colors border border-green-100"
                    >
                      <input
                        type="checkbox"
                        checked={selectedPlayerPool.includes(player.id)}
                        onChange={() => handlePlayerPoolToggle(player.id)}
                        disabled={
                          isSubmitting ||
                          (!selectedPlayerPool.includes(player.id) &&
                            selectedPlayerPool.length >= 7)
                        }
                        className="rounded border-green-300 text-green-600 focus:ring-green-500 disabled:opacity-50"
                      />
                      <span className="text-lg">{player.avatar}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {player.name}
                        </div>
                        <div className="text-xs text-gray-500">{player.ranking} pts</div>
                      </div>
                    </label>
                  ))}
              </div>
              <button
                type="button"
                onClick={handleGenerateMatchup}
                disabled={
                  isSubmitting || selectedPlayerPool.length < 4 || selectedPlayerPool.length > 7
                }
                className="w-full mt-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-2 px-4 rounded-lg hover:from-green-600 hover:to-emerald-700 font-medium shadow-md text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Shuffle size={16} />
                Generate Balanced Teams
              </button>
              {matchmakingResult && (
                <div className="mt-3 p-3 bg-white/80 rounded-lg border border-green-200">
                  <div className="text-xs font-medium text-green-800 mb-1">
                    Generated Matchup ({Math.round(matchmakingResult.confidence * 100)}% confidence)
                  </div>
                  <div className="text-xs text-gray-600 whitespace-pre-line">
                    {formatTeamAssignment(matchmakingResult)}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-3 rounded-xl border border-blue-200/50">
            <div className="block text-sm font-semibold text-blue-800 mb-2 flex items-center gap-2">
              <Users className="text-blue-500" size={14} />
              Team 1
            </div>
            <div className="space-y-2">
              <div className="relative">
                <div className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none">
                  <Sword className="text-orange-500" size={16} />
                </div>
                <select
                  value={team1Player1Id}
                  onChange={(e) => setTeam1Player1Id(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full pl-8 p-2 border border-orange-200 rounded-lg bg-white/80 backdrop-blur-sm focus:ring-2 focus:ring-orange-300 focus:border-transparent text-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
                <div className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none">
                  <Shield className="text-blue-500" size={16} />
                </div>
                <select
                  value={team1Player2Id}
                  onChange={(e) => setTeam1Player2Id(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full pl-8 p-2 border border-blue-200 rounded-lg bg-white/80 backdrop-blur-sm focus:ring-2 focus:ring-blue-300 focus:border-transparent text-sm disabled:opacity-50 disabled:cursor-not-allowed"
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

          <div className="bg-gradient-to-r from-purple-50 to-violet-50 p-3 rounded-xl border border-purple-200/50">
            <div className="block text-sm font-semibold text-purple-800 mb-2 flex items-center gap-2">
              <Users className="text-purple-500" size={14} />
              Team 2
            </div>
            <div className="space-y-2">
              <div className="relative">
                <div className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none">
                  <Sword className="text-orange-500" size={16} />
                </div>
                <select
                  value={team2Player1Id}
                  onChange={(e) => setTeam2Player1Id(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full pl-8 p-2 border border-orange-200 rounded-lg bg-white/80 backdrop-blur-sm focus:ring-2 focus:ring-orange-300 focus:border-transparent text-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
                <div className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none">
                  <Shield className="text-blue-500" size={16} />
                </div>
                <select
                  value={team2Player2Id}
                  onChange={(e) => setTeam2Player2Id(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full pl-8 p-2 border border-blue-200 rounded-lg bg-white/80 backdrop-blur-sm focus:ring-2 focus:ring-blue-300 focus:border-transparent text-sm disabled:opacity-50 disabled:cursor-not-allowed"
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

          <div className="bg-gradient-to-r from-orange-50 to-red-50 p-3 rounded-xl border border-orange-200/50">
            <div className="block text-sm font-semibold text-orange-800 mb-2">Final Score</div>
            <div className="grid grid-cols-3 gap-2 items-center">
              <input
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                min="0"
                max="10"
                value={score1}
                onChange={(e) => {
                  const value = e.target.value
                  // Only allow positive integers
                  if (value === '' || (/^\d+$/.test(value) && Number.parseInt(value, 10) >= 0)) {
                    setScore1(value)
                  }
                }}
                disabled={isSubmitting}
                placeholder="0"
                className="p-2 border border-orange-200 rounded-lg bg-white/80 text-center text-sm focus:ring-2 focus:ring-orange-300 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <div className="text-center font-bold text-orange-800">VS</div>
              <input
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                min="0"
                max="10"
                value={score2}
                onChange={(e) => {
                  const value = e.target.value
                  // Only allow positive integers
                  if (value === '' || (/^\d+$/.test(value) && Number.parseInt(value, 10) >= 0)) {
                    setScore2(value)
                  }
                }}
                disabled={isSubmitting}
                placeholder="0"
                className="p-2 border border-orange-200 rounded-lg bg-white/80 text-center text-sm focus:ring-2 focus:ring-orange-300 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            <p className="text-xs text-orange-600 mt-1 text-center">
              Games are typically played to 10 points
            </p>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={
              isSubmitting ||
              !team1Player1Id ||
              !team1Player2Id ||
              !team2Player1Id ||
              !team2Player2Id ||
              score1 === '' ||
              score2 === '' ||
              new Set([team1Player1Id, team1Player2Id, team2Player1Id, team2Player2Id]).size !== 4
            }
            className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white py-3 px-4 rounded-xl hover:from-orange-600 hover:to-red-700  font-semibold shadow-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                Recording...
              </>
            ) : (
              'Record Match'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default RegisterGameForm
