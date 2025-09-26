import { renderHook } from '@testing-library/react'
import { vi } from 'vitest'
import { useGameLogic } from '../useGameLogic'

// Mock everything to return empty data and prevent API calls
vi.mock('@/services/playersService', () => ({
  playersService: {
    getPlayersByGroup: vi.fn().mockResolvedValue({ data: [] }),
    addPlayer: vi.fn().mockResolvedValue({ data: null }),
  },
}))

vi.mock('@/services/matchesService', () => ({
  matchesService: {
    getMatchesByGroup: vi.fn().mockResolvedValue({ data: [] }),
    addMatch: vi.fn().mockResolvedValue({ data: null }),
  },
}))

// Mock to return null/empty values to prevent loops
vi.mock('@/contexts/GroupContext', () => ({
  useGroupContext: () => ({
    currentGroup: null,
    userGroups: [],
    hasAnyGroups: false,
    loading: false,
    error: null,
    switchGroup: vi.fn(),
    refreshGroups: vi.fn(),
    createGroup: vi.fn(),
    joinGroup: vi.fn(),
  }),
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    loading: false,
    error: null,
    signInWithMagicLink: vi.fn(),
    signOut: vi.fn(),
  }),
}))

describe('useGameLogic', () => {
  test('initializes with empty state when no group/user', () => {
    const { result } = renderHook(() => useGameLogic())

    expect(result.current.players).toEqual([])
    expect(result.current.matches).toEqual([])
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(typeof result.current.addPlayer).toBe('function')
    expect(typeof result.current.addMatch).toBe('function')
  })

  test('addPlayer returns error when no group selected', async () => {
    const { result } = renderHook(() => useGameLogic())

    const response = await result.current.addPlayer('Test Player')

    expect(response.success).toBe(false)
    expect(response.error).toBe('No group selected or user not authenticated')
  })

  test('addMatch returns error when no group selected', async () => {
    const { result } = renderHook(() => useGameLogic())

    const response = await result.current.addMatch('1', '2', '3', '4', '10', '5')

    expect(response.success).toBe(false)
    expect(response.error).toBe('No group selected or user not authenticated')
  })
})
