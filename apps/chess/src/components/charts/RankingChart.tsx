import { cn, useChartTheme } from '@foos/shared'
import React from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { PlayerRankingHistory } from '@/hooks/useRankingHistory'

export interface SeasonMarker {
  /** matchNumber of the first match played in this season */
  matchNumber: number
  label: string
}

interface RankingChartProps {
  history: PlayerRankingHistory
  height?: number
  className?: string
  /** Dashed vertical lines marking where a new season began */
  seasonMarkers?: SeasonMarker[]
}

// Custom tooltip component moved outside to avoid recreation
// biome-ignore lint/suspicious/noExplicitAny: Recharts requires any for custom components
const CustomTooltip = ({ active, payload, chartTheme }: any) => {
  if (active && payload && payload[0]) {
    const data = payload[0].payload
    if (data.matchNumber === 0) {
      return (
        <div className="bg-card p-2 rounded shadow-theme-card border border-[var(--th-border)]">
          <p className="text-xs font-medium text-primary">Starting Ranking</p>
          <p className="text-sm font-bold" style={{ color: chartTheme.sportPrimary }}>
            {data.ranking} pts
          </p>
        </div>
      )
    }
    return (
      <div className="bg-card p-2 rounded shadow-theme-card border border-[var(--th-border)]">
        <p className="text-xs font-medium text-primary">Match #{data.matchNumber}</p>
        <p className="text-xs text-muted">{data.date}</p>
        <p className="text-sm font-bold" style={{ color: chartTheme.sportPrimary }}>
          {data.ranking} pts
        </p>
        {data.result && (
          <p
            className={cn(
              'text-xs font-medium mt-1',
              data.result === 'win' ? 'text-[var(--th-win)]' : 'text-[var(--th-loss)]',
            )}
          >
            {data.result === 'win' ? '✓ Won' : '✗ Lost'} {data.score}
          </p>
        )}
      </div>
    )
  }
  return null
}

export function RankingChart({
  history,
  height = 250,
  className,
  seasonMarkers,
}: RankingChartProps) {
  const chartId = React.useId()
  const [isMobile, setIsMobile] = React.useState(false)
  const [containerWidth, setContainerWidth] = React.useState(0)
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const chartTheme = useChartTheme()

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  React.useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const observer = new ResizeObserver(() => setContainerWidth(el.clientWidth))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Add initial point if we have data
  const allChartData =
    history.data && history.data.length > 0
      ? [
          {
            matchNumber: 0,
            ranking: history.initialRanking,
            date: 'Start',
            result: null,
          },
          ...history.data,
        ]
      : []

  // Horizontal scrolling kicks in past 10 matches on mobile, 50 on desktop
  const MOBILE_VISIBLE_POINTS = 10
  const DESKTOP_VISIBLE_POINTS = 50
  const visiblePoints = isMobile ? MOBILE_VISIBLE_POINTS : DESKTOP_VISIBLE_POINTS
  const needsScroll = allChartData.length > visiblePoints

  // Mobile: ~60px per point so each dot is clearly tappable.
  // Desktop: size so at most DESKTOP_VISIBLE_POINTS fit in the viewport.
  const POINT_WIDTH = 60
  const chartWidth = needsScroll
    ? isMobile
      ? Math.max(allChartData.length * POINT_WIDTH, 600) // Minimum 600px width
      : Math.max(allChartData.length * (containerWidth / DESKTOP_VISIBLE_POINTS), containerWidth)
    : '100%'

  // Scroll to the right (most recent) once sizing settles when scrolling is needed
  React.useEffect(() => {
    if (needsScroll && scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth - scrollRef.current.clientWidth
    }
  }, [needsScroll, chartWidth])

  if (!history.data || history.data.length === 0) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-card-hover rounded-[var(--th-radius-md)] border border-[var(--th-border)]',
          className,
        )}
        style={{ height }}
      >
        <p className="text-sm text-muted">No match history available</p>
      </div>
    )
  }

  // Calculate Y-axis domain with padding
  const minRanking = Math.min(...allChartData.map((d) => d.ranking))
  const maxRanking = Math.max(...allChartData.map((d) => d.ranking))
  const padding = Math.max(50, (maxRanking - minRanking) * 0.1)
  const yDomain = [Math.max(800, minRanking - padding), Math.min(2400, maxRanking + padding)]

  const containerClass = needsScroll
    ? 'overflow-x-auto overflow-y-hidden scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 -webkit-overflow-scrolling-touch'
    : ''

  return (
    <div
      ref={scrollRef}
      className={cn('bg-card rounded-[var(--th-radius-md)]', containerClass, className)}
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
          <AreaChart data={allChartData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
            <defs>
              <linearGradient id={`colorRanking-${chartId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartTheme.sportPrimary} stopOpacity={0.8} />
                <stop offset="95%" stopColor={chartTheme.sportPrimary} stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridStroke} />
            {seasonMarkers?.map((marker) => (
              <ReferenceLine
                key={`${marker.matchNumber}-${marker.label}`}
                x={marker.matchNumber}
                stroke={chartTheme.border}
                strokeDasharray="4 4"
                label={{
                  value: marker.label,
                  position: 'insideTopLeft',
                  fontSize: 10,
                  fill: chartTheme.textMuted,
                }}
              />
            ))}
            <XAxis
              dataKey="matchNumber"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: chartTheme.border }}
              tickFormatter={(value) => (value === 0 ? '' : `#${value}`)}
            />
            <YAxis domain={yDomain} tick={false} tickLine={false} axisLine={false} width={0} />
            <Tooltip content={<CustomTooltip chartTheme={chartTheme} />} />
            <Area
              type="monotone"
              dataKey="ranking"
              stroke={chartTheme.sportPrimary}
              strokeWidth={2}
              fillOpacity={1}
              fill={`url(#colorRanking-${chartId})`}
              animationDuration={500}
              // biome-ignore lint/suspicious/noExplicitAny: Recharts requires any for custom components
              dot={(props: any) => {
                const { cx, cy, payload, index } = props
                if (!cx || !cy || !payload || payload.matchNumber === 0) {
                  return <circle key={`dot-${index}`} cx={0} cy={0} r={0} fill="transparent" />
                }
                const color = payload.result === 'win' ? chartTheme.win : chartTheme.loss
                return (
                  <circle
                    key={`dot-${index}`}
                    cx={cx}
                    cy={cy}
                    r={4}
                    fill={color}
                    stroke={chartTheme.bgCard}
                    strokeWidth={2}
                  />
                )
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
