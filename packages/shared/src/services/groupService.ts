import type { Database, GroupSettingsUpdate } from '../lib/database.ts'
import type {
  FriendGroup,
  GroupCreationResult,
  GroupJoinResult,
  GroupLeaveResult,
  GroupMember,
  GroupMemberActionResult,
  GroupPreview,
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

  async joinGroupByInvite(inviteCode: string): Promise<GroupJoinResult> {
    const result = await this.db.joinGroupByInvite(inviteCode)

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

  async deleteGroup(groupId: string): Promise<{
    success: boolean
    error?: string
    deletedCounts?: { players: number; matches: number; members: number }
  }> {
    const result = await this.db.deleteGroup(groupId)

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
  ): Promise<{ data: { isPublic: boolean } | null; error: string | null }> {
    return await this.db.setGroupSharing(groupId, isPublic)
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
    groupId: string,
  ): Promise<{ data: PublicGroupData | null; error: string | null }> {
    return await this.db.getPublicGroupData(groupId)
  }

  async getPublicMatches(
    groupId: string,
    seasonId?: string,
  ): Promise<{ data: Match[]; error: string | null }> {
    return await this.db.getPublicMatches(groupId, seasonId)
  }

  async getPublicSeasonStats(
    groupId: string,
    seasonId: string,
  ): Promise<{ data: PublicSeasonStats | null; error: string | null }> {
    return await this.db.getPublicSeasonStats(groupId, seasonId)
  }

  async getGroupPreview(
    groupId: string,
  ): Promise<{ data: GroupPreview | null; error: string | null }> {
    return await this.db.getGroupPreview(groupId)
  }

  async requestToJoinGroup(groupId: string): Promise<GroupJoinResult> {
    const result = await this.db.requestToJoinGroup(groupId)

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

    const success = result.data?.success ?? false

    // The membership is already committed; a failed notification must never turn
    // a successful approval into an error the admin has to retry.
    if (success) {
      const email = await this.db.sendJoinApprovedEmail(requestId)
      if (email.error) {
        console.warn('Join request approved, but the notification email failed:', email.error)
      }
    }

    return {
      success,
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

  async leaveGroup(groupId: string): Promise<GroupLeaveResult> {
    const result = await this.db.leaveGroup(groupId)

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
