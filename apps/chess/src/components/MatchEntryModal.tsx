import type { Match, MatchType, Player } from '@foos/shared'
import { AlertTriangle, Target, User, X } from 'lucide-react'
import { useState } from 'react'
import { useSeasonContext } from '@/contexts/SeasonContext'
import { Manual1v1Workflow } from './Manual1v1Workflow'

interface MatchEntryModalProps {
  players: Player[]
  matches: Match[]
  supportedMatchTypes: MatchType[]
  addMatch: (
    matchType: MatchType,
    team1Player1Id: string,
    team1Player2Id: string | null,
    team2Player1Id: string,
    team2Player2Id: string | null,
    score1: string,
    score2: string,
  ) => Promise<{ success: boolean; error?: string }>
  onClose: () => void
}

type WorkflowMode = 'entry' | 'manual-1v1'

export const MatchEntryModal = ({ players, addMatch, onClose }: MatchEntryModalProps) => {
  const [mode, setMode] = useState<WorkflowMode>('entry')
  const { currentSeason } = useSeasonContext()

  const isArchived = !!currentSeason && !currentSeason.isActive

  // Wrapper for 1v1 workflow
  const addMatch1v1 = (player1Id: string, player2Id: string, score1: string, score2: string) =>
    addMatch('1v1', player1Id, null, player2Id, null, score1, score2)

  const handleBack = () => {
    setMode('entry')
  }

  const handleSuccess = () => {
    onClose()
  }

  if (mode === 'manual-1v1') {
    return (
      <Manual1v1Workflow
        players={players}
        addMatch={addMatch1v1}
        onBack={handleBack}
        onClose={onClose}
        onSuccess={handleSuccess}
      />
    )
  }

  // Entry mode - show 1v1 workflow option
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Target className="text-[#832161]" size={24} />
            Add Match
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3">
          {/* Archived Season Warning */}
          {isArchived && (
            <div className="bg-gradient-to-r from-[#F0EFF4] to-[#E8D5E0] border border-[#832161]/30 rounded-xl p-4 mb-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="text-[#832161] flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <h3 className="font-semibold text-[#3D2645] mb-1">Archived Season</h3>
                  <p className="text-sm text-[#3D2645]/80">
                    You're viewing {currentSeason?.name || 'an archived season'}. Matches can only
                    be recorded in the active season. Please switch to the active season to record
                    new matches.
                  </p>
                </div>
              </div>
            </div>
          )}

          <p className="text-gray-600 text-center mb-6">Set up a 1v1 head-to-head match</p>

          {/* 1v1 Workflow */}
          <button
            type="button"
            onClick={() => setMode('manual-1v1')}
            disabled={isArchived}
            className={`w-full p-4 border rounded-xl transition-colors text-left ${
              isArchived
                ? 'bg-gray-50 border-gray-200 opacity-50 cursor-not-allowed'
                : 'bg-gradient-to-r from-[#F0EFF4] to-[#E8D5E0] border-[#832161]/20 hover:from-[#E8D5E0] hover:to-[#E0C8D8]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#832161]/10 rounded-lg">
                <User className="text-[#832161]" size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Select Players</h3>
                <p className="text-sm text-gray-600">Choose two players for a 1v1 match</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
