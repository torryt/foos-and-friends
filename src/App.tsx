import { createRouter, RouterProvider } from '@tanstack/react-router'
import { useState } from 'react'
import { CreateGroupModal } from '@/components/CreateGroupModal'
import { FirstTimeUserScreen } from '@/components/FirstTimeUserScreen'
import { JoinGroupModal } from '@/components/JoinGroupModal'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { GroupProvider, useGroupContext } from '@/contexts/GroupContext'
import { useAuth } from '@/hooks/useAuth'
import { routeTree } from '@/routeTree.gen'
import type { AuthUser } from '@/types'

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

interface AppContentProps {
  user: AuthUser | null
  onSignOut: () => void
}

const AppContent = ({ user, onSignOut }: AppContentProps) => {
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [showJoinGroup, setShowJoinGroup] = useState(false)

  const { currentGroup, loading } = useGroupContext()

  // If on invite page, always use router regardless of group status
  if (window.location.pathname === '/invite') {
    return (
      <RouterProvider
        router={router}
        context={{
          user,
          onSignOut,
        }}
      />
    )
  }

  // Show group selection when no active group
  if (!currentGroup) {
    return (
      <>
        <FirstTimeUserScreen
          onCreateGroup={() => setShowCreateGroup(true)}
          onJoinGroup={() => setShowJoinGroup(true)}
          loading={loading}
        />

        {/* Group management modals - available from selection screen */}
        <CreateGroupModal isOpen={showCreateGroup} onClose={() => setShowCreateGroup(false)} />
        <JoinGroupModal isOpen={showJoinGroup} onClose={() => setShowJoinGroup(false)} />
      </>
    )
  }

  // Normal app functionality when group is selected - use router
  return (
    <RouterProvider
      router={router}
      context={{
        user,
        onSignOut,
      }}
    />
  )
}

function App() {
  const { user, signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <ProtectedRoute>
      <GroupProvider>
        <AppContent user={user} onSignOut={handleSignOut} />
      </GroupProvider>
    </ProtectedRoute>
  )
}

export default App
