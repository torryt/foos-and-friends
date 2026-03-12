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
        className="bg-sport-gradient text-white p-4 rounded-[var(--th-radius-lg)] hover:bg-sport-gradient-hover shadow-theme-card flex items-center justify-center gap-2 font-semibold"
      >
        <Target size={20} />
        Add Match
      </button>
      <button
        type="button"
        onClick={onAddPlayer}
        className="bg-[var(--th-sport-primary)] text-white p-4 rounded-[var(--th-radius-lg)] hover:opacity-90 shadow-theme-card flex items-center justify-center gap-2 font-semibold"
      >
        <Plus size={20} />
        Add Player
      </button>
    </div>
  )
}

export default QuickActions
