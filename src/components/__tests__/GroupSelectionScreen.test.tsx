import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { FriendGroup } from '@/types'
import { GroupSelectionScreen } from '../GroupSelectionScreen'

const mockGroups: FriendGroup[] = [
  {
    id: 'group-1',
    name: 'Test Group 1',
    description: 'A test group',
    inviteCode: 'TEST123',
    ownerId: 'user-1',
    createdBy: 'user-1',
    isActive: true,
    maxMembers: 50,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'group-2',
    name: 'Test Group 2',
    description: 'Another test group',
    inviteCode: 'TEST456',
    ownerId: 'user-2',
    createdBy: 'user-2',
    isActive: true,
    maxMembers: 50,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
]

describe('GroupSelectionScreen', () => {
  const mockProps = {
    onSelectGroup: vi.fn(),
    onCreateGroup: vi.fn(),
    onJoinGroup: vi.fn(),
    loading: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('shows loading state when loading is true', () => {
    render(<GroupSelectionScreen {...mockProps} userGroups={[]} loading={true} />)

    expect(screen.getByText('Loading your groups...')).toBeInTheDocument()
  })

  test('shows first-time user section when no groups exist', () => {
    render(<GroupSelectionScreen {...mockProps} userGroups={[]} />)

    expect(screen.getByText('Get Started')).toBeInTheDocument()
    expect(screen.getByText('Create Your First Group')).toBeInTheDocument()
    expect(screen.getByText('Join Existing Group')).toBeInTheDocument()
    expect(screen.getByText(/Pro tip:/)).toBeInTheDocument()
  })

  test('shows group selection section when groups exist', () => {
    render(<GroupSelectionScreen {...mockProps} userGroups={mockGroups} />)

    expect(screen.getByText('Select a Group to Continue')).toBeInTheDocument()
    expect(screen.getByText('Test Group 1')).toBeInTheDocument()
    expect(screen.getByText('Test Group 2')).toBeInTheDocument()
    expect(screen.getByText('A test group')).toBeInTheDocument()
  })

  test('calls onSelectGroup when a group card is clicked', async () => {
    const user = userEvent.setup()
    render(<GroupSelectionScreen {...mockProps} userGroups={mockGroups} />)

    const groupCard = screen.getByText('Test Group 1').closest('[role="button"]')
    expect(groupCard).toBeInTheDocument()

    if (groupCard) {
      await user.click(groupCard)
      expect(mockProps.onSelectGroup).toHaveBeenCalledWith('group-1')
    }
  })

  test('calls onCreateGroup when Create Your First Group is clicked', async () => {
    const user = userEvent.setup()
    render(<GroupSelectionScreen {...mockProps} userGroups={[]} />)

    const createButton = screen.getByText('Create Your First Group')
    await user.click(createButton)

    expect(mockProps.onCreateGroup).toHaveBeenCalledTimes(1)
  })

  test('calls onJoinGroup when Join Existing Group is clicked', async () => {
    const user = userEvent.setup()
    render(<GroupSelectionScreen {...mockProps} userGroups={[]} />)

    const joinButton = screen.getByText('Join Existing Group')
    await user.click(joinButton)

    expect(mockProps.onJoinGroup).toHaveBeenCalledTimes(1)
  })

  test('shows action buttons for users with existing groups', () => {
    render(<GroupSelectionScreen {...mockProps} userGroups={mockGroups} />)

    expect(screen.getByText("Don't see the group you're looking for?")).toBeInTheDocument()
    expect(screen.getByText('Create New Group')).toBeInTheDocument()
    expect(screen.getByText('Join Another Group')).toBeInTheDocument()
  })

  test('displays group invite codes', () => {
    render(<GroupSelectionScreen {...mockProps} userGroups={mockGroups} />)

    expect(screen.getByText('TEST123')).toBeInTheDocument()
    expect(screen.getByText('TEST456')).toBeInTheDocument()
  })

  test('supports keyboard navigation for group cards', async () => {
    const user = userEvent.setup()
    render(<GroupSelectionScreen {...mockProps} userGroups={mockGroups} />)

    const groupCard = screen.getByText('Test Group 1').closest('[role="button"]')
    expect(groupCard).toBeInTheDocument()

    if (groupCard) {
      // Focus on the group card
      ;(groupCard as HTMLElement).focus()

      // Press Enter
      await user.keyboard('{Enter}')
      expect(mockProps.onSelectGroup).toHaveBeenCalledWith('group-1')
    }
  })
})
