import { Link, useLocation } from '@tanstack/react-router'
import { Clock, Trophy } from 'lucide-react'

const TabNavigation = () => {
  const location = useLocation()
  return (
    <div className="bg-card backdrop-blur-sm border-b border-[var(--th-border-subtle)]">
      <div className="container mx-auto max-w-6xl px-4 py-2">
        <div className="flex gap-1 max-w-md mx-auto md:max-w-none md:justify-center">
          <Link
            to="/"
            className={`flex-1 md:flex-none md:px-8 flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-semibold text-sm transition-colors ${
              location.pathname === '/'
                ? 'bg-sport-gradient text-white shadow-md'
                : 'bg-card text-secondary hover:bg-card-hover border border-[var(--th-border-subtle)]'
            }`}
          >
            <Trophy size={16} />
            Rankings
          </Link>
          <Link
            to="/matches"
            className={`flex-1 md:flex-none md:px-8 flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-semibold text-sm transition-colors ${
              location.pathname === '/matches'
                ? 'bg-sport-gradient text-white shadow-md'
                : 'bg-card text-secondary hover:bg-card-hover border border-[var(--th-border-subtle)]'
            }`}
          >
            <Clock size={16} />
            Match History
          </Link>
        </div>
      </div>
    </div>
  )
}

export default TabNavigation
