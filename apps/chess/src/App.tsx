import { type AuthUser, ResetPasswordPage, ThemeProvider } from '@foos/shared'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { GroupProvider } from '@/contexts/GroupContext'
import { SeasonProvider } from '@/contexts/SeasonContext'
import { useAuth } from '@/hooks/useAuth'
import { routeTree } from '@/routeTree.gen'

// Create a new router instance
const router = createRouter({
  routeTree,
  context: {
    user: null as AuthUser | null,
    onSignOut: (() => {}) as () => void,
  },
})

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

function App() {
  const { user, signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
  }

  // Password recovery links from Supabase land here. Rendered outside the
  // router so an expired link shows the reset page's error state instead of
  // the sign-in form.
  if (window.location.pathname === '/reset-password') {
    return (
      <ThemeProvider>
        <ResetPasswordPage />
      </ThemeProvider>
    )
  }

  // Auth gating happens per-route (see __root.tsx): group pages are viewable
  // logged out, everything else sits behind the sign-in form. The providers
  // tolerate an unauthenticated session (they just hold no groups).
  return (
    <ThemeProvider>
      <GroupProvider>
        <SeasonProvider>
          <RouterProvider router={router} context={{ user, onSignOut: handleSignOut }} />
        </SeasonProvider>
      </GroupProvider>
    </ThemeProvider>
  )
}

export default App
