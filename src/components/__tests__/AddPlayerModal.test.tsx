import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AddPlayerModal from '../AddPlayerModal'

describe('AddPlayerModal', () => {
  const mockOnClose = vi.fn()
  const mockOnAddPlayer = vi.fn()

  beforeEach(() => {
    mockOnClose.mockClear()
    mockOnAddPlayer.mockClear()
  })

  test('does not render when isOpen is false', () => {
    render(<AddPlayerModal isOpen={false} onClose={mockOnClose} onAddPlayer={mockOnAddPlayer} />)

    expect(screen.queryByText('Add Player')).not.toBeInTheDocument()
  })

  test('renders when isOpen is true', () => {
    render(<AddPlayerModal isOpen={true} onClose={mockOnClose} onAddPlayer={mockOnAddPlayer} />)

    expect(screen.getByRole('heading', { name: /add player/i })).toBeInTheDocument()
    expect(screen.getByPlaceholderText("Enter player's name...")).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add Player' })).toBeInTheDocument()
  })

  test('calls onClose when close button is clicked', async () => {
    render(<AddPlayerModal isOpen={true} onClose={mockOnClose} onAddPlayer={mockOnAddPlayer} />)

    const closeButton = screen.getByRole('button', { name: '' }) // X button
    await userEvent.click(closeButton)

    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  test('adds player when form is submitted with valid name', async () => {
    const user = userEvent.setup()
    render(<AddPlayerModal isOpen={true} onClose={mockOnClose} onAddPlayer={mockOnAddPlayer} />)

    const input = screen.getByPlaceholderText("Enter player's name...")
    const submitButton = screen.getByRole('button', { name: 'Add Player' })

    await user.type(input, 'John Doe')
    await user.click(submitButton)

    expect(mockOnAddPlayer).toHaveBeenCalledWith('John Doe', '👤')
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  test('adds player when Enter key is pressed', async () => {
    const user = userEvent.setup()
    render(<AddPlayerModal isOpen={true} onClose={mockOnClose} onAddPlayer={mockOnAddPlayer} />)

    const input = screen.getByPlaceholderText("Enter player's name...")

    await user.type(input, 'Jane Smith')
    await user.keyboard('{Enter}')

    expect(mockOnAddPlayer).toHaveBeenCalledWith('Jane Smith', '👤')
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  test('trims whitespace from player name', async () => {
    const user = userEvent.setup()
    render(<AddPlayerModal isOpen={true} onClose={mockOnClose} onAddPlayer={mockOnAddPlayer} />)

    const input = screen.getByPlaceholderText("Enter player's name...")
    const submitButton = screen.getByRole('button', { name: 'Add Player' })

    await user.type(input, '  John Doe  ')
    await user.click(submitButton)

    expect(mockOnAddPlayer).toHaveBeenCalledWith('John Doe', '👤')
  })

  test('does not submit when name is empty', async () => {
    const user = userEvent.setup()
    render(<AddPlayerModal isOpen={true} onClose={mockOnClose} onAddPlayer={mockOnAddPlayer} />)

    const submitButton = screen.getByRole('button', { name: 'Add Player' })

    expect(submitButton).toBeDisabled()

    // Try clicking anyway
    await user.click(submitButton)

    expect(mockOnAddPlayer).not.toHaveBeenCalled()
    expect(mockOnClose).not.toHaveBeenCalled()
  })

  test('does not submit when name is only whitespace', async () => {
    const user = userEvent.setup()
    render(<AddPlayerModal isOpen={true} onClose={mockOnClose} onAddPlayer={mockOnAddPlayer} />)

    const input = screen.getByPlaceholderText("Enter player's name...")
    const submitButton = screen.getByRole('button', { name: 'Add Player' })

    await user.type(input, '   ')
    expect(submitButton).toBeDisabled()

    await user.click(submitButton)

    expect(mockOnAddPlayer).not.toHaveBeenCalled()
    expect(mockOnClose).not.toHaveBeenCalled()
  })

  test('clears input after successful submission', async () => {
    const user = userEvent.setup()
    render(<AddPlayerModal isOpen={true} onClose={mockOnClose} onAddPlayer={mockOnAddPlayer} />)

    const input = screen.getByPlaceholderText("Enter player's name...") as HTMLInputElement
    const submitButton = screen.getByRole('button', { name: 'Add Player' })

    await user.type(input, 'Test User')
    expect(input.value).toBe('Test User')

    await user.click(submitButton)

    await waitFor(() => {
      expect(input.value).toBe('')
    })
  })

  test('renders emoji selector with default avatar', () => {
    render(<AddPlayerModal isOpen={true} onClose={mockOnClose} onAddPlayer={mockOnAddPlayer} />)

    expect(screen.getByText('Choose Avatar')).toBeInTheDocument()
    // Check that there are multiple emoji buttons (emoji selector)
    const emojiButtons = screen
      .getAllByRole('button')
      .filter(
        (button) =>
          button.textContent &&
          /[\u{1F000}-\u{1F6FF}|\u{1F900}-\u{1F9FF}|\u{2600}-\u{26FF}|\u{2700}-\u{27BF}]/u.test(
            button.textContent,
          ),
      )
    expect(emojiButtons.length).toBeGreaterThan(5)
  })

  test('allows selecting different avatar', async () => {
    const user = userEvent.setup()
    render(<AddPlayerModal isOpen={true} onClose={mockOnClose} onAddPlayer={mockOnAddPlayer} />)

    const input = screen.getByPlaceholderText("Enter player's name...")
    const submitButton = screen.getByRole('button', { name: 'Add Player' })

    // Click on a different emoji
    const engineerEmoji = screen.getByRole('button', { name: '👨‍💻' })
    await user.click(engineerEmoji)

    await user.type(input, 'Engineer Bob')
    await user.click(submitButton)

    expect(mockOnAddPlayer).toHaveBeenCalledWith('Engineer Bob', '👨‍💻')
  })

  test('resets avatar selection after successful submission', async () => {
    const user = userEvent.setup()
    render(<AddPlayerModal isOpen={true} onClose={mockOnClose} onAddPlayer={mockOnAddPlayer} />)

    const input = screen.getByPlaceholderText("Enter player's name...")
    const submitButton = screen.getByRole('button', { name: 'Add Player' })

    // Select a different emoji
    const designerEmoji = screen.getByRole('button', { name: '👩‍🎨' })
    await user.click(designerEmoji)

    await user.type(input, 'Designer Alice')
    await user.click(submitButton)

    expect(mockOnAddPlayer).toHaveBeenCalledWith('Designer Alice', '👩‍🎨')
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })
})
