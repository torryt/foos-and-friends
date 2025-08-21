import { Plus, Target } from 'lucide-react'

interface QuickActionsProps {
  onRecordMatch: () => void
  onAddPlayer: () => void
}

const QuickActions = ({ onRecordMatch, onAddPlayer }: QuickActionsProps) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-md mx-auto md:max-w-none">
      <button
        type="button"
        onClick={onRecordMatch}
        className="bg-gradient-to-r from-orange-500 to-red-600 text-white p-4 rounded-xl hover:from-orange-600 hover:to-red-700 transition-all shadow-lg flex items-center justify-center gap-2 font-semibold"
      >
        <Target size={20} />
        Record Game
      </button>
      <button
        type="button"
        onClick={onAddPlayer}
        className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg flex items-center justify-center gap-2 font-semibold"
      >
        <Plus size={20} />
        Add Friend
      </button>
    </div>
  )
}

export default QuickActions
