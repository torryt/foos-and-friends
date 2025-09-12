import type { DbMatch, DbPlayer, FriendGroup, GroupMembership, Match, Player } from '@/types'
import type {
  Database,
  DatabaseListResult,
  DatabaseResult,
  GroupCreationRpcResult,
  GroupJoinRpcResult,
} from './database'
import { supabase } from './supabase'

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

// Transform database match to app match (requires player lookup)
const dbMatchToMatch = async (
  dbMatch: DbMatch,
  playersById: Map<string, Player>,
): Promise<Match> => {
  const team1Player1 = playersById.get(dbMatch.team1_player1_id)
  const team1Player2 = playersById.get(dbMatch.team1_player2_id)
  const team2Player1 = playersById.get(dbMatch.team2_player1_id)
  const team2Player2 = playersById.get(dbMatch.team2_player2_id)

  if (!team1Player1 || !team1Player2 || !team2Player1 || !team2Player2) {
    throw new Error('Could not find all players for match')
  }

  return {
    id: dbMatch.id,
    team1: [team1Player1, team1Player2],
    team2: [team2Player1, team2Player2],
    score1: dbMatch.team1_score,
    score2: dbMatch.team2_score,
    date: dbMatch.match_date,
    time: dbMatch.match_time,
    groupId: dbMatch.group_id,
    recordedBy: dbMatch.recorded_by,
    createdAt: dbMatch.created_at,
    // TODO: Add playerStats transformation when needed
    playerStats: [],
  }
}

// Transform app player to database format for insert
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
  group_id: player.groupId ?? '',
  created_by: player.createdBy ?? '',
})

export class SupabaseDatabase implements Database {
  async getUserGroups(userId: string): Promise<DatabaseListResult<FriendGroup>> {
    try {
      const { data, error } = await supabase
        .from('friend_groups')
        .select(`
          *,
          group_memberships!inner(user_id, is_active),
          player_count:players(count)
        `)
        .eq('group_memberships.user_id', userId)
        .eq('group_memberships.is_active', true)
        .eq('is_active', true)

      if (error) {
        return { data: [], error: error.message }
      }

      const groups: FriendGroup[] = (data || []).map((group) => ({
        id: group.id,
        name: group.name,
        description: group.description,
        inviteCode: group.invite_code,
        ownerId: group.owner_id,
        createdBy: group.created_by,
        isActive: group.is_active,
        maxMembers: group.max_members,
        createdAt: group.created_at,
        updatedAt: group.updated_at,
        playerCount: group.player_count?.[0]?.count || 0,
      }))

      return { data: groups, error: null }
    } catch (err) {
      return { data: [], error: err instanceof Error ? err.message : 'Failed to fetch groups' }
    }
  }

  async getGroupById(groupId: string): Promise<DatabaseResult<FriendGroup>> {
    try {
      const { data, error } = await supabase
        .from('friend_groups')
        .select('*')
        .eq('id', groupId)
        .eq('is_active', true)
        .single()

      if (error) {
        return { data: null, error: error.message }
      }

      const group: FriendGroup = {
        id: data.id,
        name: data.name,
        description: data.description,
        inviteCode: data.invite_code,
        ownerId: data.owner_id,
        createdBy: data.created_by,
        isActive: data.is_active,
        maxMembers: data.max_members,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      }

      return { data: group, error: null }
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Failed to fetch group' }
    }
  }

  async getGroupByInviteCode(inviteCode: string): Promise<DatabaseResult<FriendGroup>> {
    try {
      const { data, error } = await supabase.rpc('get_group_by_invite_code', {
        p_invite_code: inviteCode,
      })

      if (error) {
        return { data: null, error: error.message }
      }

      if (!data.success) {
        return { data: null, error: data.error }
      }

      const groupData = data.data
      const group: FriendGroup = {
        id: groupData.id,
        name: groupData.name,
        description: groupData.description,
        inviteCode: groupData.invite_code,
        ownerId: groupData.owner_id,
        createdBy: groupData.created_by,
        isActive: groupData.is_active,
        maxMembers: groupData.max_members,
        createdAt: groupData.created_at,
        updatedAt: groupData.updated_at,
        playerCount: 0, // We don't need the actual count for invite preview
      }

      return { data: group, error: null }
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : 'Failed to fetch group by invite code',
      }
    }
  }

  async createGroup(
    name: string,
    description?: string,
  ): Promise<DatabaseResult<GroupCreationRpcResult>> {
    try {
      const { data, error } = await supabase.rpc('create_friend_group', {
        p_name: name,
        p_description: description || null,
      })

      if (error) {
        return { data: null, error: error.message }
      }

      return { data: data as GroupCreationRpcResult, error: null }
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Failed to create group' }
    }
  }

  async joinGroupByInvite(
    inviteCode: string,
    userId?: string,
  ): Promise<DatabaseResult<GroupJoinRpcResult>> {
    try {
      const { data, error } = await supabase.rpc('join_group_by_invite_code', {
        p_invite_code: inviteCode,
        p_user_id: userId,
      })

      if (error) {
        return { data: null, error: error.message }
      }

      return { data: data as GroupJoinRpcResult, error: null }
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Failed to join group' }
    }
  }

  async getGroupMembers(groupId: string): Promise<DatabaseListResult<GroupMembership>> {
    try {
      const { data, error } = await supabase
        .from('group_memberships')
        .select('*')
        .eq('group_id', groupId)
        .eq('is_active', true)

      if (error) {
        return { data: [], error: error.message }
      }

      const memberships: GroupMembership[] = (data || []).map((membership) => ({
        id: membership.id,
        groupId: membership.group_id,
        userId: membership.user_id,
        role: membership.role,
        isActive: membership.is_active,
        invitedBy: membership.invited_by,
        joinedAt: membership.joined_at,
        createdAt: membership.created_at,
      }))

      return { data: memberships, error: null }
    } catch (err) {
      return { data: [], error: err instanceof Error ? err.message : 'Failed to fetch members' }
    }
  }

  async getPlayersByGroup(groupId: string): Promise<DatabaseListResult<Player>> {
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
      return { data: players, error: null }
    } catch (err) {
      return { data: [], error: err instanceof Error ? err.message : 'Failed to fetch players' }
    }
  }

  async getPlayerById(playerId: string): Promise<DatabaseResult<Player>> {
    try {
      const { data, error } = await supabase.from('players').select('*').eq('id', playerId).single()

      if (error) {
        return { data: null, error: error.message }
      }

      return { data: dbPlayerToPlayer(data), error: null }
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Failed to fetch player' }
    }
  }

  async createPlayer(
    player: Omit<Player, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<DatabaseResult<Player>> {
    try {
      const { data, error } = await supabase
        .from('players')
        .insert(playerToDbInsert(player))
        .select()
        .single()

      if (error) {
        return { data: null, error: error.message }
      }

      return { data: dbPlayerToPlayer(data), error: null }
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Failed to create player' }
    }
  }

  async updatePlayer(playerId: string, updates: Partial<Player>): Promise<DatabaseResult<Player>> {
    try {
      const dbUpdates: Record<string, unknown> = {}
      if (updates.name !== undefined) dbUpdates.name = updates.name
      if (updates.ranking !== undefined) dbUpdates.ranking = updates.ranking
      if (updates.matchesPlayed !== undefined) dbUpdates.matches_played = updates.matchesPlayed
      if (updates.wins !== undefined) dbUpdates.wins = updates.wins
      if (updates.losses !== undefined) dbUpdates.losses = updates.losses
      if (updates.avatar !== undefined) dbUpdates.avatar = updates.avatar
      if (updates.department !== undefined) dbUpdates.department = updates.department

      const { data, error } = await supabase
        .from('players')
        .update(dbUpdates)
        .eq('id', playerId)
        .select()
        .single()

      if (error) {
        return { data: null, error: error.message }
      }

      return { data: dbPlayerToPlayer(data), error: null }
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Failed to update player' }
    }
  }

  async updateMultiplePlayers(
    updates: Array<{ id: string } & Partial<Player>>,
  ): Promise<{ data?: Player[]; error?: string }> {
    try {
      const updatedPlayers: Player[] = []
      for (const update of updates) {
        const { id, ...playerUpdates } = update
        const result = await this.updatePlayer(id, playerUpdates)
        if (result.error) {
          return { error: result.error }
        }
        if (result.data) {
          updatedPlayers.push(result.data)
        }
      }
      return { data: updatedPlayers }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to update players' }
    }
  }

  async deletePlayer(playerId: string): Promise<{ success?: boolean; error?: string }> {
    try {
      const { error } = await supabase.from('players').delete().eq('id', playerId)

      if (error) {
        return { error: error.message }
      }

      return { success: true }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to delete player' }
    }
  }

  // Match operations - to be implemented with proper match logic
  async getMatchesByGroup(groupId: string): Promise<DatabaseListResult<Match>> {
    try {
      // First get all matches for the group
      const { data: matchData, error: matchError } = await supabase
        .from('matches')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false })

      if (matchError) {
        return { data: [], error: matchError.message }
      }

      // If no matches, return empty array (this is normal)
      if (!matchData || matchData.length === 0) {
        return { data: [], error: null }
      }

      // Get all unique player IDs from the matches
      const playerIds = new Set<string>()
      matchData.forEach((match) => {
        playerIds.add(match.team1_player1_id)
        playerIds.add(match.team1_player2_id)
        playerIds.add(match.team2_player1_id)
        playerIds.add(match.team2_player2_id)
      })

      // Fetch all players in one query
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('*')
        .in('id', Array.from(playerIds))

      if (playersError) {
        return { data: [], error: playersError.message }
      }

      // Create a map of player ID to Player object
      const playersById = new Map<string, Player>()
      playersData.forEach((dbPlayer) => {
        playersById.set(dbPlayer.id, dbPlayerToPlayer(dbPlayer))
      })

      // Transform matches with player data
      const matches: Match[] = []
      for (const dbMatch of matchData) {
        try {
          const match = await dbMatchToMatch(dbMatch, playersById)
          matches.push(match)
        } catch (err) {
          console.warn('Failed to transform match:', err)
          // Skip matches with missing players
        }
      }

      return { data: matches, error: null }
    } catch (err) {
      return { data: [], error: err instanceof Error ? err.message : 'Failed to fetch matches' }
    }
  }

  async getMatchById(matchId: string): Promise<DatabaseResult<Match>> {
    try {
      // Get the match
      const { data: matchData, error: matchError } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single()

      if (matchError) {
        return { data: null, error: matchError.message }
      }

      // Get all players for this match
      const playerIds = [
        matchData.team1_player1_id,
        matchData.team1_player2_id,
        matchData.team2_player1_id,
        matchData.team2_player2_id,
      ]

      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('*')
        .in('id', playerIds)

      if (playersError) {
        return { data: null, error: playersError.message }
      }

      // Create players map
      const playersById = new Map<string, Player>()
      playersData.forEach((dbPlayer) => {
        playersById.set(dbPlayer.id, dbPlayerToPlayer(dbPlayer))
      })

      // Transform the match
      const match = await dbMatchToMatch(matchData, playersById)
      return { data: match, error: null }
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Failed to fetch match' }
    }
  }

  async recordMatch(
    groupId: string,
    team1Player1Id: string,
    team1Player2Id: string,
    team2Player1Id: string,
    team2Player2Id: string,
    score1: number,
    score2: number,
    recordedBy: string,
    rankingData: {
      team1Player1PreRanking: number
      team1Player1PostRanking: number
      team1Player2PreRanking: number
      team1Player2PostRanking: number
      team2Player1PreRanking: number
      team2Player1PostRanking: number
      team2Player2PreRanking: number
      team2Player2PostRanking: number
    },
  ): Promise<DatabaseResult<Match>> {
    try {
      const now = new Date()
      const matchDate = now.toISOString().split('T')[0] // YYYY-MM-DD
      const matchTime = now.toTimeString().split(' ')[0] // HH:MM:SS

      const { data, error } = await supabase
        .from('matches')
        .insert({
          group_id: groupId,
          team1_player1_id: team1Player1Id,
          team1_player2_id: team1Player2Id,
          team2_player1_id: team2Player1Id,
          team2_player2_id: team2Player2Id,
          team1_score: score1,
          team2_score: score2,
          match_date: matchDate,
          match_time: matchTime,
          recorded_by: recordedBy,
          // Add ranking data
          team1_player1_pre_ranking: rankingData.team1Player1PreRanking,
          team1_player1_post_ranking: rankingData.team1Player1PostRanking,
          team1_player2_pre_ranking: rankingData.team1Player2PreRanking,
          team1_player2_post_ranking: rankingData.team1Player2PostRanking,
          team2_player1_pre_ranking: rankingData.team2Player1PreRanking,
          team2_player1_post_ranking: rankingData.team2Player1PostRanking,
          team2_player2_pre_ranking: rankingData.team2Player2PreRanking,
          team2_player2_post_ranking: rankingData.team2Player2PostRanking,
        })
        .select()
        .single()

      if (error) {
        return { data: null, error: error.message }
      }

      // Get the match with player data
      const matchResult = await this.getMatchById(data.id)
      return matchResult
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Failed to record match' }
    }
  }
}

// Create the default database instance
export const database = new SupabaseDatabase()
