import type { Match } from '../types/index.ts'

// Default ranking for new players or players with no matches in a season
export const DEFAULT_RANKING = 1200

// Season ELO configuration - asymmetric K-factors for slight inflation
export const K_FACTOR_WINNER = 35 // Winners get more points (+9% vs standard K=32)
export const K_FACTOR_LOSER = 29 // Losers lose fewer points (-9% vs standard K=32)
export const K_FACTOR_DRAW = 32 // Standard ELO K-factor for draws (remis)
// Net result: ~3-8 points inflation per match while maintaining competitive balance

export type MatchResult = 'win' | 'loss' | 'draw'

// Clamp a season ranking to the supported range.
export const clampRanking = (ranking: number): number => Math.max(800, Math.min(2400, ranking))

const kFor = (result: MatchResult): number =>
  result === 'win' ? K_FACTOR_WINNER : result === 'loss' ? K_FACTOR_LOSER : K_FACTOR_DRAW

// Calculate new season ranking using the inflationary ELO system.
// Used for 1v1 matches; stored per-match rankings come from this.
export const calculateNewRanking = (
  playerRanking: number,
  opponentRanking: number,
  result: MatchResult,
): number => {
  const K = kFor(result)
  const expectedScore = 1 / (1 + 10 ** ((opponentRanking - playerRanking) / 400))
  const actualScore = result === 'win' ? 1 : result === 'draw' ? 0.5 : 0
  return clampRanking(Math.round(playerRanking + K * (actualScore - expectedScore)))
}

// Points a 2v2 team gains/loses in a match, shared equally by both teammates.
// The expected score is computed from team average vs opponent-team average, so
// both players move by the same amount regardless of their individual ratings
// (issue #102). Callers add this delta to each teammate's own pre-rating and
// clamp with clampRanking.
export const calculateTeamRankingDelta = (
  teamAvgRanking: number,
  opponentAvgRanking: number,
  result: MatchResult,
): number => {
  const K = kFor(result)
  const expectedScore = 1 / (1 + 10 ** ((opponentAvgRanking - teamAvgRanking) / 400))
  const actualScore = result === 'win' ? 1 : result === 'draw' ? 0.5 : 0
  return Math.round(K * (actualScore - expectedScore))
}

// All-time ELO uses the symmetric standard K (the seasonal 35/29 split would
// compound inflation forever on a never-resetting rating) and no 800-2400 clamp.
// Must stay in sync with compute_group_global_rankings in
// database/migrations/001_initial_schema.sql.
const K_FACTOR_ALL_TIME = 32

export interface ContinuousRankingPoint {
  matchId: string
  ranking: number
}

// Replay a group's full match history as one continuous ELO chain, as if
// seasons never reset. Returns each player's rating after every match they
// played, oldest first. 1v1 rates player vs player; 2v2 rates the team average
// against the opposing team's average and splits the resulting delta equally
// between teammates (issue #102).
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

    // Compute every new rating from pre-match values before committing any.
    // The delta is derived from team average vs opponent average and applied
    // equally to each teammate (a 1-player team makes this identical to the
    // old per-player 1v1 math).
    const updates: [string, number][] = []
    for (const [ids, teamAvg, opponentAvg, actual] of [
      [team1, team1Avg, team2Avg, team1Actual],
      [team2, team2Avg, team1Avg, 1 - team1Actual],
    ] as [string[], number, number, number][]) {
      const expected = 1 / (1 + 10 ** ((opponentAvg - teamAvg) / 400))
      const delta = Math.round(K_FACTOR_ALL_TIME * (actual - expected))
      for (const id of ids) {
        updates.push([id, ratingOf(id) + delta])
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
