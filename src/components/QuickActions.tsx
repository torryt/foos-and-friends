import { Plus, Settings, Target } from 'lucide-react'

interface QuickActionsProps {
  onRecordMatch: () => void
  onAddPlayer: () => void
  onManagePlayers: () => void
}

const QuickActions = ({ onRecordMatch, onAddPlayer, onManagePlayers }: QuickActionsProps) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-2xl mx-auto">
      <button
        type="button"
        onClick={onRecordMatch}
        className="bg-gradient-to-r from-orange-500 to-red-600 text-white p-4 rounded-xl hover:from-orange-600 hover:to-red-700 shadow-lg flex items-center justify-center gap-2 font-semibold"
      >
        <Target size={20} />
        Record Game
      </button>
      <button
        type="button"
        onClick={onAddPlayer}
        className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-xl hover:from-blue-600 hover:to-purple-700 shadow-lg flex items-center justify-center gap-2 font-semibold"
      >
        <Plus size={20} />
        Add Player
      </button>
      <button
        type="button"
        onClick={onManagePlayers}
        className="bg-gradient-to-r from-green-500 to-teal-600 text-white p-4 rounded-xl hover:from-green-600 hover:to-teal-700 shadow-lg flex items-center justify-center gap-2 font-semibold"
      >
        <Settings size={20} />
        Manage Players
      </button>
    </div>
  )
}

export default QuickActions
