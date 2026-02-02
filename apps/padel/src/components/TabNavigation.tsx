import { Link, useLocation } from '@tanstack/react-router'
import { Clock, Trophy } from 'lucide-react'

const TabNavigation = () => {
  const location = useLocation()
  return (
    <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/50">
      <div className="container mx-auto max-w-6xl px-4 py-2">
        <div className="flex gap-1 max-w-md mx-auto md:max-w-none md:justify-center">
          <Link
            to="/"
            className={`flex-1 md:flex-none md:px-8 flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-semibold text-sm transition-colors ${
              location.pathname === '/'
                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md'
                : 'bg-white/60 text-slate-700 hover:bg-white border border-white/50'
            }`}
          >
            <Trophy size={16} />
            Rankings
          </Link>
          <Link
            to="/matches"
            className={`flex-1 md:flex-none md:px-8 flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-semibold text-sm transition-colors ${
              location.pathname === '/matches'
                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md'
                : 'bg-white/60 text-slate-700 hover:bg-white border border-white/50'
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
