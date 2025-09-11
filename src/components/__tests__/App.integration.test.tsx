import { render } from '@testing-library/react'
import { vi } from 'vitest'
import App from '../../App'

// Mock all hooks and contexts to avoid any loops
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user', email: 'test@example.com' },
    isAuthenticated: true,
    loading: false,
    error: null,
    isMockMode: true,
    signOut: vi.fn(),
  }),
}))

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
  GroupProvider: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('@/hooks/useGameLogic', () => ({
  useGameLogic: () => ({
    players: [],
    matches: [],
    addPlayer: vi.fn(),
    recordMatch: vi.fn(),
  }),
}))

describe('App Integration', () => {
  test('renders without crashing', () => {
    render(<App />)
    expect(document.body).toBeInTheDocument()
  })
})
