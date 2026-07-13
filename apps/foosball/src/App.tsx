import { ResetPasswordPage, ThemeProvider } from '@foos/shared'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { GroupProvider } from '@/contexts/GroupContext'
import { SeasonProvider } from '@/contexts/SeasonContext'
import { routeTree } from '@/routeTree.gen'

// Create a new router instance
const router = createRouter({
  routeTree,
})

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

function App() {
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
          <RouterProvider router={router} />
        </SeasonProvider>
      </GroupProvider>
    </ThemeProvider>
  )
}

export default App
