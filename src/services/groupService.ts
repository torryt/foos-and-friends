import { supabase } from '@/lib/supabase'
import type { FriendGroup, GroupCreationResult, GroupJoinResult, GroupMembership } from '@/types'

export const groupService = {
  // Get user's groups
  async getUserGroups(userId: string): Promise<{ data: FriendGroup[]; error?: string }> {
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

      // Transform database format to app format
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
      }))

      return { data: groups }
    } catch (err) {
      return { data: [], error: err instanceof Error ? err.message : 'Failed to fetch groups' }
    }
  },

  // Create a new group
  async createGroup(name: string, description?: string): Promise<GroupCreationResult> {
    try {
      const { data, error } = await supabase.rpc('create_friend_group', {
        p_name: name,
        p_description: description || null,
      })

      if (error) {
        return { success: false, error: error.message }
      }

      return data as GroupCreationResult
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to create group',
      }
    }
  },

  // Join group by invite code
  async joinGroupByInvite(inviteCode: string, userId?: string): Promise<GroupJoinResult> {
    try {
      const { data, error } = await supabase.rpc('join_group_by_invite_code', {
        p_invite_code: inviteCode,
        p_user_id: userId,
      })

      if (error) {
        return { success: false, error: error.message }
      }

      return data as GroupJoinResult
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to join group',
      }
    }
  },

  // Get group by ID
  async getGroupById(groupId: string): Promise<{ data: FriendGroup | null; error?: string }> {
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

      return { data: group }
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : 'Failed to fetch group',
      }
    }
  },

  // Get group members
  async getGroupMembers(groupId: string): Promise<{ data: GroupMembership[]; error?: string }> {
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

      return { data: memberships }
    } catch (err) {
      return {
        data: [],
        error: err instanceof Error ? err.message : 'Failed to fetch members',
      }
    }
  },
}
