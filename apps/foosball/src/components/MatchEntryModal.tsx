import type { Match, MatchType, Player } from '@foos/shared'
import { savedMatchupsService } from '@foos/shared'
import { AlertTriangle, Brain, History, Target, User, Users, X } from 'lucide-react'
import { useState } from 'react'
import { useGroupContext } from '@/contexts/GroupContext'
import { useSeasonContext } from '@/contexts/SeasonContext'
import { Manual1v1Workflow } from './Manual1v1Workflow'
import { ManualTeamsWorkflow } from './ManualTeamsWorkflow'
import { ModalOrBottomDrawer } from './ModalOrBottomDrawer'
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
    <ModalOrBottomDrawer onClose={onClose} className="sm:max-w-md">
      <div className="bg-card p-6 w-full shadow-2xl border border-[var(--th-border)]">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-primary flex items-center gap-2">
            <Target className="text-[var(--th-sport-primary)]" size={24} />
            Add Match
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-secondary p-1 rounded-full hover:bg-card-hover"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3">
          {/* Archived Season Warning */}
          {isArchived && (
            <div className="bg-accent-subtle border border-[var(--th-border)] rounded-[var(--th-radius-lg)] p-4 mb-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="text-secondary flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <h3 className="font-semibold text-primary mb-1">Archived Season</h3>
                  <p className="text-sm text-primary">
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
              <div className="flex bg-card-hover rounded-[var(--th-radius-md)] p-1">
                {supportedMatchTypes.includes('1v1') && (
                  <button
                    type="button"
                    onClick={() => setSelectedMatchType('1v1')}
                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                      selectedMatchType === '1v1'
                        ? 'bg-card text-primary shadow-sm'
                        : 'text-secondary hover:text-primary'
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
                        ? 'bg-card text-primary shadow-sm'
                        : 'text-secondary hover:text-primary'
                    }`}
                  >
                    <Users size={14} />
                    2v2
                  </button>
                )}
              </div>
            </div>
          )}

          <p className="text-secondary text-center mb-6">
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
              className={`w-full p-4 border rounded-[var(--th-radius-lg)] transition-colors text-left ${
                isArchived
                  ? 'bg-card-hover border-[var(--th-border)] opacity-50 cursor-not-allowed'
                  : 'bg-accent-subtle border-[var(--th-border)] hover:bg-card-hover'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-card-hover rounded-[var(--th-radius-md)]">
                  <User className="text-[var(--th-win)]" size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-primary">Select Players</h3>
                  <p className="text-sm text-secondary">Choose two players for a 1v1 match</p>
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
                className={`w-full p-4 border rounded-[var(--th-radius-lg)] transition-colors text-left ${
                  isArchived
                    ? 'bg-card-hover border-[var(--th-border)] opacity-50 cursor-not-allowed'
                    : 'bg-accent-subtle border-[var(--th-border)] hover:bg-card-hover'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-card-hover rounded-[var(--th-radius-md)]">
                    <Brain className="text-[var(--th-accent)]" size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-primary">Pick Teams Smartly</h3>
                    <p className="text-sm text-secondary">
                      Use balanced or rare matchup algorithms
                    </p>
                  </div>
                </div>
              </button>

              {/* Select Teams Manually */}
              <button
                type="button"
                onClick={() => setMode('manual-teams')}
                disabled={isArchived}
                className={`w-full p-4 border rounded-[var(--th-radius-lg)] transition-colors text-left ${
                  isArchived
                    ? 'bg-card-hover border-[var(--th-border)] opacity-50 cursor-not-allowed'
                    : 'bg-accent-subtle border-[var(--th-border)] hover:bg-card-hover'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-card-hover rounded-[var(--th-radius-md)]">
                    <Users className="text-[var(--th-win)]" size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-primary">Select Teams Manually</h3>
                    <p className="text-sm text-secondary">Choose players and positions yourself</p>
                  </div>
                </div>
              </button>

              {/* Use Previous Matchup */}
              <button
                type="button"
                onClick={() => setMode('use-matchup')}
                disabled={isArchived || savedMatchups.length === 0}
                className={`w-full p-4 border rounded-[var(--th-radius-lg)] transition-colors text-left ${
                  isArchived || savedMatchups.length === 0
                    ? 'bg-card-hover border-[var(--th-border)] opacity-50 cursor-not-allowed'
                    : 'bg-accent-subtle border-[var(--th-border)] hover:bg-card-hover'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-[var(--th-radius-md)] ${
                      savedMatchups.length === 0 ? 'bg-card-hover' : 'bg-card-hover'
                    }`}
                  >
                    <History
                      className={savedMatchups.length === 0 ? 'text-muted' : 'text-[var(--th-draw)]'}
                      size={20}
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold text-primary">
                      Use Previous Matchup
                      {savedMatchups.length > 0 && (
                        <span className="ml-2 px-2 py-1 bg-card-hover text-[var(--th-draw)] text-xs rounded-full">
                          {savedMatchups.length}
                        </span>
                      )}
                    </h3>
                    <p className="text-sm text-secondary">
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
          <div className="mt-4 pt-4 border-t border-[var(--th-border)]">
            <p className="text-xs text-muted text-center">
              Saved matchups auto-expire after 48 hours
            </p>
          </div>
        )}
      </div>
    </ModalOrBottomDrawer>
  )
}
