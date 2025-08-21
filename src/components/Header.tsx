import { Zap } from 'lucide-react'

interface HeaderProps {
  playerCount: number
}

const Header = ({ playerCount }: HeaderProps) => {
  return (
    <div className="bg-gradient-to-r from-white/90 to-orange-50/90 backdrop-blur-sm shadow-sm border-b border-white/20 sticky top-0 z-40">
      <div className="container mx-auto max-w-6xl">
        <div className="px-4 py-3">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-lg md:text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent flex items-center gap-2">
                <Zap className="text-orange-500" size={20} />
                Foos & Friends
              </h1>
              <p className="text-xs md:text-sm text-slate-600">Play. Compete. Connect.</p>
            </div>

            <div className="text-center bg-white/80 px-3 py-2 rounded-lg border border-white/50">
              <div className="text-sm font-bold text-orange-600">{playerCount}</div>
              <div className="text-xs text-slate-600">Friends</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Header
