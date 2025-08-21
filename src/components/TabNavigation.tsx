import { Clock, Trophy } from 'lucide-react'

interface TabNavigationProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

const TabNavigation = ({ activeTab, onTabChange }: TabNavigationProps) => {
  return (
    <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/50">
      <div className="container mx-auto max-w-6xl px-4 py-2">
        <div className="flex gap-1 max-w-md mx-auto md:max-w-none md:justify-center">
          <button
            type="button"
            onClick={() => onTabChange('rankings')}
            className={`flex-1 md:flex-none md:px-8 flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-semibold transition-all text-sm ${
              activeTab === 'rankings'
                ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-md'
                : 'bg-white/60 text-slate-700 hover:bg-white border border-white/50'
            }`}
          >
            <Trophy size={16} />
            Rankings
          </button>
          <button
            type="button"
            onClick={() => onTabChange('matches')}
            className={`flex-1 md:flex-none md:px-8 flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-semibold transition-all text-sm ${
              activeTab === 'matches'
                ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-md'
                : 'bg-white/60 text-slate-700 hover:bg-white border border-white/50'
            }`}
          >
            <Clock size={16} />
            Match History
          </button>
        </div>
      </div>
    </div>
  )
}

export default TabNavigation
