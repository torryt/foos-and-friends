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
        className="bg-gradient-to-r from-[#832161] to-[#DA4167] text-white p-4 rounded-xl hover:from-[#6e1b52] hover:to-[#c93558] shadow-lg flex items-center justify-center gap-2 font-semibold"
      >
        <Target size={20} />
        Add Match
      </button>
      <button
        type="button"
        onClick={onAddPlayer}
        className="bg-gradient-to-r from-[#3D2645] to-[#5a3a66] text-white p-4 rounded-xl hover:from-[#2d1c33] hover:to-[#4a2e55] shadow-lg flex items-center justify-center gap-2 font-semibold"
      >
        <Plus size={20} />
        Add Player
      </button>
    </div>
  )
}

export default QuickActions
