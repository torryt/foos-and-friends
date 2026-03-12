import { AVAILABLE_AVATARS } from '@foos/shared'
import { CloudOff, Loader, Users, X } from 'lucide-react'
import { useState } from 'react'
import { useOfflineStatus } from '@/hooks/useOfflineStatus'
import { ModalOrBottomDrawer } from './ModalOrBottomDrawer'

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
    <ModalOrBottomDrawer isOpen={isOpen} onClose={handleClose} className="sm:max-w-sm">
      <div className="bg-card p-4 w-full shadow-2xl border border-[var(--th-border-subtle)]">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-primary flex items-center gap-2">
            <Users className="text-[var(--th-sport-primary)]" size={20} />
            Add Player
          </h3>
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="text-muted hover:text-secondary p-1 rounded-full hover:bg-card-hover disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>
        <div className="space-y-4">
          <div className="bg-card-hover p-3 rounded-[var(--th-radius-lg)] border border-[var(--th-border)]">
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
              className="w-full p-3 border border-[var(--th-border)] rounded-[var(--th-radius-md)] bg-card backdrop-blur-sm focus:ring-2 focus:ring-[var(--th-sport-primary)] focus:border-transparent disabled:opacity-50"
            />
          </div>

          <div className="bg-accent-subtle p-3 rounded-[var(--th-radius-lg)] border border-[var(--th-border)]">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-3xl">{selectedAvatar}</span>
              <span className="text-sm font-semibold text-primary">Choose Avatar</span>
            </div>
            <div className="grid grid-cols-5 gap-1.5 max-h-60 overflow-y-auto overflow-x-hidden p-1">
              {AVAILABLE_AVATARS.map((avatar) => (
                <button
                  key={avatar}
                  type="button"
                  onClick={() => setSelectedAvatar(avatar)}
                  className={`text-2xl p-1.5 rounded-[var(--th-radius-md)] hover:bg-card-hover transition-colors flex items-center justify-center aspect-square ${
                    selectedAvatar === avatar
                      ? 'bg-accent-subtle ring-2 ring-[var(--th-sport-primary)] ring-offset-1'
                      : 'bg-card'
                  }`}
                >
                  {avatar}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-3 bg-card-hover border border-[var(--th-border)] rounded-[var(--th-radius-md)]">
              <p className="text-[var(--th-loss)] text-sm">{error}</p>
            </div>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!newPlayer.trim() || isLoading || !isOnline}
            className="w-full bg-sport-gradient text-white py-3 px-4 rounded-[var(--th-radius-lg)] hover:bg-sport-gradient-hover font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
    </ModalOrBottomDrawer>
  )
}

export default AddPlayerModal
