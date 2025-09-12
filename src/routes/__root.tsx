import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import Header from '@/components/Header'
import TabNavigation from '@/components/TabNavigation'
import { ToastContainer } from '@/components/Toast'
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
