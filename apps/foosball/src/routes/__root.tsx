import type { AuthUser } from '@foos/shared'
import { createRootRouteWithContext, Outlet, useLocation } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import Header from '@/components/Header'
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

  // The public read-only subtree brings its own chrome (no auth-dependent
  // header or tab navigation)
  if (location.pathname.startsWith('/public')) {
    return <Outlet />
  }

  return (
    <>
      <Header user={user} onSignOut={onSignOut} />
      <TabNavigation />

      <div className="container mx-auto max-w-6xl p-4">
        <Outlet />
      </div>
    </>
  )
}
