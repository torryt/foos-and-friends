import { PillSelect } from '@foos/shared'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowUpDown } from 'lucide-react'
import { useState } from 'react'
import PlayerRankings, { SORT_OPTIONS, useRankingSort } from '@/components/PlayerRankings'
import { type RankingScope, SeasonScopePicker } from '@/components/SeasonScopePicker'
import { usePublicGroup } from '@/contexts/PublicGroupContext'

export const Route = createFileRoute('/public/$token/')({
  component: PublicRankings,
})

function PublicRankings() {
  const navigate = useNavigate()
  const { token } = Route.useParams()
  const [scope, setScope] = useState<RankingScope>('season')
  const [sortBy, setSortBy] = useRankingSort()

  const { players, seasonStats, seasonMatches, allMatches, seasons, currentSeason } =
    usePublicGroup()

  const isArchived = !!currentSeason && !currentSeason.isActive
  const showScopeToggle = seasons.length > 1
  const allTime = scope === 'allTime'

  const handlePlayerCardClick = (playerId: string) => {
    navigate({
      to: '/public/$token/players/$playerId',
      params: { token, playerId },
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {showScopeToggle && <SeasonScopePicker scope={scope} onScopeChange={setScope} />}
        <div className="ml-auto">
          <PillSelect
            value={sortBy}
            options={SORT_OPTIONS}
            onChange={setSortBy}
            ariaLabel="Sort by"
            icon={<ArrowUpDown size={14} aria-hidden="true" />}
            align="right"
          />
        </div>
      </div>

      <PlayerRankings
        players={players}
        seasonStats={allTime ? undefined : seasonStats}
        matches={allTime ? allMatches : seasonMatches}
        onPlayerClick={handlePlayerCardClick}
        sortBy={sortBy}
        title={allTime ? 'All-Time Rankings' : isArchived ? 'Final Standings' : 'Rankings'}
        subtitle={
          allTime
            ? 'Latest ELO across all seasons'
            : isArchived
              ? `How ${currentSeason?.name} ended`
              : currentSeason?.name
        }
      />
    </div>
  )
}
