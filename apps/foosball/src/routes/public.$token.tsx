import { createFileRoute, Link, Outlet, useLocation } from '@tanstack/react-router'
import { AlertCircle, UserPlus, Zap } from 'lucide-react'
import { useEffect } from 'react'
import { PublicGroupProvider, usePublicGroup } from '@/contexts/PublicGroupContext'
import { StaticSeasonProvider } from '@/contexts/SeasonContext'

export const Route = createFileRoute('/public/$token')({
  component: PublicLayout,
})

// Keep the unguessable token out of search engines and Referer headers
function usePublicPageMeta() {
  useEffect(() => {
    const robots = document.createElement('meta')
    robots.name = 'robots'
    robots.content = 'noindex, nofollow'
    const referrer = document.createElement('meta')
    referrer.name = 'referrer'
    referrer.content = 'no-referrer'
    document.head.append(robots, referrer)
    return () => {
      robots.remove()
      referrer.remove()
    }
  }, [])
}

function PublicLayout() {
  const { token } = Route.useParams()
  usePublicPageMeta()

  return (
    <PublicGroupProvider token={token}>
      <PublicLayoutContent />
    </PublicGroupProvider>
  )
}

function PublicLayoutContent() {
  const { group, seasons, currentSeason, selectSeason, loading, notFound } = usePublicGroup()
  const location = useLocation()
  // TV mode renders without any chrome
  const isTv = location.pathname.endsWith('/tv')

  if (notFound) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <div className="bg-card backdrop-blur-sm rounded-2xl p-8 max-w-md shadow-2xl border border-[var(--th-border-subtle)] text-center">
          <AlertCircle className="mx-auto mb-4 text-[var(--th-loss)]" size={48} />
          <h1 className="text-2xl font-bold text-primary mb-4">Page Not Available</h1>
          <p className="text-secondary">
            This public page doesn't exist or sharing has been turned off by the group.
          </p>
        </div>
      </div>
    )
  }

  if (loading || !group) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-muted">Loading…</div>
      </div>
    )
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
            {/* Full-page link: /invite lives outside the public router subtree */}
            <a
              href={`/invite?code=${group.inviteCode}`}
              className="bg-sport-gradient text-white px-4 py-2.5 min-h-11 rounded-lg font-semibold hover:bg-sport-gradient-hover transition-colors flex items-center gap-2 shrink-0 text-sm"
            >
              <UserPlus size={16} />
              Join
            </a>
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

function PublicTab({ to, label }: { to: 'index' | 'matches'; label: string }) {
  const { token } = Route.useParams()
  const location = useLocation()
  const href = to === 'index' ? `/public/${token}` : `/public/${token}/${to}`
  const isActive =
    to === 'index'
      ? location.pathname === `/public/${token}` || location.pathname === `/public/${token}/`
      : location.pathname.startsWith(href)

  return (
    <Link
      to={to === 'index' ? '/public/$token' : '/public/$token/matches'}
      params={{ token }}
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
