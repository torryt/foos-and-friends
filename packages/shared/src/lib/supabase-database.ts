import type {
  DbMatch,
  DbPlayer,
  DbPlayerSeasonStats,
  DbSeason,
  DbSeasonTrophy,
  FriendGroup,
  GroupMember,
  GroupPreview,
  GroupRole,
  JoinPolicy,
  JoinRequest,
  Match,
  MatchType,
  MyPendingJoinRequest,
  PendingJoinRequestCount,
  Player,
  PlayerMatchStats,
  PlayerSeasonStats,
  PublicGroupData,
  PublicGroupInfo,
  PublicSeasonStats,
  Season,
  SeasonTrophy,
  SportType,
  TrophyRank,
} from '../types/index.ts'
import type {
  Database,
  DatabaseListResult,
  DatabaseResult,
  GroupCreationRpcResult,
  GroupDeletionRpcResult,
  GroupJoinRpcResult,
  GroupLeaveRpcResult,
  GroupMembersRpcResult,
  GroupSettingsUpdate,
  GroupSharingRpcResult,
  MemberActionRpcResult,
  SeasonCreationRpcResult,
} from './database.ts'
import { getSupabase } from './supabase.ts'

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
  const is1v1 = (dbMatch.match_type ?? '2v2') === '1v1'

  const team1Player1 = playersById.get(dbMatch.team1_player1_id)
  const team2Player1 = playersById.get(dbMatch.team2_player1_id)

  if (!team1Player1 || !team2Player1) {
    throw new Error('Could not find required players for match')
  }

  // For 1v1 matches, player2 columns are null
  const team1Player2 = dbMatch.team1_player2_id
    ? (playersById.get(dbMatch.team1_player2_id) ?? null)
    : null
  const team2Player2 = dbMatch.team2_player2_id
    ? (playersById.get(dbMatch.team2_player2_id) ?? null)
    : null

  // Validate 2v2 matches have all players
  if (!is1v1 && (!team1Player2 || !team2Player2)) {
    throw new Error('2v2 match missing required players')
  }

  // Transform ranking data if available
  const playerStats: PlayerMatchStats[] = []

  // Always include team1_player1 and team2_player1
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
    dbMatch.team2_player1_pre_ranking !== undefined &&
    dbMatch.team2_player1_post_ranking !== undefined
  ) {
    playerStats.push({
      playerId: dbMatch.team2_player1_id,
      preGameRanking: dbMatch.team2_player1_pre_ranking,
      postGameRanking: dbMatch.team2_player1_post_ranking,
    })
  }

  // Include player2 stats only for 2v2 matches
  if (!is1v1) {
    if (
      dbMatch.team1_player2_pre_ranking != null &&
      dbMatch.team1_player2_post_ranking != null &&
      dbMatch.team1_player2_id
    ) {
      playerStats.push({
        playerId: dbMatch.team1_player2_id,
        preGameRanking: dbMatch.team1_player2_pre_ranking,
        postGameRanking: dbMatch.team1_player2_post_ranking,
      })
    }

    if (
      dbMatch.team2_player2_pre_ranking != null &&
      dbMatch.team2_player2_post_ranking != null &&
      dbMatch.team2_player2_id
    ) {
      playerStats.push({
        playerId: dbMatch.team2_player2_id,
        preGameRanking: dbMatch.team2_player2_pre_ranking,
        postGameRanking: dbMatch.team2_player2_post_ranking,
      })
    }
  }

  return {
    id: dbMatch.id,
    matchType: dbMatch.match_type ?? '2v2',
    team1: [team1Player1, team1Player2],
    team2: [team2Player1, team2Player2],
    score1: dbMatch.team1_score,
    score2: dbMatch.team2_score,
    date: dbMatch.match_date,
    time: dbMatch.match_time,
    groupId: dbMatch.group_id,
    seasonId: dbMatch.season_id,
    recordedBy: dbMatch.recorded_by,
    createdAt: dbMatch.created_at,
    playerStats,
  }
}

// Transform app player to database format for insert
// Note: Stats fields (ranking, matches_played, wins, losses) are NOT included
// because they are computed from match history via the player_stats_computed view
const playerToDbInsert = (
  player: Omit<Player, 'id' | 'createdAt' | 'updatedAt'>,
): { name: string; avatar: string; department: string; group_id: string; created_by: string } => ({
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
const dbPlayerSeasonStatsToPlayerSeasonStats = (
  dbStats: DbPlayerSeasonStats,
): PlayerSeasonStats => ({
  id: dbStats.id,
  playerId: dbStats.player_id,
  seasonId: dbStats.season_id,
  ranking: dbStats.ranking,
  matchesPlayed: dbStats.matches_played,
  wins: dbStats.wins,
  losses: dbStats.losses,
  goalsFor: dbStats.goals_for,
  goalsAgainst: dbStats.goals_against,
  createdAt: dbStats.created_at,
  updatedAt: dbStats.updated_at,
})

// Transform database season trophy (with joined season) to app format
const dbSeasonTrophyToSeasonTrophy = (dbTrophy: DbSeasonTrophy): SeasonTrophy => ({
  id: dbTrophy.id,
  groupId: dbTrophy.group_id,
  seasonId: dbTrophy.season_id,
  playerId: dbTrophy.player_id,
  rank: dbTrophy.rank as TrophyRank,
  seasonName: dbTrophy.seasons?.name ?? '',
  seasonNumber: dbTrophy.seasons?.season_number ?? 0,
  createdAt: dbTrophy.created_at,
})

// Sharing-related fields shared by every friend_groups row mapping
const groupSharingFields = (
  row: Record<string, unknown>,
): Pick<FriendGroup, 'joinPolicy' | 'isPublic'> => ({
  joinPolicy: (row.join_policy as JoinPolicy) ?? 'open',
  isPublic: (row.is_public as boolean) ?? false,
})

export class SupabaseDatabase implements Database {
  async getUserGroups(
    userId: string,
    sportType?: SportType,
  ): Promise<DatabaseListResult<FriendGroup>> {
    try {
      const supabase = getSupabase()
      let query = supabase
        .from('friend_groups')
        .select(`
          *,
          group_memberships!inner(user_id, is_active, role),
          player_count:players(count)
        `)
        .eq('group_memberships.user_id', userId)
        .eq('group_memberships.is_active', true)
        .eq('is_active', true)

      // Filter by sport type if provided
      if (sportType) {
        query = query.eq('sport_type', sportType)
      }

      const { data, error } = await query

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
        currentUserRole: group.group_memberships?.[0]?.role as GroupRole | undefined,
        sportType: group.sport_type as SportType,
        supportedMatchTypes: (group.supported_match_types as MatchType[]) || ['2v2'],
        targetScore: (group.target_score as number) ?? 10,
        ...groupSharingFields(group),
      }))

      return { data: groups, error: null }
    } catch (err) {
      return { data: [], error: err instanceof Error ? err.message : 'Failed to fetch groups' }
    }
  }

  async getGroupById(groupId: string): Promise<DatabaseResult<FriendGroup>> {
    try {
      const supabase = getSupabase()
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
        sportType: data.sport_type as SportType,
        supportedMatchTypes: (data.supported_match_types as MatchType[]) || ['2v2'],
        targetScore: (data.target_score as number) ?? 10,
        ...groupSharingFields(data),
      }

      return { data: group, error: null }
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Failed to fetch group' }
    }
  }

  async getGroupByInviteCode(inviteCode: string): Promise<DatabaseResult<FriendGroup>> {
    try {
      const supabase = getSupabase()
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
        sportType: groupData.sport_type as SportType,
        supportedMatchTypes: (groupData.supported_match_types as MatchType[]) || ['2v2'],
        targetScore: (groupData.target_score as number) ?? 10,
        ...groupSharingFields(groupData),
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
    sportType: SportType = 'foosball',
    supportedMatchTypes: MatchType[] = ['2v2'],
  ): Promise<DatabaseResult<GroupCreationRpcResult>> {
    try {
      const supabase = getSupabase()
      const { data, error } = await supabase.rpc('create_group_with_membership', {
        group_name: name,
        group_description: description || null,
        group_sport_type: sportType,
        group_supported_match_types: supportedMatchTypes,
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
      const supabase = getSupabase()
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
      const supabase = getSupabase()
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

  async updateGroup(
    groupId: string,
    updates: GroupSettingsUpdate,
  ): Promise<DatabaseResult<FriendGroup>> {
    try {
      const supabase = getSupabase()

      const row: Record<string, unknown> = {}
      if (updates.name !== undefined) row.name = updates.name
      if (updates.description !== undefined) row.description = updates.description
      if (updates.targetScore !== undefined) row.target_score = updates.targetScore

      const { data, error } = await supabase
        .from('friend_groups')
        .update(row)
        .eq('id', groupId)
        .select('*')
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
        sportType: data.sport_type as SportType,
        supportedMatchTypes: (data.supported_match_types as MatchType[]) || ['2v2'],
        targetScore: (data.target_score as number) ?? 10,
        ...groupSharingFields(data),
      }

      return { data: group, error: null }
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Failed to update group' }
    }
  }

  async leaveGroup(groupId: string, userId: string): Promise<DatabaseResult<GroupLeaveRpcResult>> {
    try {
      const supabase = getSupabase()
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

  async getGroupMembers(groupId: string): Promise<DatabaseListResult<GroupMember>> {
    try {
      const supabase = getSupabase()
      const { data, error } = await supabase.rpc('get_group_members', {
        p_group_id: groupId,
      })

      if (error) {
        return { data: [], error: error.message }
      }

      const result = data as GroupMembersRpcResult
      if (!result.success) {
        return { data: [], error: result.error || 'Failed to fetch members' }
      }

      const members: GroupMember[] = (result.members || []).map((member) => ({
        id: member.id,
        groupId: member.group_id,
        userId: member.user_id,
        role: member.role,
        isActive: member.is_active,
        invitedBy: member.invited_by,
        joinedAt: member.joined_at,
        createdAt: member.created_at,
        email: member.email,
      }))

      return { data: members, error: null }
    } catch (err) {
      return { data: [], error: err instanceof Error ? err.message : 'Failed to fetch members' }
    }
  }

  async promoteGroupMember(
    groupId: string,
    targetUserId: string,
  ): Promise<DatabaseResult<MemberActionRpcResult>> {
    try {
      const supabase = getSupabase()
      const { data, error } = await supabase.rpc('promote_group_member', {
        p_group_id: groupId,
        p_target_user_id: targetUserId,
      })

      if (error) {
        return { data: null, error: error.message }
      }

      return { data: data as MemberActionRpcResult, error: null }
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Failed to promote member' }
    }
  }

  async demoteGroupMember(
    groupId: string,
    targetUserId: string,
  ): Promise<DatabaseResult<MemberActionRpcResult>> {
    try {
      const supabase = getSupabase()
      const { data, error } = await supabase.rpc('demote_group_member', {
        p_group_id: groupId,
        p_target_user_id: targetUserId,
      })

      if (error) {
        return { data: null, error: error.message }
      }

      return { data: data as MemberActionRpcResult, error: null }
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Failed to demote admin' }
    }
  }

  async removeGroupMember(
    groupId: string,
    targetUserId: string,
  ): Promise<DatabaseResult<MemberActionRpcResult>> {
    try {
      const supabase = getSupabase()
      const { data, error } = await supabase.rpc('remove_group_member', {
        p_group_id: groupId,
        p_target_user_id: targetUserId,
      })

      if (error) {
        return { data: null, error: error.message }
      }

      return { data: data as MemberActionRpcResult, error: null }
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Failed to remove member' }
    }
  }

  async getPlayersByGroup(groupId: string): Promise<DatabaseListResult<Player>> {
    try {
      const supabase = getSupabase()
      // Read from computed view for stats derived from match history
      const { data, error } = await supabase
        .from('player_stats_computed')
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
      const supabase = getSupabase()
      // Read from computed view for stats derived from match history
      const { data, error } = await supabase
        .from('player_stats_computed')
        .select('*')
        .eq('id', playerId)
        .single()

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
      const supabase = getSupabase()
      // Insert into players table (stats not included - they're computed)
      const { data: insertData, error: insertError } = await supabase
        .from('players')
        .insert(playerToDbInsert(player))
        .select('id')
        .single()

      if (insertError) {
        return { data: null, error: insertError.message }
      }

      // Read from computed view to get the full player with computed stats
      const { data, error } = await supabase
        .from('player_stats_computed')
        .select('*')
        .eq('id', insertData.id)
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
      const supabase = getSupabase()
      // Only allow profile updates (name, avatar, department)
      // Stats (ranking, matchesPlayed, wins, losses) are computed from match history
      const dbUpdates: Record<string, unknown> = {}
      if (updates.name !== undefined) dbUpdates.name = updates.name
      if (updates.avatar !== undefined) dbUpdates.avatar = updates.avatar
      if (updates.department !== undefined) dbUpdates.department = updates.department

      // If no valid updates, just return current player
      if (Object.keys(dbUpdates).length === 0) {
        return this.getPlayerById(playerId)
      }

      const { error: updateError } = await supabase
        .from('players')
        .update(dbUpdates)
        .eq('id', playerId)

      if (updateError) {
        return { data: null, error: updateError.message }
      }

      // Read from computed view to get updated player with computed stats
      const { data, error } = await supabase
        .from('player_stats_computed')
        .select('*')
        .eq('id', playerId)
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
    // DEPRECATED: Stats are now computed from match history.
    // This method now only handles profile updates (name, avatar, department).
    // Stats updates (ranking, matchesPlayed, wins, losses) are ignored.
    try {
      const updatedPlayers: Player[] = []
      for (const update of updates) {
        const { id, ...playerUpdates } = update
        // Filter to only profile updates
        const profileUpdates: Partial<Player> = {}
        if (playerUpdates.name !== undefined) profileUpdates.name = playerUpdates.name
        if (playerUpdates.avatar !== undefined) profileUpdates.avatar = playerUpdates.avatar
        if (playerUpdates.department !== undefined)
          profileUpdates.department = playerUpdates.department

        // If only stats updates were requested, just fetch current player
        const result =
          Object.keys(profileUpdates).length > 0
            ? await this.updatePlayer(id, profileUpdates)
            : await this.getPlayerById(id)

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
      const supabase = getSupabase()
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
      const supabase = getSupabase()
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
        if (match.team1_player2_id) playerIds.add(match.team1_player2_id)
        playerIds.add(match.team2_player1_id)
        if (match.team2_player2_id) playerIds.add(match.team2_player2_id)
      })

      // Fetch all players in one query, filtered by group
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('*')
        .in('id', Array.from(playerIds))
        .eq('group_id', groupId)

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
      const supabase = getSupabase()
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
      ].filter(Boolean) as string[]

      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('*')
        .in('id', playerIds)
        .eq('group_id', matchData.group_id)

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
    matchType: MatchType,
    team1Player1Id: string,
    team1Player2Id: string | null,
    team2Player1Id: string,
    team2Player2Id: string | null,
    score1: number,
    score2: number,
    recordedBy: string,
    rankingData: {
      team1Player1PreRanking: number
      team1Player1PostRanking: number
      team1Player2PreRanking?: number | null
      team1Player2PostRanking?: number | null
      team2Player1PreRanking: number
      team2Player1PostRanking: number
      team2Player2PreRanking?: number | null
      team2Player2PostRanking?: number | null
    },
  ): Promise<DatabaseResult<Match>> {
    try {
      const supabase = getSupabase()
      const now = new Date()
      const matchDate = now.toISOString().split('T')[0] // YYYY-MM-DD
      const matchTime = now.toTimeString().split(' ')[0] // HH:MM:SS

      const { data, error } = await supabase
        .from('matches')
        .insert({
          group_id: groupId,
          season_id: seasonId,
          match_type: matchType,
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
          team1_player2_pre_ranking: rankingData.team1Player2PreRanking ?? null,
          team1_player2_post_ranking: rankingData.team1Player2PostRanking ?? null,
          team2_player1_pre_ranking: rankingData.team2Player1PreRanking,
          team2_player1_post_ranking: rankingData.team2Player1PostRanking,
          team2_player2_pre_ranking: rankingData.team2Player2PreRanking ?? null,
          team2_player2_post_ranking: rankingData.team2Player2PostRanking ?? null,
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
      const supabase = getSupabase()
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
      const supabase = getSupabase()
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
      const supabase = getSupabase()
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
      const supabase = getSupabase()
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

  async getMatchesBySeason(
    seasonId: string,
    matchType?: MatchType,
  ): Promise<DatabaseListResult<Match>> {
    try {
      const supabase = getSupabase()
      let query = supabase
        .from('matches')
        .select('*')
        .eq('season_id', seasonId)
        .order('match_date', { ascending: false })
        .order('match_time', { ascending: false })

      if (matchType) {
        query = query.eq('match_type', matchType)
      }

      const { data: matchesData, error: matchesError } = await query

      if (matchesError) {
        return { data: [], error: matchesError.message }
      }

      if (!matchesData || matchesData.length === 0) {
        return { data: [], error: null }
      }

      // Get group ID from the first match (all matches in a season belong to the same group)
      const groupId = matchesData[0].group_id

      // Get unique player IDs
      const playerIds = new Set<string>()
      matchesData.forEach((match) => {
        playerIds.add(match.team1_player1_id)
        if (match.team1_player2_id) playerIds.add(match.team1_player2_id)
        playerIds.add(match.team2_player1_id)
        if (match.team2_player2_id) playerIds.add(match.team2_player2_id)
      })

      // Fetch all players, filtered by group
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('*')
        .in('id', Array.from(playerIds))
        .eq('group_id', groupId)

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
    matchType?: MatchType,
  ): Promise<DatabaseResult<PlayerSeasonStats>> {
    try {
      const supabase = getSupabase()
      // Use match-type-specific view if specified, otherwise use combined view
      const viewName =
        matchType === '1v1'
          ? 'player_season_stats_1v1_computed'
          : matchType === '2v2'
            ? 'player_season_stats_2v2_computed'
            : 'player_season_stats_computed'

      const { data, error } = await supabase
        .from(viewName)
        .select('*')
        .eq('player_id', playerId)
        .eq('season_id', seasonId)
        .single()

      if (error) {
        return { data: null, error: error.message }
      }

      return { data: dbPlayerSeasonStatsToPlayerSeasonStats(data), error: null }
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : 'Failed to fetch player season stats',
      }
    }
  }

  async getSeasonLeaderboard(
    seasonId: string,
    matchType?: MatchType,
  ): Promise<DatabaseListResult<PlayerSeasonStats>> {
    try {
      const supabase = getSupabase()
      // Use match-type-specific view if specified, otherwise use combined view
      const viewName =
        matchType === '1v1'
          ? 'player_season_stats_1v1_computed'
          : matchType === '2v2'
            ? 'player_season_stats_2v2_computed'
            : 'player_season_stats_computed'

      const { data, error } = await supabase
        .from(viewName)
        .select('*')
        .eq('season_id', seasonId)
        .order('ranking', { ascending: false })

      if (error) {
        return { data: [], error: error.message }
      }

      const stats = (data || []).map(dbPlayerSeasonStatsToPlayerSeasonStats)
      return { data: stats, error: null }
    } catch (err) {
      return {
        data: [],
        error: err instanceof Error ? err.message : 'Failed to fetch season leaderboard',
      }
    }
  }

  // ===== SHARING OPERATIONS =====

  async setGroupSharing(
    groupId: string,
    isPublic: boolean,
  ): Promise<DatabaseResult<{ isPublic: boolean }>> {
    try {
      const supabase = getSupabase()
      const { data, error } = await supabase.rpc('set_group_sharing', {
        p_group_id: groupId,
        p_is_public: isPublic,
      })

      if (error) {
        return { data: null, error: error.message }
      }

      const result = data as GroupSharingRpcResult
      if (!result.success) {
        return { data: null, error: result.error || 'Failed to update sharing' }
      }

      return { data: { isPublic: result.is_public ?? isPublic }, error: null }
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Failed to update sharing' }
    }
  }

  async setGroupJoinPolicy(
    groupId: string,
    joinPolicy: JoinPolicy,
  ): Promise<DatabaseResult<MemberActionRpcResult>> {
    try {
      const supabase = getSupabase()
      const { data, error } = await supabase.rpc('set_group_join_policy', {
        p_group_id: groupId,
        p_join_policy: joinPolicy,
      })

      if (error) {
        return { data: null, error: error.message }
      }

      return { data: data as MemberActionRpcResult, error: null }
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : 'Failed to update join policy',
      }
    }
  }

  // ===== PUBLIC READ-ONLY ACCESS =====

  async getPublicGroupData(groupId: string): Promise<DatabaseResult<PublicGroupData>> {
    try {
      const supabase = getSupabase()
      const { data, error } = await supabase.rpc('get_public_group_data', { p_group_id: groupId })

      if (error) {
        return { data: null, error: error.message }
      }

      if (!data.success) {
        return { data: null, error: data.error || 'not_found' }
      }

      const group: PublicGroupInfo = {
        id: data.group.id,
        name: data.group.name,
        description: data.group.description,
        sportType: data.group.sport_type as SportType,
        supportedMatchTypes: (data.group.supported_match_types as MatchType[]) || ['2v2'],
        targetScore: (data.group.target_score as number) ?? 10,
        joinPolicy: (data.group.join_policy as JoinPolicy) ?? 'open',
      }

      return {
        data: {
          group,
          seasons: ((data.seasons || []) as DbSeason[]).map(dbSeasonToSeason),
          players: ((data.players || []) as DbPlayer[]).map(dbPlayerToPlayer),
          trophies: ((data.trophies || []) as DbSeasonTrophy[]).map(dbSeasonTrophyToSeasonTrophy),
        },
        error: null,
      }
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : 'Failed to fetch public group data',
      }
    }
  }

  async getPublicMatches(groupId: string, seasonId?: string): Promise<DatabaseListResult<Match>> {
    try {
      const supabase = getSupabase()
      const { data, error } = await supabase.rpc('get_public_matches', {
        p_group_id: groupId,
        p_season_id: seasonId ?? null,
      })

      if (error) {
        return { data: [], error: error.message }
      }

      if (!data.success) {
        return { data: [], error: data.error || 'not_found' }
      }

      const playersById = new Map<string, Player>()
      for (const dbPlayer of (data.players || []) as DbPlayer[]) {
        playersById.set(dbPlayer.id, dbPlayerToPlayer(dbPlayer))
      }

      const matches: Match[] = []
      for (const dbMatch of (data.matches || []) as DbMatch[]) {
        try {
          matches.push(await dbMatchToMatch(dbMatch, playersById))
        } catch {
          // Skip matches with missing players (mirrors getMatchesByGroup)
        }
      }

      return { data: matches, error: null }
    } catch (err) {
      return {
        data: [],
        error: err instanceof Error ? err.message : 'Failed to fetch public matches',
      }
    }
  }

  async getPublicSeasonStats(
    groupId: string,
    seasonId: string,
  ): Promise<DatabaseResult<PublicSeasonStats>> {
    try {
      const supabase = getSupabase()
      const { data, error } = await supabase.rpc('get_public_season_stats', {
        p_group_id: groupId,
        p_season_id: seasonId,
      })

      if (error) {
        return { data: null, error: error.message }
      }

      if (!data.success) {
        return { data: null, error: data.error || 'not_found' }
      }

      const mapStats = (rows: unknown): PlayerSeasonStats[] =>
        ((rows || []) as DbPlayerSeasonStats[]).map(dbPlayerSeasonStatsToPlayerSeasonStats)

      return {
        data: {
          overall: mapStats(data.overall),
          oneVOne: mapStats(data.one_v_one),
          twoVTwo: mapStats(data.two_v_two),
        },
        error: null,
      }
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : 'Failed to fetch public season stats',
      }
    }
  }

  async getGroupPreview(groupId: string): Promise<DatabaseResult<GroupPreview>> {
    try {
      const supabase = getSupabase()
      const { data, error } = await supabase.rpc('get_group_preview', { p_group_id: groupId })

      if (error) {
        return { data: null, error: error.message }
      }

      if (!data.success) {
        return { data: null, error: data.error || 'not_found' }
      }

      return {
        data: {
          id: data.group.id,
          name: data.group.name,
          description: data.group.description,
          sportType: data.group.sport_type as SportType,
          joinPolicy: (data.group.join_policy as JoinPolicy) ?? 'approval',
          isPublic: (data.group.is_public as boolean) ?? false,
        },
        error: null,
      }
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : 'Failed to fetch group preview',
      }
    }
  }

  async requestToJoinGroup(groupId: string): Promise<DatabaseResult<GroupJoinRpcResult>> {
    try {
      const supabase = getSupabase()
      const { data, error } = await supabase.rpc('request_to_join_group', {
        p_group_id: groupId,
      })

      if (error) {
        return { data: null, error: error.message }
      }

      return { data: data as GroupJoinRpcResult, error: null }
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : 'Failed to request to join group',
      }
    }
  }

  // ===== JOIN REQUEST OPERATIONS =====

  async getPendingJoinRequests(groupId: string): Promise<DatabaseListResult<JoinRequest>> {
    try {
      const supabase = getSupabase()
      const { data, error } = await supabase.rpc('get_pending_join_requests', {
        p_group_id: groupId,
      })

      if (error) {
        return { data: [], error: error.message }
      }

      if (!data.success) {
        return { data: [], error: data.error || 'Failed to fetch join requests' }
      }

      const requests: JoinRequest[] = (data.requests || []).map(
        (r: {
          id: string
          group_id: string
          user_id: string
          email: string | null
          status: JoinRequest['status']
          requested_at: string
        }) => ({
          id: r.id,
          groupId: r.group_id,
          userId: r.user_id,
          email: r.email,
          status: r.status,
          requestedAt: r.requested_at,
        }),
      )

      return { data: requests, error: null }
    } catch (err) {
      return {
        data: [],
        error: err instanceof Error ? err.message : 'Failed to fetch join requests',
      }
    }
  }

  async getPendingJoinRequestCounts(): Promise<DatabaseListResult<PendingJoinRequestCount>> {
    try {
      const supabase = getSupabase()
      const { data, error } = await supabase.rpc('get_pending_join_request_counts')

      if (error) {
        return { data: [], error: error.message }
      }

      if (!data.success) {
        return { data: [], error: data.error || 'Failed to fetch join request counts' }
      }

      const counts: PendingJoinRequestCount[] = (data.counts || []).map(
        (c: { group_id: string; group_name: string; count: number }) => ({
          groupId: c.group_id,
          groupName: c.group_name,
          count: c.count,
        }),
      )

      return { data: counts, error: null }
    } catch (err) {
      return {
        data: [],
        error: err instanceof Error ? err.message : 'Failed to fetch join request counts',
      }
    }
  }

  async approveJoinRequest(requestId: string): Promise<DatabaseResult<MemberActionRpcResult>> {
    try {
      const supabase = getSupabase()
      const { data, error } = await supabase.rpc('approve_join_request', {
        p_request_id: requestId,
      })

      if (error) {
        return { data: null, error: error.message }
      }

      return { data: data as MemberActionRpcResult, error: null }
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : 'Failed to approve join request',
      }
    }
  }

  async denyJoinRequest(requestId: string): Promise<DatabaseResult<MemberActionRpcResult>> {
    try {
      const supabase = getSupabase()
      const { data, error } = await supabase.rpc('deny_join_request', {
        p_request_id: requestId,
      })

      if (error) {
        return { data: null, error: error.message }
      }

      return { data: data as MemberActionRpcResult, error: null }
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : 'Failed to deny join request',
      }
    }
  }

  async getMyPendingJoinRequests(): Promise<DatabaseListResult<MyPendingJoinRequest>> {
    try {
      const supabase = getSupabase()
      // Own rows are directly readable via RLS; no RPC needed
      const { data, error } = await supabase
        .from('group_join_requests')
        .select('id, group_id, status, requested_at')
        .eq('status', 'pending')

      if (error) {
        return { data: [], error: error.message }
      }

      const requests: MyPendingJoinRequest[] = (data || []).map((r) => ({
        id: r.id,
        groupId: r.group_id,
        status: r.status,
        requestedAt: r.requested_at,
      }))

      return { data: requests, error: null }
    } catch (err) {
      return {
        data: [],
        error: err instanceof Error ? err.message : 'Failed to fetch own join requests',
      }
    }
  }

  // ===== SEASON TROPHY OPERATIONS =====

  async getTrophiesByGroup(groupId: string): Promise<DatabaseListResult<SeasonTrophy>> {
    try {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('season_trophies')
        .select('*, seasons(name, season_number)')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false })
        .order('rank', { ascending: true })

      if (error) {
        return { data: [], error: error.message }
      }

      return { data: (data || []).map(dbSeasonTrophyToSeasonTrophy), error: null }
    } catch (err) {
      return {
        data: [],
        error: err instanceof Error ? err.message : 'Failed to fetch season trophies',
      }
    }
  }
}

// Factory function to create the database instance
// Note: Must call initSupabase() before using this
export function createSupabaseDatabase(): SupabaseDatabase {
  return new SupabaseDatabase()
}
