import type { Match } from '../types/index.ts'

export interface StreakData {
  currentStreak: number
  streakType: 'win' | 'loss' | null
  bestStreak: number
  worstStreak: number
}

/**
 * Calculates streak statistics for a player based on their match history
 * @param playerId - The ID of the player
 * @param matches - Array of matches, ordered from most recent to oldest
 * @returns Object containing current streak, streak type, best win streak, and worst loss streak
 */
export function calculateStreaks(playerId: string, matches: Match[]): StreakData {
  let currentStreak = 0
  let streakType: 'win' | 'loss' | null = null
  let bestStreak = 0
  let worstStreak = 0
  let tempWinStreak = 0
  let tempLossStreak = 0

  // Calculate current streak (most recent matches)
  for (const match of matches) {
    const wasInTeam1 = match.team1[0].id === playerId || match.team1[1]?.id === playerId
    const wasInTeam2 = match.team2[0].id === playerId || match.team2[1]?.id === playerId

    // Skip matches where player was not involved
    if (!wasInTeam1 && !wasInTeam2) {
      continue
    }

    const won = wasInTeam1 ? match.score1 > match.score2 : match.score2 > match.score1

    if (streakType === null) {
      streakType = won ? 'win' : 'loss'
      currentStreak = 1
    } else if ((won && streakType === 'win') || (!won && streakType === 'loss')) {
      currentStreak++
    } else {
      break
    }
  }

  // Calculate best and worst streaks from all matches
  for (const match of matches) {
    const wasInTeam1 = match.team1[0].id === playerId || match.team1[1]?.id === playerId
    const wasInTeam2 = match.team2[0].id === playerId || match.team2[1]?.id === playerId

    // Skip matches where player was not involved
    if (!wasInTeam1 && !wasInTeam2) {
      continue
    }

    const won = wasInTeam1 ? match.score1 > match.score2 : match.score2 > match.score1

    if (won) {
      tempWinStreak++
      if (tempLossStreak > worstStreak) {
        worstStreak = tempLossStreak
      }
      tempLossStreak = 0
    } else {
      tempLossStreak++
      if (tempWinStreak > bestStreak) {
        bestStreak = tempWinStreak
      }
      tempWinStreak = 0
    }
  }

  // Check final streaks
  if (tempWinStreak > bestStreak) {
    bestStreak = tempWinStreak
  }
  if (tempLossStreak > worstStreak) {
    worstStreak = tempLossStreak
  }

  return {
    currentStreak,
    streakType,
    bestStreak,
    worstStreak,
  }
}
