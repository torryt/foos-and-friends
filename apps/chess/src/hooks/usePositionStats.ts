import type { Match } from '@foos/shared'
import { useMemo } from 'react'

type ChessColor = 'white' | 'black'

interface PositionStats {
  gamesAsWhite: number
  gamesAsBlack: number
  winsAsWhite: number
  winsAsBlack: number
  lossesAsWhite: number
  lossesAsBlack: number
  winRateAsWhite: number
  winRateAsBlack: number
  preferredColor: ChessColor | null
}

export const usePositionStats = (playerId: string, matches: Match[]): PositionStats => {
  return useMemo(() => {
    const playerMatches = matches.filter((match) => {
      return (
        match.team1[0].id === playerId ||
        match.team1[1]?.id === playerId ||
        match.team2[0].id === playerId ||
        match.team2[1]?.id === playerId
      )
    })

    let gamesAsWhite = 0
    let gamesAsBlack = 0
    let winsAsWhite = 0
    let winsAsBlack = 0
    let lossesAsWhite = 0
    let lossesAsBlack = 0

    for (const match of playerMatches) {
      const wasInTeam1 = match.team1[0].id === playerId || match.team1[1]?.id === playerId
      const wasWhite = wasInTeam1 ? match.team1[0].id === playerId : match.team2[0].id === playerId
      const won = wasInTeam1 ? match.score1 > match.score2 : match.score2 > match.score1

      if (wasWhite) {
        gamesAsWhite++
        if (won) {
          winsAsWhite++
        } else {
          lossesAsWhite++
        }
      } else {
        gamesAsBlack++
        if (won) {
          winsAsBlack++
        } else {
          lossesAsBlack++
        }
      }
    }

    const winRateAsWhite = gamesAsWhite > 0 ? Math.round((winsAsWhite / gamesAsWhite) * 100) : 0
    const winRateAsBlack = gamesAsBlack > 0 ? Math.round((winsAsBlack / gamesAsBlack) * 100) : 0

    let preferredColor: ChessColor | null = null
    if (gamesAsWhite > 0 || gamesAsBlack > 0) {
      if (gamesAsWhite > gamesAsBlack) {
        preferredColor = 'white'
      } else if (gamesAsBlack > gamesAsWhite) {
        preferredColor = 'black'
      } else {
        // If equal games, choose based on win rate
        if (winRateAsWhite > winRateAsBlack) {
          preferredColor = 'white'
        } else if (winRateAsBlack > winRateAsWhite) {
          preferredColor = 'black'
        } else {
          // Default to white if everything is equal
          preferredColor = 'white'
        }
      }
    }

    return {
      gamesAsWhite,
      gamesAsBlack,
      winsAsWhite,
      winsAsBlack,
      lossesAsWhite,
      lossesAsBlack,
      winRateAsWhite,
      winRateAsBlack,
      preferredColor,
    }
  }, [playerId, matches])
}
