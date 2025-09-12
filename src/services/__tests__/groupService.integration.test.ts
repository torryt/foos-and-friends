import { beforeEach, describe, expect, it } from 'vitest'
import { createTestDatabase } from '@/test/test-database'
import type { FriendGroup } from '@/types'

class GroupService {
  private db: import('@/lib/database').Database

  constructor(db: import('@/lib/database').Database) {
    this.db = db
  }

  async getUserGroups(userId: string) {
    return await this.db.getUserGroups(userId)
  }

  async joinGroupByInvite(inviteCode: string, userId?: string) {
    const result = await this.db.joinGroupByInvite(inviteCode, userId)

    if (result.error) {
      return { success: false, error: result.error }
    }

    return {
      success: result.data?.success,
      groupId: result.data?.group_id,
      groupName: result.data?.group_name,
      error: result.data?.error,
    }
  }

  async getGroupByInviteCode(inviteCode: string) {
    return await this.db.getGroupByInviteCode(inviteCode)
  }
}

describe('Group Service Integration', () => {
  let fakeDb: ReturnType<typeof createTestDatabase>
  let groupService: GroupService

  beforeEach(() => {
    fakeDb = createTestDatabase()
    groupService = new GroupService(fakeDb)
  })

  describe('Invite functionality', () => {
    it('should allow joining a group via invite code for users with no existing memberships', async () => {
      // Seed the fake database with a group
      const testGroup: FriendGroup = {
        id: 'test-group-id',
        name: 'Test Group',
        description: 'A test group',
        inviteCode: 'testcode123',
        ownerId: 'owner-id',
        createdBy: 'owner-id',
        isActive: true,
        maxMembers: 50,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }

      fakeDb.seed({ groups: [testGroup] })

      const result = await groupService.joinGroupByInvite('testcode123', 'user-123')

      expect(result.success).toBe(true)
      expect(result.groupId).toBe('test-group-id')
      expect(result.groupName).toBe('Test Group')

      // Verify membership was created
      const members = await fakeDb.getGroupMembers('test-group-id')
      expect(members.data).toHaveLength(1)
      expect(members.data[0].userId).toBe('user-123')
    })

    it('should get group info by invite code without requiring membership', async () => {
      // Seed the fake database with a group and some players
      const testGroup: FriendGroup = {
        id: 'test-group-id',
        name: 'Test Group',
        description: 'A test group',
        inviteCode: 'testcode123',
        ownerId: 'owner-id',
        createdBy: 'owner-id',
        isActive: true,
        maxMembers: 50,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }

      const testPlayers = Array.from({ length: 5 }, (_, i) => ({
        id: `player-${i}`,
        name: `Player ${i}`,
        ranking: 1200,
        matchesPlayed: 0,
        wins: 0,
        losses: 0,
        avatar: '👤',
        department: 'Test',
        groupId: 'test-group-id',
        createdBy: 'owner-id',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }))

      fakeDb.seed({ groups: [testGroup], players: testPlayers })

      const result = await groupService.getGroupByInviteCode('testcode123')

      expect(result.data).toBeDefined()
      expect(result.data?.inviteCode).toBe('testcode123')
      expect(result.data?.name).toBe('Test Group')
      expect(result.data?.playerCount).toBe(5)
    })

    it('should handle invalid invite codes gracefully', async () => {
      // Don't seed any groups - database is empty
      const result = await groupService.joinGroupByInvite('invalidcode')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid invite code')
    })

    it('should handle invalid invite codes in getGroupByInviteCode', async () => {
      // Don't seed any groups - database is empty
      const result = await groupService.getGroupByInviteCode('invalidcode')

      expect(result.data).toBeNull()
      expect(result.error).toBe('Invalid invite code')
    })

    it('should prevent duplicate membership', async () => {
      // Seed the fake database with a group
      const testGroup: FriendGroup = {
        id: 'test-group-id',
        name: 'Test Group',
        description: 'A test group',
        inviteCode: 'testcode123',
        ownerId: 'owner-id',
        createdBy: 'owner-id',
        isActive: true,
        maxMembers: 50,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }

      fakeDb.seed({ groups: [testGroup] })

      // First join should succeed
      const firstResult = await groupService.joinGroupByInvite('testcode123', 'user-123')
      expect(firstResult.success).toBe(true)

      // Second join should fail
      const secondResult = await groupService.joinGroupByInvite('testcode123', 'user-123')
      expect(secondResult.success).toBe(false)
      expect(secondResult.error).toBe('Already a member of this group')
    })
  })

  describe('getUserGroups for users with no memberships', () => {
    it('should return empty array for users with no group memberships', async () => {
      // Don't seed any groups or memberships
      const result = await groupService.getUserGroups('user-with-no-groups')

      expect(result.data).toBeDefined()
      expect(Array.isArray(result.data)).toBe(true)
      expect(result.data).toHaveLength(0)
      expect(result.error).toBeNull()
    })

    it('should return groups that the user is a member of', async () => {
      // Seed with groups and memberships
      const testGroup1: FriendGroup = {
        id: 'group-1',
        name: 'Group 1',
        description: 'First group',
        inviteCode: 'code1',
        ownerId: 'owner-id',
        createdBy: 'owner-id',
        isActive: true,
        maxMembers: 50,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }

      const testGroup2: FriendGroup = {
        id: 'group-2',
        name: 'Group 2',
        description: 'Second group',
        inviteCode: 'code2',
        ownerId: 'owner-id',
        createdBy: 'owner-id',
        isActive: true,
        maxMembers: 50,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }

      const memberships = [
        {
          id: 'membership-1',
          groupId: 'group-1',
          userId: 'user-123',
          role: 'member' as const,
          isActive: true,
          invitedBy: null,
          joinedAt: '2024-01-01T00:00:00Z',
          createdAt: '2024-01-01T00:00:00Z',
        },
      ]

      fakeDb.seed({
        groups: [testGroup1, testGroup2],
        memberships,
      })

      const result = await groupService.getUserGroups('user-123')

      expect(result.data).toHaveLength(1)
      expect(result.data[0].name).toBe('Group 1')
      expect(result.error).toBeNull()
    })
  })
})
