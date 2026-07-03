import type { Player } from '@foos/shared'
import { ArrowLeft, Check, Search, X } from 'lucide-react'
import { useState } from 'react'
import { ModalOrBottomDrawer } from './ModalOrBottomDrawer'

interface PlayerPickerSheetProps {
  players: Player[]
  title: string
  selectedId?: string
  onSelect: (playerId: string) => void
  onBack: () => void
  onClose: () => void
}

export const PlayerPickerSheet = ({
  players,
  title,
  selectedId,
  onSelect,
  onBack,
  onClose,
}: PlayerPickerSheetProps) => {
  const [search, setSearch] = useState('')

  const filteredPlayers = players.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <ModalOrBottomDrawer onClose={onClose} className="sm:max-w-md" fullHeight>
      <div className="bg-card w-full shadow-2xl border border-[var(--th-border)] flex flex-col h-full">
        <div
          className="px-6 flex-shrink-0"
          style={{ paddingTop: 'calc(1.5rem + env(safe-area-inset-top))' }}
        >
          <div className="flex justify-between items-center mb-6">
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-2 text-secondary hover:text-primary transition-colors"
            >
              <ArrowLeft size={20} />
              <span>Back</span>
            </button>
            <h2 className="text-lg font-bold text-primary">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="text-muted hover:text-secondary p-1 rounded-full hover:bg-card-hover"
            >
              <X size={20} />
            </button>
          </div>

          <div className="relative mb-3">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
            />
            <input
              type="search"
              placeholder="Search players…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-[var(--th-radius-md)] bg-card-hover border border-[var(--th-border)] text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-[var(--th-sport-primary)] focus:border-transparent"
            />
          </div>
        </div>

        {/* Scrollable Player List */}
        <div
          className="flex-1 overflow-y-auto min-h-0 px-6"
          style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
        >
          <div className="space-y-2 pb-2">
            {filteredPlayers.map((player) => (
              <button
                type="button"
                key={player.id}
                onClick={() => onSelect(player.id)}
                className="w-full flex items-center gap-3 p-3 rounded-[var(--th-radius-md)] bg-card-hover hover:bg-card text-left transition-colors"
              >
                <span className="text-lg">{player.avatar}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-primary truncate">{player.name}</div>
                  <div className="text-sm text-muted">{player.ranking} pts</div>
                </div>
                {selectedId === player.id && (
                  <Check size={18} className="text-[var(--th-sport-primary)] shrink-0" />
                )}
              </button>
            ))}
            {filteredPlayers.length === 0 && (
              <p className="text-sm text-muted text-center py-8">No players found</p>
            )}
          </div>
        </div>
      </div>
    </ModalOrBottomDrawer>
  )
}
