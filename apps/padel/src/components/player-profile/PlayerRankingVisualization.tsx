import type { Player } from '@foos/shared'
import { cn } from '@foos/shared'
import { ChartLine, ChevronDown, ChevronUp, UserPlus, Users, X } from 'lucide-react'
import { useState } from 'react'
import { PlayerComparisonChart } from '@/components/charts/PlayerComparisonChart'
import { RankingChart } from '@/components/charts/RankingChart'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import type { PlayerRankingHistory } from '@/hooks/useRankingHistory'

interface PlayerRankingVisualizationProps {
  mainPlayerHistory: PlayerRankingHistory[]
  comparisonHistories: PlayerRankingHistory[]
  players: Player[]
  playerId: string
}

export function PlayerRankingVisualization({
  mainPlayerHistory,
  comparisonHistories,
  players,
  playerId,
}: PlayerRankingVisualizationProps) {
  const [showRankingChart, setShowRankingChart] = useState(true)
  const [showComparison, setShowComparison] = useState(false)
  const [comparePlayerIds, setComparePlayerIds] = useState<string[]>([])
  const [showPlayerSelector, setShowPlayerSelector] = useState(false)

  const handleToggleComparison = () => {
    if (!showComparison) {
      // When enabling comparison, add 1-2 default players
      const topPlayers = players
        .filter((p) => p.id !== playerId && p.matchesPlayed > 0)
        .sort((a, b) => b.ranking - a.ranking)
        .slice(0, 2)
        .map((p) => p.id)
      setComparePlayerIds(topPlayers)
    }
    setShowComparison(!showComparison)
  }

  const handleAddComparePlayer = (playerId: string) => {
    if (!comparePlayerIds.includes(playerId) && comparePlayerIds.length < 5) {
      setComparePlayerIds([...comparePlayerIds, playerId])
    }
    setShowPlayerSelector(false)
  }

  const handleRemoveComparePlayer = (playerId: string) => {
    setComparePlayerIds(comparePlayerIds.filter((id) => id !== playerId))
  }

  if (!mainPlayerHistory[0]) return null

  return (
    <Card className="p-4 bg-white/80 backdrop-blur-sm">
      <div className="space-y-4">
        {/* Header with toggle buttons */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowRankingChart(!showRankingChart)}
            className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors"
          >
            <ChartLine className="w-5 h-5 text-blue-500" />
            <h3 className="font-semibold">Ranking History</h3>
            {showRankingChart ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {showRankingChart && (
            <Button
              onClick={handleToggleComparison}
              variant={showComparison ? 'default' : 'outline'}
              size="sm"
              className="whitespace-normal"
            >
              <Users className="w-4 h-4 mr-1" />
              {showComparison ? 'Hide' : 'Compare'}
            </Button>
          )}
        </div>

        {/* Chart Content */}
        {showRankingChart && (
          <>
            {showComparison ? (
              <div>
                {/* Player selector for comparison */}
                <div className="flex flex-wrap gap-2">
                  {comparePlayerIds.map((id) => {
                    const comparePlayer = players.find((p) => p.id === id)
                    if (!comparePlayer) return null
                    return (
                      <div
                        key={id}
                        className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-lg"
                      >
                        <span className="text-sm">{comparePlayer.avatar}</span>
                        <span className="text-xs text-gray-600">{comparePlayer.name}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveComparePlayer(id)}
                          className="ml-1 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )
                  })}
                  {comparePlayerIds.length < 5 && (
                    <div className="relative">
                      <Button
                        onClick={() => setShowPlayerSelector(!showPlayerSelector)}
                        variant="outline"
                        size="sm"
                      >
                        <UserPlus className="w-4 h-4 mr-1" />
                        Add Player
                      </Button>

                      {showPlayerSelector && (
                        <div className="absolute top-full mt-1 left-0 z-50 w-48 bg-white rounded-lg shadow-lg border border-gray-200 max-h-64 overflow-y-auto">
                          {players
                            .filter(
                              (p) =>
                                p.id !== playerId &&
                                !comparePlayerIds.includes(p.id) &&
                                p.matchesPlayed > 0,
                            )
                            .sort((a, b) => b.ranking - a.ranking)
                            .map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => handleAddComparePlayer(p.id)}
                                className="w-full px-3 py-2 flex items-center gap-2 hover:bg-gray-50 transition-colors text-left"
                              >
                                <span className="text-sm">{p.avatar}</span>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm text-gray-900 truncate">{p.name}</div>
                                  <div className="text-xs text-gray-500">{p.ranking} pts</div>
                                </div>
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Comparison chart */}
                <PlayerComparisonChart
                  histories={comparisonHistories.filter(
                    (h) => h.playerId === playerId || comparePlayerIds.includes(h.playerId),
                  )}
                  height={300}
                  showLegend={false}
                />
              </div>
            ) : (
              /* Single player chart */
              <RankingChart history={mainPlayerHistory[0]} height={250} />
            )}

            {/* Chart statistics */}
            {mainPlayerHistory[0].data.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                <div className="text-center p-2 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Highest</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {mainPlayerHistory[0].highestRanking}
                  </p>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Lowest</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {mainPlayerHistory[0].lowestRanking}
                  </p>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Current</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {mainPlayerHistory[0].currentRanking}
                  </p>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Change</p>
                  <p
                    className={cn(
                      'text-sm font-semibold',
                      mainPlayerHistory[0].currentRanking - mainPlayerHistory[0].initialRanking > 0
                        ? 'text-green-600'
                        : mainPlayerHistory[0].currentRanking -
                              mainPlayerHistory[0].initialRanking <
                            0
                          ? 'text-red-600'
                          : 'text-gray-900',
                    )}
                  >
                    {mainPlayerHistory[0].currentRanking - mainPlayerHistory[0].initialRanking > 0
                      ? '+'
                      : ''}
                    {mainPlayerHistory[0].currentRanking - mainPlayerHistory[0].initialRanking}
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  )
}
