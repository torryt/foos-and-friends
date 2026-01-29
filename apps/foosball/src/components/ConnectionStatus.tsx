import { Cloud, CloudOff } from 'lucide-react'
import { useOfflineStatus } from '@/hooks/useOfflineStatus'

export const ConnectionStatus = () => {
  const { isOnline } = useOfflineStatus()

  return (
    <output
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-300 ${
        isOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700 animate-pulse'
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
