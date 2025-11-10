import { AlertTriangle, Brain, History, Target, Users, X } from 'lucide-react'
import { useState } from 'react'
import { useGroupContext } from '@/contexts/GroupContext'
import { useSeasonContext } from '@/contexts/SeasonContext'
import { savedMatchupsService } from '@/services/savedMatchupsService'
import type { Match, Player } from '@/types'
import { ManualTeamsWorkflow } from './ManualTeamsWorkflow'
import { PickTeamsWorkflow } from './PickTeamsWorkflow'
import { UseMatchupWorkflow } from './UseMatchupWorkflow'

interface MatchEntryModalProps {
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
  onClose: () => void
}

type WorkflowMode = 'entry' | 'pick-teams' | 'manual-teams' | 'use-matchup'

export const MatchEntryModal = ({ players, matches, addMatch, onClose }: MatchEntryModalProps) => {
  const [mode, setMode] = useState<WorkflowMode>('entry')
  const { currentGroup } = useGroupContext()
  const { currentSeason } = useSeasonContext()
  const savedMatchups = currentGroup ? savedMatchupsService.getAllMatchups(currentGroup.id) : []

  const isArchived = !!currentSeason && !currentSeason.isActive

  const handleBack = () => {
    setMode('entry')
  }

  const handleSuccess = () => {
    onClose()
  }

  if (mode === 'pick-teams') {
    return (
      <PickTeamsWorkflow
        players={players}
        matches={matches}
        addMatch={addMatch}
        onBack={handleBack}
        onClose={onClose}
        onSuccess={handleSuccess}
        groupId={currentGroup?.id || ''}
      />
    )
  }

  if (mode === 'use-matchup') {
    return (
      <UseMatchupWorkflow
        savedMatchups={savedMatchups}
        addMatch={addMatch}
        onBack={handleBack}
        onClose={onClose}
        onSuccess={handleSuccess}
        groupId={currentGroup?.id || ''}
      />
    )
  }

  if (mode === 'manual-teams') {
    return (
      <ManualTeamsWorkflow
        players={players}
        addMatch={addMatch}
        onBack={handleBack}
        onClose={onClose}
        onSuccess={handleSuccess}
      />
    )
  }

  // Entry mode - show three options
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Target className="text-orange-500" size={24} />
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
            <div className="bg-gradient-to-r from-orange-100 to-red-100 border border-orange-300 rounded-xl p-4 mb-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="text-orange-600 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <h3 className="font-semibold text-orange-900 mb-1">Archived Season</h3>
                  <p className="text-sm text-orange-800">
                    You're viewing {currentSeason?.name || 'an archived season'}. Matches can only
                    be recorded in the active season. Please switch to the active season to record
                    new matches.
                  </p>
                </div>
              </div>
            </div>
          )}

          <p className="text-gray-600 text-center mb-6">How do you want to create teams?</p>

          {/* Pick Teams Smartly */}
          <button
            type="button"
            onClick={() => setMode('pick-teams')}
            disabled={isArchived}
            className={`w-full p-4 border rounded-xl transition-colors text-left ${
              isArchived
                ? 'bg-gray-50 border-gray-200 opacity-50 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 hover:from-blue-100 hover:to-indigo-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Brain className="text-blue-600" size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Pick Teams Smartly</h3>
                <p className="text-sm text-gray-600">Use balanced or rare matchup algorithms</p>
              </div>
            </div>
          </button>

          {/* Select Teams Manually */}
          <button
            type="button"
            onClick={() => setMode('manual-teams')}
            disabled={isArchived}
            className={`w-full p-4 border rounded-xl transition-colors text-left ${
              isArchived
                ? 'bg-gray-50 border-gray-200 opacity-50 cursor-not-allowed'
                : 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 hover:from-green-100 hover:to-emerald-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="text-green-600" size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Select Teams Manually</h3>
                <p className="text-sm text-gray-600">Choose players and positions yourself</p>
              </div>
            </div>
          </button>

          {/* Use Previous Matchup */}
          <button
            type="button"
            onClick={() => setMode('use-matchup')}
            disabled={isArchived || savedMatchups.length === 0}
            className={`w-full p-4 border rounded-xl transition-colors text-left ${
              isArchived || savedMatchups.length === 0
                ? 'bg-gray-50 border-gray-200 opacity-50 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-50 to-violet-50 border-purple-200 hover:from-purple-100 hover:to-violet-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-lg ${
                  savedMatchups.length === 0 ? 'bg-gray-100' : 'bg-purple-100'
                }`}
              >
                <History
                  className={savedMatchups.length === 0 ? 'text-gray-400' : 'text-purple-600'}
                  size={20}
                />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  Use Previous Matchup
                  {savedMatchups.length > 0 && (
                    <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                      {savedMatchups.length}
                    </span>
                  )}
                </h3>
                <p className="text-sm text-gray-600">
                  {savedMatchups.length === 0
                    ? 'No saved matchups available'
                    : `Load from ${savedMatchups.length} saved matchup${savedMatchups.length === 1 ? '' : 's'}`}
                </p>
              </div>
            </div>
          </button>
        </div>

        {savedMatchups.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Saved matchups auto-expire after 48 hours
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
