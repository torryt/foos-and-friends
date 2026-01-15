import { beforeEach, describe, expect, it } from 'vitest'
import { createTestDatabase } from '@/test/test-database'
import type { GroupCreationResult } from '@/types'

class GroupService {
  private db: import('@/lib/database').Database

  constructor(db: import('@/lib/database').Database) {
    this.db = db
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
}

describe('Group Creation with Seasons', () => {
  let fakeDb: ReturnType<typeof createTestDatabase>
  let groupService: GroupService

  beforeEach(() => {
    fakeDb = createTestDatabase()
    groupService = new GroupService(fakeDb)
  })

  it('should create an initial season (Season 1) when creating a new group', async () => {
    // Create a new group
    const result = await groupService.createGroup('Test Group', 'A test group')

    // Verify group was created successfully
    expect(result.success).toBe(true)
    expect(result.groupId).toBeDefined()

    // Verify that Season 1 was created for the group
    const seasons = await fakeDb.getSeasonsByGroup(result.groupId ?? '')
    expect(seasons.data).toHaveLength(1)
    expect(seasons.data[0].name).toBe('Season 1')
    expect(seasons.data[0].description).toBe('Initial season')
    expect(seasons.data[0].seasonNumber).toBe(1)
    expect(seasons.data[0].isActive).toBe(true)
  })

  it('should make the initial season active', async () => {
    // Create a new group
    const result = await groupService.createGroup('Test Group')

    expect(result.success).toBe(true)

    // Verify that there is an active season
    const activeSeason = await fakeDb.getActiveSeason(result.groupId ?? '')
    expect(activeSeason.data).not.toBeNull()
    expect(activeSeason.data?.name).toBe('Season 1')
    expect(activeSeason.data?.isActive).toBe(true)
  })

  it('should create season with correct metadata', async () => {
    // Create a new group
    const result = await groupService.createGroup('Test Group', 'A test group')

    expect(result.success).toBe(true)

    // Get the active season
    const activeSeason = await fakeDb.getActiveSeason(result.groupId ?? '')
    expect(activeSeason.data).not.toBeNull()

    if (!activeSeason.data) {
      throw new Error('Expected active season to be defined')
    }

    const season = activeSeason.data
    // Verify season metadata
    expect(season.groupId).toBe(result.groupId)
    expect(season.name).toBe('Season 1')
    expect(season.description).toBe('Initial season')
    expect(season.seasonNumber).toBe(1)
    expect(season.isActive).toBe(true)
    expect(season.endDate).toBeNull()
    expect(season.startDate).toBeDefined()
  })

  it('should allow retrieving season by group ID', async () => {
    // Create two groups
    const result1 = await groupService.createGroup('Group 1')
    const result2 = await groupService.createGroup('Group 2')

    // Get seasons for first group
    const group1Seasons = await fakeDb.getSeasonsByGroup(result1.groupId ?? '')
    expect(group1Seasons.data).toHaveLength(1)
    expect(group1Seasons.data[0].groupId).toBe(result1.groupId)

    // Get seasons for second group
    const group2Seasons = await fakeDb.getSeasonsByGroup(result2.groupId ?? '')
    expect(group2Seasons.data).toHaveLength(1)
    expect(group2Seasons.data[0].groupId).toBe(result2.groupId)

    // Verify they are different seasons
    expect(group1Seasons.data[0].id).not.toBe(group2Seasons.data[0].id)
  })
})
