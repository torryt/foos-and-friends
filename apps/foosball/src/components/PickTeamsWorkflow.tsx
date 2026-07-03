import type { Match, Player, TeamAssignment } from '@foos/shared'
import {
  calculatePositionPreferences,
  findBestMatchup,
  findRareMatchup,
  savedMatchupsService,
} from '@foos/shared'
import {
  ArrowLeft,
  ArrowLeftRight,
  Brain,
  Check,
  Loader2,
  Search,
  Shuffle,
  Sparkles,
  Users,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { useToast } from '@/hooks/useToast'
import { ModalOrBottomDrawer } from './ModalOrBottomDrawer'
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
  groupId: string
}

type Step = 'mode' | 'selection' | 'result' | 'score'

export const PickTeamsWorkflow = ({
  players,
  matches,
  addMatch,
  onBack,
  onClose,
  onSuccess,
  groupId,
}: PickTeamsWorkflowProps) => {
  const [step, setStep] = useState<Step>('mode')
  const [matchmakingMode, setMatchmakingMode] = useState<'balanced' | 'rare'>('rare')
  const [selectedPlayerPool, setSelectedPlayerPool] = useState<string[]>([])
  const [matchmakingResult, setMatchmakingResult] = useState<TeamAssignment | null>(null)
  const [savedMatchupId, setSavedMatchupId] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [team1Swapped, setTeam1Swapped] = useState(false)
  const [team2Swapped, setTeam2Swapped] = useState(false)
  const [playerSearch, setPlayerSearch] = useState('')
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
            match.team1[1]?.id === player.id ||
            match.team2[0].id === player.id ||
            match.team2[1]?.id === player.id
          )
        })

        let gamesAsAttacker = 0
        let gamesAsDefender = 0
        let winsAsAttacker = 0
        let winsAsDefender = 0

        for (const match of playerMatches) {
          // Skip 1v1 matches for position preference calculations
          if (match.matchType === '1v1') continue

          const wasInTeam1 = match.team1[0].id === player.id || match.team1[1]?.id === player.id
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
      const savedMatchup = savedMatchupsService.saveMatchup(result, matchmakingMode, groupId)
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
      savedMatchupsService.deleteMatchup(savedMatchupId, groupId)
      const newSavedMatchup = savedMatchupsService.saveMatchup(
        updatedResult,
        matchmakingMode,
        groupId,
      )
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
      <ModalOrBottomDrawer onClose={onClose} className="sm:max-w-md">
        <div
          className="bg-card px-6 pb-6 w-full shadow-2xl border border-[var(--th-border)]"
          style={{ paddingTop: 'calc(1.5rem + env(safe-area-inset-top))' }}
        >
          <div className="flex justify-between items-center mb-6">
            <button
              type="button"
              onClick={() => {
                // Remove the saved matchup when going back
                if (savedMatchupId) {
                  savedMatchupsService.deleteMatchup(savedMatchupId, groupId)
                  setSavedMatchupId(null)
                }
                setTeam1Swapped(false)
                setTeam2Swapped(false)
                setStep('selection')
              }}
              className="flex items-center gap-2 text-secondary hover:text-primary transition-colors"
            >
              <ArrowLeft size={20} />
              <span>Back</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-muted hover:text-secondary p-1 rounded-full hover:bg-card-hover"
            >
              <X size={20} />
            </button>
          </div>

          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-accent-subtle text-[var(--th-win)] rounded-full text-sm font-medium mb-3 border border-[var(--th-border)]">
              <Check size={16} />
              Teams Generated
            </div>
            <h2 className="text-lg font-bold text-primary">
              {matchmakingMode === 'balanced' ? 'Balanced' : 'Rare'} Matchup
            </h2>
            <p className="text-sm text-secondary">
              {Math.round(matchmakingResult.confidence * 100)}% confidence
            </p>
          </div>

          <div className="bg-card-hover rounded-[var(--th-radius-lg)] p-4 mb-6">
            <div className="space-y-3">
              <div className="bg-card rounded-lg p-3 border border-[var(--th-border)]">
                <div className="font-medium text-[var(--th-accent)] text-sm mb-1">Team 1</div>
                <div className="grid grid-cols-3 items-center text-primary">
                  <span className="text-left">
                    {team1Swapped
                      ? matchmakingResult.team1.defender.name
                      : matchmakingResult.team1.attacker.name}{' '}
                    (A)
                  </span>
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={() => handleSwapTeam(1)}
                      className="p-1.5 text-[var(--th-accent)] hover:text-primary hover:bg-card-hover rounded transition-colors"
                      title="Swap positions for Team 1"
                    >
                      <ArrowLeftRight size={18} />
                    </button>
                  </div>
                  <span className="text-right">
                    {team1Swapped
                      ? matchmakingResult.team1.attacker.name
                      : matchmakingResult.team1.defender.name}{' '}
                    (D)
                  </span>
                </div>
              </div>
              <div className="text-center font-bold text-secondary">VS</div>
              <div className="bg-card rounded-lg p-3 border border-[var(--th-border)]">
                <div className="font-medium text-[var(--th-sport-primary)] text-sm mb-1">
                  Team 2
                </div>
                <div className="grid grid-cols-3 items-center text-primary">
                  <span className="text-left">
                    {team2Swapped
                      ? matchmakingResult.team2.defender.name
                      : matchmakingResult.team2.attacker.name}{' '}
                    (A)
                  </span>
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={() => handleSwapTeam(2)}
                      className="p-1.5 text-[var(--th-sport-primary)] hover:text-primary hover:bg-card-hover rounded transition-colors"
                      title="Swap positions for Team 2"
                    >
                      <ArrowLeftRight size={18} />
                    </button>
                  </div>
                  <span className="text-right">
                    {team2Swapped
                      ? matchmakingResult.team2.attacker.name
                      : matchmakingResult.team2.defender.name}{' '}
                    (D)
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-[var(--th-border)]">
              <span className="text-xs text-secondary">
                Ranking diff: {matchmakingResult.rankingDifference} pts
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleContinueToScore}
              className="bg-[var(--th-sport-primary)] hover:opacity-90 text-white py-3 px-4 rounded-[var(--th-radius-lg)] font-semibold transition-colors"
            >
              Register Score
            </button>

            <button
              type="button"
              onClick={() => {
                // Remove the previously saved matchup when regenerating
                if (savedMatchupId) {
                  savedMatchupsService.deleteMatchup(savedMatchupId, groupId)
                  setSavedMatchupId(null)
                }
                setTeam1Swapped(false)
                setTeam2Swapped(false)
                setStep('selection')
              }}
              className="flex items-center justify-center gap-2 px-4 py-2 border border-[var(--th-border)] text-primary hover:bg-card-hover rounded-[var(--th-radius-md)] transition-colors"
            >
              <Shuffle size={16} />
              Regenerate
            </button>
          </div>
        </div>
      </ModalOrBottomDrawer>
    )
  }

  // Mode selection step
  if (step === 'mode') {
    return (
      <ModalOrBottomDrawer onClose={onClose} className="sm:max-w-md">
        <div className="bg-card w-full shadow-2xl border border-[var(--th-border)] flex flex-col">
          <div
            className="px-6 flex-shrink-0"
            style={{ paddingTop: 'calc(1.5rem + env(safe-area-inset-top))' }}
          >
            <div className="flex justify-between items-center mb-8">
              <button
                type="button"
                onClick={onBack}
                className="flex items-center gap-2 text-secondary hover:text-primary transition-colors"
              >
                <ArrowLeft size={20} />
                <span>Back</span>
              </button>
              <h2 className="text-lg font-bold text-primary">Pick Teams Smartly</h2>
              <button
                type="button"
                onClick={onClose}
                className="text-muted hover:text-secondary p-1 rounded-full hover:bg-card-hover"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center px-6 gap-4">
            <button
              type="button"
              onClick={() => {
                setMatchmakingMode('rare')
                setStep('selection')
              }}
              className="w-full text-left p-5 rounded-[var(--th-radius-lg)] border-2 border-[var(--th-border)] bg-card-hover hover:border-[var(--th-accent)] hover:bg-card transition-colors"
            >
              <div className="flex items-center gap-3 mb-2">
                <Sparkles size={22} className="text-[var(--th-accent)]" />
                <span className="text-base font-semibold text-primary">Rare Matchup</span>
              </div>
              <p className="text-sm text-secondary pl-9">
                Pairs players who rarely team up together
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                setMatchmakingMode('balanced')
                setStep('selection')
              }}
              className="w-full text-left p-5 rounded-[var(--th-radius-lg)] border-2 border-[var(--th-border)] bg-card-hover hover:border-[var(--th-sport-primary)] hover:bg-card transition-colors"
            >
              <div className="flex items-center gap-3 mb-2">
                <Brain size={22} className="text-[var(--th-sport-primary)]" />
                <span className="text-base font-semibold text-primary">Balanced</span>
              </div>
              <p className="text-sm text-secondary pl-9">
                Creates evenly matched teams based on rankings
              </p>
            </button>
          </div>

          <div
            className="flex-shrink-0 px-6 pt-4"
            style={{ paddingBottom: 'calc(2.5rem + env(safe-area-inset-bottom))' }}
          />
        </div>
      </ModalOrBottomDrawer>
    )
  }

  // Player selection step
  return (
    <ModalOrBottomDrawer onClose={onClose} className="sm:max-w-md" fullHeight>
      <div className="bg-card w-full shadow-2xl border border-[var(--th-border)] flex flex-col h-full">
        <div
          className="px-6 flex-shrink-0"
          style={{ paddingTop: 'calc(1.5rem + env(safe-area-inset-top))' }}
        >
          <div className="flex justify-between items-center mb-6">
            <button
              type="button"
              onClick={() => setStep('mode')}
              className="flex items-center gap-2 text-secondary hover:text-primary transition-colors"
            >
              <ArrowLeft size={20} />
              <span>Back</span>
            </button>
            <h2 className="text-lg font-bold text-primary">Pick Teams Smartly</h2>
            <button
              type="button"
              onClick={onClose}
              className="text-muted hover:text-secondary p-1 rounded-full hover:bg-card-hover"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="text-muted" size={16} />
              <span className="font-medium text-primary">
                Player Pool ({selectedPlayerPool.length})
              </span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={selectAllPlayers}
                disabled={selectedPlayerPool.length === players.length}
                className="text-xs text-[var(--th-sport-primary)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={clearAllPlayers}
                disabled={selectedPlayerPool.length === 0}
                className="text-xs text-secondary hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Clear All
              </button>
            </div>
          </div>

          <div className="relative mb-3">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
            <input
              type="search"
              placeholder="Search players…"
              value={playerSearch}
              onChange={(e) => setPlayerSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-[var(--th-radius-md)] bg-card-hover border border-[var(--th-border)] text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-[var(--th-sport-primary)] focus:border-transparent"
            />
          </div>
        </div>

        {/* Scrollable Player List */}
        <div className="flex-1 overflow-y-auto min-h-0 px-6">
          <div className="space-y-2 pb-2">
            {players
              .slice()
              .toSorted((a, b) => a.name.localeCompare(b.name))
              .filter((p) => p.name.toLowerCase().includes(playerSearch.toLowerCase()))
              .map((player) => (
                <label
                  key={player.id}
                  className="flex items-center gap-3 p-3 rounded-[var(--th-radius-md)] bg-card-hover hover:bg-card-hover cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedPlayerPool.includes(player.id)}
                    onChange={() => handlePlayerPoolToggle(player.id)}
                    disabled={false}
                    className="rounded border-[var(--th-border)] text-[var(--th-sport-primary)] focus:ring-[var(--th-sport-primary)] disabled:opacity-50"
                  />
                  <span className="text-lg">{player.avatar}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-primary truncate">{player.name}</div>
                    <div className="text-sm text-muted">{player.ranking} pts</div>
                  </div>
                </label>
              ))}
          </div>
        </div>

        {/* Sticky Footer */}
        <div
          className="flex-shrink-0 px-6 pt-4 border-t border-[var(--th-border)] bg-card"
          style={{ paddingBottom: 'calc(2.5rem + env(safe-area-inset-bottom))' }}
        >
          {selectedPlayerPool.length < 4 && (
            <p className="text-sm text-[var(--th-loss)] text-center mb-3">
              Select 4 or more players to generate teams
            </p>
          )}
          <button
            type="button"
            onClick={handleGenerateMatchup}
            disabled={isGenerating || selectedPlayerPool.length < 4}
            className="w-full bg-[var(--th-sport-primary)] hover:opacity-90 text-white py-3 px-4 rounded-[var(--th-radius-lg)] font-semibold shadow-theme-card transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                Generating...
              </>
            ) : (
              <>
                <Shuffle size={16} />
                {matchmakingMode === 'balanced'
                  ? 'Generate Balanced Teams'
                  : 'Generate Rare Matchup'}
              </>
            )}
          </button>
        </div>
      </div>
    </ModalOrBottomDrawer>
  )
}
