import { describe, expect, it, vi } from 'vitest'
import type { Database } from '@/lib/database'
import type { Match, Player } from '@/types'

// Mock the database
const createMockDatabase = (): Database => ({
  getUserGroups: vi.fn(),
  getGroupById: vi.fn(),
  getGroupByInviteCode: vi.fn(),
  createGroup: vi.fn(),
  joinGroupByInvite: vi.fn(),
  deleteGroup: vi.fn(),
  leaveGroup: vi.fn(),
  getGroupMembers: vi.fn(),
  getPlayersByGroup: vi.fn(),
  getPlayerById: vi.fn(),
  createPlayer: vi.fn(),
  updatePlayer: vi.fn(),
  updateMultiplePlayers: vi.fn(),
  deletePlayer: vi.fn(),
  getMatchesByGroup: vi.fn(),
  getMatchById: vi.fn(),
  recordMatch: vi.fn(),
  updateMatch: vi.fn(),
  deleteMatch: vi.fn(),
})

// Create mock players service
const createMockPlayersService = () => ({
  getPlayerById: vi.fn(),
  updateMultiplePlayers: vi.fn(),
  getPlayersByGroup: vi.fn(),
})

// Dynamic import to get the MatchesService class
const getMatchesServiceClass = async () => {
  const module = await import('../matchesService')
  // Extract the class from the module (we can't use the exported instance)
  const MatchesService =
    (module as any).default ||
    Object.values(module).find((v) => typeof v === 'function' && v.name === 'MatchesService')

  // If we can't get the class directly, we'll need to mock it differently
  if (!MatchesService) {
    throw new Error('Could not find MatchesService class')
  }

  return MatchesService
}

describe('MatchesService', () => {
  describe('recalculateFromMatch', () => {
    it.skip('should recalculate all ELO scores from a specific match forward', async () => {
      const mockDb = createMockDatabase()
      const mockPlayersService = createMockPlayersService()

      // Create test data
      const groupId = 'test-group-1'
      const players: Player[] = [
        {
          id: 'player-1',
          groupId,
          name: 'Player 1',
          avatar: '🎯',
          ranking: 1200,
          matchesPlayed: 0,
          wins: 0,
          losses: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'player-2',
          groupId,
          name: 'Player 2',
          avatar: '🎮',
          ranking: 1200,
          matchesPlayed: 0,
          wins: 0,
          losses: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'player-3',
          groupId,
          name: 'Player 3',
          avatar: '🏆',
          ranking: 1200,
          matchesPlayed: 0,
          wins: 0,
          losses: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'player-4',
          groupId,
          name: 'Player 4',
          avatar: '⚡',
          ranking: 1200,
          matchesPlayed: 0,
          wins: 0,
          losses: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]

      const matches: Match[] = [
        {
          id: 'match-1',
          groupId,
          team1: [players[0], players[1]],
          team2: [players[2], players[3]],
          score1: 10,
          score2: 8,
          date: '2024-01-01',
          time: '10:00',
          recordedBy: 'user-1',
        },
        {
          id: 'match-2',
          groupId,
          team1: [players[0], players[2]],
          team2: [players[1], players[3]],
          score1: 7,
          score2: 10,
          date: '2024-01-02',
          time: '10:00',
          recordedBy: 'user-1',
        },
        {
          id: 'match-3',
          groupId,
          team1: [players[0], players[3]],
          team2: [players[1], players[2]],
          score1: 10,
          score2: 5,
          date: '2024-01-03',
          time: '10:00',
          recordedBy: 'user-1',
        },
      ]

      // Mock database responses
      ;(mockDb.getMatchesByGroup as any).mockResolvedValue({ data: matches, error: null })
      ;(mockPlayersService.getPlayersByGroup as any).mockResolvedValue({ data: players })
      ;(mockPlayersService.updateMultiplePlayers as any).mockResolvedValue({
        data: [],
        error: null,
      })

      // We need to test the actual service implementation
      // Since we can't easily import the class, we'll test through the exported instance
      const { matchesService } = await import('../matchesService')

      // Create a spy on the private method through prototype if possible
      const recalcSpy = vi.spyOn(matchesService as any, 'recalculateFromMatch')

      // Mock the dependencies
      ;(matchesService as any).db = mockDb
      ;(matchesService as any).playersService = mockPlayersService

      // Call recalculation from the second match
      const result = await (matchesService as any).recalculateFromMatch(
        groupId,
        '2024-01-02T10:00:00Z',
      )

      expect(result.success).toBe(true)
      expect(mockDb.getMatchesByGroup).toHaveBeenCalledWith(groupId)
      expect(mockPlayersService.updateMultiplePlayers).toHaveBeenCalled()

      // Check that the update was called with recalculated values
      const updateCall = (mockPlayersService.updateMultiplePlayers as any).mock.calls[0][0]
      expect(updateCall).toHaveLength(4) // All 4 players should be updated

      // Verify that rankings were recalculated (not all 1200)
      const rankings = updateCall.map((u: any) => u.ranking)
      expect(new Set(rankings).size).toBeGreaterThan(1) // Rankings should be different

      // Verify match counts
      updateCall.forEach((update: any) => {
        expect(update.matchesPlayed).toBe(3) // All players played 3 matches
        expect(update.wins + update.losses).toBe(3) // Total should be 3
      })
    })

    it('should handle empty match list', async () => {
      const mockDb = createMockDatabase()
      const mockPlayersService = createMockPlayersService()

      const groupId = 'test-group-1'

      // Mock empty matches
      ;(mockDb.getMatchesByGroup as any).mockResolvedValue({ data: [], error: null })

      const { matchesService } = await import('../matchesService')
      ;(matchesService as any).db = mockDb
      ;(matchesService as any).playersService = mockPlayersService

      const result = await (matchesService as any).recalculateFromMatch(
        groupId,
        '2024-01-01T10:00:00Z',
      )

      expect(result.success).toBe(true)
      expect(mockPlayersService.updateMultiplePlayers).not.toHaveBeenCalled()
    })

    it('should handle database errors gracefully', async () => {
      const mockDb = createMockDatabase()
      const mockPlayersService = createMockPlayersService()

      const groupId = 'test-group-1'

      // Mock database error
      ;(mockDb.getMatchesByGroup as any).mockResolvedValue({ data: [], error: 'Database error' })

      const { matchesService } = await import('../matchesService')
      ;(matchesService as any).db = mockDb
      ;(matchesService as any).playersService = mockPlayersService

      const result = await (matchesService as any).recalculateFromMatch(
        groupId,
        '2024-01-01T10:00:00Z',
      )

      expect(result.success).toBeUndefined()
      expect(result.error).toBe('Database error')
    })
  })

  describe('deleteMatch', () => {
    it('should delete a match and trigger recalculation', async () => {
      const mockDb = createMockDatabase()
      const mockPlayersService = createMockPlayersService()

      const match: Match = {
        id: 'match-1',
        groupId: 'group-1',
        team1: [
          {
            id: 'p1',
            name: 'P1',
            avatar: '🎯',
            ranking: 1200,
            matchesPlayed: 1,
            wins: 1,
            losses: 0,
            groupId: 'group-1',
            createdAt: '',
            updatedAt: '',
          },
          {
            id: 'p2',
            name: 'P2',
            avatar: '🎮',
            ranking: 1200,
            matchesPlayed: 1,
            wins: 1,
            losses: 0,
            groupId: 'group-1',
            createdAt: '',
            updatedAt: '',
          },
        ],
        team2: [
          {
            id: 'p3',
            name: 'P3',
            avatar: '🏆',
            ranking: 1200,
            matchesPlayed: 1,
            wins: 0,
            losses: 1,
            groupId: 'group-1',
            createdAt: '',
            updatedAt: '',
          },
          {
            id: 'p4',
            name: 'P4',
            avatar: '⚡',
            ranking: 1200,
            matchesPlayed: 1,
            wins: 0,
            losses: 1,
            groupId: 'group-1',
            createdAt: '',
            updatedAt: '',
          },
        ],
        score1: 10,
        score2: 8,
        playedAt: '2024-01-01T10:00:00Z',
        date: '2024-01-01',
        time: '10:00',
        recordedBy: 'user-1',
      }

      // Mock responses
      ;(mockDb.getMatchById as any).mockResolvedValue({ data: match, error: null })
      ;(mockDb.deleteMatch as any).mockResolvedValue({ success: true })
      ;(mockDb.getMatchesByGroup as any).mockResolvedValue({ data: [], error: null })
      ;(mockPlayersService.getPlayersByGroup as any).mockResolvedValue({
        data: match.team1.concat(match.team2),
      })
      ;(mockPlayersService.updateMultiplePlayers as any).mockResolvedValue({
        data: [],
        error: null,
      })

      const { matchesService } = await import('../matchesService')
      ;(matchesService as any).db = mockDb
      ;(matchesService as any).playersService = mockPlayersService

      const result = await matchesService.deleteMatch('match-1')

      expect(result.success).toBe(true)
      expect(mockDb.getMatchById).toHaveBeenCalledWith('match-1')
      expect(mockDb.deleteMatch).toHaveBeenCalledWith('match-1')
      expect(mockDb.getMatchesByGroup).toHaveBeenCalledWith('group-1')
    })

    it('should handle match not found', async () => {
      const mockDb = createMockDatabase()
      const mockPlayersService = createMockPlayersService()

      ;(mockDb.getMatchById as any).mockResolvedValue({ data: null, error: 'Not found' })

      const { matchesService } = await import('../matchesService')
      ;(matchesService as any).db = mockDb
      ;(matchesService as any).playersService = mockPlayersService

      const result = await matchesService.deleteMatch('non-existent')

      expect(result.error).toBe('Not found')
      expect(mockDb.deleteMatch).not.toHaveBeenCalled()
    })
  })
})
