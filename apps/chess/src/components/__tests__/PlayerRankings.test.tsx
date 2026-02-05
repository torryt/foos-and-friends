import type { Player } from '@foos/shared'
import { render, screen } from '@testing-library/react'
import PlayerRankings from '../PlayerRankings'

const mockPlayers: Player[] = [
  {
    id: '1',
    name: 'Alice Johnson',
    ranking: 1500,
    matchesPlayed: 10,
    wins: 7,
    losses: 3,
    avatar: '👩‍💻',
    department: 'Engineering',
  },
  {
    id: '2',
    name: 'Bob Smith',
    ranking: 1200,
    matchesPlayed: 8,
    wins: 4,
    losses: 4,
    avatar: '👨‍🎨',
    department: 'Design',
  },
  {
    id: '3',
    name: 'Charlie Brown',
    ranking: 1800,
    matchesPlayed: 15,
    wins: 12,
    losses: 3,
    avatar: '🧔',
    department: 'Sales',
  },
]

describe('PlayerRankings', () => {
  test('renders player rankings table', () => {
    render(<PlayerRankings players={mockPlayers} />)

    expect(screen.getByText('Friend Rankings')).toBeInTheDocument()
    expect(screen.getByText('See how you stack up against your friends!')).toBeInTheDocument()
  })

  test('displays players sorted by ranking (highest first)', () => {
    render(<PlayerRankings players={mockPlayers} />)

    const playerNames = screen.getAllByText(/Alice Johnson|Bob Smith|Charlie Brown/)
    expect(playerNames[0]).toHaveTextContent('Charlie Brown') // 1800 rating
    expect(playerNames[1]).toHaveTextContent('Alice Johnson') // 1500 rating
    expect(playerNames[2]).toHaveTextContent('Bob Smith') // 1200 rating
  })

  test('shows correct player stats', () => {
    render(<PlayerRankings players={mockPlayers} />)

    // Check Alice's stats
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
    expect(screen.getByText('1500')).toBeInTheDocument()
    expect(screen.getByText('7W - 3L (10 total)')).toBeInTheDocument()
  })

  test('calculates and displays win rate correctly when sorted by ELO', () => {
    render(<PlayerRankings players={mockPlayers} />)

    // When sorted by ELO (default), it shows win rate as secondary info
    // Alice: 7/10 = 70%
    expect(screen.getByText('70% win rate')).toBeInTheDocument()

    // Bob: 4/8 = 50%
    expect(screen.getByText('50% win rate')).toBeInTheDocument()

    // Charlie: 12/15 = 80%
    expect(screen.getByText('80% win rate')).toBeInTheDocument()
  })

  test('handles empty player list', () => {
    render(<PlayerRankings players={[]} />)

    expect(screen.getByText('Friend Rankings')).toBeInTheDocument()
    // Empty state just shows empty grid - no special message in current implementation
  })

  test('displays correct rank numbers', () => {
    render(<PlayerRankings players={mockPlayers} />)

    // Should show 1, 2, 3 based on ranking order (not #1, #2, #3)
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  test('shows player avatars', () => {
    render(<PlayerRankings players={mockPlayers} />)

    expect(screen.getByText('👩‍💻')).toBeInTheDocument()
    expect(screen.getByText('👨‍🎨')).toBeInTheDocument()
    expect(screen.getByText('🧔')).toBeInTheDocument()
  })
})
