import type { JoinPolicy } from '@foos/shared'
import { useNavigate } from '@tanstack/react-router'
import { Clock, Loader, UserPlus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useGroupContext } from '@/contexts/GroupContext'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { groupService } from '@/lib/init'

interface RequestToJoinButtonProps {
  groupId: string
  joinPolicy: JoinPolicy
}

// The join CTA on a group page seen by a non-member. Logged out it routes to
// the protected /join page (which shows the sign-in form first); logged in it
// joins directly (open policy) or files a join request (approval policy).
export const RequestToJoinButton = ({ groupId, joinPolicy }: RequestToJoinButtonProps) => {
  const { isAuthenticated } = useAuth()
  const { refreshGroups } = useGroupContext()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [pending, setPending] = useState(false)

  // The user may already have a pending request for this group
  useEffect(() => {
    if (!isAuthenticated) return
    let stale = false
    groupService.getMyPendingJoinRequests().then((result) => {
      if (!stale && result.data.some((r) => r.groupId === groupId)) {
        setPending(true)
      }
    })
    return () => {
      stale = true
    }
  }, [isAuthenticated, groupId])

  const handleJoin = async () => {
    if (!isAuthenticated) {
      navigate({ to: '/join', search: { groupId } })
      return
    }

    setLoading(true)
    const result = await groupService.requestToJoinGroup(groupId)
    setLoading(false)

    if (result.success && result.status === 'pending') {
      setPending(true)
      toast().success('Request sent — a group admin needs to approve it')
      return
    }

    if (result.success && result.status === 'joined') {
      toast().success(`Welcome to ${result.groupName}!`)
      // Membership flips the group page from the read-only view to the app
      await refreshGroups()
      return
    }

    toast().error(result.error || 'Failed to join group')
  }

  if (pending) {
    return (
      <span className="bg-card text-secondary px-4 py-2.5 min-h-11 rounded-lg font-semibold border border-[var(--th-border-subtle)] flex items-center gap-2 shrink-0 text-sm">
        <Clock size={16} aria-hidden="true" />
        Request pending
      </span>
    )
  }

  return (
    <button
      type="button"
      onClick={handleJoin}
      disabled={loading}
      className="bg-sport-gradient text-white px-4 py-2.5 min-h-11 rounded-lg font-semibold hover:bg-sport-gradient-hover transition-colors flex items-center gap-2 shrink-0 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? <Loader className="animate-spin" size={16} /> : <UserPlus size={16} />}
      {!isAuthenticated
        ? 'Sign in to join'
        : joinPolicy === 'approval'
          ? 'Request to join'
          : 'Join'}
    </button>
  )
}
