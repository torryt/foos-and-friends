import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { useState } from 'react'
import Header from '@/components/Header'
import PlayerManagementModal from '@/components/PlayerManagementModal'
import TabNavigation from '@/components/TabNavigation'
import { ToastContainer } from '@/components/Toast'
import { useGameLogic } from '@/hooks/useGameLogic'
import type { AuthUser } from '@/types'

interface MyRouterContext {
  user: AuthUser | null
  onSignOut: () => void
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: () => (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-yellow-100">
      <RootComponent />
      <ToastContainer />
      <TanStackRouterDevtools />
    </div>
  ),
})

function RootComponent() {
  const { user, onSignOut } = Route.useRouteContext()
  const [showManagePlayers, setShowManagePlayers] = useState(false)
  const { players, updatePlayer, deletePlayer } = useGameLogic()
  const isAdmin = true // Will need to get this from context later

  return (
    <>
      <Header
        user={user}
        onSignOut={onSignOut}
        onManageGroup={(_groupId) => {
          // For now, just show the manage players modal
          setShowManagePlayers(true)
        }}
      />
      <TabNavigation />

      <div className="container mx-auto max-w-6xl p-4">
        <Outlet />
      </div>

      <PlayerManagementModal
        isOpen={showManagePlayers}
        onClose={() => setShowManagePlayers(false)}
        players={players}
        currentUserId={user?.id}
        isAdmin={isAdmin}
        onUpdatePlayer={updatePlayer}
        onDeletePlayer={deletePlayer}
      />
    </>
  )
}
