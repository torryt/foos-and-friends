import { Check, ChevronDown } from 'lucide-react'
import { type ReactNode, useRef, useState } from 'react'
import { useClickOutside } from '../lib/useClickOutside.ts'

export interface PillSelectOption<T extends string> {
  value: T
  label: string
}

interface PillSelectProps<T extends string> {
  value: T
  options: PillSelectOption<T>[]
  onChange: (value: T) => void
  /** Prefix for the trigger's accessible name, e.g. "Sort by" → "Sort by ELO Ranking" */
  ariaLabel: string
  /** Leading icon shown in the trigger pill */
  icon?: ReactNode
  /** Which edge of the trigger the dropdown aligns to */
  align?: 'left' | 'right'
}

/**
 * Pill-styled dropdown select — same trigger treatment as the rankings
 * season picker, for controls that sit alongside it.
 */
export const PillSelect = <T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  icon,
  align = 'left',
}: PillSelectProps<T>) => {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  useClickOutside(containerRef, () => setOpen(false), open)

  const selected = options.find((option) => option.value === value)

  const handleSelect = (next: T) => {
    onChange(next)
    setOpen(false)
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`${ariaLabel} ${selected?.label ?? ''}`.trim()}
        className="min-h-11 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors flex items-center gap-2 bg-accent-subtle border-[var(--th-sport-primary)] text-[var(--th-sport-primary)] hover:opacity-85"
      >
        {icon}
        <span className="max-w-40 truncate">{selected?.label}</span>
        <ChevronDown
          size={14}
          className={`opacity-70 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={ariaLabel}
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} mt-2 w-56 max-w-[calc(100vw-2rem)] bg-card rounded-[var(--th-radius-lg)] shadow-theme-card border border-[var(--th-border)] z-30 overflow-hidden`}
        >
          <div className="p-1.5 space-y-0.5">
            {options.map((option) => {
              const isSelected = option.value === value

              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(option.value)}
                  className={`w-full min-h-11 flex items-center gap-2 px-3 py-2 rounded-[var(--th-radius-md)] border text-left text-sm transition-colors ${
                    isSelected
                      ? 'bg-accent-subtle border-[var(--th-sport-primary)] font-semibold text-primary'
                      : 'border-transparent text-primary hover:bg-card-hover'
                  }`}
                >
                  <span className="flex-1 min-w-0 truncate">{option.label}</span>
                  {isSelected && (
                    <Check size={16} className="text-[var(--th-sport-primary)] flex-none" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
