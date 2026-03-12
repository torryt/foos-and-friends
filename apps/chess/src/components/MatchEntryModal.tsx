import type { Match, MatchType, Player } from '@foos/shared'
import { AlertTriangle, Target, User, X } from 'lucide-react'
import { useState } from 'react'
import { useSeasonContext } from '@/contexts/SeasonContext'
import { Manual1v1Workflow } from './Manual1v1Workflow'
import { ModalOrBottomDrawer } from './ModalOrBottomDrawer'

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

          <p className="text-secondary text-center mb-6">Set up a 1v1 head-to-head match</p>

          {/* 1v1 Workflow */}
          <button
            type="button"
            onClick={() => setMode('manual-1v1')}
            disabled={isArchived}
            className={`w-full p-4 border rounded-[var(--th-radius-lg)] transition-colors text-left ${
              isArchived
                ? 'bg-card-hover border-[var(--th-border)] opacity-50 cursor-not-allowed'
                : 'bg-accent-subtle border-[var(--th-border)] hover:bg-[var(--th-accent-subtle-hover,var(--th-accent-subtle))]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[var(--th-sport-primary)]/10 rounded-lg">
                <User className="text-[var(--th-sport-primary)]" size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-primary">Select Players</h3>
                <p className="text-sm text-secondary">Choose two players for a 1v1 match</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </ModalOrBottomDrawer>
  )
}
