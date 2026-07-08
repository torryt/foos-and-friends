import { type ThemeName, useTheme } from './ThemeContext'

const THEMES: { id: ThemeName; label: string; colors: string[] }[] = [
  {
    id: 'default',
    label: 'Classic',
    colors: ['#f97316', '#ef4444', '#fff7ed'],
  },
  {
    id: 'neonarcade',
    label: 'Neon Arcade',
    colors: ['#53e8ff', '#ff5c8a', '#0c0a18'],
  },
]

export function ThemePicker({ onSelect }: { onSelect?: () => void }) {
  const { theme, setTheme } = useTheme()

  return (
    <div className="px-3 py-2">
      <div className="text-xs font-medium text-secondary mb-2">Theme</div>
      <div className="flex gap-2">
        {THEMES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTheme(t.id)
              onSelect?.()
            }}
            className={`flex flex-col items-center gap-1 p-2 rounded-[var(--th-radius-md)] border transition-colors ${
              theme === t.id
                ? 'border-[var(--th-accent)] bg-accent-subtle'
                : 'border-[var(--th-border)] hover:bg-card-hover'
            }`}
            title={t.label}
          >
            <div className="flex gap-0.5">
              {t.colors.map((color) => (
                <div
                  key={color}
                  className="w-3 h-3 rounded-full border border-[var(--th-border)]"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <span className="text-[10px] text-secondary whitespace-nowrap">{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
