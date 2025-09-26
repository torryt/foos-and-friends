import React from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { PlayerRankingHistory } from '@/hooks/useRankingHistory'
import { cn } from '@/lib/utils'

interface PlayerComparisonChartProps {
  histories: PlayerRankingHistory[]
  height?: number
  className?: string
  showLegend?: boolean
}

const CHART_COLORS = [
  '#fb923c', // orange-400
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#8b5cf6', // violet-500
  '#ef4444', // red-500
  '#14b8a6', // teal-500
]

interface ChartDataPoint {
  matchNumber: number
  [playerId: string]: number
}

export function PlayerComparisonChart({
  histories,
  height = 300,
  className,
  showLegend = true,
}: PlayerComparisonChartProps) {
  const [isMobile, setIsMobile] = React.useState(false)
  const scrollRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Find the maximum number of matches among all players
  const maxMatches =
    histories && histories.length > 0 ? Math.max(...histories.map((h) => h.data.length)) : 0

  // Create unified chart data
  const chartData =
    histories && histories.length > 0
      ? Array.from({ length: maxMatches + 1 }, (_, index) => {
          const dataPoint: ChartDataPoint = {
            matchNumber: index,
          }

          histories.forEach((history) => {
            if (index === 0) {
              // Starting point
              dataPoint[history.playerId] = history.initialRanking
            } else if (index - 1 < history.data.length) {
              // Player has data for this match
              dataPoint[history.playerId] = history.data[index - 1].ranking
            } else {
              // Player hasn't played this many matches, use their last known ranking
              dataPoint[history.playerId] =
                history.data[history.data.length - 1]?.ranking || history.currentRanking
            }
          })

          return dataPoint
        })
      : []

  // On mobile with > 10 matches, enable horizontal scrolling
  const MOBILE_VISIBLE_POINTS = 10
  const needsScroll = isMobile && chartData.length > MOBILE_VISIBLE_POINTS

  // Calculate chart width for scrolling on mobile
  // Each point needs ~60px width to be clearly visible
  const POINT_WIDTH = 60
  const chartWidth = needsScroll
    ? Math.max(chartData.length * POINT_WIDTH, 600) // Minimum 600px width
    : '100%'

  // Scroll to the right (most recent) on mount when scrolling is needed
  React.useEffect(() => {
    if (needsScroll && scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth - scrollRef.current.clientWidth
    }
  }, [needsScroll])

  if (!histories || histories.length === 0) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200',
          className,
        )}
        style={{ height }}
      >
        <p className="text-sm text-gray-500">Select players to compare</p>
      </div>
    )
  }

  // Custom tooltip component
  // biome-ignore lint/suspicious/noExplicitAny: Recharts requires any for custom components
  const renderCustomTooltip = (props: any) => {
    const { active, payload, label } = props
    if (active && payload && payload.length > 0) {
      return (
        <div className="bg-white p-3 rounded shadow-lg border border-gray-200">
          <p className="text-xs font-medium text-gray-900 mb-2">
            {label === 0 ? 'Starting Rankings' : `After Match #${label}`}
          </p>
          {payload.map(
            (entry: { dataKey: string; color: string; value: number }, _index: number) => {
              const history = histories.find((h) => h.playerId === entry.dataKey)
              if (!history) return null

              return (
                <div key={entry.dataKey} className="flex items-center gap-2 mb-1">
                  <span className="text-sm">{history.playerAvatar}</span>
                  <span className="text-xs text-gray-600">{history.playerName}:</span>
                  <span className="text-sm font-bold" style={{ color: entry.color }}>
                    {entry.value} pts
                  </span>
                </div>
              )
            },
          )}
        </div>
      )
    }
    return null
  }

  // Custom legend component
  // biome-ignore lint/suspicious/noExplicitAny: Recharts requires any for custom components
  const renderCustomLegend = (props: any) => {
    const { payload } = props
    if (!payload) return null
    return (
      <div className="flex flex-wrap justify-center gap-3 mt-4">
        {payload.map((entry: { dataKey: string; color: string }, _index: number) => {
          const history = histories.find((h) => h.playerId === entry.dataKey)
          if (!history) return null

          return (
            <div key={entry.dataKey} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-sm">{history.playerAvatar}</span>
              <span className="text-xs text-gray-600">{history.playerName}</span>
            </div>
          )
        })}
      </div>
    )
  }

  // Calculate Y-axis domain with padding
  const allRankings = chartData.flatMap((d) =>
    histories.map((h) => d[h.playerId]).filter((v) => v != null),
  )
  const minRanking = Math.min(...allRankings)
  const maxRanking = Math.max(...allRankings)
  const padding = Math.max(50, (maxRanking - minRanking) * 0.1)
  const yDomain = [Math.max(800, minRanking - padding), Math.min(2400, maxRanking + padding)]

  const containerClass = needsScroll
    ? 'overflow-x-auto overflow-y-hidden scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 -webkit-overflow-scrolling-touch'
    : ''

  return (
    <div className={cn('bg-white rounded-lg p-4', className)}>
      {/* Legend stays outside scrollable area */}
      {showLegend && (
        <div className="mb-4">
          {renderCustomLegend({
            payload: histories.map((history, index) => ({
              dataKey: history.playerId,
              color: CHART_COLORS[index % CHART_COLORS.length],
            })),
          })}
        </div>
      )}

      <div
        ref={scrollRef}
        className={cn(containerClass)}
        style={
          needsScroll ? { WebkitOverflowScrolling: 'touch', overscrollBehaviorX: 'contain' } : {}
        }
      >
        <div
          style={{
            width: typeof chartWidth === 'number' ? `${chartWidth}px` : chartWidth,
            minWidth: '100%',
          }}
        >
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis
                dataKey="matchNumber"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: '#e5e7eb' }}
                tickFormatter={(value) => (value === 0 ? 'Start' : `#${value}`)}
              />
              <YAxis domain={yDomain} tick={false} tickLine={false} axisLine={false} width={0} />
              <Tooltip content={renderCustomTooltip} />
              {/* Remove Legend from inside chart since it's now outside */}
              {histories.map((history, index) => (
                <Line
                  key={history.playerId}
                  type="monotone"
                  dataKey={history.playerId}
                  stroke={CHART_COLORS[index % CHART_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3, strokeWidth: 1, fill: '#fff' }}
                  activeDot={{ r: 5 }}
                  name={history.playerName}
                  animationDuration={500}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
