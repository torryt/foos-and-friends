import type { Database, GroupSettingsUpdate } from '../lib/database.ts'
import type {
  FriendGroup,
  GroupCreationResult,
  GroupJoinResult,
  GroupLeaveResult,
  GroupMember,
  GroupMemberActionResult,
  JoinPolicy,
  JoinRequest,
  Match,
  MyPendingJoinRequest,
  PendingJoinRequestCount,
  PublicGroupData,
  PublicSeasonStats,
  SportType,
} from '../types/index.ts'

export class GroupService {
  private db: Database

  constructor(db: Database) {
    this.db = db
  }

  async getUserGroups(
    userId: string,
    sportType?: SportType,
  ): Promise<{ data: FriendGroup[]; error: string | null }> {
    const result = await this.db.getUserGroups(userId, sportType)
    return result
  }

  async createGroup(
    name: string,
    description?: string,
    sportType?: SportType,
  ): Promise<GroupCreationResult> {
    const result = await this.db.createGroup(name, description, sportType)

    if (result.error) {
      return { success: false, error: result.error }
    }

    return {
      success: result.data?.success ?? false,
      groupId: result.data?.group_id ?? '',
      inviteCode: result.data?.invite_code ?? '',
      name: result.data?.name ?? '',
    }
  }

  async joinGroupByInvite(inviteCode: string, userId?: string): Promise<GroupJoinResult> {
    const result = await this.db.joinGroupByInvite(inviteCode, userId)

    if (result.error) {
      return { success: false, error: result.error }
    }

    return {
      success: result.data?.success ?? false,
      status: result.data?.status,
      groupId: result.data?.group_id ?? '',
      groupName: result.data?.group_name ?? '',
      error: result.data?.error ?? undefined,
    }
  }

  async getGroupById(groupId: string): Promise<{ data: FriendGroup | null; error: string | null }> {
    return await this.db.getGroupById(groupId)
  }

  async getGroupByInviteCode(
    inviteCode: string,
  ): Promise<{ data: FriendGroup | null; error: string | null }> {
    return await this.db.getGroupByInviteCode(inviteCode)
  }

  async getGroupMembers(groupId: string): Promise<{ data: GroupMember[]; error: string | null }> {
    return await this.db.getGroupMembers(groupId)
  }

  async promoteMember(groupId: string, targetUserId: string): Promise<GroupMemberActionResult> {
    const result = await this.db.promoteGroupMember(groupId, targetUserId)

    if (result.error) {
      return { success: false, error: result.error }
    }

    return {
      success: result.data?.success ?? false,
      error: result.data?.error,
    }
  }

  async demoteMember(groupId: string, targetUserId: string): Promise<GroupMemberActionResult> {
    const result = await this.db.demoteGroupMember(groupId, targetUserId)

    if (result.error) {
      return { success: false, error: result.error }
    }

    return {
      success: result.data?.success ?? false,
      error: result.data?.error,
    }
  }

  async removeMember(groupId: string, targetUserId: string): Promise<GroupMemberActionResult> {
    const result = await this.db.removeGroupMember(groupId, targetUserId)

    if (result.error) {
      return { success: false, error: result.error }
    }

    return {
      success: result.data?.success ?? false,
      error: result.data?.error,
    }
  }

  async deleteGroup(
    groupId: string,
    userId: string,
  ): Promise<{
    success: boolean
    error?: string
    deletedCounts?: { players: number; matches: number; members: number }
  }> {
    const result = await this.db.deleteGroup(groupId, userId)

    if (result.error) {
      return { success: false, error: result.error }
    }

    return {
      success: result.data?.success ?? false,
      error: result.data?.error,
      deletedCounts: result.data?.deleted_counts,
    }
  }

  async updateGroup(
    groupId: string,
    updates: GroupSettingsUpdate,
  ): Promise<{ data: FriendGroup | null; error: string | null }> {
    return await this.db.updateGroup(groupId, updates)
  }

  // ===== Sharing =====

  async setGroupSharing(
    groupId: string,
    isPublic: boolean,
  ): Promise<{ data: { isPublic: boolean; publicToken: string | null } | null; error: string | null }> {
    return await this.db.setGroupSharing(groupId, isPublic)
  }

  async regeneratePublicToken(
    groupId: string,
  ): Promise<{ data: { publicToken: string } | null; error: string | null }> {
    return await this.db.regeneratePublicToken(groupId)
  }

  async setGroupJoinPolicy(
    groupId: string,
    joinPolicy: JoinPolicy,
  ): Promise<GroupMemberActionResult> {
    const result = await this.db.setGroupJoinPolicy(groupId, joinPolicy)

    if (result.error) {
      return { success: false, error: result.error }
    }

    return {
      success: result.data?.success ?? false,
      error: result.data?.error,
    }
  }

  // ===== Public read-only access =====

  async getPublicGroupData(
    token: string,
  ): Promise<{ data: PublicGroupData | null; error: string | null }> {
    return await this.db.getPublicGroupData(token)
  }

  async getPublicMatches(
    token: string,
    seasonId?: string,
  ): Promise<{ data: Match[]; error: string | null }> {
    return await this.db.getPublicMatches(token, seasonId)
  }

  async getPublicSeasonStats(
    token: string,
    seasonId: string,
  ): Promise<{ data: PublicSeasonStats | null; error: string | null }> {
    return await this.db.getPublicSeasonStats(token, seasonId)
  }

  // ===== Join requests =====

  async getPendingJoinRequests(
    groupId: string,
  ): Promise<{ data: JoinRequest[]; error: string | null }> {
    return await this.db.getPendingJoinRequests(groupId)
  }

  async getPendingJoinRequestCounts(): Promise<{
    data: PendingJoinRequestCount[]
    error: string | null
  }> {
    return await this.db.getPendingJoinRequestCounts()
  }

  async approveJoinRequest(requestId: string): Promise<GroupMemberActionResult> {
    const result = await this.db.approveJoinRequest(requestId)

    if (result.error) {
      return { success: false, error: result.error }
    }

    return {
      success: result.data?.success ?? false,
      error: result.data?.error,
    }
  }

  async denyJoinRequest(requestId: string): Promise<GroupMemberActionResult> {
    const result = await this.db.denyJoinRequest(requestId)

    if (result.error) {
      return { success: false, error: result.error }
    }

    return {
      success: result.data?.success ?? false,
      error: result.data?.error,
    }
  }

  async getMyPendingJoinRequests(): Promise<{
    data: MyPendingJoinRequest[]
    error: string | null
  }> {
    return await this.db.getMyPendingJoinRequests()
  }

  async leaveGroup(groupId: string, userId: string): Promise<GroupLeaveResult> {
    const result = await this.db.leaveGroup(groupId, userId)

    if (result.error) {
      return { success: false, error: result.error }
    }

    return {
      success: result.data?.success ?? false,
      error: result.data?.error,
    }
  }
}

// Factory function to create group service with a database instance
export function createGroupService(db: Database): GroupService {
  return new GroupService(db)
}
