import { Users, X } from 'lucide-react'
import { useState } from 'react'

interface AddPlayerModalProps {
  isOpen: boolean
  onClose: () => void
  onAddPlayer: (name: string) => void
}

const AddPlayerModal = ({ isOpen, onClose, onAddPlayer }: AddPlayerModalProps) => {
  const [newPlayer, setNewPlayer] = useState('')

  if (!isOpen) return null

  const handleSubmit = () => {
    if (newPlayer.trim()) {
      onAddPlayer(newPlayer.trim())
      setNewPlayer('')
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
            Add Friend
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-white/50"
          >
            <X size={20} />
          </button>
        </div>
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-3 rounded-xl border border-blue-200/50">
            <input
              type="text"
              placeholder="Enter friend's name..."
              value={newPlayer}
              onChange={(e) => setNewPlayer(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full p-3 border border-blue-200 rounded-lg bg-white/80 backdrop-blur-sm focus:ring-2 focus:ring-blue-300 focus:border-transparent transition-all"
            />
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!newPlayer.trim()}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add Friend
          </button>
        </div>
      </div>
    </div>
  )
}

export default AddPlayerModal
