import { Clock, Plus, Target } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { Match } from '@/types'

interface MatchHistoryProps {
  matches: Match[]
  onRecordMatch: () => void
}

const MatchHistory = ({ matches, onRecordMatch }: MatchHistoryProps) => {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/50">
      <div className="p-4 border-b border-slate-200/50">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Recent Games</h2>
            <p className="text-sm text-slate-600">Latest foos battles with friends</p>
          </div>
          <button
            type="button"
            onClick={onRecordMatch}
            className="bg-gradient-to-r from-orange-500 to-red-600 text-white p-2 rounded-lg hover:from-orange-600 hover:to-red-700"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      <div className="p-4">
        {matches.length === 0 ? (
          <Alert className="bg-gradient-to-r from-orange-50 to-red-50 border-orange-200/50">
            <Target className="h-4 w-4 text-orange-500" />
            <AlertDescription className="text-slate-600 font-medium text-sm">
              No games recorded yet. Tap + to record your first foos battle!
            </AlertDescription>
          </Alert>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {matches.map((match) => (
              <div
                key={match.id}
                className="bg-gradient-to-br from-white to-slate-50 border border-white/50 rounded-xl p-3 shadow-sm"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="text-xs text-slate-600 flex items-center gap-1">
                    <Clock size={12} />
                    {match.date} at {match.time}
                  </div>
                  <span className="bg-gradient-to-r from-emerald-100 to-green-200 text-emerald-800 px-2 py-1 rounded-full text-xs font-bold">
                    Completed
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 items-center">
                  <div className="text-center bg-gradient-to-br from-blue-50 to-cyan-50 p-2 rounded-lg border border-blue-200/50">
                    <div className="font-bold text-blue-800 mb-1 text-xs">Team 1</div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-sm">{match.team1[0].avatar}</span>
                        <div className="text-xs text-blue-700 font-medium">
                          {match.team1[0].name}
                        </div>
                      </div>
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-sm">{match.team1[1].avatar}</span>
                        <div className="text-xs text-blue-700 font-medium">
                          {match.team1[1].name}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs bg-blue-100 text-blue-600 px-1 py-0.5 rounded-full mt-1">
                      Avg: {Math.round((match.team1[0].ranking + match.team1[1].ranking) / 2)}
                    </div>
                  </div>

                  <div className="text-center">
                    <div
                      className={`text-2xl font-bold mb-1 ${
                        match.score1 > match.score2
                          ? 'text-green-600'
                          : match.score2 > match.score1
                            ? 'text-red-600'
                            : 'text-slate-600'
                      }`}
                    >
                      {match.score1} - {match.score2}
                    </div>
                    <div className="text-xs text-slate-500">Final Score</div>
                  </div>

                  <div className="text-center bg-gradient-to-br from-purple-50 to-violet-50 p-2 rounded-lg border border-purple-200/50">
                    <div className="font-bold text-purple-800 mb-1 text-xs">Team 2</div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-sm">{match.team2[0].avatar}</span>
                        <div className="text-xs text-purple-700 font-medium">
                          {match.team2[0].name}
                        </div>
                      </div>
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-sm">{match.team2[1].avatar}</span>
                        <div className="text-xs text-purple-700 font-medium">
                          {match.team2[1].name}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs bg-purple-100 text-purple-600 px-1 py-0.5 rounded-full mt-1">
                      Avg: {Math.round((match.team2[0].ranking + match.team2[1].ranking) / 2)}
                    </div>
                  </div>
                </div>

                {match.score1 !== match.score2 && (
                  <div className="mt-2 text-center">
                    <span className="text-xs font-medium text-green-600">
                      🎉 Team {match.score1 > match.score2 ? '1' : '2'} wins! Great game, friends!
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default MatchHistory
