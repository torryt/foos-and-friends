import { Link } from '@tanstack/react-router'
import { Calendar, Shield, Sword } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { WinLossBadge } from '@/components/ui/WinLossBadge'
import { cn, scrollToTop } from '@/lib/utils'
import type { Match, Player } from '@/types'

interface PlayerRecentMatchesProps {
  playerId: string
  players: Player[]
  matches: Match[]
  recentForm: string[]
}

export function PlayerRecentMatches({
  playerId,
  players,
  matches,
  recentForm,
}: PlayerRecentMatchesProps) {
  // Get recent matches for the player
  const playerMatches = matches
    .filter((match) => {
      return (
        match.team1[0].id === playerId ||
        match.team1[1].id === playerId ||
        match.team2[0].id === playerId ||
        match.team2[1].id === playerId
      )
    })
    .sort((a, b) => {
      // Sort by createdAt in ascending order (oldest first)
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return timeA - timeB
    })

  const getPlayerPosition = (match: Match, playerId: string) => {
    // For now, determine position based on player index
    // Team1[0] and Team2[0] are attackers, Team1[1] and Team2[1] are defenders
    if (match.team1[0].id === playerId || match.team2[0].id === playerId) return 'attacker'
    if (match.team1[1].id === playerId || match.team2[1].id === playerId) return 'defender'
    return 'attacker'
  }

  const getTeammate = (match: Match, playerId: string) => {
    if (match.team1[0].id === playerId) {
      const teammateId = match.team1[1].id
      return players.find((p) => p.id === teammateId)
    }
    if (match.team1[1].id === playerId) {
      const teammateId = match.team1[0].id
      return players.find((p) => p.id === teammateId)
    }
    if (match.team2[0].id === playerId) {
      const teammateId = match.team2[1].id
      return players.find((p) => p.id === teammateId)
    }
    if (match.team2[1].id === playerId) {
      const teammateId = match.team2[0].id
      return players.find((p) => p.id === teammateId)
    }
    return null
  }

  const getOpponents = (match: Match, playerId: string) => {
    const wasInTeam1 = match.team1[0].id === playerId || match.team1[1].id === playerId
    const opponentTeam = wasInTeam1 ? match.team2 : match.team1
    return opponentTeam.map((p) => players.find((player) => player.id === p.id)).filter(Boolean)
  }

  const didWin = (match: Match, playerId: string) => {
    const wasInTeam1 = match.team1[0].id === playerId || match.team1[1].id === playerId
    return wasInTeam1 ? match.score1 > match.score2 : match.score2 > match.score1
  }

  return (
    <Card className="p-4 bg-white/80 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-orange-500" />
          Recent Matches
        </h3>
        {recentForm.length > 0 && (
          <div className="flex gap-1">
            {recentForm.map((result, index) => (
              <WinLossBadge
                key={`form-${recentForm.length - index}`}
                result={result as 'W' | 'L'}
                size="md"
              />
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2 overflow-y-auto">
        {playerMatches.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">No matches played yet</p>
        ) : (
          playerMatches.map((match) => {
            const won = didWin(match, playerId)
            const position = getPlayerPosition(match, playerId)
            const teammate = getTeammate(match, playerId)
            const opponents = getOpponents(match, playerId)
            // const wasInTeam1 = match.team1[0].id === playerId || match.team1[1].id === playerId
            const score = `${match.score1}-${match.score2}`

            return (
              <div
                key={match.id}
                className={cn(
                  'p-3 rounded-lg border-l-4 bg-gray-50',
                  won ? 'border-l-green-600' : 'border-l-red-400',
                )}
              >
                {/* Mobile-first layout: score on top, centered */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                  {/* Score - on top for mobile, right side for desktop */}
                  <div className="text-center sm:hidden">
                    <div className="text-xl font-bold text-gray-900">{score}</div>
                  </div>

                  {/* Main content - centered on mobile */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 text-center sm:text-left flex-1">
                    <div className="flex items-center justify-center sm:justify-start gap-3">
                      <WinLossBadge result={won ? 'W' : 'L'} size="md" className="flex-shrink-0" />
                    </div>

                    <div className="min-w-0 flex-1">
                      {/* Main match info */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                        <div className="flex items-center justify-center sm:justify-start gap-2">
                          {position === 'attacker' ? (
                            <Sword className="w-4 h-4 text-orange-500 flex-shrink-0" />
                          ) : (
                            <Shield className="w-4 h-4 text-blue-500 flex-shrink-0" />
                          )}
                          <span className="text-sm font-medium text-gray-900">
                            with{' '}
                            {teammate ? (
                              <Link
                                to="/players/$playerId"
                                params={{ playerId: teammate.id }}
                                className="text-orange-600 hover:text-orange-700 hover:underline transition-colors"
                                onClick={() => scrollToTop()}
                              >
                                {teammate.name}
                              </Link>
                            ) : (
                              'Unknown'
                            )}
                          </span>
                        </div>
                        <div className="flex items-center justify-center sm:justify-start gap-1">
                          <span className="text-xs text-gray-500">vs</span>
                          <div className="flex items-center gap-1">
                            {opponents.map((opponent, idx) => (
                              <span key={opponent?.id} className="text-xs">
                                {opponent ? (
                                  <Link
                                    to="/players/$playerId"
                                    params={{ playerId: opponent.id }}
                                    className="text-orange-600 hover:text-orange-700 hover:underline transition-colors"
                                    onClick={() => scrollToTop()}
                                  >
                                    {opponent.name}
                                  </Link>
                                ) : (
                                  <span className="text-gray-600">Unknown</span>
                                )}
                                {idx < opponents.length - 1 && (
                                  <span className="text-gray-600">, </span>
                                )}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      {/* Date */}
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(match.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Score - hidden on mobile, shown on desktop */}
                  <div className="hidden sm:block text-right">
                    <div className="text-lg font-bold text-gray-900">{score}</div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </Card>
  )
}
