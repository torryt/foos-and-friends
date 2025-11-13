import type {
  DbMatch,
  DbPlayer,
  DbPlayerSeasonStats,
  DbSeason,
  FriendGroup,
  GroupMembership,
  Match,
  Player,
  PlayerMatchStats,
  PlayerSeasonStats,
  Season,
} from '@/types'
import type {
  Database,
  DatabaseListResult,
  DatabaseResult,
  GroupCreationRpcResult,
  GroupDeletionRpcResult,
  GroupJoinRpcResult,
  GroupLeaveRpcResult,
  SeasonCreationRpcResult,
} from './database'
import { supabase } from './supabase'

// Transform database player to app player
// Stats are computed from matches, so we need to fetch them separately
const dbPlayerToPlayer = (
  dbPlayer: DbPlayer,
  computedStats?: { ranking: number; matchesPlayed: number; wins: number; losses: number },
): Player => ({
  id: dbPlayer.id,
  name: dbPlayer.name,
  ranking: computedStats?.ranking ?? 1200, // Default ELO if no matches
  matchesPlayed: computedStats?.matchesPlayed ?? 0,
  wins: computedStats?.wins ?? 0,
  losses: computedStats?.losses ?? 0,
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

  // Transform ranking data if available
  const playerStats: PlayerMatchStats[] = []

  // Add stats for each player if ranking data exists
  if (
    dbMatch.team1_player1_pre_ranking !== undefined &&
    dbMatch.team1_player1_post_ranking !== undefined
  ) {
    playerStats.push({
      playerId: dbMatch.team1_player1_id,
      preGameRanking: dbMatch.team1_player1_pre_ranking,
      postGameRanking: dbMatch.team1_player1_post_ranking,
    })
  }

  if (
    dbMatch.team1_player2_pre_ranking !== undefined &&
    dbMatch.team1_player2_post_ranking !== undefined
  ) {
    playerStats.push({
      playerId: dbMatch.team1_player2_id,
      preGameRanking: dbMatch.team1_player2_pre_ranking,
      postGameRanking: dbMatch.team1_player2_post_ranking,
    })
  }

  if (
    dbMatch.team2_player1_pre_ranking !== undefined &&
    dbMatch.team2_player1_post_ranking !== undefined
  ) {
    playerStats.push({
      playerId: dbMatch.team2_player1_id,
      preGameRanking: dbMatch.team2_player1_pre_ranking,
      postGameRanking: dbMatch.team2_player1_post_ranking,
    })
  }

  if (
    dbMatch.team2_player2_pre_ranking !== undefined &&
    dbMatch.team2_player2_post_ranking !== undefined
  ) {
    playerStats.push({
      playerId: dbMatch.team2_player2_id,
      preGameRanking: dbMatch.team2_player2_pre_ranking,
      postGameRanking: dbMatch.team2_player2_post_ranking,
    })
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
    playerStats,
  }
}

// Transform app player to database format for insert
// Stats are computed from matches, so we don't insert them
const playerToDbInsert = (
  player: Omit<Player, 'id' | 'createdAt' | 'updatedAt'>,
): Omit<DbPlayer, 'id' | 'created_at' | 'updated_at'> => ({
  name: player.name,
  avatar: player.avatar,
  department: player.department,
  group_id: player.groupId ?? '',
  created_by: player.createdBy ?? '',
})

// Transform database season to app season
const dbSeasonToSeason = (dbSeason: DbSeason): Season => ({
  id: dbSeason.id,
  groupId: dbSeason.group_id,
  name: dbSeason.name,
  description: dbSeason.description,
  seasonNumber: dbSeason.season_number,
  startDate: dbSeason.start_date,
  endDate: dbSeason.end_date,
  isActive: dbSeason.is_active,
  createdBy: dbSeason.created_by,
  createdAt: dbSeason.created_at,
  updatedAt: dbSeason.updated_at,
})

// Transform database player season stats to app format
// Stats are computed from matches via the view
const dbPlayerSeasonStatsToPlayerSeasonStats = (
  dbStats: DbPlayerSeasonStats & {
    ranking?: number
    matches_played?: number
    wins?: number
    losses?: number
    goals_for?: number
    goals_against?: number
  },
): PlayerSeasonStats => ({
  id: dbStats.id,
  playerId: dbStats.player_id,
  seasonId: dbStats.season_id,
  ranking: dbStats.ranking ?? 1200, // Default ELO if no matches
  matchesPlayed: dbStats.matches_played ?? 0,
  wins: dbStats.wins ?? 0,
  losses: dbStats.losses ?? 0,
  goalsFor: dbStats.goals_for ?? 0,
  goalsAgainst: dbStats.goals_against ?? 0,
  createdAt: dbStats.created_at,
  updatedAt: dbStats.updated_at,
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
        isOwner: group.owner_id === userId,
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

  async deleteGroup(
    groupId: string,
    userId: string,
  ): Promise<DatabaseResult<GroupDeletionRpcResult>> {
    try {
      const { data, error } = await supabase.rpc('delete_group_with_cascade', {
        p_group_id: groupId,
        p_user_id: userId,
      })

      if (error) {
        return { data: null, error: error.message }
      }

      return { data: data as GroupDeletionRpcResult, error: null }
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Failed to delete group' }
    }
  }

  async leaveGroup(groupId: string, userId: string): Promise<DatabaseResult<GroupLeaveRpcResult>> {
    try {
      const { data, error } = await supabase.rpc('leave_group', {
        p_group_id: groupId,
        p_user_id: userId,
      })

      if (error) {
        return { data: null, error: error.message }
      }

      return { data: data as GroupLeaveRpcResult, error: null }
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Failed to leave group' }
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
      // Get players
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('*')
        .eq('group_id', groupId)

      if (playersError) {
        return { data: [], error: playersError.message }
      }

      // Get computed stats for all players
      const { data: statsData, error: statsError } = await supabase
        .from('player_stats_computed')
        .select('*')
        .eq('group_id', groupId)

      if (statsError) {
        return { data: [], error: statsError.message }
      }

      // Create a map of player ID to stats
      const statsById = new Map(statsData.map((s) => [s.player_id, s]))

      // Transform players with computed stats
      const players = (playersData || []).map((dbPlayer) => {
        const stats = statsById.get(dbPlayer.id)
        // Compute ranking by calling the function
        return dbPlayerToPlayer(dbPlayer, {
          ranking: stats?.ranking ?? 1200,
          matchesPlayed: stats?.matches_played ?? 0,
          wins: stats?.wins ?? 0,
          losses: stats?.losses ?? 0,
        })
      })

      // Sort by ranking (computed or default)
      players.sort((a, b) => b.ranking - a.ranking)

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

      // Get computed stats
      const { data: statsData } = await supabase
        .from('player_stats_computed')
        .select('*')
        .eq('player_id', playerId)
        .single()

      // Compute ranking from match history
      const { data: rankingData } = await supabase.rpc('compute_player_global_ranking', {
        p_player_id: playerId,
      })

      return {
        data: dbPlayerToPlayer(data, {
          ranking: rankingData ?? 1200,
          matchesPlayed: statsData?.matches_played ?? 0,
          wins: statsData?.wins ?? 0,
          losses: statsData?.losses ?? 0,
        }),
        error: null,
      }
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
      // Only allow updating profile fields, not computed stats
      const dbUpdates: Record<string, unknown> = {}
      if (updates.name !== undefined) dbUpdates.name = updates.name
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

      // Get computed stats after update
      const { data: statsData } = await supabase
        .from('player_stats_computed')
        .select('*')
        .eq('player_id', playerId)
        .single()

      // Compute ranking from match history
      const { data: rankingData } = await supabase.rpc('compute_player_global_ranking', {
        p_player_id: playerId,
      })

      return {
        data: dbPlayerToPlayer(data, {
          ranking: rankingData ?? 1200,
          matchesPlayed: statsData?.matches_played ?? 0,
          wins: statsData?.wins ?? 0,
          losses: statsData?.losses ?? 0,
        }),
        error: null,
      }
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
    seasonId: string,
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
          season_id: seasonId,
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

  // ===== SEASON OPERATIONS =====

  async getSeasonsByGroup(groupId: string): Promise<DatabaseListResult<Season>> {
    try {
      const { data, error } = await supabase
        .from('seasons')
        .select('*')
        .eq('group_id', groupId)
        .order('season_number', { ascending: false })

      if (error) {
        return { data: [], error: error.message }
      }

      const seasons = (data || []).map(dbSeasonToSeason)
      return { data: seasons, error: null }
    } catch (err) {
      return { data: [], error: err instanceof Error ? err.message : 'Failed to fetch seasons' }
    }
  }

  async getActiveSeason(groupId: string): Promise<DatabaseResult<Season>> {
    try {
      const { data, error } = await supabase
        .from('seasons')
        .select('*')
        .eq('group_id', groupId)
        .eq('is_active', true)
        .single()

      if (error) {
        return { data: null, error: error.message }
      }

      return { data: dbSeasonToSeason(data), error: null }
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : 'Failed to fetch active season',
      }
    }
  }

  async getSeasonById(seasonId: string): Promise<DatabaseResult<Season>> {
    try {
      const { data, error } = await supabase.from('seasons').select('*').eq('id', seasonId).single()

      if (error) {
        return { data: null, error: error.message }
      }

      return { data: dbSeasonToSeason(data), error: null }
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Failed to fetch season' }
    }
  }

  async endSeasonAndCreateNew(
    groupId: string,
    newSeasonName: string,
    newSeasonDescription?: string,
  ): Promise<DatabaseResult<SeasonCreationRpcResult>> {
    try {
      const { data, error } = await supabase.rpc('end_season_and_create_new', {
        p_group_id: groupId,
        p_new_season_name: newSeasonName,
        p_new_season_description: newSeasonDescription || null,
      })

      if (error) {
        return { data: null, error: error.message }
      }

      return { data, error: null }
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : 'Failed to create new season',
      }
    }
  }

  async getMatchesBySeason(seasonId: string): Promise<DatabaseListResult<Match>> {
    try {
      const { data: matchesData, error: matchesError } = await supabase
        .from('matches')
        .select('*')
        .eq('season_id', seasonId)
        .order('match_date', { ascending: false })
        .order('match_time', { ascending: false })

      if (matchesError) {
        return { data: [], error: matchesError.message }
      }

      if (!matchesData || matchesData.length === 0) {
        return { data: [], error: null }
      }

      // Get unique player IDs
      const playerIds = new Set<string>()
      matchesData.forEach((match) => {
        playerIds.add(match.team1_player1_id)
        playerIds.add(match.team1_player2_id)
        playerIds.add(match.team2_player1_id)
        playerIds.add(match.team2_player2_id)
      })

      // Fetch all players
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('*')
        .in('id', Array.from(playerIds))

      if (playersError) {
        return { data: [], error: playersError.message }
      }

      // Create players map
      const playersById = new Map<string, Player>()
      playersData.forEach((dbPlayer) => {
        playersById.set(dbPlayer.id, dbPlayerToPlayer(dbPlayer))
      })

      // Transform matches
      const matches = await Promise.all(
        matchesData.map((dbMatch) => dbMatchToMatch(dbMatch, playersById)),
      )

      return { data: matches, error: null }
    } catch (err) {
      return {
        data: [],
        error: err instanceof Error ? err.message : 'Failed to fetch season matches',
      }
    }
  }

  // ===== PLAYER SEASON STATS OPERATIONS =====

  async getPlayerSeasonStats(
    playerId: string,
    seasonId: string,
  ): Promise<DatabaseResult<PlayerSeasonStats>> {
    try {
      // Get player season stats record (just the relationship)
      const { data, error } = await supabase
        .from('player_season_stats')
        .select('*')
        .eq('player_id', playerId)
        .eq('season_id', seasonId)
        .single()

      if (error) {
        return { data: null, error: error.message }
      }

      // Get computed stats from the view
      const { data: computedData } = await supabase
        .from('player_season_stats_computed')
        .select('*')
        .eq('player_id', playerId)
        .eq('season_id', seasonId)
        .single()

      // Compute ranking from match history
      const { data: rankingData } = await supabase.rpc('compute_player_season_ranking', {
        p_player_id: playerId,
        p_season_id: seasonId,
      })

      return {
        data: dbPlayerSeasonStatsToPlayerSeasonStats({
          ...data,
          ranking: rankingData ?? 1200,
          matches_played: computedData?.matches_played,
          wins: computedData?.wins,
          losses: computedData?.losses,
          goals_for: computedData?.goals_for,
          goals_against: computedData?.goals_against,
        }),
        error: null,
      }
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : 'Failed to fetch player season stats',
      }
    }
  }

  async getSeasonLeaderboard(seasonId: string): Promise<DatabaseListResult<PlayerSeasonStats>> {
    try {
      // Get all player season stats for this season from the computed view
      const { data: computedData, error: computedError } = await supabase
        .from('player_season_stats_computed')
        .select('*')
        .eq('season_id', seasonId)

      if (computedError) {
        return { data: [], error: computedError.message }
      }

      // For each player, compute ranking from match history
      const statsWithRankings = await Promise.all(
        (computedData || []).map(async (stats) => {
          const { data: rankingData } = await supabase.rpc('compute_player_season_ranking', {
            p_player_id: stats.player_id,
            p_season_id: seasonId,
          })

          return dbPlayerSeasonStatsToPlayerSeasonStats({
            id: stats.id,
            player_id: stats.player_id,
            season_id: stats.season_id,
            created_at: stats.created_at,
            updated_at: stats.updated_at,
            ranking: rankingData ?? 1200,
            matches_played: stats.matches_played,
            wins: stats.wins,
            losses: stats.losses,
            goals_for: stats.goals_for,
            goals_against: stats.goals_against,
          })
        }),
      )

      // Sort by ranking descending
      statsWithRankings.sort((a, b) => b.ranking - a.ranking)

      return { data: statsWithRankings, error: null }
    } catch (err) {
      return {
        data: [],
        error: err instanceof Error ? err.message : 'Failed to fetch season leaderboard',
      }
    }
  }

  async initializePlayerForSeason(
    playerId: string,
    seasonId: string,
  ): Promise<DatabaseResult<PlayerSeasonStats>> {
    try {
      // Just create the relationship record, stats will be computed
      const { data, error } = await supabase
        .from('player_season_stats')
        .insert({
          player_id: playerId,
          season_id: seasonId,
        })
        .select()
        .single()

      if (error) {
        return { data: null, error: error.message }
      }

      // Return with default stats (no matches yet)
      return {
        data: dbPlayerSeasonStatsToPlayerSeasonStats({
          ...data,
          ranking: 1200,
          matches_played: 0,
          wins: 0,
          losses: 0,
          goals_for: 0,
          goals_against: 0,
        }),
        error: null,
      }
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : 'Failed to initialize player for season',
      }
    }
  }

  async updatePlayerSeasonStats(
    playerId: string,
    seasonId: string,
    _updates: Partial<PlayerSeasonStats>,
  ): Promise<DatabaseResult<PlayerSeasonStats>> {
    try {
      // Stats are computed, so this method just ensures the record exists
      // and returns the computed stats (updates parameter ignored)
      const { data, error } = await supabase
        .from('player_season_stats')
        .select('*')
        .eq('player_id', playerId)
        .eq('season_id', seasonId)
        .single()

      if (error) {
        return { data: null, error: error.message }
      }

      // Get computed stats from the view
      const { data: computedData } = await supabase
        .from('player_season_stats_computed')
        .select('*')
        .eq('player_id', playerId)
        .eq('season_id', seasonId)
        .single()

      // Compute ranking from match history
      const { data: rankingData } = await supabase.rpc('compute_player_season_ranking', {
        p_player_id: playerId,
        p_season_id: seasonId,
      })

      return {
        data: dbPlayerSeasonStatsToPlayerSeasonStats({
          ...data,
          ranking: rankingData ?? 1200,
          matches_played: computedData?.matches_played,
          wins: computedData?.wins,
          losses: computedData?.losses,
          goals_for: computedData?.goals_for,
          goals_against: computedData?.goals_against,
        }),
        error: null,
      }
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : 'Failed to update player season stats',
      }
    }
  }

  async updateMultiplePlayerSeasonStats(
    updates: Array<{ playerId: string; seasonId: string } & Partial<PlayerSeasonStats>>,
  ): Promise<{ data?: PlayerSeasonStats[]; error?: string }> {
    try {
      const results = await Promise.all(
        updates.map((update) =>
          this.updatePlayerSeasonStats(update.playerId, update.seasonId, update),
        ),
      )

      // Check if any updates failed
      const failedUpdate = results.find((result) => result.error)
      if (failedUpdate) {
        return { error: failedUpdate.error || 'Failed to update some player season stats' }
      }

      const data = results.map((result) => result.data).filter(Boolean) as PlayerSeasonStats[]
      return { data }
    } catch (err) {
      return {
        error: err instanceof Error ? err.message : 'Failed to update multiple player season stats',
      }
    }
  }
}

// Create the default database instance
export const database = new SupabaseDatabase()
