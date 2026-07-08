import type { Match } from '../types/index.ts'

// Default ranking for new players or players with no matches in a season
export const DEFAULT_RANKING = 1200

// Season ELO configuration - asymmetric K-factors for slight inflation
export const K_FACTOR_WINNER = 35 // Winners get more points (+9% vs standard K=32)
export const K_FACTOR_LOSER = 29 // Losers lose fewer points (-9% vs standard K=32)
export const K_FACTOR_DRAW = 32 // Standard ELO K-factor for draws (remis)
// Net result: ~3-8 points inflation per match while maintaining competitive balance

export type MatchResult = 'win' | 'loss' | 'draw'

// Calculate new season ranking using the inflationary ELO system.
// Used when recording matches; stored per-match rankings come from this.
export const calculateNewRanking = (
  playerRanking: number,
  opponentRanking: number,
  result: MatchResult,
): number => {
  const K = result === 'win' ? K_FACTOR_WINNER : result === 'loss' ? K_FACTOR_LOSER : K_FACTOR_DRAW
  const expectedScore = 1 / (1 + 10 ** ((opponentRanking - playerRanking) / 400))
  const actualScore = result === 'win' ? 1 : result === 'draw' ? 0.5 : 0
  const newRanking = playerRanking + K * (actualScore - expectedScore)
  return Math.max(800, Math.min(2400, Math.round(newRanking)))
}

// All-time ELO uses the symmetric standard K (the seasonal 35/29 split would
// compound inflation forever on a never-resetting rating) and no 800-2400 clamp.
// Must stay in sync with compute_player_global_ranking in
// database/migrations/020_continuous_alltime_elo.sql.
const K_FACTOR_ALL_TIME = 32

export interface ContinuousRankingPoint {
  matchId: string
  ranking: number
}

// Replay a group's full match history as one continuous ELO chain, as if
// seasons never reset. Returns each player's rating after every match they
// played, oldest first. 1v1 rates player vs player; 2v2 rates each player
// against the opposing team's average.
export function replayContinuousElo(matches: Match[]): Map<string, ContinuousRankingPoint[]> {
  // Insertion order (createdAt), same order the stored rankings were assigned in
  const ordered = matches.toSorted((a, b) => {
    const byCreated = (a.createdAt ?? '').localeCompare(b.createdAt ?? '')
    return byCreated !== 0 ? byCreated : a.id.localeCompare(b.id)
  })

  const ratings = new Map<string, number>()
  const series = new Map<string, ContinuousRankingPoint[]>()
  const ratingOf = (playerId: string) => ratings.get(playerId) ?? DEFAULT_RANKING

  for (const match of ordered) {
    const team1 = match.team1.filter((p) => p !== null).map((p) => p.id)
    const team2 = match.team2.filter((p) => p !== null).map((p) => p.id)
    if (team1.length === 0 || team2.length === 0) continue

    const isDraw = match.score1 === match.score2
    const team1Actual = isDraw ? 0.5 : match.score1 > match.score2 ? 1 : 0
    // A 1-player "team" average is just that player's rating, so this covers 1v1 too
    const team1Avg = team1.reduce((sum, id) => sum + ratingOf(id), 0) / team1.length
    const team2Avg = team2.reduce((sum, id) => sum + ratingOf(id), 0) / team2.length

    // Compute every new rating from pre-match values before committing any
    const updates: [string, number][] = []
    for (const [ids, opponentAvg, actual] of [
      [team1, team2Avg, team1Actual],
      [team2, team1Avg, 1 - team1Actual],
    ] as [string[], number, number][]) {
      for (const id of ids) {
        const current = ratingOf(id)
        const expected = 1 / (1 + 10 ** ((opponentAvg - current) / 400))
        updates.push([id, Math.round(current + K_FACTOR_ALL_TIME * (actual - expected))])
      }
    }

    for (const [id, ranking] of updates) {
      ratings.set(id, ranking)
      const points = series.get(id) ?? []
      points.push({ matchId: match.id, ranking })
      series.set(id, points)
    }
  }

  return series
}
