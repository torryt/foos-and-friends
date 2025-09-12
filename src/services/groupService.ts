import type { Database } from '@/lib/database'
import { database } from '@/lib/supabase-database'
import type {
  FriendGroup,
  GroupCreationResult,
  GroupJoinResult,
  GroupLeaveResult,
  GroupMembership,
} from '@/types'

class GroupService {
  private db: Database

  constructor(db: Database) {
    this.db = db
  }

  async getUserGroups(userId: string): Promise<{ data: FriendGroup[]; error: string | null }> {
    const result = await this.db.getUserGroups(userId)
    return result
  }

  async createGroup(name: string, description?: string): Promise<GroupCreationResult> {
    const result = await this.db.createGroup(name, description)

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

  async getGroupMembers(
    groupId: string,
  ): Promise<{ data: GroupMembership[]; error: string | null }> {
    return await this.db.getGroupMembers(groupId)
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

// Create the default service instance
export const groupService = new GroupService(database)
