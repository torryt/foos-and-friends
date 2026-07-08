import type { Player } from '@foos/shared'
import { cn } from '@foos/shared'
import { ChartLine, ChevronDown, ChevronUp, UserPlus, Users, X } from 'lucide-react'
import { useState } from 'react'
import { PlayerComparisonChart } from '@/components/charts/PlayerComparisonChart'
import { RankingChart, type SeasonMarker } from '@/components/charts/RankingChart'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useSeasonContext } from '@/contexts/SeasonContext'
import type { PlayerRankingHistory } from '@/hooks/useRankingHistory'

interface PlayerRankingVisualizationProps {
  mainPlayerHistory: PlayerRankingHistory[]
  comparisonHistories: PlayerRankingHistory[]
  // Continuous all-time chains (no 1200 reset at season boundaries), matching
  // the all-time rating in the profile header
  continuousMainHistory: PlayerRankingHistory[]
  continuousComparisonHistories: PlayerRankingHistory[]
  players: Player[]
  playerId: string
}

type ChartScope = 'season' | 'alltime'

// Restrict a stored (per-season resetting) history to a single season's chain
function sliceHistoryToSeason(
  history: PlayerRankingHistory,
  seasonId: string | undefined,
): PlayerRankingHistory {
  const data = history.data
    .filter((point) => point.seasonId === seasonId)
    .map((point, index) => ({ ...point, matchNumber: index + 1 }))
  const rankings = data.map((point) => point.ranking)
  const currentRanking = rankings.at(-1) ?? 1200
  return {
    ...history,
    data,
    initialRanking: data[0]?.ranking ?? 1200,
    currentRanking,
    highestRanking: rankings.length > 0 ? Math.max(...rankings) : currentRanking,
    lowestRanking: rankings.length > 0 ? Math.min(...rankings) : currentRanking,
  }
}

export function PlayerRankingVisualization({
  mainPlayerHistory,
  comparisonHistories,
  continuousMainHistory,
  continuousComparisonHistories,
  players,
  playerId,
}: PlayerRankingVisualizationProps) {
  const [showRankingChart, setShowRankingChart] = useState(true)
  const [showComparison, setShowComparison] = useState(false)
  const [comparePlayerIds, setComparePlayerIds] = useState<string[]>([])
  const [showPlayerSelector, setShowPlayerSelector] = useState(false)
  const [chartScope, setChartScope] = useState<ChartScope>('alltime')
  const { seasons, currentSeason } = useSeasonContext()

  const seasonScope = chartScope === 'season'
  const displayMainHistory = seasonScope
    ? mainPlayerHistory[0] && sliceHistoryToSeason(mainPlayerHistory[0], currentSeason?.id)
    : continuousMainHistory[0]
  const displayComparisonHistories = seasonScope
    ? comparisonHistories.map((h) => sliceHistoryToSeason(h, currentSeason?.id))
    : continuousComparisonHistories

  // Season markers/finals describe the stored (resetting) chain
  const history = mainPlayerHistory[0]

  // Where each new season starts within the (all-time, chronological) history,
  // plus the final ELO the player reached in each season they played.
  const seasonNameById = new Map(seasons.map((s) => [s.id, s.name]))
  const seasonMarkers: SeasonMarker[] = []
  const seasonFinals: { seasonId: string; name: string; ranking: number; live: boolean }[] = []
  for (const point of history?.data ?? []) {
    if (!point.seasonId) continue
    const last = seasonFinals[seasonFinals.length - 1]
    if (last?.seasonId === point.seasonId) {
      last.ranking = point.ranking
    } else {
      seasonFinals.push({
        seasonId: point.seasonId,
        name: seasonNameById.get(point.seasonId) ?? 'Season',
        ranking: point.ranking,
        live: seasons.find((s) => s.id === point.seasonId)?.isActive ?? false,
      })
      if (last) {
        seasonMarkers.push({
          matchNumber: point.matchNumber,
          label: seasonFinals.at(-1)?.name ?? '',
        })
      }
    }
  }

  const handleToggleComparison = () => {
    if (!showComparison) {
      // When enabling comparison, add 1-2 default players
      const topPlayers = players
        .filter((p) => p.id !== playerId && p.matchesPlayed > 0)
        .toSorted((a, b) => b.ranking - a.ranking)
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
            <ChartLine className="w-5 h-5 text-orange-500" />
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
            {/* Scope toggle: continuous all-time chain vs selected season's chain */}
            <div className="flex rounded-lg bg-gray-100 p-1 w-fit">
              {(
                [
                  ['alltime', 'All-time'],
                  ['season', currentSeason?.name ?? 'Season'],
                ] as [ChartScope, string][]
              ).map(([scope, label]) => (
                <button
                  key={scope}
                  type="button"
                  onClick={() => setChartScope(scope)}
                  className={cn(
                    'px-4 min-h-11 text-sm font-medium rounded-md transition-colors',
                    chartScope === scope
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-900',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

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
                            .toSorted((a, b) => b.ranking - a.ranking)
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
                  histories={displayComparisonHistories.filter(
                    (h) => h.playerId === playerId || comparePlayerIds.includes(h.playerId),
                  )}
                  height={300}
                  showLegend={false}
                />
              </div>
            ) : displayMainHistory && displayMainHistory.data.length > 0 ? (
              /* Single player chart */
              <>
                <RankingChart
                  history={displayMainHistory}
                  height={250}
                  seasonMarkers={seasonScope ? [] : seasonMarkers}
                />
                {!seasonScope && seasonFinals.length > 1 && (
                  <div className="flex gap-2 mt-3 overflow-x-auto">
                    {seasonFinals.map((final) => (
                      <div
                        key={final.seasonId}
                        className="flex-1 min-w-20 text-center p-2 bg-card-hover rounded-lg"
                      >
                        <p className="text-[10px] font-semibold text-muted uppercase tracking-wide truncate">
                          {final.name}
                          {final.live ? ' · now' : ' · final'}
                        </p>
                        <p
                          className={`text-sm font-semibold ${
                            final.live ? 'text-[var(--th-sport-primary)]' : 'text-primary'
                          }`}
                        >
                          {final.ranking}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">
                No matches in {currentSeason?.name ?? 'this season'}
              </p>
            )}

            {/* Chart statistics */}
            {displayMainHistory && displayMainHistory.data.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                <div className="text-center p-2 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Highest</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {displayMainHistory.highestRanking}
                  </p>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Lowest</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {displayMainHistory.lowestRanking}
                  </p>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Current</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {displayMainHistory.currentRanking}
                  </p>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Change</p>
                  <p
                    className={cn(
                      'text-sm font-semibold',
                      displayMainHistory.currentRanking - displayMainHistory.initialRanking > 0
                        ? 'text-green-600'
                        : displayMainHistory.currentRanking - displayMainHistory.initialRanking < 0
                          ? 'text-red-600'
                          : 'text-gray-900',
                    )}
                  >
                    {displayMainHistory.currentRanking - displayMainHistory.initialRanking > 0
                      ? '+'
                      : ''}
                    {displayMainHistory.currentRanking - displayMainHistory.initialRanking}
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
