import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import type { Player } from '@/types'
import RegisterGameForm from '../RegisterGameForm'

// Mock data for testing
const createPlayer = (id: string, name: string, ranking = 1500): Player => ({
  id,
  name,
  ranking,
  matchesPlayed: 10,
  wins: 5,
  losses: 5,
  avatar: '🎯',
  department: 'Engineering',
})

const mockPlayers: Player[] = [
  createPlayer('1', 'Alice', 1600),
  createPlayer('2', 'Bob', 1550),
  createPlayer('3', 'Charlie', 1500),
  createPlayer('4', 'David', 1450),
]

describe('RegisterGameForm', () => {
  const mockRecordMatch = vi.fn()
  const mockSetShowRecordMatch = vi.fn()

  beforeEach(() => {
    mockRecordMatch.mockClear()
    mockSetShowRecordMatch.mockClear()
  })

  test('renders with register game title', () => {
    render(
      <RegisterGameForm
        players={mockPlayers}
        recordMatch={mockRecordMatch}
        setShowRecordMatch={mockSetShowRecordMatch}
      />,
    )

    expect(screen.getByRole('heading', { name: /register game/i })).toBeInTheDocument()
  })

  test('displays attacker and defender position labels', () => {
    render(
      <RegisterGameForm
        players={mockPlayers}
        recordMatch={mockRecordMatch}
        setShowRecordMatch={mockSetShowRecordMatch}
      />,
    )

    // Check for attacker labels (there should be 2, one for each team)
    const attackerOptions = screen.getAllByText('Select Attacker')
    expect(attackerOptions).toHaveLength(2)

    // Check for defender labels (there should be 2, one for each team)
    const defenderOptions = screen.getAllByText('Select Defender')
    expect(defenderOptions).toHaveLength(2)
  })

  test('displays position icons in dropdowns', () => {
    render(
      <RegisterGameForm
        players={mockPlayers}
        recordMatch={mockRecordMatch}
        setShowRecordMatch={mockSetShowRecordMatch}
      />,
    )

    // Check for sword icons (attackers) - should have orange color
    const swordIcons = document.querySelectorAll('.text-orange-500')
    expect(swordIcons.length).toBeGreaterThan(0)

    // Check for shield icons (defenders) - should have blue color
    const shieldIcons = document.querySelectorAll('.text-blue-500')
    expect(shieldIcons.length).toBeGreaterThan(0)
  })

  test('applies correct styling to attacker dropdowns', () => {
    const { container } = render(
      <RegisterGameForm
        players={mockPlayers}
        recordMatch={mockRecordMatch}
        setShowRecordMatch={mockSetShowRecordMatch}
      />,
    )

    const attackerSelects = container.querySelectorAll('select.border-orange-200')
    expect(attackerSelects.length).toBe(2) // One for each team
  })

  test('applies correct styling to defender dropdowns', () => {
    const { container } = render(
      <RegisterGameForm
        players={mockPlayers}
        recordMatch={mockRecordMatch}
        setShowRecordMatch={mockSetShowRecordMatch}
      />,
    )

    const defenderSelects = container.querySelectorAll('select.border-blue-200')
    expect(defenderSelects.length).toBe(2) // One for each team
  })

  test('allows selecting different players for each position', async () => {
    const user = userEvent.setup()
    render(
      <RegisterGameForm
        players={mockPlayers}
        recordMatch={mockRecordMatch}
        setShowRecordMatch={mockSetShowRecordMatch}
      />,
    )

    const selects = screen.getAllByRole('combobox')
    const [team1Attacker, team1Defender, team2Attacker, team2Defender] = selects

    // Select players for each position
    await user.selectOptions(team1Attacker, '1') // Alice as Team 1 Attacker
    await user.selectOptions(team1Defender, '2') // Bob as Team 1 Defender
    await user.selectOptions(team2Attacker, '3') // Charlie as Team 2 Attacker
    await user.selectOptions(team2Defender, '4') // David as Team 2 Defender

    expect(team1Attacker).toHaveValue('1')
    expect(team1Defender).toHaveValue('2')
    expect(team2Attacker).toHaveValue('3')
    expect(team2Defender).toHaveValue('4')
  })

  test('prevents selecting the same player multiple times', async () => {
    const user = userEvent.setup()
    render(
      <RegisterGameForm
        players={mockPlayers}
        recordMatch={mockRecordMatch}
        setShowRecordMatch={mockSetShowRecordMatch}
      />,
    )

    const selects = screen.getAllByRole('combobox')
    const [team1Attacker, team1Defender] = selects

    // Select Alice as Team 1 Attacker
    await user.selectOptions(team1Attacker, '1')

    // Try to select Alice as Team 1 Defender - she should not be available
    const team1DefenderOptions = Array.from(team1Defender.children) as HTMLOptionElement[]
    const aliceOption = team1DefenderOptions.find((option) => option.value === '1')

    // Alice should not be available in the Team 1 Defender dropdown
    expect(aliceOption).toBeUndefined()
  })

  test('submits form with correct player positions', async () => {
    const user = userEvent.setup()
    render(
      <RegisterGameForm
        players={mockPlayers}
        recordMatch={mockRecordMatch}
        setShowRecordMatch={mockSetShowRecordMatch}
      />,
    )

    const selects = screen.getAllByRole('combobox')
    const scoreInputs = screen.getAllByRole('spinbutton')
    const submitButton = screen.getByRole('button', { name: /register game/i })

    // Fill out the form
    await user.selectOptions(selects[0], '1') // Team 1 Attacker: Alice
    await user.selectOptions(selects[1], '2') // Team 1 Defender: Bob
    await user.selectOptions(selects[2], '3') // Team 2 Attacker: Charlie
    await user.selectOptions(selects[3], '4') // Team 2 Defender: David

    await user.clear(scoreInputs[0])
    await user.type(scoreInputs[0], '10')
    await user.clear(scoreInputs[1])
    await user.type(scoreInputs[1], '8')

    await user.click(submitButton)

    expect(mockRecordMatch).toHaveBeenCalledWith('1', '2', '3', '4', '10', '8')
    expect(mockSetShowRecordMatch).toHaveBeenCalledWith(false)
  })

  test('displays register game button text', () => {
    render(
      <RegisterGameForm
        players={mockPlayers}
        recordMatch={mockRecordMatch}
        setShowRecordMatch={mockSetShowRecordMatch}
      />,
    )

    const buttons = screen.getAllByText('Register Game')
    expect(buttons).toHaveLength(2) // Title and button
    expect(screen.getByRole('button', { name: /register game/i })).toBeInTheDocument()
  })

  test('closes form when close button is clicked', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <RegisterGameForm
        players={mockPlayers}
        recordMatch={mockRecordMatch}
        setShowRecordMatch={mockSetShowRecordMatch}
      />,
    )

    // Find the X close button (has SVG with specific class)
    const closeButton = container.querySelector('button .lucide-x')?.parentElement
    expect(closeButton).toBeTruthy()

    if (closeButton) {
      await user.click(closeButton)
      expect(mockSetShowRecordMatch).toHaveBeenCalledWith(false)
    }
  })

  test('maintains proper player spacing with padding for icons', () => {
    render(
      <RegisterGameForm
        players={mockPlayers}
        recordMatch={mockRecordMatch}
        setShowRecordMatch={mockSetShowRecordMatch}
      />,
    )

    // All select elements should have left padding for the icons
    const selects = screen.getAllByRole('combobox')
    selects.forEach((select) => {
      expect(select).toHaveClass('pl-8') // Left padding for icons
    })
  })

  test('disables submit button when form is incomplete', () => {
    render(
      <RegisterGameForm
        players={mockPlayers}
        recordMatch={mockRecordMatch}
        setShowRecordMatch={mockSetShowRecordMatch}
      />,
    )

    const submitButton = screen.getByRole('button', { name: /register game/i })
    expect(submitButton).toBeDisabled()
  })

  test('enables submit button when all fields are filled', async () => {
    const user = userEvent.setup()
    render(
      <RegisterGameForm
        players={mockPlayers}
        recordMatch={mockRecordMatch}
        setShowRecordMatch={mockSetShowRecordMatch}
      />,
    )

    const selects = screen.getAllByRole('combobox')
    const scoreInputs = screen.getAllByRole('spinbutton')
    const submitButton = screen.getByRole('button', { name: /register game/i })

    // Fill all required fields
    await user.selectOptions(selects[0], '1')
    await user.selectOptions(selects[1], '2')
    await user.selectOptions(selects[2], '3')
    await user.selectOptions(selects[3], '4')
    await user.clear(scoreInputs[0])
    await user.type(scoreInputs[0], '10')
    await user.clear(scoreInputs[1])
    await user.type(scoreInputs[1], '8')

    await waitFor(() => {
      expect(submitButton).toBeEnabled()
    })
  })
})
