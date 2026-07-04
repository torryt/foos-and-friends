import { UserSettingsPage } from '@foos/shared'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/settings')({
  component: UserSettingsPage,
})
