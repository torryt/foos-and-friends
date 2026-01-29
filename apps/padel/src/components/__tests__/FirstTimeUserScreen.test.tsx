import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { FirstTimeUserScreen } from '../FirstTimeUserScreen'

describe('FirstTimeUserScreen', () => {
  const mockProps = {
    onCreateGroup: vi.fn(),
    onJoinGroup: vi.fn(),
    loading: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('shows loading state when loading is true', () => {
    render(<FirstTimeUserScreen {...mockProps} loading={true} />)

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  test('shows first-time user section', () => {
    render(<FirstTimeUserScreen {...mockProps} />)

    expect(screen.getByText('Get Started')).toBeInTheDocument()
    expect(screen.getByText('Create Your First Group')).toBeInTheDocument()
    expect(screen.getByText('Join Existing Group')).toBeInTheDocument()
    expect(screen.getByText(/Pro tip:/)).toBeInTheDocument()
  })

  test('calls onCreateGroup when Create Your First Group is clicked', async () => {
    const user = userEvent.setup()
    render(<FirstTimeUserScreen {...mockProps} />)

    const createButton = screen.getByText('Create Your First Group')
    await user.click(createButton)

    expect(mockProps.onCreateGroup).toHaveBeenCalledTimes(1)
  })

  test('calls onJoinGroup when Join Existing Group is clicked', async () => {
    const user = userEvent.setup()
    render(<FirstTimeUserScreen {...mockProps} />)

    const joinButton = screen.getByText('Join Existing Group')
    await user.click(joinButton)

    expect(mockProps.onJoinGroup).toHaveBeenCalledTimes(1)
  })

  test('shows consistent loading state without flickering', async () => {
    // Start by rendering with loading state
    const { rerender } = render(<FirstTimeUserScreen {...mockProps} loading={true} />)

    // Verify loading state
    expect(screen.getByText('Loading...')).toBeInTheDocument()
    expect(screen.queryByText('Get Started')).not.toBeInTheDocument()
    expect(screen.queryByText('Create Your First Group')).not.toBeInTheDocument()

    // Transition to loaded state
    rerender(<FirstTimeUserScreen {...mockProps} loading={false} />)

    // Verify loaded state shows immediately without flicker
    await waitFor(() => {
      expect(screen.getByText('Get Started')).toBeInTheDocument()
    })

    expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    expect(screen.getByText('Create Your First Group')).toBeInTheDocument()
    expect(screen.getByText('Join Existing Group')).toBeInTheDocument()
  })
})
