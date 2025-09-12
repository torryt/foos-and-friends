import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import QuickActions from '../QuickActions'

describe('QuickActions', () => {
  const mockOnRecordMatch = vi.fn()
  const mockOnAddPlayer = vi.fn()

  beforeEach(() => {
    mockOnRecordMatch.mockClear()
    mockOnAddPlayer.mockClear()
  })

  test('renders all action buttons', () => {
    render(<QuickActions onRecordMatch={mockOnRecordMatch} onAddPlayer={mockOnAddPlayer} />)

    expect(screen.getByText('Record Game')).toBeInTheDocument()
    expect(screen.getByText('Add Player')).toBeInTheDocument()
  })

  test('calls onRecordMatch when Record Game button is clicked', async () => {
    const user = userEvent.setup()
    render(<QuickActions onRecordMatch={mockOnRecordMatch} onAddPlayer={mockOnAddPlayer} />)

    const recordButton = screen.getByRole('button', { name: /record game/i })
    await user.click(recordButton)

    expect(mockOnRecordMatch).toHaveBeenCalledTimes(1)
    expect(mockOnAddPlayer).not.toHaveBeenCalled()
  })

  test('calls onAddPlayer when Add Player button is clicked', async () => {
    const user = userEvent.setup()
    render(<QuickActions onRecordMatch={mockOnRecordMatch} onAddPlayer={mockOnAddPlayer} />)

    const addButton = screen.getByRole('button', { name: /add player/i })
    await user.click(addButton)

    expect(mockOnAddPlayer).toHaveBeenCalledTimes(1)
    expect(mockOnRecordMatch).not.toHaveBeenCalled()
  })

  test('renders with correct icons', () => {
    render(<QuickActions onRecordMatch={mockOnRecordMatch} onAddPlayer={mockOnAddPlayer} />)

    // Check that buttons contain the expected text content
    const recordButton = screen.getByRole('button', { name: /record game/i })
    const addButton = screen.getByRole('button', { name: /add player/i })

    expect(recordButton).toBeInTheDocument()
    expect(addButton).toBeInTheDocument()
  })
})
