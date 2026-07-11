import { PillSelect } from '@foos/shared'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowUpDown } from 'lucide-react'
import { useState } from 'react'
import AddPlayerModal from '@/components/AddPlayerModal'
import { ArchivedSeasonBanner } from '@/components/ArchivedSeasonBanner'
import { MatchEntryModal } from '@/components/MatchEntryModal'
import { MilestoneCelebration } from '@/components/MilestoneCelebration'
import PlayerRankings, { SORT_OPTIONS, useRankingSort } from '@/components/PlayerRankings'
import QuickActions from '@/components/QuickActions'
import { type RankingScope, SeasonScopePicker } from '@/components/SeasonScopePicker'
import { useSeasonContext } from '@/contexts/SeasonContext'
import { useGameLogic } from '@/hooks/useGameLogic'

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
  const navigate = useNavigate()
  const [showAddPlayer, setShowAddPlayer] = useState(false)
  const [showRecordMatch, setShowRecordMatch] = useState(false)
  const [scope, setScope] = useState<RankingScope>('season')
  const [sortBy, setSortBy] = useRankingSort()

  const {
    players,
    seasonStats,
    matches,
    allMatches,
    supportedMatchTypes,
    addPlayer,
    addMatch,
    currentMilestone,
    dismissMilestone,
  } = useGameLogic()
  const { currentSeason, seasons } = useSeasonContext()

  const isArchived = !!currentSeason && !currentSeason.isActive
  const showScopeToggle = seasons.length > 1
  const allTime = scope === 'allTime'

  const handlePlayerCardClick = (playerId: string) => {
    navigate({
      to: '/players/$playerId',
      params: { playerId },
    })
  }

  return (
    <div className="space-y-4">
      <ArchivedSeasonBanner />

      {/* Recording into an archived season is not allowed */}
      {!isArchived && (
        <QuickActions
          onAddMatch={() => setShowRecordMatch(true)}
          onAddPlayer={() => setShowAddPlayer(true)}
        />
      )}

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
        matches={allTime ? allMatches : matches}
        onPlayerClick={handlePlayerCardClick}
        sortBy={sortBy}
        title={allTime ? 'All-Time Rankings' : isArchived ? 'Final Standings' : 'Friend Rankings'}
        subtitle={
          allTime
            ? 'Latest ELO across all seasons'
            : isArchived
              ? `How ${currentSeason?.name} ended`
              : 'See how you stack up against your friends!'
        }
      />

      <AddPlayerModal
        isOpen={showAddPlayer}
        onClose={() => setShowAddPlayer(false)}
        onAddPlayer={(name, avatar) => addPlayer(name, avatar)}
      />

      {showRecordMatch && (
        <MatchEntryModal
          players={players}
          matches={matches}
          supportedMatchTypes={supportedMatchTypes}
          addMatch={addMatch}
          onClose={() => setShowRecordMatch(false)}
        />
      )}

      <MilestoneCelebration reached={currentMilestone} onDismiss={dismissMilestone} />
    </div>
  )
}
