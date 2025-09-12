import type { ReactNode } from 'react'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { groupService } from '@/services/groupService'
import type { FriendGroup } from '@/types'

interface GroupContextType {
  currentGroup: FriendGroup | null
  userGroups: FriendGroup[]
  hasAnyGroups: boolean
  loading: boolean
  error: string | null
  switchGroup: (groupId: string) => void
  refreshGroups: () => Promise<void>
  createGroup: (name: string, description?: string) => Promise<{ success: boolean; error?: string }>
  joinGroup: (inviteCode: string) => Promise<{ success: boolean; error?: string }>
}

const GroupContext = createContext<GroupContextType | null>(null)

export const useGroupContext = () => {
  const context = useContext(GroupContext)
  if (!context) {
    throw new Error('useGroupContext must be used within a GroupProvider')
  }
  return context
}

interface GroupProviderProps {
  children: ReactNode
}

export const GroupProvider = ({ children }: GroupProviderProps) => {
  const { user, isAuthenticated } = useAuth()
  const [currentGroup, setCurrentGroup] = useState<FriendGroup | null>(null)
  const [userGroups, setUserGroups] = useState<FriendGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load user's groups
  const refreshGroups = useCallback(async () => {
    if (!isAuthenticated || !user) return

    setLoading(true)
    setError(null)

    try {
      const result = await groupService.getUserGroups(user.id)

      if (result.error) {
        setError(result.error)
        setUserGroups([])
        setCurrentGroup(null)
      } else {
        setUserGroups(result.data)

        // Set first group as current if none selected and no current group exists
        setCurrentGroup((current) => {
          if (!current && result.data.length > 0) {
            return result.data[0]
          }
          return current
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load groups')
      setUserGroups([])
      setCurrentGroup(null)
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, user])

  // Switch to a different group
  const switchGroup = useCallback(
    (groupId: string) => {
      const group = userGroups.find((g) => g.id === groupId)
      if (group) {
        setCurrentGroup(group)
      }
    },
    [userGroups],
  )

  // Check for pending invites and auto-join
  const handlePendingInvites = useCallback(async () => {
    if (!isAuthenticated || !user) return

    const pendingInviteCode = localStorage.getItem('pendingInviteCode')
    if (!pendingInviteCode) return

    try {
      const result = await groupService.joinGroupByInvite(pendingInviteCode)

      if (result.success && result.groupId) {
        // Clear the pending invite
        localStorage.removeItem('pendingInviteCode')

        // Refresh groups to include the new one
        await refreshGroups()

        // Switch to the newly joined group
        switchGroup(result.groupId)
      }
      // If joining fails, we'll leave the pending invite for manual retry
    } catch (err) {
      console.error('Failed to handle pending invite:', err)
      // Leave the pending invite for manual retry
    }
  }, [isAuthenticated, user, refreshGroups, switchGroup])

  // Check for pending invites after groups are loaded
  useEffect(() => {
    if (isAuthenticated && user && userGroups.length >= 0) {
      handlePendingInvites()
    }
  }, [isAuthenticated, user, userGroups, handlePendingInvites])

  // Create a new group
  const createGroup = async (name: string, description?: string) => {
    if (!isAuthenticated || !user) {
      return { success: false, error: 'Not authenticated' }
    }

    setError(null)

    try {
      const result = await groupService.createGroup(name, description)

      if (result.success) {
        // Refresh groups to include the new one
        await refreshGroups()

        // Switch to the new group if we have the ID
        if (result.groupId) {
          const newGroup = userGroups.find((g) => g.id === result.groupId)
          if (newGroup) {
            setCurrentGroup(newGroup)
          }
        }

        return { success: true }
      } else {
        setError(result.error || 'Failed to create group')
        return { success: false, error: result.error }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create group'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  // Join a group by invite code
  const joinGroup = async (inviteCode: string) => {
    if (!isAuthenticated || !user) {
      return { success: false, error: 'Not authenticated' }
    }

    setError(null)

    try {
      const result = await groupService.joinGroupByInvite(inviteCode, user.id)

      if (result.success) {
        // Refresh groups to include the joined group
        await refreshGroups()

        // Switch to the joined group if we have the ID
        if (result.groupId) {
          const joinedGroup = userGroups.find((g) => g.id === result.groupId)
          if (joinedGroup) {
            setCurrentGroup(joinedGroup)
          }
        }

        return { success: true }
      } else {
        setError(result.error || 'Failed to join group')
        return { success: false, error: result.error }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to join group'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  // Load groups when user authenticates
  useEffect(() => {
    if (isAuthenticated && user) {
      refreshGroups()
    } else {
      setUserGroups([])
      setCurrentGroup(null)
      setError(null)
    }
  }, [isAuthenticated, user, refreshGroups])

  return (
    <GroupContext.Provider
      value={{
        currentGroup,
        userGroups,
        hasAnyGroups: userGroups.length > 0,
        loading,
        error,
        switchGroup,
        refreshGroups,
        createGroup,
        joinGroup,
      }}
    >
      {children}
    </GroupContext.Provider>
  )
}
