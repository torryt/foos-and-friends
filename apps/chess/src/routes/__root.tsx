import type { AuthUser } from '@foos/shared'
import { createRootRouteWithContext, Outlet, useLocation } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import Header from '@/components/Header'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import TabNavigation from '@/components/TabNavigation'
import { ToastContainer } from '@/components/Toast'

interface MyRouterContext {
  user: AuthUser | null
  onSignOut: () => void
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: () => (
    <div className="min-h-screen bg-page">
      <RootComponent />
      <ToastContainer />
      <TanStackRouterDevtools />
    </div>
  ),
})

function RootComponent() {
  const { user, onSignOut } = Route.useRouteContext()
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
      <Header user={user} onSignOut={onSignOut} />
      <TabNavigation />

      <div className="container mx-auto max-w-6xl p-4">
        <Outlet />
      </div>
    </ProtectedRoute>
  )
}
