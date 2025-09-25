import { Link } from '@tanstack/react-router'
import { ChevronDown, Crown, Shield, TrendingDown, TrendingUp, Users } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { type RelationshipStats, useRelationshipStats } from '@/hooks/useRelationshipStats'
import { cn, scrollToTop } from '@/lib/utils'
import type { Match, Player } from '@/types'

interface PlayerRelationshipStatsProps {
  playerId: string
  players: Player[]
  matches: Match[]
}

interface RelationshipCardProps {
  relationship: RelationshipStats
  badge?: 'best' | 'worst' | 'rival' | 'easy' | null
  rank?: number
}

function RelationshipCard({ relationship, badge, rank }: RelationshipCardProps) {
  const getBadgeInfo = (badge: string | null) => {
    switch (badge) {
      case 'best':
        return { icon: Crown, text: 'Best Partner', color: 'text-yellow-600 bg-yellow-100' }
      case 'worst':
        return { icon: TrendingDown, text: 'Needs Work', color: 'text-red-600 bg-red-100' }
      case 'rival':
        return { icon: Shield, text: 'Biggest Rival', color: 'text-purple-600 bg-purple-100' }
      case 'easy':
        return { icon: TrendingUp, text: 'Favorite Opponent', color: 'text-green-600 bg-green-100' }
      default:
        return null
    }
  }

  const badgeInfo = getBadgeInfo(badge || null)
  const winRateColor =
    relationship.winRate >= 70
      ? 'text-green-700 bg-green-50'
      : relationship.winRate >= 50
        ? 'text-blue-700 bg-blue-50'
        : relationship.winRate >= 30
          ? 'text-orange-700 bg-orange-50'
          : 'text-red-700 bg-red-50'

  return (
    <div className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
      <div className="flex items-start gap-3">
        {rank && (
          <div className="w-6 h-6 flex-shrink-0 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
            {rank}
          </div>
        )}
        <span className="text-2xl flex-shrink-0">{relationship.playerAvatar}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Link
                  to="/players/$playerId"
                  params={{ playerId: relationship.playerId }}
                  onClick={scrollToTop}
                  className="font-medium text-gray-900 truncate hover:text-orange-600 transition-colors"
                >
                  {relationship.playerName}
                </Link>
                {badgeInfo && (
                  <div
                    className={cn(
                      'px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 flex-shrink-0',
                      badgeInfo.color,
                    )}
                  >
                    <badgeInfo.icon className="w-3 h-3" />
                    <span>{badgeInfo.text}</span>
                  </div>
                )}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="flex-shrink-0">{relationship.gamesPlayed} games</span>
                  <span className="flex-shrink-0">
                    {relationship.wins}W-{relationship.losses}L
                  </span>
                  {relationship.goalDifference !== 0 && (
                    <span
                      className={cn(
                        'flex-shrink-0',
                        relationship.goalDifference > 0 ? 'text-green-600' : 'text-red-600',
                      )}
                    >
                      {relationship.goalDifference > 0 ? '+' : ''}
                      {relationship.goalDifference}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right side: Form and Win Rate */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Recent form - hide on very small screens */}
              {relationship.recentForm.length > 0 && (
                <div className="hidden sm:flex gap-1">
                  {relationship.recentForm.map((result, index) => (
                    <span
                      key={`${relationship.playerId}-form-${index}`}
                      className={cn(
                        'w-4 h-4 sm:w-5 sm:h-5 rounded-full text-xs font-bold flex items-center justify-center text-white',
                        result === 'W' ? 'bg-green-400' : 'bg-red-400',
                      )}
                    >
                      {result}
                    </span>
                  ))}
                </div>
              )}

              {/* Win rate */}
              <div
                className={cn(
                  'px-2 py-1 sm:px-3 rounded-full text-sm font-bold flex-shrink-0',
                  winRateColor,
                )}
              >
                {relationship.winRate}%
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function PlayerRelationshipStats({
  playerId,
  players,
  matches,
}: PlayerRelationshipStatsProps) {
  const [activeTab, setActiveTab] = useState<'teammates' | 'opponents'>('teammates')
  const [showAllTeammates, setShowAllTeammates] = useState(false)
  const [showAllOpponents, setShowAllOpponents] = useState(false)

  const relationshipData = useRelationshipStats(playerId, matches, players)

  if (relationshipData.teammates.length === 0 && relationshipData.opponents.length === 0) {
    return (
      <Card className="p-4 bg-white/80 backdrop-blur-sm">
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No match history available</p>
          </div>
        </div>
      </Card>
    )
  }

  const displayedTeammates = showAllTeammates
    ? relationshipData.teammates
    : relationshipData.teammates.slice(0, 5)

  const displayedOpponents = showAllOpponents
    ? relationshipData.opponents
    : relationshipData.opponents.slice(0, 5)

  return (
    <Card className="p-4 bg-white/80 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Users className="w-5 h-5 text-orange-500" />
          Relationships
        </h3>

        {/* Tab switcher */}
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            type="button"
            onClick={() => setActiveTab('teammates')}
            className={cn(
              'px-3 py-1 rounded-md text-sm font-medium transition-colors',
              activeTab === 'teammates'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700',
            )}
          >
            Teammates ({relationshipData.teammates.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('opponents')}
            className={cn(
              'px-3 py-1 rounded-md text-sm font-medium transition-colors',
              activeTab === 'opponents'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700',
            )}
          >
            Opponents ({relationshipData.opponents.length})
          </button>
        </div>
      </div>

      {/* Teammates Tab */}
      {activeTab === 'teammates' && (
        <div className="space-y-3">
          {displayedTeammates.map((teammate, index) => {
            let badge: 'best' | 'worst' | null = null
            if (
              relationshipData.topTeammate &&
              teammate.playerId === relationshipData.topTeammate.playerId
            ) {
              badge = 'best'
            } else if (
              relationshipData.worstTeammate &&
              teammate.playerId === relationshipData.worstTeammate.playerId
            ) {
              badge = 'worst'
            }

            return (
              <RelationshipCard
                key={teammate.playerId}
                relationship={teammate}
                badge={badge}
                rank={index + 1}
              />
            )
          })}

          {relationshipData.teammates.length > 5 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAllTeammates(!showAllTeammates)}
              className="w-full"
            >
              {showAllTeammates ? (
                <>
                  Show Less
                  <ChevronDown className="w-4 h-4 ml-1 rotate-180" />
                </>
              ) : (
                <>
                  Show All {relationshipData.teammates.length} Teammates
                  <ChevronDown className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
          )}
        </div>
      )}

      {/* Opponents Tab */}
      {activeTab === 'opponents' && (
        <div className="space-y-3">
          {displayedOpponents.map((opponent, index) => {
            let badge: 'rival' | 'easy' | null = null
            if (
              relationshipData.biggestRival &&
              opponent.playerId === relationshipData.biggestRival.playerId
            ) {
              badge = 'rival'
            } else if (
              relationshipData.easiestOpponent &&
              opponent.playerId === relationshipData.easiestOpponent.playerId
            ) {
              badge = 'easy'
            }

            return (
              <RelationshipCard
                key={opponent.playerId}
                relationship={opponent}
                badge={badge}
                rank={index + 1}
              />
            )
          })}

          {relationshipData.opponents.length > 5 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAllOpponents(!showAllOpponents)}
              className="w-full"
            >
              {showAllOpponents ? (
                <>
                  Show Less
                  <ChevronDown className="w-4 h-4 ml-1 rotate-180" />
                </>
              ) : (
                <>
                  Show All {relationshipData.opponents.length} Opponents
                  <ChevronDown className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
          )}
        </div>
      )}

      {/* Summary stats at bottom */}
      {(relationshipData.topTeammate || relationshipData.biggestRival) && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="space-y-2 sm:grid sm:grid-cols-2 sm:gap-3 sm:space-y-0 text-sm">
            {relationshipData.topTeammate && (
              <div className="flex items-center gap-2 text-green-600">
                <Crown className="w-4 h-4 flex-shrink-0" />
                <span className="min-w-0">
                  <span className="hidden sm:inline">Best with </span>
                  <strong className="truncate">{relationshipData.topTeammate.playerName}</strong>
                  <span className="hidden sm:inline">
                    : {relationshipData.topTeammate.winRate}% win rate
                  </span>
                  <span className="sm:hidden">: {relationshipData.topTeammate.winRate}%</span>
                </span>
              </div>
            )}
            {relationshipData.biggestRival && (
              <div className="flex items-center gap-2 text-purple-600">
                <Shield className="w-4 h-4 flex-shrink-0" />
                <span className="min-w-0">
                  <span className="hidden sm:inline">Most played vs </span>
                  <strong className="truncate">{relationshipData.biggestRival.playerName}</strong>
                  <span className="hidden sm:inline">
                    : {relationshipData.biggestRival.gamesPlayed} games
                  </span>
                  <span className="sm:hidden">: {relationshipData.biggestRival.gamesPlayed}</span>
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}
