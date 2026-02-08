import { AVAILABLE_AVATARS } from '@foos/shared'
import { CloudOff, Loader, Users, X } from 'lucide-react'
import { useState } from 'react'
import { useOfflineStatus } from '@/hooks/useOfflineStatus'

interface AddPlayerModalProps {
  isOpen: boolean
  onClose: () => void
  onAddPlayer: (name: string, avatar: string) => Promise<{ success: boolean; error?: string }>
}

const AddPlayerModal = ({ isOpen, onClose, onAddPlayer }: AddPlayerModalProps) => {
  const [newPlayer, setNewPlayer] = useState('')
  const [selectedAvatar, setSelectedAvatar] = useState(AVAILABLE_AVATARS[0])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { isOnline } = useOfflineStatus()

  if (!isOpen) return null

  const handleSubmit = async () => {
    if (!newPlayer.trim()) {
      setError('Please enter a player name')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await onAddPlayer(newPlayer.trim(), selectedAvatar)

      if (result.success) {
        setNewPlayer('')
        setSelectedAvatar(AVAILABLE_AVATARS[0])
        onClose()
      } else {
        setError(result.error || 'Failed to add player')
      }
    } catch (_err) {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      setNewPlayer('')
      setSelectedAvatar(AVAILABLE_AVATARS[0])
      setError(null)
      onClose()
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-br from-white to-blue-50 rounded-2xl p-4 w-full max-w-sm shadow-2xl border border-white/20">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Users className="text-blue-500" size={20} />
            Add Player
          </h3>
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-white/50 disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-3 rounded-xl border border-blue-200/50">
            <input
              type="text"
              placeholder="Enter player's name..."
              value={newPlayer}
              onChange={(e) => {
                setNewPlayer(e.target.value)
                if (error) setError(null) // Clear error when typing
              }}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              className="w-full p-3 border border-blue-200 rounded-lg bg-white/80 backdrop-blur-sm focus:ring-2 focus:ring-blue-300 focus:border-transparent disabled:opacity-50"
            />
          </div>

          <div className="bg-gradient-to-r from-orange-50 to-yellow-50 p-3 rounded-xl border border-orange-200/50">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-3xl">{selectedAvatar}</span>
              <span className="text-sm font-semibold text-orange-800">Choose Avatar</span>
            </div>
            <div className="grid grid-cols-5 gap-1.5 max-h-60 overflow-y-auto overflow-x-hidden p-1">
              {AVAILABLE_AVATARS.map((avatar) => (
                <button
                  key={avatar}
                  type="button"
                  onClick={() => setSelectedAvatar(avatar)}
                  className={`text-2xl p-1.5 rounded-lg hover:bg-orange-100 transition-colors flex items-center justify-center aspect-square ${
                    selectedAvatar === avatar
                      ? 'bg-orange-200 ring-2 ring-orange-400 ring-offset-1'
                      : 'bg-white/60'
                  }`}
                >
                  {avatar}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!newPlayer.trim() || isLoading || !isOnline}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-xl hover:from-blue-600 hover:to-purple-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            title={!isOnline ? 'Cannot add players while offline' : undefined}
          >
            {!isOnline ? (
              <>
                <CloudOff size={16} />
                Offline - Cannot Add
              </>
            ) : isLoading ? (
              <>
                <Loader size={16} className="animate-spin" />
                Adding...
              </>
            ) : (
              'Add Player'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AddPlayerModal
