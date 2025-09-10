import type { ReactNode } from 'react'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { isMockMode } from '@/lib/supabase'
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

        // Set first group as current if none selected
        if (!currentGroup && result.data.length > 0) {
          setCurrentGroup(result.data[0])
          if (isMockMode) {
            groupService.setCurrentMockGroup(result.data[0].id)
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load groups')
      setUserGroups([])
      setCurrentGroup(null)
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, user, currentGroup])

  // Switch to a different group
  const switchGroup = (groupId: string) => {
    const group = userGroups.find((g) => g.id === groupId)
    if (group) {
      setCurrentGroup(group)
      if (isMockMode) {
        groupService.setCurrentMockGroup(groupId)
      }
    }
  }

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
            if (isMockMode) {
              groupService.setCurrentMockGroup(result.groupId)
            }
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
            if (isMockMode) {
              groupService.setCurrentMockGroup(result.groupId)
            }
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

  // For mock mode, set up the default group
  useEffect(() => {
    if (isMockMode && isAuthenticated && !currentGroup) {
      const mockGroup = groupService.getCurrentMockGroup()
      setCurrentGroup(mockGroup)
      setUserGroups([mockGroup])
    }
  }, [isAuthenticated, currentGroup])

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
