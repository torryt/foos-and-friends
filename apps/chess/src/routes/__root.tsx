import type { AuthUser } from '@foos/shared'
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
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
    <div className="min-h-screen bg-gradient-to-br from-[#F0EFF4] via-[#F0EFF4]/80 to-[#E8D5E0]">
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
