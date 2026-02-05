import type { Match, Player } from '@foos/shared'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { PlayerRecentMatches } from '../PlayerRecentMatches'

// Mock the router
vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    params,
  }: {
    children: React.ReactNode
    to: string
    params?: Record<string, string>
  }) => <a href={`${to}/${params?.playerId || ''}`}>{children}</a>,
}))

describe('PlayerRecentMatches', () => {
  const mockPlayer1: Player = {
    id: 'player1',
    name: 'Alice',
    ranking: 1220,
    matchesPlayed: 11,
    wins: 7,
    losses: 4,
    avatar: '👩',
    department: 'Engineering',
    groupId: 'group1',
  }

  const mockPlayer2: Player = {
    id: 'player2',
    name: 'Bob',
    ranking: 1318,
    matchesPlayed: 9,
    wins: 6,
    losses: 3,
    avatar: '👨',
    department: 'Design',
    groupId: 'group1',
  }

  const mockPlayer3: Player = {
    id: 'player3',
    name: 'Charlie',
    ranking: 1085,
    matchesPlayed: 13,
    wins: 7,
    losses: 6,
    avatar: '🧑',
    department: 'Marketing',
    groupId: 'group1',
  }

  const mockPlayer4: Player = {
    id: 'player4',
    name: 'Diana',
    ranking: 1377,
    matchesPlayed: 16,
    wins: 10,
    losses: 6,
    avatar: '👩‍💼',
    department: 'Sales',
    groupId: 'group1',
  }

  const mockPlayers = [mockPlayer1, mockPlayer2, mockPlayer3, mockPlayer4]

  const mockMatches: Match[] = [
    {
      id: 'match1',
      team1: [mockPlayer1, mockPlayer2],
      team2: [mockPlayer3, mockPlayer4],
      score1: 10,
      score2: 8,
      date: '2024-01-15',
      time: '14:30',
      groupId: 'group1',
      recordedBy: 'user1',
      createdAt: '2024-01-15T14:30:00Z',
    },
    {
      id: 'match2',
      team1: [mockPlayer1, mockPlayer3],
      team2: [mockPlayer2, mockPlayer4],
      score1: 7,
      score2: 10,
      date: '2024-01-14',
      time: '16:45',
      groupId: 'group1',
      recordedBy: 'user1',
      createdAt: '2024-01-14T16:45:00Z',
    },
    {
      id: 'match3',
      team1: [mockPlayer2, mockPlayer4],
      team2: [mockPlayer1, mockPlayer3],
      score1: 5,
      score2: 10,
      date: '2024-01-13',
      time: '10:00',
      groupId: 'group1',
      recordedBy: 'user1',
      createdAt: '2024-01-13T10:00:00Z',
    },
  ]

  describe('Rendering', () => {
    it('renders the component with title', () => {
      render(
        <PlayerRecentMatches
          playerId="player1"
          players={mockPlayers}
          matches={mockMatches}
          recentForm={['W', 'L', 'W']}
        />,
      )

      expect(screen.getByText('Recent Matches')).toBeInTheDocument()
    })

    it('renders empty state when player has no matches', () => {
      render(
        <PlayerRecentMatches
          playerId="player1"
          players={mockPlayers}
          matches={[]}
          recentForm={[]}
        />,
      )

      expect(screen.getByText('No matches played yet')).toBeInTheDocument()
    })

    it('displays recent form badges', () => {
      render(
        <PlayerRecentMatches
          playerId="player1"
          players={mockPlayers}
          matches={mockMatches}
          recentForm={['W', 'L', 'W']}
        />,
      )

      // Check that form badges are rendered (W/L badges have specific styling)
      const badges = screen.getAllByText(/W|L/)
      expect(badges.length).toBeGreaterThan(0)
    })

    it('displays matches with correct information', () => {
      render(
        <PlayerRecentMatches
          playerId="player1"
          players={mockPlayers}
          matches={mockMatches}
          recentForm={['W', 'L', 'W']}
        />,
      )

      // Check that scores are displayed (getAllByText because scores appear twice: mobile & desktop)
      expect(screen.getAllByText('10-8').length).toBeGreaterThan(0)
      expect(screen.getAllByText('7-10').length).toBeGreaterThan(0)
      expect(screen.getAllByText('5-10').length).toBeGreaterThan(0)

      // Check that teammate/opponent names are displayed
      expect(screen.getAllByText('Bob').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Charlie').length).toBeGreaterThan(0)
    })
  })

  describe('Sorting functionality', () => {
    it('sorts matches by newest first by default', () => {
      render(
        <PlayerRecentMatches
          playerId="player1"
          players={mockPlayers}
          matches={mockMatches}
          recentForm={['W', 'L', 'W']}
        />,
      )

      // Get all match dates to verify order
      const dates = screen.getAllByText(/Jan \d+/)

      // The first match should be the newest (Jan 15)
      expect(dates[0]).toHaveTextContent('Jan 15')

      // The last match should be the oldest (Jan 13)
      expect(dates[dates.length - 1]).toHaveTextContent('Jan 13')
    })

    it('displays sort button with correct initial text', () => {
      render(
        <PlayerRecentMatches
          playerId="player1"
          players={mockPlayers}
          matches={mockMatches}
          recentForm={['W', 'L', 'W']}
        />,
      )

      const sortButton = screen.getByRole('button', { name: /newest/i })
      expect(sortButton).toBeInTheDocument()
      expect(sortButton).toHaveTextContent('Newest')
    })

    it('toggles sort order when button is clicked', async () => {
      const user = userEvent.setup()

      render(
        <PlayerRecentMatches
          playerId="player1"
          players={mockPlayers}
          matches={mockMatches}
          recentForm={['W', 'L', 'W']}
        />,
      )

      const sortButton = screen.getByRole('button', { name: /newest/i })

      // Click to sort by oldest first
      await user.click(sortButton)

      // Button text should change
      expect(sortButton).toHaveTextContent('Oldest')

      // Get all match dates after sorting
      const dates = screen.getAllByText(/Jan \d+/)

      // The first match should now be the oldest (Jan 13)
      expect(dates[0]).toHaveTextContent('Jan 13')

      // The last match should now be the newest (Jan 15)
      expect(dates[dates.length - 1]).toHaveTextContent('Jan 15')
    })

    it('toggles back to newest first after clicking twice', async () => {
      const user = userEvent.setup()

      render(
        <PlayerRecentMatches
          playerId="player1"
          players={mockPlayers}
          matches={mockMatches}
          recentForm={['W', 'L', 'W']}
        />,
      )

      const sortButton = screen.getByRole('button', { name: /newest/i })

      // Click twice
      await user.click(sortButton)
      await user.click(sortButton)

      // Button text should be back to "Newest"
      expect(sortButton).toHaveTextContent('Newest')

      // Get all match dates
      const dates = screen.getAllByText(/Jan \d+/)

      // Should be back to newest first (Jan 15)
      expect(dates[0]).toHaveTextContent('Jan 15')
    })

    it('has correct title attribute for sort button', () => {
      render(
        <PlayerRecentMatches
          playerId="player1"
          players={mockPlayers}
          matches={mockMatches}
          recentForm={['W', 'L', 'W']}
        />,
      )

      const sortButton = screen.getByRole('button', { name: /newest/i })
      expect(sortButton).toHaveAttribute('title', 'Sort oldest first')
    })

    it('updates title attribute when sort order changes', async () => {
      const user = userEvent.setup()

      render(
        <PlayerRecentMatches
          playerId="player1"
          players={mockPlayers}
          matches={mockMatches}
          recentForm={['W', 'L', 'W']}
        />,
      )

      const sortButton = screen.getByRole('button', { name: /newest/i })

      // Click to change sort order
      await user.click(sortButton)

      // Title should update
      expect(sortButton).toHaveAttribute('title', 'Sort newest first')
    })
  })

  describe('Match filtering', () => {
    it('only displays matches where the player participated', () => {
      // Create a match where player1 did not participate
      const matchesWithExtra: Match[] = [
        ...mockMatches,
        {
          id: 'match4',
          team1: [mockPlayer2, mockPlayer3],
          team2: [mockPlayer4, mockPlayer4], // Player1 not in this match
          score1: 10,
          score2: 5,
          date: '2024-01-16',
          time: '12:00',
          groupId: 'group1',
          recordedBy: 'user1',
          createdAt: '2024-01-16T12:00:00Z',
        },
      ]

      render(
        <PlayerRecentMatches
          playerId="player1"
          players={mockPlayers}
          matches={matchesWithExtra}
          recentForm={['W', 'L', 'W']}
        />,
      )

      // Should only show 3 dates (not the 4th one where player1 didn't participate)
      const dates = screen.getAllByText(/Jan \d+/)
      expect(dates).toHaveLength(3)
    })
  })

  describe('Position and teammate display', () => {
    it('displays correct position icons for attacker', () => {
      render(
        <PlayerRecentMatches
          playerId="player1"
          players={mockPlayers}
          matches={[mockMatches[0]]}
          recentForm={['W']}
        />,
      )

      // Player1 is in team1[0], so should be an attacker (Sword icon)
      const swordIcons = document.querySelectorAll('svg.text-orange-500')
      expect(swordIcons.length).toBeGreaterThan(0)
    })

    it('displays correct position icons for defender', () => {
      render(
        <PlayerRecentMatches
          playerId="player2"
          players={mockPlayers}
          matches={[mockMatches[0]]}
          recentForm={['W']}
        />,
      )

      // Player2 is in team1[1], so should be a defender (Shield icon)
      const shieldIcons = document.querySelectorAll('svg.text-blue-500')
      expect(shieldIcons.length).toBeGreaterThan(0)
    })

    it('displays correct teammate', () => {
      render(
        <PlayerRecentMatches
          playerId="player1"
          players={mockPlayers}
          matches={[mockMatches[0]]}
          recentForm={['W']}
        />,
      )

      // Player1's teammate in match1 is Player2 (Bob)
      expect(screen.getByText(/with/)).toBeInTheDocument()
      expect(screen.getAllByText('Bob').length).toBeGreaterThan(0)
    })

    it('displays correct opponents', () => {
      render(
        <PlayerRecentMatches
          playerId="player1"
          players={mockPlayers}
          matches={[mockMatches[0]]}
          recentForm={['W']}
        />,
      )

      // Player1's opponents in match1 are Player3 (Charlie) and Player4 (Diana)
      expect(screen.getByText(/vs/)).toBeInTheDocument()
      expect(screen.getAllByText('Charlie').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Diana').length).toBeGreaterThan(0)
    })
  })

  describe('Win/Loss display', () => {
    it('displays correct win/loss badge for winning match', () => {
      render(
        <PlayerRecentMatches
          playerId="player1"
          players={mockPlayers}
          matches={[mockMatches[0]]} // Player1 won this match (10-8)
          recentForm={['W']}
        />,
      )

      // Should have green border for win - find the match card div with border classes
      const matchCards = document.querySelectorAll('.border-l-4')
      expect(matchCards.length).toBe(1)
      expect(matchCards[0]).toHaveClass('border-l-green-600')
    })

    it('displays correct win/loss badge for losing match', () => {
      render(
        <PlayerRecentMatches
          playerId="player1"
          players={mockPlayers}
          matches={[mockMatches[1]]} // Player1 lost this match (7-10)
          recentForm={['L']}
        />,
      )

      // Should have red border for loss - find the match card div with border classes
      const matchCards = document.querySelectorAll('.border-l-4')
      expect(matchCards.length).toBe(1)
      expect(matchCards[0]).toHaveClass('border-l-red-400')
    })
  })
})
