import { createFileRoute } from '@tanstack/react-router'
import { Crown } from 'lucide-react'
import { useEffect } from 'react'
import { usePublicGroup } from '@/contexts/PublicGroupContext'

export const Route = createFileRoute('/public/$token/tv')({
  component: PublicTvLeaderboard,
})

const REFRESH_INTERVAL_MS = 30_000
const MAX_ROWS = 10

// Fullscreen leaderboard for office monitors: no navigation, no actions,
// big typography, auto-refreshing.
function PublicTvLeaderboard() {
  const { group, players, seasonStats, currentSeason, refresh, loading } = usePublicGroup()

  useEffect(() => {
    const interval = setInterval(() => {
      refresh()
    }, REFRESH_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [refresh])

  if (loading || !group) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted text-2xl">Loading…</div>
      </div>
    )
  }

  // Season leaderboard; players without a match this season are left out
  const playersById = new Map(players.map((p) => [p.id, p]))
  const rows = seasonStats
    .toSorted((a, b) => b.ranking - a.ranking)
    .map((stats) => ({ stats, player: playersById.get(stats.playerId) }))
    .filter((row) => row.player)
    .slice(0, MAX_ROWS)

  const medal = ['🥇', '🥈', '🥉']

  return (
    <div className="min-h-screen flex flex-col px-[4vw] py-[3vh]">
      <header className="flex items-baseline justify-between mb-[3vh]">
        <h1 className="text-[clamp(1.5rem,4vw,3.5rem)] font-bold text-sport-gradient flex items-center gap-3">
          <Crown className="text-[var(--th-sport-primary)]" size={40} aria-hidden="true" />
          {group.name}
        </h1>
        {currentSeason && (
          <span className="text-[clamp(1rem,2vw,1.75rem)] text-secondary font-medium">
            {currentSeason.name}
          </span>
        )}
      </header>

      {rows.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-muted text-2xl">
          No matches yet this season
        </div>
      ) : (
        <ol className="flex-1 flex flex-col justify-evenly">
          {rows.map(({ stats, player }, index) => {
            if (!player) return null
            const isPodium = index < 3
            return (
              <li
                key={stats.playerId}
                className={`flex items-center gap-[2vw] px-[2vw] py-[0.5vh] rounded-2xl ${
                  isPodium ? 'bg-card border border-[var(--th-border-subtle)]' : ''
                }`}
              >
                <span
                  className={`w-[3ch] text-right tabular-nums font-bold ${
                    isPodium
                      ? 'text-[clamp(1.5rem,3vw,2.75rem)]'
                      : 'text-[clamp(1.1rem,2vw,1.9rem)] text-muted'
                  }`}
                >
                  {isPodium ? medal[index] : index + 1}
                </span>
                <span className="text-[clamp(1.5rem,3vw,2.75rem)]" aria-hidden="true">
                  {player.avatar}
                </span>
                <span
                  className={`flex-1 truncate font-semibold text-primary ${
                    isPodium
                      ? 'text-[clamp(1.4rem,2.8vw,2.5rem)]'
                      : 'text-[clamp(1.1rem,2vw,1.9rem)]'
                  }`}
                >
                  {player.name}
                </span>
                <span className="text-[clamp(0.9rem,1.5vw,1.4rem)] text-secondary tabular-nums hidden sm:block">
                  {stats.wins}W&thinsp;–&thinsp;{stats.losses}L
                </span>
                <span
                  className={`tabular-nums font-bold text-[var(--th-sport-primary)] ${
                    isPodium ? 'text-[clamp(1.6rem,3.2vw,3rem)]' : 'text-[clamp(1.2rem,2.2vw,2rem)]'
                  }`}
                >
                  {stats.ranking}
                </span>
              </li>
            )
          })}
        </ol>
      )}

      <footer className="mt-[2vh] text-center text-muted text-[clamp(0.7rem,1vw,0.95rem)]">
        Chess & Friends · updates automatically
      </footer>
    </div>
  )
}
