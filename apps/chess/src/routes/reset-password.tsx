import { ResetPasswordPage } from '@foos/shared'
import { createFileRoute } from '@tanstack/react-router'

// Normally handled before the router mounts (see App.tsx), but registered as a
// route so client-side navigation to /reset-password also resolves.
export const Route = createFileRoute('/reset-password')({
  component: ResetPasswordPage,
})
