import { Edit, Loader, Settings, Trash2, Users, X } from 'lucide-react'
import { useState } from 'react'
import { AVAILABLE_AVATARS } from '@/constants/avatars'
import { useToast } from '@/hooks/useToast'
import type { Player } from '@/types'

interface PlayerManagementModalProps {
  isOpen: boolean
  onClose: () => void
  players: Player[]
  currentUserId?: string
  isAdmin?: boolean
  onUpdatePlayer: (
    playerId: string,
    updates: { name?: string; avatar?: string },
  ) => Promise<{ success: boolean; error?: string }>
  onDeletePlayer: (playerId: string) => Promise<{ success: boolean; error?: string }>
}

interface EditingPlayer {
  id: string
  name: string
  avatar: string
}

const PlayerManagementModal = ({
  isOpen,
  onClose,
  players,
  currentUserId,
  isAdmin = false,
  onUpdatePlayer,
  onDeletePlayer,
}: PlayerManagementModalProps) => {
  const [editingPlayer, setEditingPlayer] = useState<EditingPlayer | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  if (!isOpen) return null

  const handleStartEdit = (player: Player) => {
    setEditingPlayer({
      id: player.id,
      name: player.name,
      avatar: player.avatar,
    })
    setError(null)
  }

  const handleCancelEdit = () => {
    setEditingPlayer(null)
    setError(null)
  }

  const handleSaveEdit = async () => {
    if (!editingPlayer) return

    if (!editingPlayer.name.trim()) {
      setError('Player name cannot be empty')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await onUpdatePlayer(editingPlayer.id, {
        name: editingPlayer.name.trim(),
        avatar: editingPlayer.avatar,
      })

      if (result.success) {
        setEditingPlayer(null)
        toast().success('Player updated successfully!')
      } else {
        setError(result.error || 'Failed to update player')
      }
    } catch (_err) {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeletePlayer = async (playerId: string) => {
    if (
      !window.confirm('Are you sure you want to delete this player? This action cannot be undone.')
    ) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await onDeletePlayer(playerId)

      if (result.success) {
        toast().success('Player deleted successfully!')
      } else {
        setError(result.error || 'Failed to delete player')
        toast().error(result.error || 'Failed to delete player')
      }
    } catch (_err) {
      setError('An unexpected error occurred')
      toast().error('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      setEditingPlayer(null)
      setError(null)
      onClose()
    }
  }

  const canEditPlayer = (player: Player) => {
    return isAdmin || player.createdBy === currentUserId
  }

  const canDeletePlayer = (player: Player) => {
    return isAdmin || player.createdBy === currentUserId
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-br from-white to-blue-50 rounded-2xl p-6 w-full max-w-2xl shadow-2xl border border-white/20 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Settings className="text-blue-500" size={24} />
            Manage Players
          </h3>
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-white/50 disabled:opacity-50"
          >
            <X size={24} />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          <div className="space-y-3">
            {players.map((player) => (
              <div
                key={player.id}
                className="bg-white/60 border border-white/50 rounded-xl p-4 hover:bg-white/80 transition-colors"
              >
                {editingPlayer?.id === player.id ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{editingPlayer.avatar}</span>
                      <input
                        type="text"
                        value={editingPlayer.name}
                        onChange={(e) =>
                          setEditingPlayer({ ...editingPlayer, name: e.target.value })
                        }
                        className="flex-1 p-2 border border-blue-200 rounded-lg bg-white/80 focus:ring-2 focus:ring-blue-300 focus:border-transparent"
                        disabled={isLoading}
                      />
                    </div>

                    <div className="bg-gradient-to-r from-orange-50 to-yellow-50 p-3 rounded-xl border border-orange-200/50">
                      <div className="text-sm font-semibold text-orange-800 mb-2">
                        Choose Avatar
                      </div>
                      <div className="grid grid-cols-8 gap-3 max-h-40 overflow-y-auto p-1">
                        {AVAILABLE_AVATARS.map((avatar) => (
                          <button
                            key={avatar}
                            type="button"
                            onClick={() => setEditingPlayer({ ...editingPlayer, avatar })}
                            disabled={isLoading}
                            className={`text-2xl p-2 rounded-lg hover:bg-orange-100 transition-colors ${
                              editingPlayer.avatar === avatar
                                ? 'bg-orange-200 ring-2 ring-orange-400'
                                : 'bg-white/60'
                            } disabled:opacity-50`}
                          >
                            {avatar}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        disabled={isLoading}
                        className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveEdit}
                        disabled={isLoading || !editingPlayer.name.trim()}
                        className="px-3 py-1.5 text-sm bg-blue-500 text-white hover:bg-blue-600 rounded-lg disabled:opacity-50 flex items-center gap-1"
                      >
                        {isLoading ? (
                          <>
                            <Loader size={14} className="animate-spin" />
                            Saving...
                          </>
                        ) : (
                          'Save'
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{player.avatar}</span>
                      <div>
                        <div className="font-semibold text-slate-800">{player.name}</div>
                        <div className="text-xs text-slate-500">
                          ELO: {player.ranking} • {player.wins}W-{player.losses}L
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-1">
                      {canEditPlayer(player) && (
                        <button
                          type="button"
                          onClick={() => handleStartEdit(player)}
                          disabled={isLoading}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg disabled:opacity-50"
                          title="Edit player"
                        >
                          <Edit size={16} />
                        </button>
                      )}
                      {canDeletePlayer(player) && player.matchesPlayed === 0 && (
                        <button
                          type="button"
                          onClick={() => handleDeletePlayer(player.id)}
                          disabled={isLoading}
                          className="p-2 text-red-600 hover:bg-red-100 rounded-lg disabled:opacity-50"
                          title="Delete player (only if no matches played)"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {players.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                <Users size={48} className="mx-auto mb-4 opacity-50" />
                <p>No players in this group yet.</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="w-full py-2 text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default PlayerManagementModal
