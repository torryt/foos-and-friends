import type { Player, PlayerSeasonStats, Season } from '@foos/shared'
import { createFileRoute } from '@tanstack/react-router'
import { Crown } from 'lucide-react'
import { useEffect } from 'react'
import { useGroupContext } from '@/contexts/GroupContext'
import { useGroupPageMode } from '@/contexts/GroupPageContext'
import { usePublicGroup } from '@/contexts/PublicGroupContext'
import { useSeasonContext } from '@/contexts/SeasonContext'
import { useGameLogic } from '@/hooks/useGameLogic'

export const Route = createFileRoute('/groups/$groupId/tv')({
  component: TvPage,
})

const REFRESH_INTERVAL_MS = 30_000
const MAX_ROWS = 10

// Public groups work logged-out; private groups need a logged-in member
// session on the TV device (there is no anonymous access path to private data).
function TvPage() {
  const mode = useGroupPageMode()
  return mode === 'member' ? <MemberTv /> : <PublicTv />
}

function PublicTv() {
  const { group, players, seasonStats, currentSeason, refresh, loading } = usePublicGroup()
  useAutoRefresh(refresh)
  return (
    <TvLeaderboard
      groupName={group?.name}
      players={players}
      seasonStats={seasonStats}
      currentSeason={currentSeason}
      loading={loading || !group}
    />
  )
}

function MemberTv() {
  const { currentGroup } = useGroupContext()
  const { currentSeason } = useSeasonContext()
  const { players, seasonStats, loading, refresh } = useGameLogic()
  useAutoRefresh(refresh)
  return (
    <TvLeaderboard
      groupName={currentGroup?.name}
      players={players}
      seasonStats={seasonStats}
      currentSeason={currentSeason}
      loading={loading || !currentGroup}
    />
  )
}

function useAutoRefresh(refresh: () => unknown) {
  useEffect(() => {
    const interval = setInterval(() => {
      refresh()
    }, REFRESH_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [refresh])
}

interface TvLeaderboardProps {
  groupName: string | undefined
  players: Player[]
  seasonStats: PlayerSeasonStats[]
  currentSeason: Season | null
  loading: boolean
}

// Fullscreen leaderboard for office monitors: no navigation, no actions,
// big typography, auto-refreshing.
function TvLeaderboard({
  groupName,
  players,
  seasonStats,
  currentSeason,
  loading,
}: TvLeaderboardProps) {
  if (loading) {
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
          {groupName}
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
