import { beforeEach, describe, expect, it } from 'vitest'
import { FakeDatabase } from '../../test/fake-database.ts'
import { createGroupService, type GroupService } from '../groupService.ts'

// FakeDatabase creates groups owned by 'fake-user-id' and simulates
// auth.uid() via db.currentUserId for the member management RPCs.
const OWNER_ID = 'fake-user-id'
const MEMBER_B = 'user-b'
const MEMBER_C = 'user-c'

describe('GroupService member management', () => {
  let db: FakeDatabase
  let service: GroupService
  let groupId: string

  beforeEach(async () => {
    db = new FakeDatabase()
    service = createGroupService(db)

    const created = await service.createGroup('Test Group')
    expect(created.success).toBe(true)
    groupId = created.groupId ?? ''

    db.currentUserId = MEMBER_B
    await service.joinGroupByInvite(created.inviteCode ?? '')
    db.currentUserId = MEMBER_C
    await service.joinGroupByInvite(created.inviteCode ?? '')
    db.currentUserId = OWNER_ID
  })

  describe('getGroupMembers', () => {
    it('lists all members with emails for the owner, owner first', async () => {
      const result = await service.getGroupMembers(groupId)

      expect(result.error).toBeNull()
      expect(result.data).toHaveLength(3)
      expect(result.data[0].role).toBe('owner')
      expect(result.data[0].userId).toBe(OWNER_ID)
      expect(result.data.every((m) => m.email)).toBe(true)
    })

    it('rejects regular members', async () => {
      db.currentUserId = MEMBER_B

      const result = await service.getGroupMembers(groupId)

      expect(result.error).toBe('Only group owners and admins can list members')
      expect(result.data).toHaveLength(0)
    })

    it('allows admins after promotion, sorted owner > admin > member', async () => {
      await service.promoteMember(groupId, MEMBER_B)
      db.currentUserId = MEMBER_B

      const result = await service.getGroupMembers(groupId)

      expect(result.error).toBeNull()
      expect(result.data.map((m) => m.role)).toEqual(['owner', 'admin', 'member'])
    })
  })

  describe('promoteMember', () => {
    it('lets the owner promote a member to admin', async () => {
      const result = await service.promoteMember(groupId, MEMBER_B)

      expect(result.success).toBe(true)
      const members = await service.getGroupMembers(groupId)
      expect(members.data.find((m) => m.userId === MEMBER_B)?.role).toBe('admin')
    })

    it('lets an admin promote another member', async () => {
      await service.promoteMember(groupId, MEMBER_B)
      db.currentUserId = MEMBER_B

      const result = await service.promoteMember(groupId, MEMBER_C)

      expect(result.success).toBe(true)
    })

    it('rejects promotion by a regular member', async () => {
      db.currentUserId = MEMBER_B

      const result = await service.promoteMember(groupId, MEMBER_C)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Only group owners and admins can promote members')
    })

    it('rejects promoting someone who is already owner or admin', async () => {
      await service.promoteMember(groupId, MEMBER_B)

      expect((await service.promoteMember(groupId, MEMBER_B)).error).toBe(
        'User is already an owner or admin',
      )
      expect((await service.promoteMember(groupId, OWNER_ID)).error).toBe(
        'User is already an owner or admin',
      )
    })

    it('rejects promoting a non-member', async () => {
      const result = await service.promoteMember(groupId, 'stranger')

      expect(result.success).toBe(false)
      expect(result.error).toBe('User is not a member of this group')
    })
  })

  describe('demoteMember', () => {
    it('lets the owner demote an admin to member', async () => {
      await service.promoteMember(groupId, MEMBER_B)

      const result = await service.demoteMember(groupId, MEMBER_B)

      expect(result.success).toBe(true)
      const members = await service.getGroupMembers(groupId)
      expect(members.data.find((m) => m.userId === MEMBER_B)?.role).toBe('member')
    })

    it('lets an admin demote another admin', async () => {
      await service.promoteMember(groupId, MEMBER_B)
      await service.promoteMember(groupId, MEMBER_C)
      db.currentUserId = MEMBER_B

      const result = await service.demoteMember(groupId, MEMBER_C)

      expect(result.success).toBe(true)
      db.currentUserId = OWNER_ID
      const members = await service.getGroupMembers(groupId)
      expect(members.data.find((m) => m.userId === MEMBER_C)?.role).toBe('member')
    })

    it('rejects demotion by a regular member', async () => {
      await service.promoteMember(groupId, MEMBER_B)
      db.currentUserId = MEMBER_C

      const result = await service.demoteMember(groupId, MEMBER_B)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Only group owners and admins can demote admins')
    })

    it('does not let admins demote themselves', async () => {
      await service.promoteMember(groupId, MEMBER_B)
      db.currentUserId = MEMBER_B

      const result = await service.demoteMember(groupId, MEMBER_B)

      expect(result.success).toBe(false)
      expect(result.error).toBe('You cannot demote yourself')
    })

    it('never demotes the owner', async () => {
      await service.promoteMember(groupId, MEMBER_B)
      db.currentUserId = MEMBER_B

      const result = await service.demoteMember(groupId, OWNER_ID)

      expect(result.success).toBe(false)
      expect(result.error).toBe('The group owner cannot be demoted')
    })

    it('rejects demoting a regular member', async () => {
      const result = await service.demoteMember(groupId, MEMBER_B)

      expect(result.success).toBe(false)
      expect(result.error).toBe('User is not an admin')
    })

    it('rejects demoting a non-member', async () => {
      const result = await service.demoteMember(groupId, 'stranger')

      expect(result.success).toBe(false)
      expect(result.error).toBe('User is not a member of this group')
    })
  })

  describe('removeMember', () => {
    it('lets the owner remove a member', async () => {
      const result = await service.removeMember(groupId, MEMBER_B)

      expect(result.success).toBe(true)
      const members = await service.getGroupMembers(groupId)
      expect(members.data.map((m) => m.userId)).toEqual([OWNER_ID, MEMBER_C])
    })

    it('lets an admin remove a regular member', async () => {
      await service.promoteMember(groupId, MEMBER_B)
      db.currentUserId = MEMBER_B

      const result = await service.removeMember(groupId, MEMBER_C)

      expect(result.success).toBe(true)
    })

    it('rejects removal by a regular member', async () => {
      db.currentUserId = MEMBER_B

      const result = await service.removeMember(groupId, MEMBER_C)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Only group owners and admins can remove members')
    })

    it('does not let an admin remove another admin', async () => {
      await service.promoteMember(groupId, MEMBER_B)
      await service.promoteMember(groupId, MEMBER_C)
      db.currentUserId = MEMBER_B

      const result = await service.removeMember(groupId, MEMBER_C)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Only the group owner can remove an admin')
    })

    it('lets the owner remove an admin', async () => {
      await service.promoteMember(groupId, MEMBER_B)

      const result = await service.removeMember(groupId, MEMBER_B)

      expect(result.success).toBe(true)
    })

    it('never removes the owner', async () => {
      await service.promoteMember(groupId, MEMBER_B)
      db.currentUserId = MEMBER_B

      const result = await service.removeMember(groupId, OWNER_ID)

      expect(result.success).toBe(false)
      expect(result.error).toBe('The group owner cannot be removed')
    })

    it('does not let users remove themselves', async () => {
      const result = await service.removeMember(groupId, OWNER_ID)

      expect(result.success).toBe(false)
      expect(result.error).toBe('You cannot remove yourself. Leave the group instead.')
    })
  })
})
