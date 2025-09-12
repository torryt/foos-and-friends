import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import QuickActions from '../QuickActions'

describe('QuickActions', () => {
  const mockOnRecordMatch = vi.fn()
  const mockOnAddPlayer = vi.fn()
  const mockOnManagePlayers = vi.fn()

  beforeEach(() => {
    mockOnRecordMatch.mockClear()
    mockOnAddPlayer.mockClear()
    mockOnManagePlayers.mockClear()
  })

  test('renders all action buttons', () => {
    render(<QuickActions onRecordMatch={mockOnRecordMatch} onAddPlayer={mockOnAddPlayer} onManagePlayers={mockOnManagePlayers} />)

    expect(screen.getByText('Record Game')).toBeInTheDocument()
    expect(screen.getByText('Add Player')).toBeInTheDocument()
    expect(screen.getByText('Manage Players')).toBeInTheDocument()
  })

  test('calls onRecordMatch when Record Game button is clicked', async () => {
    const user = userEvent.setup()
    render(<QuickActions onRecordMatch={mockOnRecordMatch} onAddPlayer={mockOnAddPlayer} onManagePlayers={mockOnManagePlayers} />)

    const recordButton = screen.getByRole('button', { name: /record game/i })
    await user.click(recordButton)

    expect(mockOnRecordMatch).toHaveBeenCalledTimes(1)
    expect(mockOnAddPlayer).not.toHaveBeenCalled()
    expect(mockOnManagePlayers).not.toHaveBeenCalled()
  })

  test('calls onAddPlayer when Add Player button is clicked', async () => {
    const user = userEvent.setup()
    render(<QuickActions onRecordMatch={mockOnRecordMatch} onAddPlayer={mockOnAddPlayer} onManagePlayers={mockOnManagePlayers} />)

    const addButton = screen.getByRole('button', { name: /add player/i })
    await user.click(addButton)

    expect(mockOnAddPlayer).toHaveBeenCalledTimes(1)
    expect(mockOnRecordMatch).not.toHaveBeenCalled()
    expect(mockOnManagePlayers).not.toHaveBeenCalled()
  })

  test('calls onManagePlayers when Manage Players button is clicked', async () => {
    const user = userEvent.setup()
    render(<QuickActions onRecordMatch={mockOnRecordMatch} onAddPlayer={mockOnAddPlayer} onManagePlayers={mockOnManagePlayers} />)

    const manageButton = screen.getByRole('button', { name: /manage players/i })
    await user.click(manageButton)

    expect(mockOnManagePlayers).toHaveBeenCalledTimes(1)
    expect(mockOnRecordMatch).not.toHaveBeenCalled()
    expect(mockOnAddPlayer).not.toHaveBeenCalled()
  })

  test('renders with correct icons', () => {
    render(<QuickActions onRecordMatch={mockOnRecordMatch} onAddPlayer={mockOnAddPlayer} onManagePlayers={mockOnManagePlayers} />)

    // Check that buttons contain the expected text content
    const recordButton = screen.getByRole('button', { name: /record game/i })
    const addButton = screen.getByRole('button', { name: /add player/i })
    const manageButton = screen.getByRole('button', { name: /manage players/i })

    expect(recordButton).toBeInTheDocument()
    expect(addButton).toBeInTheDocument()
    expect(manageButton).toBeInTheDocument()
  })
})
