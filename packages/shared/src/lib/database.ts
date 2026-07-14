import type {
  FriendGroup,
  GroupMember,
  GroupPreview,
  JoinRequest,
  Match,
  MatchType,
  MyPendingJoinRequest,
  PendingJoinRequestCount,
  Player,
  PlayerSeasonStats,
  PublicGroupData,
  PublicSeasonStats,
  Season,
  SeasonTrophy,
  SportType,
} from '../types/index.ts'

// Editable group settings (owner only)
export interface GroupSettingsUpdate {
  name?: string
  description?: string | null
  targetScore?: number
}

// Database operation results
export interface DatabaseResult<T> {
  data: T | null
  error: string | null
}

export interface DatabaseListResult<T> {
  data: T[]
  error: string | null
}

// RPC function results
export interface GroupCreationRpcResult {
  success: boolean
  group_id: string
  invite_code: string
  name: string
}

export interface GroupJoinRpcResult {
  success: boolean
  status?: 'joined' | 'pending'
  group_id?: string
  group_name?: string
  error?: string
}

export interface GroupSharingRpcResult {
  success: boolean
  is_public?: boolean
  error?: string
}

export interface GroupDeletionRpcResult {
  success: boolean
  deleted_counts?: {
    players: number
    matches: number
    members: number
  }
  error?: string
}

export interface GroupLeaveRpcResult {
  success: boolean
  error?: string
}

export interface GroupMembersRpcResult {
  success: boolean
  members?: Array<{
    id: string
    group_id: string
    user_id: string
    role: 'owner' | 'admin' | 'member'
    is_active: boolean
    invited_by: string | null
    joined_at: string
    created_at: string
    email: string | null
  }>
  error?: string
}

export interface MemberActionRpcResult {
  success: boolean
  error?: string
}

export interface SeasonCreationRpcResult {
  success: boolean
  old_season_id?: string
  new_season_id?: string
  season_number?: number
  error?: string
}

// Database interface that abstracts all database operations
export interface Database {
  // Group operations
  getUserGroups(userId: string, sportType?: SportType): Promise<DatabaseListResult<FriendGroup>>
  getGroupById(groupId: string): Promise<DatabaseResult<FriendGroup>>
  getGroupByInviteCode(inviteCode: string): Promise<DatabaseResult<FriendGroup>>
  createGroup(
    name: string,
    description?: string,
    sportType?: SportType,
    supportedMatchTypes?: MatchType[],
  ): Promise<DatabaseResult<GroupCreationRpcResult>>
  // The acting user is the authenticated caller (auth.uid() server-side)
  joinGroupByInvite(inviteCode: string): Promise<DatabaseResult<GroupJoinRpcResult>>
  deleteGroup(groupId: string): Promise<DatabaseResult<GroupDeletionRpcResult>>
  leaveGroup(groupId: string): Promise<DatabaseResult<GroupLeaveRpcResult>>
  updateGroup(groupId: string, updates: GroupSettingsUpdate): Promise<DatabaseResult<FriendGroup>>

  // Sharing operations (owner/admin via RPC role checks)
  setGroupSharing(
    groupId: string,
    isPublic: boolean,
  ): Promise<DatabaseResult<{ isPublic: boolean }>>
  setGroupJoinPolicy(
    groupId: string,
    joinPolicy: 'open' | 'approval',
  ): Promise<DatabaseResult<MemberActionRpcResult>>

  // Public read-only access (group-id-gated on is_public, works unauthenticated)
  getPublicGroupData(groupId: string): Promise<DatabaseResult<PublicGroupData>>
  getPublicMatches(groupId: string, seasonId?: string): Promise<DatabaseListResult<Match>>
  getPublicSeasonStats(
    groupId: string,
    seasonId: string,
  ): Promise<DatabaseResult<PublicSeasonStats>>
  // Minimal group info for a non-member landing page (works for private groups)
  getGroupPreview(groupId: string): Promise<DatabaseResult<GroupPreview>>
  // Join (open policy) or file a join request (approval policy) by group id
  requestToJoinGroup(groupId: string): Promise<DatabaseResult<GroupJoinRpcResult>>

  // Join request operations
  getPendingJoinRequests(groupId: string): Promise<DatabaseListResult<JoinRequest>>
  getPendingJoinRequestCounts(): Promise<DatabaseListResult<PendingJoinRequestCount>>
  approveJoinRequest(requestId: string): Promise<DatabaseResult<MemberActionRpcResult>>
  denyJoinRequest(requestId: string): Promise<DatabaseResult<MemberActionRpcResult>>
  getMyPendingJoinRequests(): Promise<DatabaseListResult<MyPendingJoinRequest>>
  // Notifies the requester by email that they were let in. Best-effort: approval
  // has already been committed by the time this runs.
  sendJoinApprovedEmail(requestId: string): Promise<DatabaseResult<{ sent: boolean }>>

  // Group membership operations
  getGroupMembers(groupId: string): Promise<DatabaseListResult<GroupMember>>
  promoteGroupMember(
    groupId: string,
    targetUserId: string,
  ): Promise<DatabaseResult<MemberActionRpcResult>>
  demoteGroupMember(
    groupId: string,
    targetUserId: string,
  ): Promise<DatabaseResult<MemberActionRpcResult>>
  removeGroupMember(
    groupId: string,
    targetUserId: string,
  ): Promise<DatabaseResult<MemberActionRpcResult>>

  // Player operations
  getPlayersByGroup(groupId: string): Promise<DatabaseListResult<Player>>
  getPlayerById(playerId: string): Promise<DatabaseResult<Player>>
  createPlayer(
    player: Omit<Player, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<DatabaseResult<Player>>
  updatePlayer(playerId: string, updates: Partial<Player>): Promise<DatabaseResult<Player>>
  updateMultiplePlayers(
    updates: Array<{ id: string } & Partial<Player>>,
  ): Promise<{ data?: Player[]; error?: string }>
  deletePlayer(playerId: string): Promise<{ success?: boolean; error?: string }>

  // Match operations
  getMatchesByGroup(groupId: string): Promise<DatabaseListResult<Match>>
  getMatchesBySeason(seasonId: string, matchType?: MatchType): Promise<DatabaseListResult<Match>>
  getMatchById(matchId: string): Promise<DatabaseResult<Match>>
  recordMatch(
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
  ): Promise<DatabaseResult<Match>>

  // Season operations
  getSeasonsByGroup(groupId: string): Promise<DatabaseListResult<Season>>
  getActiveSeason(groupId: string): Promise<DatabaseResult<Season>>
  getSeasonById(seasonId: string): Promise<DatabaseResult<Season>>
  endSeasonAndCreateNew(
    groupId: string,
    newSeasonName: string,
    newSeasonDescription?: string,
  ): Promise<DatabaseResult<SeasonCreationRpcResult>>

  // Player season stats operations (read-only, computed from matches)
  getPlayerSeasonStats(
    playerId: string,
    seasonId: string,
    matchType?: MatchType,
  ): Promise<DatabaseResult<PlayerSeasonStats>>
  getSeasonLeaderboard(
    seasonId: string,
    matchType?: MatchType,
  ): Promise<DatabaseListResult<PlayerSeasonStats>>

  // Season trophy operations (read-only, awarded server-side when a season ends)
  getTrophiesByGroup(groupId: string): Promise<DatabaseListResult<SeasonTrophy>>
}
