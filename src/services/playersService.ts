import { supabase } from '@/lib/supabase'
import type { DbPlayer, Player } from '@/types'

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
  player: Omit<Player, 'id' | 'createdAt' | 'updatedAt'> & { groupId: string; createdBy: string },
): Omit<DbPlayer, 'id' | 'created_at' | 'updated_at'> => ({
  name: player.name,
  ranking: player.ranking,
  matches_played: player.matchesPlayed,
  wins: player.wins,
  losses: player.losses,
  avatar: player.avatar,
  department: player.department,
  group_id: player.groupId,
  created_by: player.createdBy,
})

export const playersService = {
  // Get all players in a group
  async getPlayersByGroup(groupId: string): Promise<{ data: Player[]; error?: string }> {
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
}
