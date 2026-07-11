import type { JoinRequest, PendingJoinRequestCount } from '@foos/shared'
import { useClickOutside } from '@foos/shared'
import { Bell, Check, Loader, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useGroupContext } from '@/contexts/GroupContext'
import { useJoinRequests } from '@/hooks/useJoinRequests'
import { useToast } from '@/hooks/useToast'
import { groupService } from '@/lib/init'

// Header notification bell: badge with the number of pending join requests
// across all groups the user administers, and a dropdown to approve/deny.
export const JoinRequestsBell = () => {
  const { counts, totalCount, refresh } = useJoinRequests()
  const { refreshGroups } = useGroupContext()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [requestsByGroup, setRequestsByGroup] = useState<Map<string, JoinRequest[]>>(new Map())
  const [loadingRequests, setLoadingRequests] = useState(false)
  const [actingOn, setActingOn] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  useClickOutside(containerRef, () => setOpen(false), open)

  // Load the actual requests when the dropdown opens
  useEffect(() => {
    if (!open || counts.length === 0) return
    let stale = false
    setLoadingRequests(true)
    Promise.all(
      counts.map(async (c: PendingJoinRequestCount) => {
        const result = await groupService.getPendingJoinRequests(c.groupId)
        return [c.groupId, result.data] as const
      }),
    ).then((entries) => {
      if (stale) return
      setRequestsByGroup(new Map(entries))
      setLoadingRequests(false)
    })
    return () => {
      stale = true
    }
  }, [open, counts])

  const handleAction = async (request: JoinRequest, action: 'approve' | 'deny') => {
    setActingOn(request.id)
    try {
      const result =
        action === 'approve'
          ? await groupService.approveJoinRequest(request.id)
          : await groupService.denyJoinRequest(request.id)

      if (result.success) {
        toast().success(action === 'approve' ? 'Request approved' : 'Request denied')
        setRequestsByGroup((prev) => {
          const next = new Map(prev)
          next.set(
            request.groupId,
            (next.get(request.groupId) ?? []).filter((r) => r.id !== request.id),
          )
          return next
        })
        await refresh()
        if (action === 'approve') {
          // New member affects group member counts shown elsewhere
          await refreshGroups()
        }
      } else {
        toast().error(result.error || `Failed to ${action} request`)
      }
    } finally {
      setActingOn(null)
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label={totalCount > 0 ? `${totalCount} pending join requests` : 'Join requests'}
        aria-expanded={open}
        className="relative bg-card px-2 py-2 min-h-11 min-w-11 rounded-[var(--th-radius-md)] border border-[var(--th-border-subtle)] hover:bg-card-hover transition-colors flex items-center justify-center"
      >
        <Bell size={16} className="text-secondary" />
        {totalCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-[var(--th-loss)] text-white text-[10px] font-bold rounded-full min-w-4.5 h-4.5 px-1 flex items-center justify-center">
            {totalCount > 9 ? '9+' : totalCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-x-4 top-16 sm:absolute sm:inset-x-auto sm:top-full sm:right-0 sm:mt-1 sm:w-80 bg-card rounded-[var(--th-radius-lg)] shadow-theme-card border border-[var(--th-border)] z-20">
          <div className="p-3 border-b border-[var(--th-border)]">
            <h3 className="text-sm font-semibold text-primary">Join requests</h3>
          </div>

          <div className="max-h-96 overflow-y-auto p-2">
            {counts.length === 0 ? (
              <p className="px-3 py-4 text-sm text-muted text-center">No pending requests</p>
            ) : loadingRequests ? (
              <div className="flex justify-center py-4">
                <Loader size={18} className="animate-spin text-muted" />
              </div>
            ) : (
              counts.map((count) => (
                <div key={count.groupId} className="mb-2 last:mb-0">
                  <div className="px-3 py-1 text-xs font-medium text-muted uppercase tracking-wide">
                    {count.groupName}
                  </div>
                  {(requestsByGroup.get(count.groupId) ?? []).map((request) => (
                    <div
                      key={request.id}
                      className="px-3 py-2 flex items-center gap-2 rounded-lg hover:bg-card-hover"
                    >
                      <span className="flex-1 text-sm text-primary truncate">
                        {request.email ?? 'Unknown user'}
                      </span>
                      <button
                        type="button"
                        disabled={actingOn === request.id}
                        onClick={() => handleAction(request, 'approve')}
                        aria-label={`Approve ${request.email ?? 'request'}`}
                        className="min-h-11 min-w-11 flex items-center justify-center rounded-[var(--th-radius-md)] bg-accent-subtle text-[var(--th-win)] hover:opacity-80 transition-opacity disabled:opacity-50"
                      >
                        <Check size={18} />
                      </button>
                      <button
                        type="button"
                        disabled={actingOn === request.id}
                        onClick={() => handleAction(request, 'deny')}
                        aria-label={`Deny ${request.email ?? 'request'}`}
                        className="min-h-11 min-w-11 flex items-center justify-center rounded-[var(--th-radius-md)] bg-card border border-[var(--th-border-subtle)] text-[var(--th-loss)] hover:bg-card-hover transition-colors disabled:opacity-50"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
