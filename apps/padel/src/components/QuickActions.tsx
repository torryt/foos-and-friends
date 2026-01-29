import { Plus, Target } from 'lucide-react'

interface QuickActionsProps {
  onAddMatch: () => void
  onAddPlayer: () => void
}

const QuickActions = ({ onAddMatch, onAddPlayer }: QuickActionsProps) => {
  return (
    <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto">
      <button
        type="button"
        onClick={onAddMatch}
        className="bg-gradient-to-r from-orange-500 to-red-600 text-white p-4 rounded-xl hover:from-orange-600 hover:to-red-700 shadow-lg flex items-center justify-center gap-2 font-semibold"
      >
        <Target size={20} />
        Add Match
      </button>
      <button
        type="button"
        onClick={onAddPlayer}
        className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-xl hover:from-blue-600 hover:to-purple-700 shadow-lg flex items-center justify-center gap-2 font-semibold"
      >
        <Plus size={20} />
        Add Player
      </button>
    </div>
  )
}

export default QuickActions
