import { createRouter, RouterProvider } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { CreateGroupModal } from '@/components/CreateGroupModal'
import { GroupSelectionScreen } from '@/components/GroupSelectionScreen'
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

  const { currentGroup, userGroups, loading, switchGroup, joinGroup } = useGroupContext()

  // Handle invite links on app load
  useEffect(() => {
    const handleInviteLink = async () => {
      const path = window.location.pathname
      const inviteMatch = path.match(/\/invite\/([A-Z0-9]+)$/i)

      if (inviteMatch && user) {
        const inviteCode = inviteMatch[1]
        try {
          const result = await joinGroup(inviteCode)
          if (result.success) {
            // Clear the invite URL after successful join
            window.history.replaceState({}, '', '/')
            // Optional: Show success message
            console.log('Successfully joined group via invite link')
          } else {
            console.error('Failed to join group:', result.error)
            // Optional: Show error message to user
          }
        } catch (error) {
          console.error('Error processing invite link:', error)
        }
      }
    }

    handleInviteLink()
  }, [user, joinGroup])

  // Show group selection when no active group
  if (!currentGroup) {
    return (
      <>
        <GroupSelectionScreen
          userGroups={userGroups}
          onSelectGroup={switchGroup}
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
