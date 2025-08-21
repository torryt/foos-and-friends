import { useEffect, useState } from 'react'
import type { Match, Player } from '@/types'

export const useGameLogic = () => {
  const [players, setPlayers] = useState<Player[]>([])
  const [matches, setMatches] = useState<Match[]>([])

  // Initialize with sample data
  useEffect(() => {
    const samplePlayers = [
      {
        id: 1,
        name: 'Alex Chen',
        ranking: 1450,
        matchesPlayed: 18,
        wins: 12,
        losses: 6,
        avatar: '👨‍💻',
        department: 'Engineering',
      },
      {
        id: 2,
        name: 'Maria Garcia',
        ranking: 1320,
        matchesPlayed: 15,
        wins: 9,
        losses: 6,
        avatar: '👩‍🎨',
        department: 'Design',
      },
      {
        id: 3,
        name: 'Jake Wilson',
        ranking: 1680,
        matchesPlayed: 22,
        wins: 17,
        losses: 5,
        avatar: '🧔',
        department: 'Sales',
      },
      {
        id: 4,
        name: 'Sarah Kim',
        ranking: 1180,
        matchesPlayed: 12,
        wins: 5,
        losses: 7,
        avatar: '👩‍💼',
        department: 'Marketing',
      },
      {
        id: 5,
        name: 'Tom Rodriguez',
        ranking: 1250,
        matchesPlayed: 10,
        wins: 6,
        losses: 4,
        avatar: '👨‍🔬',
        department: 'Product',
      },
    ]
    setPlayers(samplePlayers)

    // Sample matches
    setMatches([
      {
        id: 1,
        team1: [samplePlayers[0], samplePlayers[1]],
        team2: [samplePlayers[2], samplePlayers[3]],
        score1: 10,
        score2: 7,
        date: '2024-08-21',
        time: '14:30',
      },
      {
        id: 2,
        team1: [samplePlayers[1], samplePlayers[4]],
        team2: [samplePlayers[0], samplePlayers[2]],
        score1: 8,
        score2: 10,
        date: '2024-08-21',
        time: '13:15',
      },
    ])
  }, [])

  // Ranking calculation function (International Foosball Rating System)
  const calculateNewRanking = (
    playerRanking: number,
    opponentRanking: number,
    isWinner: boolean,
  ) => {
    const K = 32 // K-factor for ranking calculation (standard ELO)
    const expectedScore = 1 / (1 + 10 ** ((opponentRanking - playerRanking) / 400))
    const actualScore = isWinner ? 1 : 0
    const newRanking = playerRanking + K * (actualScore - expectedScore)

    // Clamp between 800 and 2400 (international foosball range)
    return Math.max(800, Math.min(2400, Math.round(newRanking)))
  }

  const addPlayer = (name: string) => {
    const newId = Math.max(...players.map((p) => p.id), 0) + 1
    const avatars = ['👨‍💻', '👩‍🎨', '🧔', '👩‍💼', '👨‍🔬', '👩‍🚀', '👨‍🎓', '👩‍⚕️']
    setPlayers([
      ...players,
      {
        id: newId,
        name,
        ranking: 1200,
        matchesPlayed: 0,
        wins: 0,
        losses: 0,
        avatar: avatars[Math.floor(Math.random() * avatars.length)],
        department: 'Office',
      },
    ])
  }

  const recordMatch = (
    team1Player1Id: string,
    team1Player2Id: string,
    team2Player1Id: string,
    team2Player2Id: string,
    score1: string,
    score2: string,
  ) => {
    const team1Player1 = players.find((p) => p.id === parseInt(team1Player1Id, 10))
    const team1Player2 = players.find((p) => p.id === parseInt(team1Player2Id, 10))
    const team2Player1 = players.find((p) => p.id === parseInt(team2Player1Id, 10))
    const team2Player2 = players.find((p) => p.id === parseInt(team2Player2Id, 10))

    if (!team1Player1 || !team1Player2 || !team2Player1 || !team2Player2) return

    // Check for duplicate players
    const playerIds = [team1Player1Id, team1Player2Id, team2Player1Id, team2Player2Id]
    if (new Set(playerIds).size !== 4) return

    const team1Won = score1 > score2
    const updatedPlayers = [...players]

    // Calculate average team rankings
    const team1Ranking = (team1Player1.ranking + team1Player2.ranking) / 2
    const team2Ranking = (team2Player1.ranking + team2Player2.ranking) / 2

    // Update all players
    ;[team1Player1, team1Player2].forEach((player) => {
      const playerIndex = updatedPlayers.findIndex((p) => p.id === player.id)
      if (playerIndex !== -1) {
        updatedPlayers[playerIndex].ranking = calculateNewRanking(
          player.ranking,
          team2Ranking,
          team1Won,
        )
        updatedPlayers[playerIndex].matchesPlayed += 1
        if (team1Won) {
          updatedPlayers[playerIndex].wins += 1
        } else {
          updatedPlayers[playerIndex].losses += 1
        }
      }
    })
    ;[team2Player1, team2Player2].forEach((player) => {
      const playerIndex = updatedPlayers.findIndex((p) => p.id === player.id)
      if (playerIndex !== -1) {
        updatedPlayers[playerIndex].ranking = calculateNewRanking(
          player.ranking,
          team1Ranking,
          !team1Won,
        )
        updatedPlayers[playerIndex].matchesPlayed += 1
        if (!team1Won) {
          updatedPlayers[playerIndex].wins += 1
        } else {
          updatedPlayers[playerIndex].losses += 1
        }
      }
    })

    setPlayers(updatedPlayers)

    // Add match to history
    const team1Player1Updated = updatedPlayers.find((p) => p.id === team1Player1.id)
    const team1Player2Updated = updatedPlayers.find((p) => p.id === team1Player2.id)
    const team2Player1Updated = updatedPlayers.find((p) => p.id === team2Player1.id)
    const team2Player2Updated = updatedPlayers.find((p) => p.id === team2Player2.id)

    if (
      !team1Player1Updated ||
      !team1Player2Updated ||
      !team2Player1Updated ||
      !team2Player2Updated
    )
      return

    const team1Updated = [team1Player1Updated, team1Player2Updated] as [Player, Player]
    const team2Updated = [team2Player1Updated, team2Player2Updated] as [Player, Player]

    const newMatch: Match = {
      id: Math.max(...matches.map((m) => m.id), 0) + 1,
      team1: team1Updated,
      team2: team2Updated,
      score1: parseInt(score1, 10),
      score2: parseInt(score2, 10),
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }),
    }

    setMatches([newMatch, ...matches])
  }

  return {
    players,
    matches,
    addPlayer,
    recordMatch,
  }
}
