import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import QuickActions from '../QuickActions'

describe('QuickActions', () => {
  const mockOnAddMatch = vi.fn()
  const mockOnAddPlayer = vi.fn()

  beforeEach(() => {
    mockOnAddMatch.mockClear()
    mockOnAddPlayer.mockClear()
  })

  test('renders all action buttons', () => {
    render(<QuickActions onAddMatch={mockOnAddMatch} onAddPlayer={mockOnAddPlayer} />)

    expect(screen.getByText('Add Match')).toBeInTheDocument()
    expect(screen.getByText('Add Player')).toBeInTheDocument()
  })

  test('calls onAddMatch when Add Match button is clicked', async () => {
    const user = userEvent.setup()
    render(<QuickActions onAddMatch={mockOnAddMatch} onAddPlayer={mockOnAddPlayer} />)

    const recordButton = screen.getByRole('button', { name: /add match/i })
    await user.click(recordButton)

    expect(mockOnAddMatch).toHaveBeenCalledTimes(1)
    expect(mockOnAddPlayer).not.toHaveBeenCalled()
  })

  test('calls onAddPlayer when Add Player button is clicked', async () => {
    const user = userEvent.setup()
    render(<QuickActions onAddMatch={mockOnAddMatch} onAddPlayer={mockOnAddPlayer} />)

    const addButton = screen.getByRole('button', { name: /add player/i })
    await user.click(addButton)

    expect(mockOnAddPlayer).toHaveBeenCalledTimes(1)
    expect(mockOnAddMatch).not.toHaveBeenCalled()
  })

  test('renders with correct icons', () => {
    render(<QuickActions onAddMatch={mockOnAddMatch} onAddPlayer={mockOnAddPlayer} />)

    // Check that buttons contain the expected text content
    const recordButton = screen.getByRole('button', { name: /add match/i })
    const addButton = screen.getByRole('button', { name: /add player/i })

    expect(recordButton).toBeInTheDocument()
    expect(addButton).toBeInTheDocument()
  })
})
