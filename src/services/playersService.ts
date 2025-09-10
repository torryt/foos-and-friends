import { isMockMode, isSupabaseAvailable, supabase } from '@/lib/supabase'
import type { DbPlayer, Player } from '@/types'

// Mock data - this gets used when in mock mode
let mockPlayers: Player[] = [
  {
    id: '1',
    name: 'Alex Chen',
    ranking: 1450,
    matchesPlayed: 18,
    wins: 12,
    losses: 6,
    avatar: '👨‍💻',
    department: 'Engineering',
    groupId: 'mock-group-1',
    createdBy: 'mock-user-id',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Maria Garcia',
    ranking: 1320,
    matchesPlayed: 15,
    wins: 9,
    losses: 6,
    avatar: '👩‍🎨',
    department: 'Design',
    groupId: 'mock-group-1',
    createdBy: 'mock-user-id',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '3',
    name: 'Jake Wilson',
    ranking: 1680,
    matchesPlayed: 22,
    wins: 17,
    losses: 5,
    avatar: '🧔',
    department: 'Sales',
    groupId: 'mock-group-1',
    createdBy: 'mock-user-id',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '4',
    name: 'Sarah Kim',
    ranking: 1180,
    matchesPlayed: 12,
    wins: 5,
    losses: 7,
    avatar: '👩‍💼',
    department: 'Marketing',
    groupId: 'mock-group-1',
    createdBy: 'mock-user-id',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '5',
    name: 'Tom Rodriguez',
    ranking: 1250,
    matchesPlayed: 10,
    wins: 6,
    losses: 4,
    avatar: '👨‍🔬',
    department: 'Product',
    groupId: 'mock-group-1',
    createdBy: 'mock-user-id',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

// Transform database player to app player
const dbPlayerToPlayer = (dbPlayer: DbPlayer): Player => ({
  id: dbPlayer.id,
  name: dbPlayer.name,
  ranking: dbPlayer.ranking,
  matchesPlayed: dbPlayer.matches_played,
  wins: dbPlayer.wins,
  losses: dbPlayer.losses,
  avatar: dbPlayer.avatar,
  department: dbPlayer.department,
  groupId: dbPlayer.group_id,
  createdBy: dbPlayer.created_by,
  createdAt: dbPlayer.created_at,
  updatedAt: dbPlayer.updated_at,
})

// Transform app player to database format for insert/update
const playerToDbInsert = (
  player: Omit<Player, 'id' | 'createdAt' | 'updatedAt'>,
): Omit<DbPlayer, 'id' | 'created_at' | 'updated_at'> => ({
  name: player.name,
  ranking: player.ranking,
  matches_played: player.matchesPlayed,
  wins: player.wins,
  losses: player.losses,
  avatar: player.avatar,
  department: player.department,
  group_id: player.groupId!,
  created_by: player.createdBy!,
})

export const playersService = {
  // Get all players in a group
  async getPlayersByGroup(groupId: string): Promise<{ data: Player[]; error?: string }> {
    if (isMockMode) {
      const groupPlayers = mockPlayers.filter((p) => p.groupId === groupId)
      return { data: groupPlayers }
    }

    if (!isSupabaseAvailable() || !supabase) {
      return { data: [], error: 'Supabase not available' }
    }

    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('group_id', groupId)
        .order('ranking', { ascending: false })

      if (error) {
        return { data: [], error: error.message }
      }

      const players = (data || []).map(dbPlayerToPlayer)
      return { data: players }
    } catch (err) {
      return { data: [], error: err instanceof Error ? err.message : 'Failed to fetch players' }
    }
  },

  // Add a new player to a group
  async addPlayer(
    groupId: string,
    name: string,
    avatar: string,
    department: string,
    createdBy: string,
  ): Promise<{ data: Player | null; error?: string }> {
    if (isMockMode) {
      // Check for duplicate name in group
      const existingPlayer = mockPlayers.find((p) => p.groupId === groupId && p.name === name)
      if (existingPlayer) {
        return { data: null, error: 'A player with this name already exists in the group' }
      }

      const numericIds = mockPlayers
        .map((p) => parseInt(p.id, 10))
        .filter((id) => !Number.isNaN(id))
      const newId = (Math.max(...numericIds, 0) + 1).toString()

      const newPlayer: Player = {
        id: newId,
        name,
        ranking: 1200,
        matchesPlayed: 0,
        wins: 0,
        losses: 0,
        avatar,
        department,
        groupId,
        createdBy,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      mockPlayers.push(newPlayer)
      return { data: newPlayer }
    }

    if (!isSupabaseAvailable() || !supabase) {
      return { data: null, error: 'Supabase not available' }
    }

    try {
      const playerData = playerToDbInsert({
        name,
        ranking: 1200,
        matchesPlayed: 0,
        wins: 0,
        losses: 0,
        avatar,
        department,
        groupId,
        createdBy,
      })

      const { data, error } = await supabase.from('players').insert(playerData).select().single()

      if (error) {
        // Handle unique constraint violation (duplicate name in group)
        if (error.code === '23505') {
          return { data: null, error: 'A player with this name already exists in the group' }
        }
        return { data: null, error: error.message }
      }

      const player = dbPlayerToPlayer(data)
      return { data: player }
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Failed to add player' }
    }
  },

  // Update player stats (usually after a match)
  async updatePlayerStats(
    playerId: string,
    updates: {
      ranking?: number
      matchesPlayed?: number
      wins?: number
      losses?: number
    },
  ): Promise<{ data: Player | null; error?: string }> {
    if (isMockMode) {
      const playerIndex = mockPlayers.findIndex((p) => p.id === playerId)
      if (playerIndex === -1) {
        return { data: null, error: 'Player not found' }
      }

      const updatedPlayer = {
        ...mockPlayers[playerIndex],
        ...updates,
        updatedAt: new Date().toISOString(),
      }

      mockPlayers[playerIndex] = updatedPlayer
      return { data: updatedPlayer }
    }

    if (!isSupabaseAvailable() || !supabase) {
      return { data: null, error: 'Supabase not available' }
    }

    try {
      const dbUpdates: Partial<DbPlayer> = {}
      if (updates.ranking !== undefined) dbUpdates.ranking = updates.ranking
      if (updates.matchesPlayed !== undefined) dbUpdates.matches_played = updates.matchesPlayed
      if (updates.wins !== undefined) dbUpdates.wins = updates.wins
      if (updates.losses !== undefined) dbUpdates.losses = updates.losses
      dbUpdates.updated_at = new Date().toISOString()

      const { data, error } = await supabase
        .from('players')
        .update(dbUpdates)
        .eq('id', playerId)
        .select()
        .single()

      if (error) {
        return { data: null, error: error.message }
      }

      const player = dbPlayerToPlayer(data)
      return { data: player }
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Failed to update player' }
    }
  },

  // Update multiple players (batch update for match results)
  async updateMultiplePlayers(
    updates: Array<{
      id: string
      ranking?: number
      matchesPlayed?: number
      wins?: number
      losses?: number
    }>,
  ): Promise<{ data: Player[]; error?: string }> {
    if (isMockMode) {
      const updatedPlayers: Player[] = []

      for (const update of updates) {
        const playerIndex = mockPlayers.findIndex((p) => p.id === update.id)
        if (playerIndex !== -1) {
          const updatedPlayer = {
            ...mockPlayers[playerIndex],
            ...update,
            updatedAt: new Date().toISOString(),
          }
          mockPlayers[playerIndex] = updatedPlayer
          updatedPlayers.push(updatedPlayer)
        }
      }

      return { data: updatedPlayers }
    }

    if (!isSupabaseAvailable() || !supabase) {
      return { data: [], error: 'Supabase not available' }
    }

    try {
      const updatedPlayers: Player[] = []

      // Update each player individually (Supabase doesn't support bulk updates easily)
      for (const update of updates) {
        const result = await this.updatePlayerStats(update.id, {
          ranking: update.ranking,
          matchesPlayed: update.matchesPlayed,
          wins: update.wins,
          losses: update.losses,
        })

        if (result.error) {
          return { data: [], error: result.error }
        }

        if (result.data) {
          updatedPlayers.push(result.data)
        }
      }

      return { data: updatedPlayers }
    } catch (err) {
      return { data: [], error: err instanceof Error ? err.message : 'Failed to update players' }
    }
  },

  // Get player by ID
  async getPlayerById(playerId: string): Promise<{ data: Player | null; error?: string }> {
    if (isMockMode) {
      const player = mockPlayers.find((p) => p.id === playerId)
      return { data: player || null }
    }

    if (!isSupabaseAvailable() || !supabase) {
      return { data: null, error: 'Supabase not available' }
    }

    try {
      const { data, error } = await supabase.from('players').select('*').eq('id', playerId).single()

      if (error) {
        return { data: null, error: error.message }
      }

      const player = dbPlayerToPlayer(data)
      return { data: player }
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Failed to fetch player' }
    }
  },

  // Delete player (optional - might not be needed)
  async deletePlayer(playerId: string): Promise<{ success: boolean; error?: string }> {
    if (isMockMode) {
      const playerIndex = mockPlayers.findIndex((p) => p.id === playerId)
      if (playerIndex === -1) {
        return { success: false, error: 'Player not found' }
      }

      mockPlayers.splice(playerIndex, 1)
      return { success: true }
    }

    if (!isSupabaseAvailable() || !supabase) {
      return { success: false, error: 'Supabase not available' }
    }

    try {
      const { error } = await supabase.from('players').delete().eq('id', playerId)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to delete player',
      }
    }
  },

  // Get mock players (for mock mode utilities)
  getMockPlayers(): Player[] {
    return [...mockPlayers]
  },

  // Set mock players (for mock mode utilities)
  setMockPlayers(players: Player[]): void {
    mockPlayers = [...players]
  },
}
