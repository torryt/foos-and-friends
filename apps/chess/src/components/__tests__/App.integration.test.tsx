import type { FriendGroup } from '@foos/shared'
import { render, screen, waitFor } from '@testing-library/react'
import { type MockedFunction, vi } from 'vitest'
import App from '../../App'

// Mock the groupService from lib/init
vi.mock('@/lib/init')

// Mock the useAuth hook to simulate authenticated user
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'mock-user-id',
      email: 'test@example.com',
      emailConfirmed: true,
      createdAt: '2024-01-01',
    },
    isAuthenticated: true,
    loading: false,
    error: null,
    signInWithMagicLink: vi.fn(),
    signOut: vi.fn(),
  }),
}))

// Mock the router components: App should always render the router — the
// entry redirect / first-time screen lives at the index route, behind it
vi.mock('@tanstack/react-router', () => ({
  createRouter: vi.fn(() => ({})),
  RouterProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="router">{children}</div>
  ),
}))

vi.mock('@/routeTree.gen', () => ({
  routeTree: {},
}))

describe('App Integration - unified group routes architecture', () => {
  let mockGetUserGroups: MockedFunction<
    (userId: string) => Promise<{ data: FriendGroup[]; error: string | null }>
  >

  beforeEach(async () => {
    vi.clearAllMocks()

    // Import and mock the groupService after clearing mocks
    const { groupService } = await import('@/lib/init')
    mockGetUserGroups = vi.mocked(groupService.getUserGroups)

    // Clear any stored group IDs that might affect tests
    localStorage.clear()
    // Reset window location
    Object.defineProperty(window, 'location', {
      value: { pathname: '/' },
      writable: true,
    })
  })

  test('renders the router immediately while groups load (no top-level first-time screen)', async () => {
    const mockGroups: FriendGroup[] = [
      {
        id: 'group-1',
        name: 'Test Group',
        description: 'A test group',
        inviteCode: 'TEST123',
        ownerId: 'mock-user-id',
        createdBy: 'mock-user-id',
        isActive: true,
        maxMembers: 10,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      },
    ]

    // Mock delayed response to simulate loading
    mockGetUserGroups.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({ data: mockGroups, error: null })
          }, 100)
        }),
    )

    render(<App />)

    // The router is rendered from the start — auth gating and the
    // first-time screen happen per-route, so App itself never flickers
    expect(screen.getByTestId('router')).toBeInTheDocument()
    expect(screen.queryByText('Get Started')).not.toBeInTheDocument()
    expect(screen.queryByText('Create Your First Group')).not.toBeInTheDocument()

    // Still rendered once groups have loaded
    await waitFor(
      () => {
        expect(screen.getByTestId('router')).toBeInTheDocument()
      },
      { timeout: 1000 },
    )
    expect(screen.queryByText('Get Started')).not.toBeInTheDocument()
  })

  test('renders the router when the user has no groups (index route handles the first-time screen)', async () => {
    mockGetUserGroups.mockResolvedValue({ data: [], error: null })

    render(<App />)

    await waitFor(() => {
      expect(screen.getByTestId('router')).toBeInTheDocument()
    })

    // The first-time screen is a route concern now, not App's
    expect(screen.queryByText('Get Started')).not.toBeInTheDocument()
    expect(screen.queryByText('Create Your First Group')).not.toBeInTheDocument()
  })

  test('handles group loading errors gracefully (router still renders)', async () => {
    mockGetUserGroups.mockResolvedValue({ data: [], error: 'Failed to load groups' })

    render(<App />)

    await waitFor(() => {
      expect(screen.getByTestId('router')).toBeInTheDocument()
    })
  })

  test('renders without crashing', async () => {
    mockGetUserGroups.mockResolvedValue({ data: [], error: null })
    render(<App />)

    // Wait for async operations to complete to avoid act() warnings
    await waitFor(() => {
      expect(document.body).toBeInTheDocument()
    })
  })
})
