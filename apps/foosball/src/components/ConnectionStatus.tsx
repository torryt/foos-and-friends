import { Cloud, CloudOff } from 'lucide-react'
import { useOfflineStatus } from '@/hooks/useOfflineStatus'

export const ConnectionStatus = () => {
  const { isOnline } = useOfflineStatus()

  return (
    <output
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-300 ${
        isOnline ? 'bg-accent-subtle text-[var(--th-win)]' : 'bg-card-hover text-[var(--th-loss)] animate-pulse'
      }`}
      aria-live="polite"
    >
      {isOnline ? (
        <>
          <Cloud size={14} aria-hidden="true" />
          <span className="hidden sm:inline">Online</span>
          <span className="sr-only sm:hidden">Online</span>
        </>
      ) : (
        <>
          <CloudOff size={14} aria-hidden="true" />
          <span className="hidden sm:inline">Offline</span>
          <span className="sr-only sm:hidden">Offline</span>
        </>
      )}
    </output>
  )
}
