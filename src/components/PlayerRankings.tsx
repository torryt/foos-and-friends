import { Medal, Trophy } from 'lucide-react'
import type { Player } from '@/types'

interface PlayerRankingsProps {
  players: Player[]
  onPlayerClick?: (playerId: string) => void
}

interface PlayerCardProps {
  player: Player
  index: number
}

const PlayerCard = ({ player, index }: PlayerCardProps) => (
  <>
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        {index === 0 && <Trophy className="text-yellow-500" size={16} />}
        {index === 1 && <Medal className="text-gray-400" size={14} />}
        {index === 2 && <Medal className="text-amber-600" size={14} />}
        <span className="font-bold text-slate-700 text-sm w-6">{index + 1}</span>
      </div>
      <span className="text-2xl">{player.avatar}</span>
      <div>
        <div className="font-semibold text-slate-800 text-sm">{player.name}</div>
        <div className="text-xs text-slate-500">
          {player.wins}W - {player.losses}L ({player.matchesPlayed} total)
        </div>
      </div>
    </div>
    <div className="text-right">
      <span
        className={`px-2 py-1 rounded-full text-xs font-bold ${
          player.ranking >= 1800
            ? 'bg-gradient-to-r from-purple-100 to-violet-200 text-purple-800'
            : player.ranking >= 1600
              ? 'bg-gradient-to-r from-emerald-100 to-green-200 text-emerald-800'
              : player.ranking >= 1400
                ? 'bg-gradient-to-r from-blue-100 to-cyan-200 text-blue-800'
                : player.ranking >= 1200
                  ? 'bg-gradient-to-r from-amber-100 to-yellow-200 text-amber-800'
                  : 'bg-gradient-to-r from-rose-100 to-pink-200 text-rose-800'
        }`}
      >
        {player.ranking}
      </span>
      <div className="text-xs text-slate-600 mt-1">
        {player.matchesPlayed > 0
          ? `${Math.round((player.wins / player.matchesPlayed) * 100)}% win rate`
          : 'No matches'}
      </div>
    </div>
  </>
)

const PlayerRankings = ({ players, onPlayerClick }: PlayerRankingsProps) => {
  const sortedPlayers = [...players].sort((a, b) => b.ranking - a.ranking)

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/50">
      <div className="p-4 border-b border-slate-200/50">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Trophy className="text-orange-500" />
          Friend Rankings
        </h2>
        <p className="text-sm text-slate-600">See how you stack up against your friends!</p>
      </div>

      <div className="p-4">
        <div className="flex flex-col gap-2 max-w-4xl mx-auto">
          {sortedPlayers.map((player, index) =>
            onPlayerClick ? (
              <button
                key={player.id}
                type="button"
                className="w-full flex items-center justify-between bg-gradient-to-r from-white to-slate-50 p-3 rounded-lg border border-slate-200/50 cursor-pointer hover:from-blue-50 hover:to-slate-100 transition-colors text-left"
                onClick={() => onPlayerClick(player.id)}
                aria-label={`View match history for ${player.name}`}
              >
                <PlayerCard player={player} index={index} />
              </button>
            ) : (
              <div
                key={player.id}
                className="flex items-center justify-between bg-gradient-to-r from-white to-slate-50 p-3 rounded-lg border border-slate-200/50"
              >
                <PlayerCard player={player} index={index} />
              </div>
            ),
          )}
        </div>
      </div>
    </div>
  )
}

export default PlayerRankings
