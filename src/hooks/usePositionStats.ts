import { useMemo } from 'react'
import type { Match, PlayerPosition } from '@/types'

interface PositionStats {
  gamesAsAttacker: number
  gamesAsDefender: number
  winsAsAttacker: number
  winsAsDefender: number
  lossesAsAttacker: number
  lossesAsDefender: number
  winRateAsAttacker: number
  winRateAsDefender: number
  preferredPosition: PlayerPosition | null
}

export const usePositionStats = (playerId: string, matches: Match[]): PositionStats => {
  return useMemo(() => {
    const playerMatches = matches.filter((match) => {
      return (
        match.team1[0].id === playerId ||
        match.team1[1].id === playerId ||
        match.team2[0].id === playerId ||
        match.team2[1].id === playerId
      )
    })

    let gamesAsAttacker = 0
    let gamesAsDefender = 0
    let winsAsAttacker = 0
    let winsAsDefender = 0
    let lossesAsAttacker = 0
    let lossesAsDefender = 0

    for (const match of playerMatches) {
      const wasInTeam1 = match.team1[0].id === playerId || match.team1[1].id === playerId
      const wasAttacker = wasInTeam1
        ? match.team1[0].id === playerId
        : match.team2[0].id === playerId
      const won = wasInTeam1 ? match.score1 > match.score2 : match.score2 > match.score1

      if (wasAttacker) {
        gamesAsAttacker++
        if (won) {
          winsAsAttacker++
        } else {
          lossesAsAttacker++
        }
      } else {
        gamesAsDefender++
        if (won) {
          winsAsDefender++
        } else {
          lossesAsDefender++
        }
      }
    }

    const winRateAsAttacker =
      gamesAsAttacker > 0 ? Math.round((winsAsAttacker / gamesAsAttacker) * 100) : 0
    const winRateAsDefender =
      gamesAsDefender > 0 ? Math.round((winsAsDefender / gamesAsDefender) * 100) : 0

    let preferredPosition: PlayerPosition | null = null
    if (gamesAsAttacker > 0 || gamesAsDefender > 0) {
      if (gamesAsAttacker > gamesAsDefender) {
        preferredPosition = 'attacker'
      } else if (gamesAsDefender > gamesAsAttacker) {
        preferredPosition = 'defender'
      } else {
        // If equal games, choose based on win rate
        if (winRateAsAttacker > winRateAsDefender) {
          preferredPosition = 'attacker'
        } else if (winRateAsDefender > winRateAsAttacker) {
          preferredPosition = 'defender'
        } else {
          // Default to attacker if everything is equal
          preferredPosition = 'attacker'
        }
      }
    }

    return {
      gamesAsAttacker,
      gamesAsDefender,
      winsAsAttacker,
      winsAsDefender,
      lossesAsAttacker,
      lossesAsDefender,
      winRateAsAttacker,
      winRateAsDefender,
      preferredPosition,
    }
  }, [playerId, matches])
}
