import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { CreateGroupModal } from '@/components/CreateGroupModal'
import { FirstTimeUserScreen } from '@/components/FirstTimeUserScreen'
import { JoinGroupModal } from '@/components/JoinGroupModal'
import { useGroupContext } from '@/contexts/GroupContext'

export const Route = createFileRoute('/')({
  component: Index,
})

// The app's entry point: sends signed-in users to their default group (the
// last group they visited, restored from localStorage by GroupContext), or
// shows the first-time screen when they have none.
function Index() {
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [showJoinGroup, setShowJoinGroup] = useState(false)
  const { currentGroup, hasAnyGroups, loading } = useGroupContext()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && currentGroup) {
      navigate({
        to: '/groups/$groupId',
        params: { groupId: currentGroup.id },
        replace: true,
      })
    }
  }, [loading, currentGroup, navigate])

  if (loading || currentGroup) {
    return (
      <FirstTimeUserScreen
        onCreateGroup={() => setShowCreateGroup(true)}
        onJoinGroup={() => setShowJoinGroup(true)}
        loading={true}
      />
    )
  }

  if (!hasAnyGroups) {
    return (
      <>
        <FirstTimeUserScreen
          onCreateGroup={() => setShowCreateGroup(true)}
          onJoinGroup={() => setShowJoinGroup(true)}
          loading={false}
        />

        {/* Group management modals - available from selection screen */}
        <CreateGroupModal isOpen={showCreateGroup} onClose={() => setShowCreateGroup(false)} />
        <JoinGroupModal isOpen={showJoinGroup} onClose={() => setShowJoinGroup(false)} />
      </>
    )
  }

  // Groups exist but none selected yet — GroupContext is about to pick one
  return (
    <FirstTimeUserScreen
      onCreateGroup={() => setShowCreateGroup(true)}
      onJoinGroup={() => setShowJoinGroup(true)}
      loading={true}
    />
  )
}
