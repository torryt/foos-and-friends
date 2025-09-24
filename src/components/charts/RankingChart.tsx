import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { PlayerRankingHistory } from '@/hooks/useRankingHistory'
import { cn } from '@/lib/utils'

interface RankingChartProps {
  history: PlayerRankingHistory
  height?: number
  className?: string
}

export function RankingChart({ history, height = 250, className }: RankingChartProps) {
  if (!history.data || history.data.length === 0) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200',
          className,
        )}
        style={{ height }}
      >
        <p className="text-sm text-gray-500">No match history available</p>
      </div>
    )
  }

  // Add initial point if we have data
  const chartData =
    history.data.length > 0
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

  // Custom tooltip component
  // biome-ignore lint/suspicious/noExplicitAny: Recharts requires any for custom components
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload[0]) {
      const data = payload[0].payload
      if (data.matchNumber === 0) {
        return (
          <div className="bg-white p-2 rounded shadow-lg border border-gray-200">
            <p className="text-xs font-medium text-gray-900">Starting Ranking</p>
            <p className="text-sm font-bold text-orange-600">{data.ranking} pts</p>
          </div>
        )
      }
      return (
        <div className="bg-white p-2 rounded shadow-lg border border-gray-200">
          <p className="text-xs font-medium text-gray-900">Match #{data.matchNumber}</p>
          <p className="text-xs text-gray-500">{data.date}</p>
          <p className="text-sm font-bold text-orange-600">{data.ranking} pts</p>
          {data.result && (
            <p
              className={cn(
                'text-xs font-medium mt-1',
                data.result === 'win' ? 'text-green-600' : 'text-red-600',
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

  // Calculate Y-axis domain with padding
  const minRanking = Math.min(...chartData.map((d) => d.ranking))
  const maxRanking = Math.max(...chartData.map((d) => d.ranking))
  const padding = Math.max(50, (maxRanking - minRanking) * 0.1)
  const yDomain = [Math.max(800, minRanking - padding), Math.min(2400, maxRanking + padding)]

  return (
    <div className={cn('bg-white rounded-lg', className)}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
          <defs>
            <linearGradient id="colorRanking" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#fb923c" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#fb923c" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis
            dataKey="matchNumber"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: '#e5e7eb' }}
            tickFormatter={(value) => (value === 0 ? '' : `#${value}`)}
          />
          <YAxis
            domain={yDomain}
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: '#e5e7eb' }}
            width={45}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="ranking"
            stroke="#fb923c"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorRanking)"
            animationDuration={500}
            // biome-ignore lint/suspicious/noExplicitAny: Recharts requires any for custom components
            dot={(props: any) => {
              const { cx, cy, payload } = props
              if (!cx || !cy || !payload || payload.matchNumber === 0) return <></>
              const color = payload.result === 'win' ? '#16a34a' : '#dc2626'
              return <circle cx={cx} cy={cy} r={4} fill={color} stroke="#fff" strokeWidth={2} />
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
