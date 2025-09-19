import { Loader2, Shield, Sword, Target, Users, X } from 'lucide-react'
import { useState } from 'react'
import { useToast } from '@/hooks/useToast'
import type { Player } from '@/types'

interface RegisterGameFormProps {
  players: Player[]
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

const RegisterGameForm = ({ players, recordMatch, setShowRecordMatch }: RegisterGameFormProps) => {
  const [team1Player1Id, setTeam1Player1Id] = useState('')
  const [team1Player2Id, setTeam1Player2Id] = useState('')
  const [team2Player1Id, setTeam2Player1Id] = useState('')
  const [team2Player2Id, setTeam2Player2Id] = useState('')
  const [score1, setScore1] = useState('')
  const [score2, setScore2] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

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
        setTeam1Player1Id('')
        setTeam1Player2Id('')
        setTeam2Player1Id('')
        setTeam2Player2Id('')
        setScore1('')
        setScore2('')
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
            Register Game
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

        <div className="space-y-4">
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
                Registering...
              </>
            ) : (
              'Register Game'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default RegisterGameForm
