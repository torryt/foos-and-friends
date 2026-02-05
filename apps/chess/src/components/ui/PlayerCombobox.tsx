import type { Player } from '@foos/shared'
import { cn } from '@foos/shared'
import { Check, ChevronsUpDown, Shield, Sword } from 'lucide-react'
import * as React from 'react'
import { Button } from '@/components/ui/Button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface PlayerComboboxProps {
  players: Player[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  position?: 'attacker' | 'defender'
  className?: string
  disabled?: boolean
}

export function PlayerCombobox({
  players,
  value,
  onChange,
  placeholder = 'Select player...',
  position,
  className,
  disabled = false,
}: PlayerComboboxProps) {
  const [open, setOpen] = React.useState(false)

  const selectedPlayer = players.find((p) => p.id === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn('w-full justify-between font-normal', !value && 'text-gray-500', className)}
        >
          <span className="flex items-center gap-2 truncate">
            {position === 'attacker' && <Sword className="text-orange-500 shrink-0" size={16} />}
            {position === 'defender' && <Shield className="text-blue-500 shrink-0" size={16} />}
            {value ? (
              <span className="truncate">
                {selectedPlayer?.avatar} {selectedPlayer?.name} ({selectedPlayer?.ranking})
              </span>
            ) : (
              <span className="truncate">{placeholder}</span>
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search players..." />
          <CommandList>
            <CommandEmpty>No player found.</CommandEmpty>
            <CommandGroup>
              {players.map((player) => (
                <CommandItem
                  key={player.id}
                  value={`${player.name}-${player.id}`}
                  onSelect={() => {
                    onChange(player.id)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === player.id ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  <span className="flex items-center gap-2">
                    <span>{player.avatar}</span>
                    <span>{player.name}</span>
                    <span className="text-gray-500">({player.ranking})</span>
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
