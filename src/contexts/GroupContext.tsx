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
  processingPendingInvite: boolean
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

// Helper functions for localStorage group persistence
const getStorageKey = (userId: string) => `selectedGroupId_${userId}`

const getStoredGroupId = (userId: string): string | null => {
  try {
    return localStorage.getItem(getStorageKey(userId))
  } catch {
    return null
  }
}

const setStoredGroupId = (userId: string, groupId: string) => {
  try {
    localStorage.setItem(getStorageKey(userId), groupId)
  } catch {
    // Ignore localStorage errors (e.g., private browsing)
  }
}

const removeStoredGroupId = (userId: string) => {
  try {
    localStorage.removeItem(getStorageKey(userId))
  } catch {
    // Ignore localStorage errors
  }
}

export const GroupProvider = ({ children }: GroupProviderProps) => {
  const { user, isAuthenticated } = useAuth()
  const [currentGroup, setCurrentGroup] = useState<FriendGroup | null>(null)
  const [userGroups, setUserGroups] = useState<FriendGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [processingPendingInvite, setProcessingPendingInvite] = useState(false)

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

        // Try to restore saved group, otherwise set first group as current
        setCurrentGroup((current) => {
          if (!current && result.data.length > 0) {
            // Try to restore the previously selected group
            const storedGroupId = getStoredGroupId(user.id)
            if (storedGroupId) {
              const storedGroup = result.data.find((g) => g.id === storedGroupId)
              if (storedGroup) {
                return storedGroup
              } else {
                // Stored group no longer exists, clean up localStorage
                removeStoredGroupId(user.id)
              }
            }
            // Fall back to first group
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
      if (group && user) {
        setCurrentGroup(group)
        // Save the selected group to localStorage
        setStoredGroupId(user.id, groupId)
      }
    },
    [userGroups, user],
  )

  // Check for pending invites and auto-join
  const handlePendingInvites = useCallback(async () => {
    if (!isAuthenticated || !user) return

    // Check for invite code in URL parameters only
    const urlParams = new URLSearchParams(window.location.search)
    const inviteCode = urlParams.get('invite')
    if (!inviteCode) return

    setProcessingPendingInvite(true)

    try {
      const result = await groupService.joinGroupByInvite(inviteCode)

      if (result.success && result.groupId) {
        // Clean up the URL
        const cleanUrl = new URL(window.location.href)
        cleanUrl.searchParams.delete('invite')
        window.history.replaceState({}, document.title, cleanUrl.toString())

        // Refresh groups to include the new one
        await refreshGroups()

        // Switch to the newly joined group
        switchGroup(result.groupId)
      }
      // If joining fails, the user can retry manually or use the invite link again
    } catch (err) {
      console.error('Failed to handle pending invite:', err)
    } finally {
      setProcessingPendingInvite(false)
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
          switchGroup(result.groupId)
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
          switchGroup(result.groupId)
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
      // Clear state when user signs out (but keep localStorage for next sign-in)
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
        processingPendingInvite,
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
