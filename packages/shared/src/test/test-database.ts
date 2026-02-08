import type { Database } from '../lib/database.ts'
import type { FriendGroup, GroupMembership, Match, Player } from '../types/index.ts'
import { FakeDatabase } from './fake-database.ts'

/**
 * Creates a fresh fake database instance for testing
 */
export function createTestDatabase(): FakeDatabase {
  return new FakeDatabase()
}

/**
 * Creates a fake database pre-seeded with test data
 */
export function createSeededTestDatabase(data: {
  groups?: FriendGroup[]
  memberships?: GroupMembership[]
  players?: Player[]
  matches?: Match[]
}): FakeDatabase {
  const db = new FakeDatabase()
  db.seed(data)
  return db
}

/**
 * Creates a typical test scenario with a group, user membership, and some players
 */
export function createStandardTestScenario() {
  const testGroup: FriendGroup = {
    id: 'test-group',
    name: 'Test Group',
    description: 'A group for testing',
    inviteCode: 'testcode123',
    ownerId: 'user-1',
    createdBy: 'user-1',
    isActive: true,
    maxMembers: 50,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    sportType: 'foosball',
    supportedMatchTypes: ['2v2'],
  }

  const memberships = [
    {
      id: 'membership-1',
      groupId: 'test-group',
      userId: 'user-1',
      role: 'owner' as const,
      isActive: true,
      invitedBy: null,
      joinedAt: '2024-01-01T00:00:00Z',
      createdAt: '2024-01-01T00:00:00Z',
    },
    {
      id: 'membership-2',
      groupId: 'test-group',
      userId: 'user-2',
      role: 'member' as const,
      isActive: true,
      invitedBy: null,
      joinedAt: '2024-01-01T00:00:00Z',
      createdAt: '2024-01-01T00:00:00Z',
    },
  ]

  const players = [
    {
      id: 'player-1',
      name: 'Alice',
      ranking: 1500,
      matchesPlayed: 10,
      wins: 6,
      losses: 4,
      avatar: '👩',
      department: 'Engineering',
      groupId: 'test-group',
      createdBy: 'user-1',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    {
      id: 'player-2',
      name: 'Bob',
      ranking: 1300,
      matchesPlayed: 8,
      wins: 3,
      losses: 5,
      avatar: '👨',
      department: 'Design',
      groupId: 'test-group',
      createdBy: 'user-2',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
  ]

  return createSeededTestDatabase({
    groups: [testGroup],
    memberships,
    players,
  })
}

// Type-safe helper for dependency injection in tests
export interface TestServices {
  db: Database
}

export function createTestServices(db?: Database): TestServices {
  return {
    db: db || createTestDatabase(),
  }
}
