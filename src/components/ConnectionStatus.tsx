import { Cloud, CloudOff } from 'lucide-react'
import { useOfflineStatus } from '@/hooks/useOfflineStatus'

export const ConnectionStatus = () => {
  const { isOnline } = useOfflineStatus()

  return (
    <div
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-300 ${
        isOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700 animate-pulse'
      }`}
    >
      {isOnline ? (
        <>
          <Cloud size={14} />
          <span>Online</span>
        </>
      ) : (
        <>
          <CloudOff size={14} />
          <span>Offline</span>
        </>
      )}
    </div>
  )
}
