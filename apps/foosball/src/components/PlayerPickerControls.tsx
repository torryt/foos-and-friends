import type { PlayerPickerPreferences, PlayerPickerSort } from '@foos/shared'
import { PillSelect } from '@foos/shared'
import { ArrowUpDown } from 'lucide-react'

const SORT_OPTIONS: { value: PlayerPickerSort; label: string }[] = [
  { value: 'name', label: 'Name (A–Z)' },
  { value: 'recent', label: 'Recently active' },
  { value: 'games', label: 'Most games' },
  { value: 'rating', label: 'Rating' },
]

interface PlayerPickerControlsProps {
  prefs: PlayerPickerPreferences
  onChange: (patch: Partial<PlayerPickerPreferences>) => void
}

// Sort dropdown + "Active only" switch shown above every matchup player list
export const PlayerPickerControls = ({ prefs, onChange }: PlayerPickerControlsProps) => (
  <div className="flex items-center gap-2 mb-3">
    <PillSelect
      value={prefs.sort}
      options={SORT_OPTIONS}
      onChange={(sort) => onChange({ sort })}
      ariaLabel="Sort by"
      icon={<ArrowUpDown size={14} aria-hidden="true" />}
    />
    <button
      type="button"
      role="switch"
      aria-checked={prefs.activeOnly}
      onClick={() => onChange({ activeOnly: !prefs.activeOnly })}
      className={`min-h-11 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
        prefs.activeOnly
          ? 'bg-accent-subtle border-[var(--th-sport-primary)] text-[var(--th-sport-primary)]'
          : 'border-[var(--th-border)] text-secondary hover:bg-card-hover'
      }`}
    >
      Active only
    </button>
  </div>
)
