import { render, screen, waitFor } from '@testing-library/react'
import { type MockedFunction, vi } from 'vitest'
import type { FriendGroup } from '@/types'
import App from '../../App'

// Mock the groupService
vi.mock('@/services/groupService')

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

// Mock the router components to focus on the flicker issue
vi.mock('@tanstack/react-router', () => ({
  createRouter: vi.fn(() => ({})),
  RouterProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="router">{children}</div>
  ),
}))

// Mock the modals since they're not the focus of this test
vi.mock('@/components/CreateGroupModal', () => ({
  CreateGroupModal: () => <div data-testid="create-group-modal" />,
}))

vi.mock('@/components/JoinGroupModal', () => ({
  JoinGroupModal: () => <div data-testid="join-group-modal" />,
}))

vi.mock('@/routeTree.gen', () => ({
  routeTree: {},
}))

describe('App Integration - FirstTimeUserScreen Flickering', () => {
  let mockGetUserGroups: MockedFunction<
    (userId: string) => Promise<{ data: FriendGroup[]; error: string | null }>
  >

  beforeEach(async () => {
    vi.clearAllMocks()

    // Import and mock the groupService after clearing mocks
    const { groupService } = await import('@/services/groupService')
    mockGetUserGroups = vi.mocked(groupService.getUserGroups)

    // Clear any stored group IDs that might affect tests
    localStorage.clear()
    // Reset window location
    Object.defineProperty(window, 'location', {
      value: { pathname: '/' },
      writable: true,
    })
  })

  test('should not show FirstTimeUserScreen when user has groups (prevents flickering)', async () => {
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

    // Initially should show loading state (via FirstTimeUserScreen with loading=true)
    expect(screen.getByText('Loading...')).toBeInTheDocument()

    // Should NOT show the "Get Started" section during loading
    expect(screen.queryByText('Get Started')).not.toBeInTheDocument()
    expect(screen.queryByText('Create Your First Group')).not.toBeInTheDocument()

    // After groups load, should show the router (normal app) instead of FirstTimeUserScreen
    await waitFor(
      () => {
        expect(screen.getByTestId('router')).toBeInTheDocument()
      },
      { timeout: 1000 },
    )

    // Wait for the loading state to completely clear
    await waitFor(
      () => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
      },
      { timeout: 500 },
    )

    // FirstTimeUserScreen content should not be visible anymore
    expect(screen.queryByText('Get Started')).not.toBeInTheDocument()
    expect(screen.queryByText('Create Your First Group')).not.toBeInTheDocument()
  })

  test('should show FirstTimeUserScreen when user has no groups', async () => {
    // Mock empty groups response
    mockGetUserGroups.mockResolvedValue({ data: [], error: null })

    render(<App />)

    // Initially should show loading state
    expect(screen.getByText('Loading...')).toBeInTheDocument()

    // After loading completes with no groups, should show FirstTimeUserScreen content
    await waitFor(() => {
      expect(screen.getByText('Get Started')).toBeInTheDocument()
    })

    expect(screen.getByText('Create Your First Group')).toBeInTheDocument()
    expect(screen.getByText('Join Existing Group')).toBeInTheDocument()
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    expect(screen.queryByTestId('router')).not.toBeInTheDocument()
  })

  test('should handle group loading error gracefully', async () => {
    // Mock error response
    mockGetUserGroups.mockResolvedValue({ data: [], error: 'Failed to load groups' })

    render(<App />)

    // Initially should show loading state
    expect(screen.getByText('Loading...')).toBeInTheDocument()

    // After error, should show FirstTimeUserScreen (treating as no groups)
    await waitFor(() => {
      expect(screen.getByText('Get Started')).toBeInTheDocument()
    })

    expect(screen.getByText('Create Your First Group')).toBeInTheDocument()
    expect(screen.getByText('Join Existing Group')).toBeInTheDocument()
  })

  test('should handle invite page correctly regardless of group status', async () => {
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

    mockGetUserGroups.mockResolvedValue({ data: mockGroups, error: null })

    // Mock window.location.pathname to simulate invite page
    Object.defineProperty(window, 'location', {
      value: { pathname: '/invite' },
      writable: true,
    })

    render(<App />)

    // Should show router immediately for invite page, regardless of loading state
    await waitFor(() => {
      expect(screen.getByTestId('router')).toBeInTheDocument()
    })

    expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    expect(screen.queryByText('Get Started')).not.toBeInTheDocument()
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
