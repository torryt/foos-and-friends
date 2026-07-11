// Player position enum for frontend display
export type PlayerPosition = 'attacker' | 'defender'

// Sport type for multi-sport support
export type SportType = 'foosball' | 'chess'

// Match type for 1v1 or 2v2 support
export type MatchType = '1v1' | '2v2'

// Updated Player interface for Supabase integration
export interface Player {
  id: string // Changed from number to string for Supabase UUID
  name: string
  ranking: number
  matchesPlayed: number // Maps to matches_played in DB
  wins: number
  losses: number
  avatar: string
  department: string
  groupId?: string // Added for group association
  createdBy?: string // Added for audit trail
  createdAt?: string
  updatedAt?: string
}

// Database Player type (matches Supabase schema)
export interface DbPlayer {
  id: string
  name: string
  ranking: number
  matches_played: number
  wins: number
  losses: number
  avatar: string
  department: string
  group_id: string
  created_by: string
  created_at: string
  updated_at: string
}

// Player match stats for tracking pre-game rankings and score changes
export interface PlayerMatchStats {
  playerId: string
  preGameRanking: number
  postGameRanking: number
  // rankingChange can be calculated as: postGameRanking - preGameRanking
}

// Extended stats with calculated ranking change
export interface PlayerStatsWithChange extends PlayerMatchStats {
  rankingChange: number
}

// Utility function to calculate ranking change from player stats
export const calculateRankingChange = (stats: PlayerMatchStats): number => {
  return stats.postGameRanking - stats.preGameRanking
}

// Utility function to add ranking change to player stats
export const addRankingChange = (stats: PlayerMatchStats): PlayerStatsWithChange => {
  return {
    ...stats,
    rankingChange: calculateRankingChange(stats),
  }
}

// Updated Match interface for Supabase integration
export interface Match {
  id: string // Changed from number to string for Supabase UUID
  matchType: MatchType // 1v1 or 2v2
  team1: [Player, Player | null] // Second player null for 1v1
  team2: [Player, Player | null] // Second player null for 1v1
  score1: number // Maps to team1_score in DB
  score2: number // Maps to team2_score in DB
  date: string
  time: string
  groupId?: string // Added for group association
  seasonId?: string // Added for season association
  recordedBy?: string // Added for audit trail
  createdAt?: string
  playerStats?: PlayerMatchStats[] // Historical ranking data for each player
}

// Database Match type (matches Supabase schema)
export interface DbMatch {
  id: string
  group_id: string
  season_id: string
  match_type: MatchType
  team1_player1_id: string
  team1_player2_id: string | null // Nullable for 1v1
  team2_player1_id: string
  team2_player2_id: string | null // Nullable for 1v1
  team1_score: number
  team2_score: number
  match_date: string
  match_time: string
  recorded_by: string
  created_at: string
  // Historical rankings (ranking changes calculated as post - pre)
  team1_player1_pre_ranking?: number
  team1_player1_post_ranking?: number
  team1_player2_pre_ranking?: number | null
  team1_player2_post_ranking?: number | null
  team2_player1_pre_ranking?: number
  team2_player1_post_ranking?: number
  team2_player2_pre_ranking?: number | null
  team2_player2_post_ranking?: number | null
}

// How new users get into a group via the invite link
export type JoinPolicy = 'open' | 'approval'

// New types for group functionality
export interface FriendGroup {
  id: string
  name: string
  description: string | null
  inviteCode: string
  ownerId: string
  createdBy: string
  isActive: boolean
  maxMembers: number
  createdAt: string
  updatedAt: string
  playerCount?: number
  isOwner?: boolean // Added for client-side group owner detection
  currentUserRole?: GroupRole // The requesting user's role in this group
  sportType?: SportType // Added for multi-sport support
  supportedMatchTypes: MatchType[] // Which match types this group supports
  targetScore: number // Points needed to win a game in this group
  joinPolicy: JoinPolicy // open = invite link joins immediately; approval = admin approves
  isPublic: boolean // Whether the read-only public page is enabled
  publicToken: string | null // Token for the public page URL (null until first enabled)
}

export type GroupRole = 'owner' | 'admin' | 'member'

export interface GroupMembership {
  id: string
  groupId: string
  userId: string
  role: GroupRole
  isActive: boolean
  invitedBy: string | null
  joinedAt: string
  createdAt: string
}

// Membership enriched with the member's email (from get_group_members RPC,
// only available to group owners/admins)
export interface GroupMember extends GroupMembership {
  email: string | null
}

// Season types for competitive periods
export interface Season {
  id: string
  groupId: string
  name: string
  description: string | null
  seasonNumber: number
  startDate: string
  endDate: string | null
  isActive: boolean
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface DbSeason {
  id: string
  group_id: string
  name: string
  description: string | null
  season_number: number
  start_date: string
  end_date: string | null
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
}

// Player season stats for per-season tracking
export interface PlayerSeasonStats {
  id: string
  playerId: string
  seasonId: string
  ranking: number
  matchesPlayed: number
  wins: number
  losses: number
  goalsFor: number
  goalsAgainst: number
  createdAt: string
  updatedAt: string
}

export interface DbPlayerSeasonStats {
  id: string
  player_id: string
  season_id: string
  ranking: number
  matches_played: number
  wins: number
  losses: number
  goals_for: number
  goals_against: number
  created_at: string
  updated_at: string
}

// Season podium trophies, snapshotted when a season ends (1 = gold, 2 = silver, 3 = bronze)
export type TrophyRank = 1 | 2 | 3

export interface SeasonTrophy {
  id: string
  groupId: string
  seasonId: string
  playerId: string
  rank: TrophyRank
  seasonName: string
  seasonNumber: number
  createdAt: string
}

export interface DbSeasonTrophy {
  id: string
  group_id: string
  season_id: string
  player_id: string
  rank: number
  created_at: string
  seasons: { name: string; season_number: number } | null
}

// Auth types
export interface AuthUser {
  id: string
  email: string
  emailConfirmed: boolean
  createdAt: string
}

// Group creation/join responses
export interface GroupCreationResult {
  success: boolean
  groupId?: string
  inviteCode?: string
  name?: string
  error?: string
}

export interface GroupJoinResult {
  success: boolean
  status?: 'joined' | 'pending' // pending when the group requires admin approval
  groupId?: string
  groupName?: string
  error?: string
}

// A pending request to join a group (admin view, includes requester email)
export interface JoinRequest {
  id: string
  groupId: string
  userId: string
  email: string | null
  status: 'pending' | 'approved' | 'denied'
  requestedAt: string
}

// Pending-request count per group, for the notification bell
export interface PendingJoinRequestCount {
  groupId: string
  groupName: string
  count: number
}

// The current user's own join requests (e.g. to show "request pending" on the invite page)
export interface MyPendingJoinRequest {
  id: string
  groupId: string
  status: 'pending' | 'approved' | 'denied'
  requestedAt: string
}

// ===== Public read-only sharing =====

// The subset of group info exposed on the public page
export interface PublicGroupInfo {
  id: string
  name: string
  description: string | null
  inviteCode: string
  sportType: SportType
  supportedMatchTypes: MatchType[]
  targetScore: number
  joinPolicy: JoinPolicy
}

export interface PublicGroupData {
  group: PublicGroupInfo
  seasons: Season[]
  players: Player[]
  trophies: SeasonTrophy[]
}

export interface PublicSeasonStats {
  overall: PlayerSeasonStats[]
  oneVOne: PlayerSeasonStats[]
  twoVTwo: PlayerSeasonStats[]
}

export interface GroupLeaveResult {
  success: boolean
  error?: string
}

// Promote/remove member responses
export interface GroupMemberActionResult {
  success: boolean
  error?: string
}

// Season management responses
export interface SeasonCreationResult {
  success: boolean
  oldSeasonId?: string
  newSeasonId?: string
  seasonNumber?: number
  error?: string
}
