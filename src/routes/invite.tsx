import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { AlertCircle, Loader, UserPlus, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { z } from 'zod'
import { useGroupContext } from '@/contexts/GroupContext'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { groupService } from '@/services/groupService'

const inviteSearchSchema = z.object({
  code: z.string(),
})

export const Route = createFileRoute('/invite')({
  component: InvitePageComponent,
  validateSearch: inviteSearchSchema,
})

function InvitePageComponent() {
  const { code: inviteCode } = Route.useSearch()
  const { isAuthenticated } = useAuth()
  const { refreshGroups, switchGroup } = useGroupContext()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [loading, setLoading] = useState(false)
  const [groupInfo, setGroupInfo] = useState<{ name: string; description?: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [joined, setJoined] = useState(false)

  // No need to store invite code in localStorage - we'll use URL parameters

  // Try to get group info without joining (for preview)
  useEffect(() => {
    const fetchGroupInfo = async () => {
      if (!inviteCode) return

      try {
        const result = await groupService.getGroupByInviteCode(inviteCode)
        if (result.data) {
          setGroupInfo({
            name: result.data.name,
            description: result.data.description || undefined,
          })
        } else if (result.error) {
          setError(result.error)
        }
      } catch (err) {
        console.error('Failed to fetch group info:', err)
      }
    }

    fetchGroupInfo()
  }, [inviteCode])

  // Handle joining for authenticated users
  const handleJoinGroup = async () => {
    if (!inviteCode || !isAuthenticated) return

    setLoading(true)
    setError(null)

    try {
      const result = await groupService.joinGroupByInvite(inviteCode)

      if (result.success && result.groupId) {
        setJoined(true)
        setGroupInfo({ name: result.groupName || 'Group' })
        toast().success(`Successfully joined ${result.groupName}!`)

        // Refresh groups and switch to the new group
        await refreshGroups()
        switchGroup(result.groupId)

        // Navigate to the main app after a brief delay
        setTimeout(() => {
          navigate({ to: '/' })
        }, 2000)
      } else {
        setError(result.error || 'Failed to join group')
        toast().error(result.error || 'Failed to join group')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(errorMessage)
      toast().error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // Handle the flow for new users (redirect to auth with invite code in URL)
  const handleSignUpToJoin = () => {
    // Navigate to the auth page with the invite code in the URL
    navigate({ to: '/', search: { code: inviteCode } })
  }

  if (!inviteCode) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 max-w-md shadow-2xl border border-white/50 text-center">
          <AlertCircle className="mx-auto mb-4 text-red-500" size={48} />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Invalid Invite Link</h1>
          <p className="text-gray-600 mb-6">
            This invite link appears to be invalid or incomplete.
          </p>
          <button
            type="button"
            onClick={() => navigate({ to: '/' })}
            className="bg-gradient-to-r from-orange-500 to-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-orange-600 hover:to-red-700 transition-colors"
          >
            Go to App
          </button>
        </div>
      </div>
    )
  }

  if (joined) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 max-w-md shadow-2xl border border-white/50 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="text-green-600" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Welcome to {groupInfo?.name}!</h1>
          <p className="text-gray-600 mb-6">
            You've successfully joined the group. Redirecting to the app...
          </p>
          <div className="flex items-center justify-center">
            <Loader className="animate-spin text-orange-500" size={24} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 max-w-md shadow-2xl border border-white/50">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-orange-100 to-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="text-orange-600" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">You're Invited!</h1>
          <p className="text-gray-600">
            {groupInfo?.name ? `Join "${groupInfo.name}"` : 'Join this foosball group'} and start
            competing with friends.
          </p>
          {groupInfo?.description && (
            <p className="text-sm text-gray-500 mt-2">{groupInfo.description}</p>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </p>
          </div>
        )}

        <div className="space-y-4">
          {isAuthenticated ? (
            <button
              type="button"
              onClick={handleJoinGroup}
              disabled={loading}
              className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-orange-600 hover:to-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader className="animate-spin" size={20} />
                  Joining...
                </>
              ) : (
                <>
                  <UserPlus size={20} />
                  Join Group
                </>
              )}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleSignUpToJoin}
                className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-orange-600 hover:to-red-700 transition-colors flex items-center justify-center gap-2"
              >
                <UserPlus size={20} />
                Sign Up & Join
              </button>

              <div className="text-center text-sm text-gray-500">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => navigate({ to: '/', search: { code: inviteCode } })}
                  className="text-orange-600 hover:text-orange-700 font-medium"
                >
                  Sign in here
                </button>
              </div>
            </>
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-2">Invite Code</p>
            <code className="text-sm font-mono bg-gray-100 px-3 py-1 rounded">{inviteCode}</code>
          </div>
        </div>
      </div>
    </div>
  )
}
