import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

    expect(screen.getByText('Setting up your account...')).toBeInTheDocument()
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
})
