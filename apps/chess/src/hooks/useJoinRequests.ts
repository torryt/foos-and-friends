import type { PendingJoinRequestCount } from '@foos/shared'
import { useCallback, useEffect, useState } from 'react'
import { useGroupContext } from '@/contexts/GroupContext'
import { groupService } from '@/lib/init'

const POLL_INTERVAL_MS = 60_000

// Pending join-request counts across every group the user owns or
// administers, polled for the header notification bell.
export function useJoinRequests() {
  const { userGroups } = useGroupContext()
  const [counts, setCounts] = useState<PendingJoinRequestCount[]>([])

  const isAdminOfAnyGroup = userGroups.some(
    (g) => g.isOwner || g.currentUserRole === 'admin' || g.currentUserRole === 'owner',
  )

  const refresh = useCallback(async () => {
    if (!isAdminOfAnyGroup) {
      setCounts([])
      return
    }
    const result = await groupService.getPendingJoinRequestCounts()
    if (!result.error) {
      setCounts(result.data)
    }
  }, [isAdminOfAnyGroup])

  useEffect(() => {
    refresh()
    if (!isAdminOfAnyGroup) return

    const interval = setInterval(refresh, POLL_INTERVAL_MS)
    const onFocus = () => refresh()
    window.addEventListener('focus', onFocus)
    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', onFocus)
    }
  }, [refresh, isAdminOfAnyGroup])

  const totalCount = counts.reduce((sum, c) => sum + c.count, 0)

  return { counts, totalCount, refresh }
}
