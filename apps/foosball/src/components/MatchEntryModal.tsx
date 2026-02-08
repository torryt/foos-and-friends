import type { Match, MatchType, Player } from '@foos/shared'
import { savedMatchupsService } from '@foos/shared'
import { AlertTriangle, Brain, History, Target, User, Users, X } from 'lucide-react'
import { useState } from 'react'
import { useGroupContext } from '@/contexts/GroupContext'
import { useSeasonContext } from '@/contexts/SeasonContext'
import { Manual1v1Workflow } from './Manual1v1Workflow'
import { ManualTeamsWorkflow } from './ManualTeamsWorkflow'
import { PickTeamsWorkflow } from './PickTeamsWorkflow'
import { UseMatchupWorkflow } from './UseMatchupWorkflow'

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

type WorkflowMode = 'entry' | 'pick-teams' | 'manual-teams' | 'use-matchup' | 'manual-1v1'

export const MatchEntryModal = ({
  players,
  matches,
  supportedMatchTypes,
  addMatch,
  onClose,
}: MatchEntryModalProps) => {
  const [mode, setMode] = useState<WorkflowMode>('entry')
  const [selectedMatchType, setSelectedMatchType] = useState<MatchType>(
    supportedMatchTypes.includes('2v2') ? '2v2' : '1v1',
  )
  const { currentGroup } = useGroupContext()
  const { currentSeason } = useSeasonContext()
  const savedMatchups = currentGroup ? savedMatchupsService.getAllMatchups(currentGroup.id) : []

  const isArchived = !!currentSeason && !currentSeason.isActive
  const showMatchTypeToggle = supportedMatchTypes.length > 1

  // Wrapper for 2v2 workflows (keeps their existing addMatch signature)
  const addMatch2v2 = (
    team1Player1Id: string,
    team1Player2Id: string,
    team2Player1Id: string,
    team2Player2Id: string,
    score1: string,
    score2: string,
  ) =>
    addMatch('2v2', team1Player1Id, team1Player2Id, team2Player1Id, team2Player2Id, score1, score2)

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

  if (mode === 'pick-teams') {
    return (
      <PickTeamsWorkflow
        players={players}
        matches={matches}
        addMatch={addMatch2v2}
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
        addMatch={addMatch2v2}
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
        addMatch={addMatch2v2}
        onBack={handleBack}
        onClose={onClose}
        onSuccess={handleSuccess}
      />
    )
  }

  // Entry mode - show match type toggle and workflow options
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

          {/* Match Type Toggle */}
          {showMatchTypeToggle && (
            <div className="mb-4">
              <div className="flex bg-gray-100 rounded-lg p-1">
                {supportedMatchTypes.includes('1v1') && (
                  <button
                    type="button"
                    onClick={() => setSelectedMatchType('1v1')}
                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                      selectedMatchType === '1v1'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <User size={14} />
                    1v1
                  </button>
                )}
                {supportedMatchTypes.includes('2v2') && (
                  <button
                    type="button"
                    onClick={() => setSelectedMatchType('2v2')}
                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                      selectedMatchType === '2v2'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Users size={14} />
                    2v2
                  </button>
                )}
              </div>
            </div>
          )}

          <p className="text-gray-600 text-center mb-6">
            {selectedMatchType === '1v1'
              ? 'Set up a 1v1 head-to-head match'
              : 'How do you want to create teams?'}
          </p>

          {/* 1v1 Workflow Options */}
          {selectedMatchType === '1v1' && (
            <button
              type="button"
              onClick={() => setMode('manual-1v1')}
              disabled={isArchived}
              className={`w-full p-4 border rounded-xl transition-colors text-left ${
                isArchived
                  ? 'bg-gray-50 border-gray-200 opacity-50 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 hover:from-green-100 hover:to-emerald-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <User className="text-green-600" size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Select Players</h3>
                  <p className="text-sm text-gray-600">Choose two players for a 1v1 match</p>
                </div>
              </div>
            </button>
          )}

          {/* 2v2 Workflow Options */}
          {selectedMatchType === '2v2' && (
            <>
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
            </>
          )}
        </div>

        {selectedMatchType === '2v2' && savedMatchups.length > 0 && (
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
