import type { FriendGroup, SportType } from '@foos/shared'
import type { ReactNode } from 'react'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { groupService } from '@/lib/init'

// Sport type for this app - foosball groups only
const SPORT_TYPE: SportType = 'foosball'

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
  deleteGroup: (groupId: string) => Promise<{
    success: boolean
    error?: string
    deletedCounts?: { players: number; matches: number; members: number }
  }>
  leaveGroup: (groupId: string) => Promise<{ success: boolean; error?: string }>
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

  // Load user's groups
  const refreshGroups = useCallback(async () => {
    if (!isAuthenticated || !user) return

    setLoading(true)
    setError(null)

    try {
      const result = await groupService.getUserGroups(user.id, SPORT_TYPE)

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

  // Create a new group
  const createGroup = async (name: string, description?: string) => {
    if (!isAuthenticated || !user) {
      return { success: false, error: 'Not authenticated' }
    }

    setError(null)

    try {
      const result = await groupService.createGroup(name, description, SPORT_TYPE)

      if (result.success && result.groupId) {
        // Immediately set the new group as current to avoid UI issues
        // This ensures smooth transition from FirstTimeUserScreen to the main app
        const newGroup: FriendGroup = {
          id: result.groupId,
          name: result.name || name,
          description: description || null,
          inviteCode: result.inviteCode || '',
          ownerId: user.id,
          createdBy: user.id,
          isActive: true,
          maxMembers: 50,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isOwner: true,
          playerCount: 0,
        }

        // Set the new group as current immediately
        setCurrentGroup(newGroup)
        setStoredGroupId(user.id, result.groupId)

        // Then refresh to get the complete group list
        await refreshGroups()

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

      if (result.success && result.groupId) {
        // Immediately set the joined group as current to avoid UI issues
        // This ensures smooth transition from FirstTimeUserScreen to the main app
        const joinedGroup: FriendGroup = {
          id: result.groupId,
          name: result.groupName || '',
          description: null,
          inviteCode: inviteCode,
          ownerId: '', // Will be updated after refresh
          createdBy: '',
          isActive: true,
          maxMembers: 50,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isOwner: false,
          playerCount: 0,
        }

        // Set the joined group as current immediately
        setCurrentGroup(joinedGroup)
        setStoredGroupId(user.id, result.groupId)

        // Then refresh to get the complete group list with full details
        await refreshGroups()

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

  // Delete a group
  const deleteGroup = async (groupId: string) => {
    if (!isAuthenticated || !user) {
      return { success: false, error: 'Not authenticated' }
    }

    setError(null)

    try {
      const result = await groupService.deleteGroup(groupId, user.id)

      if (result.success) {
        // Handle current group cleanup
        if (currentGroup?.id === groupId) {
          // Remove from localStorage
          removeStoredGroupId(user.id)
          setCurrentGroup(null)
        }

        // Refresh groups to remove the deleted one
        await refreshGroups()

        // If we just deleted the current group, switch to the first available group
        if (currentGroup?.id === groupId) {
          const updatedGroups = userGroups.filter((g) => g.id !== groupId)
          if (updatedGroups.length > 0) {
            switchGroup(updatedGroups[0].id)
          }
        }

        return {
          success: true,
          deletedCounts: result.deletedCounts,
        }
      } else {
        setError(result.error || 'Failed to delete group')
        return { success: false, error: result.error }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete group'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  // Leave a group
  const leaveGroup = async (groupId: string) => {
    if (!isAuthenticated || !user) {
      return { success: false, error: 'Not authenticated' }
    }

    setError(null)

    try {
      const result = await groupService.leaveGroup(groupId, user.id)

      if (result.success) {
        // Handle current group cleanup
        if (currentGroup?.id === groupId) {
          // Remove from localStorage
          removeStoredGroupId(user.id)
          setCurrentGroup(null)
        }

        // Refresh groups to remove the left group
        await refreshGroups()

        // If we just left the current group, switch to the first available group
        if (currentGroup?.id === groupId) {
          const updatedGroups = userGroups.filter((g) => g.id !== groupId)
          if (updatedGroups.length > 0) {
            switchGroup(updatedGroups[0].id)
          }
        }

        return { success: true }
      } else {
        setError(result.error || 'Failed to leave group')
        return { success: false, error: result.error }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to leave group'
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
        switchGroup,
        refreshGroups,
        createGroup,
        joinGroup,
        deleteGroup,
        leaveGroup,
      }}
    >
      {children}
    </GroupContext.Provider>
  )
}
