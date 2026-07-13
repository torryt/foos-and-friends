import type { GroupPreview } from '@foos/shared'
import { createFileRoute, Link, Outlet, useLocation } from '@tanstack/react-router'
import { AlertCircle, Lock, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'
import Header from '@/components/Header'
import { RequestToJoinButton } from '@/components/RequestToJoinButton'
import TabNavigation from '@/components/TabNavigation'
import { useGroupContext } from '@/contexts/GroupContext'
import { GroupPageProvider } from '@/contexts/GroupPageContext'
import { PublicGroupProvider, usePublicGroup } from '@/contexts/PublicGroupContext'
import { StaticSeasonProvider } from '@/contexts/SeasonContext'
import { useAuth } from '@/hooks/useAuth'
import { groupService } from '@/lib/init'

export const Route = createFileRoute('/groups/$groupId')({
  component: GroupLayout,
})

// This app only serves foosball groups; a chess group's id 404s here
const SPORT_TYPE = 'foosball'

// One URL per group, member or not: members get the full app, everyone else
// gets the read-only public view (or, for private groups, a minimal
// name-plus-request-to-join landing page).
function GroupLayout() {
  const { groupId } = Route.useParams()
  const { user, onSignOut } = Route.useRouteContext()
  const { loading: authLoading, isAuthenticated } = useAuth()
  const { userGroups, currentGroup, switchGroup, loading: groupsLoading } = useGroupContext()

  const isMember = userGroups.some((g) => g.id === groupId)

  // The URL is the source of truth: visiting a group you belong to makes it
  // the current group (and the localStorage default for next sign-in)
  useEffect(() => {
    if (isMember && currentGroup?.id !== groupId) {
      switchGroup(groupId)
    }
  }, [isMember, currentGroup?.id, groupId, switchGroup])

  if (authLoading || (isAuthenticated && groupsLoading)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-muted">Loading…</div>
      </div>
    )
  }

  if (isMember) {
    return (
      <GroupPageProvider value="member">
        <MemberLayout user={user} onSignOut={onSignOut} />
      </GroupPageProvider>
    )
  }

  return (
    <PublicGroupProvider groupId={groupId}>
      <GroupPageProvider value="public">
        <PublicLayout groupId={groupId} />
      </GroupPageProvider>
    </PublicGroupProvider>
  )
}

interface MemberLayoutProps {
  user: ReturnType<typeof Route.useRouteContext>['user']
  onSignOut: () => void
}

function MemberLayout({ user, onSignOut }: MemberLayoutProps) {
  const location = useLocation()
  // TV mode renders without any chrome
  if (location.pathname.endsWith('/tv')) {
    return <Outlet />
  }

  return (
    <>
      <Header user={user} onSignOut={onSignOut} />
      <TabNavigation />
      <div className="container mx-auto max-w-6xl p-4">
        <Outlet />
      </div>
    </>
  )
}

function PublicLayout({ groupId }: { groupId: string }) {
  const { group, seasons, currentSeason, selectSeason, loading, notFound } = usePublicGroup()
  const location = useLocation()
  const isTv = location.pathname.endsWith('/tv')

  // Not publicly readable: fall back to the minimal preview (private groups)
  // or a not-found card (nonexistent groups)
  if (notFound) {
    return <GroupPreviewPage groupId={groupId} />
  }

  if (loading || !group) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-muted">Loading…</div>
      </div>
    )
  }

  if (group.sportType !== SPORT_TYPE) {
    return <NotFoundCard />
  }

  const content = (
    <StaticSeasonProvider
      seasons={seasons}
      currentSeason={currentSeason}
      onSwitchSeason={selectSeason}
    >
      <Outlet />
    </StaticSeasonProvider>
  )

  if (isTv) {
    return content
  }

  return (
    <>
      <div className="bg-[var(--th-bg-header)] backdrop-blur-sm shadow-sm border-b border-[var(--th-border-subtle)] sticky top-0 z-40">
        <div className="container mx-auto max-w-6xl">
          <div className="px-4 py-3 flex justify-between items-center">
            <div className="min-w-0">
              <h1 className="text-lg md:text-2xl font-bold text-sport-gradient flex items-center gap-2 truncate">
                <Zap className="text-[var(--th-sport-primary)] shrink-0" size={20} />
                {group.name}
              </h1>
              <p className="text-xs md:text-sm text-secondary">Read-only view · Foos & Friends</p>
            </div>
            <RequestToJoinButton groupId={groupId} joinPolicy={group.joinPolicy} />
          </div>
        </div>
      </div>

      {/* Tab navigation, mirroring the authed app's two tabs */}
      <div className="bg-[var(--th-bg-header)] border-b border-[var(--th-border-subtle)]">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="flex gap-1">
            <PublicTab to="index" label="Rankings" />
            <PublicTab to="matches" label="Match History" />
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-6xl p-4">{content}</div>
    </>
  )
}

// A non-member's view of a private group: just the name and a way to knock.
function GroupPreviewPage({ groupId }: { groupId: string }) {
  const [preview, setPreview] = useState<GroupPreview | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let stale = false
    groupService.getGroupPreview(groupId).then((result) => {
      if (!stale) {
        setPreview(result.data)
        setLoading(false)
      }
    })
    return () => {
      stale = true
    }
  }, [groupId])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-muted">Loading…</div>
      </div>
    )
  }

  if (!preview || preview.sportType !== SPORT_TYPE) {
    return <NotFoundCard />
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <div className="bg-card backdrop-blur-sm rounded-2xl p-8 max-w-md shadow-2xl border border-[var(--th-border-subtle)] text-center">
        <div className="w-16 h-16 bg-card-hover rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock className="text-[var(--th-sport-primary)]" size={32} />
        </div>
        <h1 className="text-2xl font-bold text-primary mb-2">{preview.name}</h1>
        {preview.description && <p className="text-sm text-muted mb-2">{preview.description}</p>}
        <p className="text-secondary mb-6">
          This group is private. You can request to join — a group admin needs to let you in.
        </p>
        <div className="flex justify-center">
          <RequestToJoinButton groupId={groupId} joinPolicy={preview.joinPolicy} />
        </div>
      </div>
    </div>
  )
}

function NotFoundCard() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <div className="bg-card backdrop-blur-sm rounded-2xl p-8 max-w-md shadow-2xl border border-[var(--th-border-subtle)] text-center">
        <AlertCircle className="mx-auto mb-4 text-[var(--th-loss)]" size={48} />
        <h1 className="text-2xl font-bold text-primary mb-4">Group Not Found</h1>
        <p className="text-secondary">This group doesn't exist or is no longer active.</p>
      </div>
    </div>
  )
}

function PublicTab({ to, label }: { to: 'index' | 'matches'; label: string }) {
  const { groupId } = Route.useParams()
  const location = useLocation()
  const base = `/groups/${groupId}`
  const href = to === 'index' ? base : `${base}/${to}`
  const isActive =
    to === 'index'
      ? location.pathname === base || location.pathname === `${base}/`
      : location.pathname.startsWith(href)

  return (
    <Link
      to={to === 'index' ? '/groups/$groupId' : '/groups/$groupId/matches'}
      params={{ groupId }}
      className={`px-4 py-3 min-h-11 text-sm font-medium border-b-2 transition-colors ${
        isActive
          ? 'border-[var(--th-sport-primary)] text-[var(--th-sport-primary)]'
          : 'border-transparent text-secondary hover:text-primary'
      }`}
    >
      {label}
    </Link>
  )
}
