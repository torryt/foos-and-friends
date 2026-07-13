import type { GroupPreview } from '@foos/shared'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { AlertCircle, Clock, Loader, UserPlus, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { z } from 'zod'
import { useGroupContext } from '@/contexts/GroupContext'
import { useToast } from '@/hooks/useToast'
import { groupService } from '@/lib/init'

const joinSearchSchema = z.object({
  groupId: z.string(),
})

// Where a logged-out visitor lands after clicking "Sign in to join" on a
// group page: the root route's auth gate shows the sign-in form first, then
// this page files the join (or join request) by group id — no invite code.
export const Route = createFileRoute('/join')({
  component: JoinPage,
  validateSearch: joinSearchSchema,
})

function JoinPage() {
  const { groupId } = Route.useSearch()
  const { refreshGroups, userGroups } = useGroupContext()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [preview, setPreview] = useState<GroupPreview | null>(null)
  const [checking, setChecking] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [requestPending, setRequestPending] = useState(false)

  useEffect(() => {
    let stale = false
    const load = async () => {
      const [previewResult, myRequests] = await Promise.all([
        groupService.getGroupPreview(groupId),
        groupService.getMyPendingJoinRequests(),
      ])
      if (stale) return
      if (previewResult.data) {
        setPreview(previewResult.data)
      } else {
        setError(previewResult.error || 'Group not found')
      }
      if (myRequests.data.some((r) => r.groupId === groupId)) {
        setRequestPending(true)
      }
      setChecking(false)
    }
    load()
    return () => {
      stale = true
    }
  }, [groupId])

  // Already a member: go straight to the group
  useEffect(() => {
    if (userGroups.some((g) => g.id === groupId)) {
      navigate({ to: '/groups/$groupId', params: { groupId }, replace: true })
    }
  }, [userGroups, groupId, navigate])

  const handleJoin = async () => {
    setLoading(true)
    setError(null)

    const result = await groupService.requestToJoinGroup(groupId)
    setLoading(false)

    if (result.success && result.status === 'pending') {
      setRequestPending(true)
      toast().success('Request sent — a group admin needs to approve it')
      return
    }

    if (result.success && result.status === 'joined') {
      toast().success(`Successfully joined ${result.groupName}!`)
      await refreshGroups()
      navigate({ to: '/groups/$groupId', params: { groupId } })
      return
    }

    setError(result.error || 'Failed to join group')
    toast().error(result.error || 'Failed to join group')
  }

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <div className="bg-card backdrop-blur-sm rounded-2xl p-8 max-w-md shadow-2xl border border-[var(--th-border-subtle)] text-center">
          <Loader className="animate-spin mx-auto mb-4 text-[var(--th-sport-primary)]" size={48} />
          <h1 className="text-2xl font-bold text-primary mb-4">Loading Group</h1>
          <p className="text-secondary">Please wait…</p>
        </div>
      </div>
    )
  }

  if (!preview) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <div className="bg-card backdrop-blur-sm rounded-2xl p-8 max-w-md shadow-2xl border border-[var(--th-border-subtle)] text-center">
          <AlertCircle className="mx-auto mb-4 text-[var(--th-loss)]" size={48} />
          <h1 className="text-2xl font-bold text-primary mb-4">Group Not Found</h1>
          <p className="text-secondary mb-6">This group doesn't exist or is no longer active.</p>
          <button
            type="button"
            onClick={() => navigate({ to: '/' })}
            className="bg-sport-gradient text-white px-6 py-3 rounded-lg font-semibold hover:bg-sport-gradient-hover transition-colors"
          >
            Go to App
          </button>
        </div>
      </div>
    )
  }

  if (requestPending) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <div className="bg-card backdrop-blur-sm rounded-2xl p-8 max-w-md shadow-2xl border border-[var(--th-border-subtle)] text-center">
          <div className="w-16 h-16 bg-card-hover rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="text-[var(--th-sport-primary)]" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-primary mb-4">Request Pending</h1>
          <p className="text-secondary mb-6">
            Your request to join "{preview.name}" has been sent. A group admin needs to approve it
            before you're in.
          </p>
          <button
            type="button"
            onClick={() => navigate({ to: '/' })}
            className="bg-sport-gradient text-white px-6 py-3 rounded-lg font-semibold hover:bg-sport-gradient-hover transition-colors"
          >
            Go to App
          </button>
        </div>
      </div>
    )
  }

  const requiresApproval = preview.joinPolicy === 'approval'

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <div className="bg-card backdrop-blur-sm rounded-2xl p-8 max-w-md shadow-2xl border border-[var(--th-border-subtle)]">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-card-hover rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="text-[var(--th-sport-primary)]" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-primary mb-2">Join {preview.name}</h1>
          {preview.description && <p className="text-sm text-muted mt-2">{preview.description}</p>}
          {requiresApproval && (
            <p className="text-xs text-muted mt-3 flex items-center justify-center gap-1.5">
              <Clock size={12} aria-hidden="true" />
              Joining requires approval from a group admin
            </p>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-card-hover border border-[var(--th-border)] rounded-lg">
            <p className="text-primary text-sm flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={handleJoin}
          disabled={loading}
          className="w-full bg-sport-gradient text-white px-6 py-3 rounded-lg font-semibold hover:bg-sport-gradient-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader className="animate-spin" size={20} />
              {requiresApproval ? 'Sending request…' : 'Joining...'}
            </>
          ) : (
            <>
              <UserPlus size={20} />
              {requiresApproval ? 'Request to Join' : 'Join Group'}
            </>
          )}
        </button>
      </div>
    </div>
  )
}
