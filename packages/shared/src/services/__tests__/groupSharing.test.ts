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

    await service.joinGroupByInvite(inviteCode, MEMBER_B)
  })

  describe('public sharing', () => {
    it('lets the owner enable sharing and generates a token', async () => {
      const result = await service.setGroupSharing(groupId, true)

      expect(result.error).toBeNull()
      expect(result.data?.isPublic).toBe(true)
      expect(result.data?.publicToken).toBeTruthy()
    })

    it('keeps the same token when toggling off and on again', async () => {
      const first = await service.setGroupSharing(groupId, true)
      await service.setGroupSharing(groupId, false)
      const second = await service.setGroupSharing(groupId, true)

      expect(second.data?.publicToken).toBe(first.data?.publicToken)
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

    it('regenerates to a different token', async () => {
      const enabled = await service.setGroupSharing(groupId, true)
      const regenerated = await service.regeneratePublicToken(groupId)

      expect(regenerated.error).toBeNull()
      expect(regenerated.data?.publicToken).toBeTruthy()
      expect(regenerated.data?.publicToken).not.toBe(enabled.data?.publicToken)
    })

    it('serves public data only while sharing is enabled', async () => {
      const enabled = await service.setGroupSharing(groupId, true)
      const token = enabled.data?.publicToken ?? ''

      const visible = await service.getPublicGroupData(token)
      expect(visible.data?.group.id).toBe(groupId)

      await service.setGroupSharing(groupId, false)
      const hidden = await service.getPublicGroupData(token)
      expect(hidden.data).toBeNull()
    })

    it('returns nothing for an unknown token', async () => {
      const result = await service.getPublicGroupData('bogus-token')
      expect(result.data).toBeNull()
    })
  })

  describe('join policy', () => {
    it('owner can require approval; joining then files a pending request', async () => {
      const policy = await service.setGroupJoinPolicy(groupId, 'approval')
      expect(policy.success).toBe(true)

      const join = await service.joinGroupByInvite(inviteCode, OUTSIDER)

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
      await service.joinGroupByInvite(inviteCode, OUTSIDER)
      await service.joinGroupByInvite(inviteCode, OUTSIDER)

      const requests = await service.getPendingJoinRequests(groupId)
      expect(requests.data).toHaveLength(1)
    })

    it('open groups still join immediately with status joined', async () => {
      const join = await service.joinGroupByInvite(inviteCode, OUTSIDER)

      expect(join.success).toBe(true)
      expect(join.status).toBe('joined')
    })
  })

  describe('approve / deny', () => {
    let requestId: string

    beforeEach(async () => {
      await service.setGroupJoinPolicy(groupId, 'approval')
      await service.joinGroupByInvite(inviteCode, OUTSIDER)
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
