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
