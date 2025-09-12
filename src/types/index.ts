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
  team1: [Player, Player]
  team2: [Player, Player]
  score1: number // Maps to team1_score in DB
  score2: number // Maps to team2_score in DB
  date: string
  time: string
  groupId?: string // Added for group association
  recordedBy?: string // Added for audit trail
  createdAt?: string
  playerStats?: PlayerMatchStats[] // Historical ranking data for each player
}

// Database Match type (matches Supabase schema)
export interface DbMatch {
  id: string
  group_id: string
  team1_player1_id: string
  team1_player2_id: string
  team2_player1_id: string
  team2_player2_id: string
  team1_score: number
  team2_score: number
  match_date: string
  match_time: string
  recorded_by: string
  created_at: string
  // Historical rankings (ranking changes calculated as post - pre)
  team1_player1_pre_ranking?: number
  team1_player1_post_ranking?: number
  team1_player2_pre_ranking?: number
  team1_player2_post_ranking?: number
  team2_player1_pre_ranking?: number
  team2_player1_post_ranking?: number
  team2_player2_pre_ranking?: number
  team2_player2_post_ranking?: number
}

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
}

export interface GroupMembership {
  id: string
  groupId: string
  userId: string
  role: 'owner' | 'admin' | 'member'
  isActive: boolean
  invitedBy: string | null
  joinedAt: string
  createdAt: string
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
  groupId?: string
  groupName?: string
  error?: string
}
