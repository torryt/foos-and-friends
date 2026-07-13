import { createRootRoute, Outlet, useLocation } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import Header from '@/components/Header'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import TabNavigation from '@/components/TabNavigation'
import { ToastContainer } from '@/components/Toast'
import { useAuth } from '@/hooks/useAuth'

export const Route = createRootRoute({
  component: () => (
    <div className="min-h-screen bg-page">
      <RootComponent />
      <ToastContainer />
      <TanStackRouterDevtools />
    </div>
  ),
})

function RootComponent() {
  // user comes from the reactive auth hook, not router context — route context
  // is frozen at match time, so on a hard refresh it would still hold null
  const { user, signOut } = useAuth()
  const location = useLocation()

  // Group pages handle auth themselves (they're viewable logged-out) and
  // bring their own chrome — full app for members, read-only view otherwise
  if (location.pathname.startsWith('/groups/')) {
    return <Outlet />
  }

  // The entry redirect / first-time screen is fullscreen, no chrome
  if (location.pathname === '/') {
    return (
      <ProtectedRoute>
        <Outlet />
      </ProtectedRoute>
    )
  }

  // Everything else (settings, invite, join) is authed with the app chrome
  return (
    <ProtectedRoute>
      <Header user={user} onSignOut={signOut} />
      <TabNavigation />

      <div className="container mx-auto max-w-6xl p-4">
        <Outlet />
      </div>
    </ProtectedRoute>
  )
}
