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
      <div className="bg-white w-full shadow-2xl border border-gray-100 flex flex-col h-full">
        <div
          className="px-6 flex-shrink-0"
          style={{ paddingTop: 'calc(1.5rem + env(safe-area-inset-top))' }}
        >
          <div className="flex justify-between items-center mb-6">
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft size={20} />
              <span>Back</span>
            </button>
            <h2 className="text-lg font-bold text-gray-900">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
            >
              <X size={20} />
            </button>
          </div>

          <div className="relative mb-3">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <input
              type="search"
              placeholder="Search players…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-gray-50 border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 text-left transition-colors"
              >
                <span className="text-lg">{player.avatar}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">{player.name}</div>
                  <div className="text-sm text-gray-500">{player.ranking} pts</div>
                </div>
                {selectedId === player.id && <Check size={18} className="text-blue-600 shrink-0" />}
              </button>
            ))}
            {filteredPlayers.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-8">No players found</p>
            )}
          </div>
        </div>
      </div>
    </ModalOrBottomDrawer>
  )
}
