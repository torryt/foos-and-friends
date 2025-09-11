import { isMockMode, isSupabaseAvailable, supabase } from '@/lib/supabase'
import type { DbMatch, Match, Player } from '@/types'
import { playersService } from './playersService'

// Mock data - this gets used when in mock mode
let mockMatches: Match[] = []

// Initialize mock matches with sample data
const initializeMockMatches = async () => {
  if (mockMatches.length > 0) return // Already initialized

  const mockPlayers = playersService.getMockPlayers()
  if (mockPlayers.length < 4) return // Need at least 4 players for matches

  mockMatches = [
    {
      id: '1',
      team1: [mockPlayers[0], mockPlayers[1]],
      team2: [mockPlayers[2], mockPlayers[3]],
      score1: 10,
      score2: 7,
      date: '2024-08-21',
      time: '14:30',
      groupId: 'mock-group-1',
      recordedBy: 'mock-user-id',
      createdAt: new Date().toISOString(),
    },
    {
      id: '2',
      team1: [mockPlayers[1], mockPlayers[4]],
      team2: [mockPlayers[0], mockPlayers[2]],
      score1: 8,
      score2: 10,
      date: '2024-08-21',
      time: '13:15',
      groupId: 'mock-group-1',
      recordedBy: 'mock-user-id',
      createdAt: new Date().toISOString(),
    },
  ]
}

// Transform database match to app match
const dbMatchToMatch = async (dbMatch: DbMatch): Promise<Match | null> => {
  // Get all players for this match
  const playerIds = [
    dbMatch.team1_player1_id,
    dbMatch.team1_player2_id,
    dbMatch.team2_player1_id,
    dbMatch.team2_player2_id,
  ]

  const players: { [id: string]: Player } = {}

  for (const playerId of playerIds) {
    const result = await playersService.getPlayerById(playerId)
    if (result.data) {
      players[playerId] = result.data
    } else {
      // If we can't find a player, skip this match
      return null
    }
  }

  return {
    id: dbMatch.id,
    team1: [players[dbMatch.team1_player1_id], players[dbMatch.team1_player2_id]],
    team2: [players[dbMatch.team2_player1_id], players[dbMatch.team2_player2_id]],
    score1: dbMatch.team1_score,
    score2: dbMatch.team2_score,
    date: dbMatch.match_date,
    time: dbMatch.match_time,
    groupId: dbMatch.group_id,
    recordedBy: dbMatch.recorded_by,
    createdAt: dbMatch.created_at,
  }
}

// Transform app match to database format for insert
const matchToDbInsert = (
  match: Omit<Match, 'id' | 'createdAt'> & { groupId: string },
  recordedBy: string,
): Omit<DbMatch, 'id' | 'created_at'> => ({
  group_id: match.groupId,
  team1_player1_id: match.team1[0].id,
  team1_player2_id: match.team1[1].id,
  team2_player1_id: match.team2[0].id,
  team2_player2_id: match.team2[1].id,
  team1_score: match.score1,
  team2_score: match.score2,
  match_date: match.date,
  match_time: match.time,
  recorded_by: recordedBy,
})

export const matchesService = {
  // Get all matches in a group
  async getMatchesByGroup(groupId: string): Promise<{ data: Match[]; error?: string }> {
    if (isMockMode) {
      await initializeMockMatches()
      const groupMatches = mockMatches.filter((m) => m.groupId === groupId)
      return { data: groupMatches }
    }

    if (!isSupabaseAvailable() || !supabase) {
      return { data: [], error: 'Supabase not available' }
    }

    try {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false })

      if (error) {
        return { data: [], error: error.message }
      }

      // Transform database matches to app matches
      const matches: Match[] = []
      for (const dbMatch of data || []) {
        const match = await dbMatchToMatch(dbMatch)
        if (match) {
          matches.push(match)
        }
      }

      return { data: matches }
    } catch (err) {
      return { data: [], error: err instanceof Error ? err.message : 'Failed to fetch matches' }
    }
  },

  // Record a new match
  async recordMatch(
    groupId: string,
    team1Player1Id: string,
    team1Player2Id: string,
    team2Player1Id: string,
    team2Player2Id: string,
    score1: number,
    score2: number,
    recordedBy: string,
  ): Promise<{ data: Match | null; error?: string }> {
    // Validate that all players are different
    const playerIds = [team1Player1Id, team1Player2Id, team2Player1Id, team2Player2Id]
    if (new Set(playerIds).size !== 4) {
      return { data: null, error: 'All players must be different' }
    }

    // Get all players to validate they exist and are in the correct group
    const playersResults = await Promise.all([
      playersService.getPlayerById(team1Player1Id),
      playersService.getPlayerById(team1Player2Id),
      playersService.getPlayerById(team2Player1Id),
      playersService.getPlayerById(team2Player2Id),
    ])

    // Check if all players exist and are in the correct group
    const players = playersResults.map((r) => r.data).filter(Boolean) as Player[]
    if (players.length !== 4) {
      return { data: null, error: 'One or more players not found' }
    }

    const invalidPlayer = players.find((p) => p.groupId !== groupId)
    if (invalidPlayer) {
      return { data: null, error: 'All players must be in the same group' }
    }

    const [team1Player1, team1Player2, team2Player1, team2Player2] = players

    // Determine winner and calculate new rankings
    const team1Won = score1 > score2
    const team1Ranking = (team1Player1.ranking + team1Player2.ranking) / 2
    const team2Ranking = (team2Player1.ranking + team2Player2.ranking) / 2

    // Calculate new rankings using ELO system
    const calculateNewRanking = (
      playerRanking: number,
      opponentRanking: number,
      isWinner: boolean,
    ) => {
      const K = 32 // K-factor for ranking calculation
      const expectedScore = 1 / (1 + 10 ** ((opponentRanking - playerRanking) / 400))
      const actualScore = isWinner ? 1 : 0
      const newRanking = playerRanking + K * (actualScore - expectedScore)
      return Math.max(800, Math.min(2400, Math.round(newRanking)))
    }

    // Calculate new stats for all players
    const playerUpdates = [
      {
        id: team1Player1.id,
        ranking: calculateNewRanking(team1Player1.ranking, team2Ranking, team1Won),
        matchesPlayed: team1Player1.matchesPlayed + 1,
        wins: team1Player1.wins + (team1Won ? 1 : 0),
        losses: team1Player1.losses + (team1Won ? 0 : 1),
      },
      {
        id: team1Player2.id,
        ranking: calculateNewRanking(team1Player2.ranking, team2Ranking, team1Won),
        matchesPlayed: team1Player2.matchesPlayed + 1,
        wins: team1Player2.wins + (team1Won ? 1 : 0),
        losses: team1Player2.losses + (team1Won ? 0 : 1),
      },
      {
        id: team2Player1.id,
        ranking: calculateNewRanking(team2Player1.ranking, team1Ranking, !team1Won),
        matchesPlayed: team2Player1.matchesPlayed + 1,
        wins: team2Player1.wins + (!team1Won ? 1 : 0),
        losses: team2Player1.losses + (!team1Won ? 0 : 1),
      },
      {
        id: team2Player2.id,
        ranking: calculateNewRanking(team2Player2.ranking, team1Ranking, !team1Won),
        matchesPlayed: team2Player2.matchesPlayed + 1,
        wins: team2Player2.wins + (!team1Won ? 1 : 0),
        losses: team2Player2.losses + (!team1Won ? 0 : 1),
      },
    ]

    if (isMockMode) {
      await initializeMockMatches()

      // Update player stats in mock mode
      const updateResult = await playersService.updateMultiplePlayers(playerUpdates)
      if (updateResult.error) {
        return { data: null, error: updateResult.error }
      }

      // Get updated players for the match object
      const updatedPlayersResults = await Promise.all([
        playersService.getPlayerById(team1Player1Id),
        playersService.getPlayerById(team1Player2Id),
        playersService.getPlayerById(team2Player1Id),
        playersService.getPlayerById(team2Player2Id),
      ])

      const updatedPlayers = updatedPlayersResults.map((r) => r.data).filter(Boolean) as Player[]
      if (updatedPlayers.length !== 4) {
        return { data: null, error: 'Failed to get updated player data' }
      }

      // Create new match
      const numericIds = mockMatches
        .map((m) => parseInt(m.id, 10))
        .filter((id) => !Number.isNaN(id))
      const newMatchId = (Math.max(...numericIds, 0) + 1).toString()

      const newMatch: Match = {
        id: newMatchId,
        team1: [updatedPlayers[0], updatedPlayers[1]],
        team2: [updatedPlayers[2], updatedPlayers[3]],
        score1,
        score2,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }),
        groupId,
        recordedBy,
        createdAt: new Date().toISOString(),
      }

      mockMatches.unshift(newMatch) // Add to beginning for latest-first order
      return { data: newMatch }
    }

    if (!isSupabaseAvailable() || !supabase) {
      return { data: null, error: 'Supabase not available' }
    }

    try {
      // Start a transaction to update players and create match
      const { data: matchData, error: matchError } = await supabase
        .from('matches')
        .insert(
          matchToDbInsert(
            {
              team1: [team1Player1, team1Player2],
              team2: [team2Player1, team2Player2],
              score1,
              score2,
              date: new Date().toISOString().split('T')[0],
              time: new Date().toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              }),
              groupId,
            },
            recordedBy,
          ),
        )
        .select()
        .single()

      if (matchError) {
        return { data: null, error: matchError.message }
      }

      // Update all player stats
      const updateResult = await playersService.updateMultiplePlayers(playerUpdates)
      if (updateResult.error) {
        // If player updates fail, we should ideally rollback the match creation
        // For now, we'll return the error
        return { data: null, error: updateResult.error }
      }

      // Convert the database match to app format
      const match = await dbMatchToMatch(matchData)
      if (!match) {
        return { data: null, error: 'Failed to create match object' }
      }

      return { data: match }
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Failed to record match' }
    }
  },

  // Get match by ID
  async getMatchById(matchId: string): Promise<{ data: Match | null; error?: string }> {
    if (isMockMode) {
      await initializeMockMatches()
      const match = mockMatches.find((m) => m.id === matchId)
      return { data: match || null }
    }

    if (!isSupabaseAvailable() || !supabase) {
      return { data: null, error: 'Supabase not available' }
    }

    try {
      const { data, error } = await supabase.from('matches').select('*').eq('id', matchId).single()

      if (error) {
        return { data: null, error: error.message }
      }

      const match = await dbMatchToMatch(data)
      return { data: match }
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Failed to fetch match' }
    }
  },

  // Get mock matches (for mock mode utilities)
  getMockMatches(): Match[] {
    return [...mockMatches]
  },

  // Set mock matches (for mock mode utilities)
  setMockMatches(matches: Match[]): void {
    mockMatches = [...matches]
  },
}
