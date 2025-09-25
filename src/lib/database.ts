/// <reference types="vite/client" />
import type { FriendGroup, GroupMembership, Match, Player } from '@/types'

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
  group_id?: string
  group_name?: string
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

// Database interface that abstracts all database operations
export interface Database {
  // Group operations
  getUserGroups(userId: string): Promise<DatabaseListResult<FriendGroup>>
  getGroupById(groupId: string): Promise<DatabaseResult<FriendGroup>>
  getGroupByInviteCode(inviteCode: string): Promise<DatabaseResult<FriendGroup>>
  createGroup(name: string, description?: string): Promise<DatabaseResult<GroupCreationRpcResult>>
  joinGroupByInvite(
    inviteCode: string,
    userId?: string,
  ): Promise<DatabaseResult<GroupJoinRpcResult>>
  deleteGroup(groupId: string, userId: string): Promise<DatabaseResult<GroupDeletionRpcResult>>
  leaveGroup(groupId: string, userId: string): Promise<DatabaseResult<GroupLeaveRpcResult>>

  // Group membership operations
  getGroupMembers(groupId: string): Promise<DatabaseListResult<GroupMembership>>

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
  getMatchById(matchId: string): Promise<DatabaseResult<Match>>
  recordMatch(
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
  ): Promise<DatabaseResult<Match>>
  updateMatch(
    matchId: string,
    team1Player1Id: string,
    team1Player2Id: string,
    team2Player1Id: string,
    team2Player2Id: string,
    score1: number,
    score2: number,
  ): Promise<DatabaseResult<Match>>
  deleteMatch(matchId: string): Promise<{ success?: boolean; error?: string }>
}
