import type { PendingJoinRequestCount } from '@foos/shared'
import { useQuery } from '@tanstack/react-query'
import { useGroupContext } from '@/contexts/GroupContext'
import { groupService } from '@/lib/init'

const POLL_INTERVAL_MS = 60_000

// Pending join-request counts across every group the user owns or
// administers, polled for the header notification bell.
export function useJoinRequests() {
  const { userGroups } = useGroupContext()

  const isAdminOfAnyGroup = userGroups.some(
    (g) => g.isOwner || g.currentUserRole === 'admin' || g.currentUserRole === 'owner',
  )

  const joinRequestCountsQuery = useQuery({
    queryKey: ['joinRequestCounts'],
    queryFn: async () => {
      const result = await groupService.getPendingJoinRequestCounts()
      if (result.error) throw new Error(result.error)
      return result.data
    },
    enabled: isAdminOfAnyGroup,
    // Always stale, so focusing the window refetches immediately — the bell
    // should never show a stale count when the admin comes back to the tab.
    staleTime: 0,
    refetchInterval: POLL_INTERVAL_MS,
    refetchOnWindowFocus: true,
  })

  const refresh = async () => {
    if (!isAdminOfAnyGroup) {
      return
    }
    await joinRequestCountsQuery.refetch()
  }

  const counts: PendingJoinRequestCount[] = isAdminOfAnyGroup
    ? (joinRequestCountsQuery.data ?? [])
    : []

  const totalCount = counts.reduce((sum, c) => sum + c.count, 0)

  return { counts, totalCount, refresh }
}
