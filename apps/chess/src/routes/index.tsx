import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import AddPlayerModal from '@/components/AddPlayerModal'
import { ArchivedSeasonBanner } from '@/components/ArchivedSeasonBanner'
import { MatchEntryModal } from '@/components/MatchEntryModal'
import PlayerRankings from '@/components/PlayerRankings'
import QuickActions from '@/components/QuickActions'
import { useSeasonContext } from '@/contexts/SeasonContext'
import { useGameLogic } from '@/hooks/useGameLogic'

type RankingScope = 'season' | 'allTime'

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
  const navigate = useNavigate()
  const [showAddPlayer, setShowAddPlayer] = useState(false)
  const [showRecordMatch, setShowRecordMatch] = useState(false)
  const [scope, setScope] = useState<RankingScope>('season')

  const { players, seasonStats, matches, supportedMatchTypes, addPlayer, addMatch } = useGameLogic()
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

      {showScopeToggle && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setScope('season')}
            className={`min-h-11 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              !allTime
                ? 'bg-accent-subtle border-[var(--th-sport-primary)] text-[var(--th-sport-primary)]'
                : 'bg-card border-[var(--th-border-subtle)] text-secondary hover:bg-card-hover'
            }`}
          >
            {currentSeason?.name || 'This season'}
          </button>
          <button
            type="button"
            onClick={() => setScope('allTime')}
            className={`min-h-11 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              allTime
                ? 'bg-accent-subtle border-[var(--th-sport-primary)] text-[var(--th-sport-primary)]'
                : 'bg-card border-[var(--th-border-subtle)] text-secondary hover:bg-card-hover'
            }`}
          >
            All time
          </button>
        </div>
      )}

      <PlayerRankings
        players={players}
        seasonStats={allTime ? undefined : seasonStats}
        onPlayerClick={handlePlayerCardClick}
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
    </div>
  )
}
