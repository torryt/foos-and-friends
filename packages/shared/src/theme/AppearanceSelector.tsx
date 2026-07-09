import { type ThemeMode, useTheme } from './ThemeContext.tsx'

const MODES: { id: ThemeMode; label: string; icon: string }[] = [
  { id: 'light', label: 'Light', icon: '☀️' },
  { id: 'dark', label: 'Dark', icon: '🌙' },
  { id: 'system', label: 'System', icon: '💻' },
]

export function AppearanceSelector() {
  const { mode, setMode } = useTheme()

  return (
    <div>
      <div
        role="radiogroup"
        aria-label="Appearance"
        className="flex gap-1 p-1 bg-page border border-[var(--th-border)] rounded-[var(--th-radius-md)]"
      >
        {MODES.map(({ id, label, icon }) => {
          const active = mode === id
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setMode(id)}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 min-h-11 px-1 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                active
                  ? 'bg-card text-[var(--th-accent)] border-[var(--th-accent)]'
                  : 'text-secondary border-transparent hover:bg-card-hover'
              }`}
            >
              <span aria-hidden="true" className="text-sm leading-none">
                {icon}
              </span>
              {label}
            </button>
          )
        })}
      </div>
      <p className="text-xs text-muted mt-2">
        Light is Classic, dark is Neon Arcade. System follows your device setting.
      </p>
    </div>
  )
}
