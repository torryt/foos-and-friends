import { beforeEach, describe, expect, it } from 'vitest'
import { FakeDatabase } from '../../test/fake-database.ts'
import { createGroupService, type GroupService } from '../groupService.ts'

// FakeDatabase creates groups owned by 'fake-user-id' and simulates
// auth.uid() via db.currentUserId for role-checked RPCs.
const OWNER_ID = 'fake-user-id'
const MEMBER_B = 'user-b'
const OUTSIDER = 'user-x'

describe('GroupService sharing & join approval', () => {
  let db: FakeDatabase
  let service: GroupService
  let groupId: string
  let inviteCode: string

  beforeEach(async () => {
    db = new FakeDatabase()
    service = createGroupService(db)

    const created = await service.createGroup('Test Group')
    expect(created.success).toBe(true)
    groupId = created.groupId ?? ''
    inviteCode = created.inviteCode ?? ''

    await joinAs(MEMBER_B, inviteCode)
  })

  // Simulates another user joining: the acting user is now the authenticated
  // caller, so switch db.currentUserId around the call
  async function joinAs(userId: string, code: string) {
    const previous = db.currentUserId
    db.currentUserId = userId
    const result = await service.joinGroupByInvite(code)
    db.currentUserId = previous
    return result
  }

  describe('public sharing', () => {
    it('lets the owner enable sharing', async () => {
      const result = await service.setGroupSharing(groupId, true)

      expect(result.error).toBeNull()
      expect(result.data?.isPublic).toBe(true)
    })

    it('rejects regular members', async () => {
      db.currentUserId = MEMBER_B

      const result = await service.setGroupSharing(groupId, true)

      expect(result.data).toBeNull()
      expect(result.error).toMatch(/owners and admins/)
    })

    it('allows admins', async () => {
      await service.promoteMember(groupId, MEMBER_B)
      db.currentUserId = MEMBER_B

      const result = await service.setGroupSharing(groupId, true)

      expect(result.error).toBeNull()
      expect(result.data?.isPublic).toBe(true)
    })

    it('serves public data only while sharing is enabled', async () => {
      await service.setGroupSharing(groupId, true)

      const visible = await service.getPublicGroupData(groupId)
      expect(visible.data?.group.id).toBe(groupId)

      await service.setGroupSharing(groupId, false)
      const hidden = await service.getPublicGroupData(groupId)
      expect(hidden.data).toBeNull()
    })

    it('never exposes the invite code through public data', async () => {
      await service.setGroupSharing(groupId, true)

      const visible = await service.getPublicGroupData(groupId)

      expect(JSON.stringify(visible.data)).not.toContain(inviteCode)
    })

    it('returns nothing for an unknown group id', async () => {
      const result = await service.getPublicGroupData('bogus-group-id')
      expect(result.data).toBeNull()
    })
  })

  describe('group preview', () => {
    it('returns name and join policy even for private groups', async () => {
      const result = await service.getGroupPreview(groupId)

      expect(result.error).toBeNull()
      expect(result.data?.name).toBe('Test Group')
      expect(result.data?.isPublic).toBe(false)
      expect(result.data?.joinPolicy).toBe('open')
    })

    it('returns nothing for an unknown group id', async () => {
      const result = await service.getGroupPreview('bogus-group-id')
      expect(result.data).toBeNull()
    })
  })

  describe('request to join by group id', () => {
    it('joins immediately when the policy is open', async () => {
      db.currentUserId = OUTSIDER

      const result = await service.requestToJoinGroup(groupId)

      expect(result.success).toBe(true)
      expect(result.status).toBe('joined')

      db.currentUserId = OWNER_ID
      const members = await service.getGroupMembers(groupId)
      expect(members.data.some((m) => m.userId === OUTSIDER && m.role === 'member')).toBe(true)
    })

    it('files a pending request when the policy is approval', async () => {
      await service.setGroupJoinPolicy(groupId, 'approval')
      db.currentUserId = OUTSIDER

      const result = await service.requestToJoinGroup(groupId)

      expect(result.success).toBe(true)
      expect(result.status).toBe('pending')

      db.currentUserId = OWNER_ID
      const members = await service.getGroupMembers(groupId)
      expect(members.data.some((m) => m.userId === OUTSIDER)).toBe(false)
      const requests = await service.getPendingJoinRequests(groupId)
      expect(requests.data).toHaveLength(1)
      expect(requests.data[0].userId).toBe(OUTSIDER)
    })

    it('does not duplicate a pending request', async () => {
      await service.setGroupJoinPolicy(groupId, 'approval')
      db.currentUserId = OUTSIDER

      await service.requestToJoinGroup(groupId)
      await service.requestToJoinGroup(groupId)

      db.currentUserId = OWNER_ID
      const requests = await service.getPendingJoinRequests(groupId)
      expect(requests.data).toHaveLength(1)
    })

    it('rejects existing members', async () => {
      db.currentUserId = MEMBER_B

      const result = await service.requestToJoinGroup(groupId)

      expect(result.success).toBe(false)
      expect(result.error).toMatch(/already a member/i)
    })

    it('rejects unknown groups', async () => {
      const result = await service.requestToJoinGroup('bogus-group-id')

      expect(result.success).toBe(false)
    })
  })

  describe('join policy', () => {
    it('owner can require approval; joining then files a pending request', async () => {
      const policy = await service.setGroupJoinPolicy(groupId, 'approval')
      expect(policy.success).toBe(true)

      const join = await joinAs(OUTSIDER, inviteCode)

      expect(join.success).toBe(true)
      expect(join.status).toBe('pending')

      const members = await service.getGroupMembers(groupId)
      expect(members.data.some((m) => m.userId === OUTSIDER)).toBe(false)

      const requests = await service.getPendingJoinRequests(groupId)
      expect(requests.data).toHaveLength(1)
      expect(requests.data[0].userId).toBe(OUTSIDER)
    })

    it('regular members cannot change the join policy', async () => {
      db.currentUserId = MEMBER_B

      const result = await service.setGroupJoinPolicy(groupId, 'approval')

      expect(result.success).toBe(false)
    })

    it('joining twice while pending does not duplicate the request', async () => {
      await service.setGroupJoinPolicy(groupId, 'approval')
      await joinAs(OUTSIDER, inviteCode)
      await joinAs(OUTSIDER, inviteCode)

      const requests = await service.getPendingJoinRequests(groupId)
      expect(requests.data).toHaveLength(1)
    })

    it('open groups still join immediately with status joined', async () => {
      const join = await joinAs(OUTSIDER, inviteCode)

      expect(join.success).toBe(true)
      expect(join.status).toBe('joined')
    })
  })

  describe('approve / deny', () => {
    let requestId: string

    beforeEach(async () => {
      await service.setGroupJoinPolicy(groupId, 'approval')
      await joinAs(OUTSIDER, inviteCode)
      const requests = await service.getPendingJoinRequests(groupId)
      requestId = requests.data[0].id
    })

    it('approving creates an active membership and resolves the request', async () => {
      const result = await service.approveJoinRequest(requestId)
      expect(result.success).toBe(true)

      const members = await service.getGroupMembers(groupId)
      expect(members.data.some((m) => m.userId === OUTSIDER && m.role === 'member')).toBe(true)

      const requests = await service.getPendingJoinRequests(groupId)
      expect(requests.data).toHaveLength(0)
    })

    it('denying resolves the request without adding a member', async () => {
      const result = await service.denyJoinRequest(requestId)
      expect(result.success).toBe(true)

      const members = await service.getGroupMembers(groupId)
      expect(members.data.some((m) => m.userId === OUTSIDER)).toBe(false)
    })

    it('cannot approve the same request twice', async () => {
      await service.approveJoinRequest(requestId)
      const second = await service.approveJoinRequest(requestId)

      expect(second.success).toBe(false)
    })

    it('regular members cannot approve', async () => {
      db.currentUserId = MEMBER_B

      const result = await service.approveJoinRequest(requestId)

      expect(result.success).toBe(false)
    })

    it('the requesting user sees their own pending request', async () => {
      db.currentUserId = OUTSIDER

      const mine = await service.getMyPendingJoinRequests()

      expect(mine.data).toHaveLength(1)
      expect(mine.data[0].groupId).toBe(groupId)
    })

    it('pending counts show up for the owner via the bell feed', async () => {
      db.currentUserId = OWNER_ID

      const counts = await service.getPendingJoinRequestCounts()

      expect(counts.data).toHaveLength(1)
      expect(counts.data[0].groupId).toBe(groupId)
      expect(counts.data[0].count).toBe(1)
    })
  })
})
