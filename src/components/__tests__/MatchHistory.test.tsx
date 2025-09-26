import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import type { Match, Player } from '@/types'
import MatchHistory from '../MatchHistory'

describe('MatchHistory', () => {
  const mockOnAddMatch = vi.fn()

  const mockPlayer1: Player = {
    id: 'player1',
    name: 'Alice',
    ranking: 1220, // Current ranking
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
    ranking: 1318, // Current ranking
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
    ranking: 1085, // Current ranking
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
    ranking: 1377, // Current ranking
    matchesPlayed: 16,
    wins: 10,
    losses: 6,
    avatar: '👩‍💼',
    department: 'Sales',
    groupId: 'group1',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Empty state', () => {
    it('renders empty state when no matches provided', () => {
      render(<MatchHistory matches={[]} players={[]} onAddMatch={mockOnAddMatch} />)

      expect(screen.getByText('Recent Games')).toBeInTheDocument()
      expect(
        screen.getByText('No games recorded yet. Tap + to record your first foos battle!'),
      ).toBeInTheDocument()
    })

    it('calls onAddMatch when + button is clicked in empty state', async () => {
      const user = userEvent.setup()
      render(<MatchHistory matches={[]} players={[]} onAddMatch={mockOnAddMatch} />)

      const buttons = screen.getAllByRole('button')
      const addButton = buttons[1] // Second button is the add match button (+ icon)
      await user.click(addButton)

      expect(mockOnAddMatch).toHaveBeenCalledTimes(1)
    })
  })

  describe('Match with historical data', () => {
    const matchWithRankingData: Match = {
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
      playerStats: [
        {
          playerId: 'player1',
          preGameRanking: 1200,
          postGameRanking: 1220,
        },
        {
          playerId: 'player2',
          preGameRanking: 1300,
          postGameRanking: 1318,
        },
        {
          playerId: 'player3',
          preGameRanking: 1100,
          postGameRanking: 1085,
        },
        {
          playerId: 'player4',
          preGameRanking: 1400,
          postGameRanking: 1377,
        },
      ],
    }

    it('renders match with historical ranking data', () => {
      render(
        <MatchHistory
          matches={[matchWithRankingData]}
          players={[mockPlayer1, mockPlayer2, mockPlayer3, mockPlayer4]}
          onAddMatch={mockOnAddMatch}
        />,
      )

      // Check match details
      expect(screen.getByText('2024-01-15 at 14:30')).toBeInTheDocument()
      expect(screen.getByText('10 - 8')).toBeInTheDocument()
      expect(screen.getByText('🎉 Team 1 wins! Great game, friends!')).toBeInTheDocument()

      // Check player names
      expect(screen.getByText('Alice')).toBeInTheDocument()
      expect(screen.getByText('Bob')).toBeInTheDocument()
      expect(screen.getByText('Charlie')).toBeInTheDocument()
      expect(screen.getByText('Diana')).toBeInTheDocument()

      // Check pre-game team averages (both teams have same average by coincidence)
      expect(screen.getAllByText('Pre-Avg: 1250')).toHaveLength(2) // Team 1: (1200 + 1300) / 2 = 1250, Team 2: (1100 + 1400) / 2 = 1250
    })

    it('displays individual player ranking changes', () => {
      render(
        <MatchHistory
          matches={[matchWithRankingData]}
          players={[mockPlayer1, mockPlayer2, mockPlayer3, mockPlayer4]}
          onAddMatch={mockOnAddMatch}
        />,
      )

      // Check that post-game rankings and changes are displayed (no pre-game rankings)
      expect(screen.getByText('1220')).toBeInTheDocument() // Alice post-game
      expect(screen.getByText('+20')).toBeInTheDocument() // Alice change

      expect(screen.getByText('1318')).toBeInTheDocument() // Bob post-game
      expect(screen.getByText('+18')).toBeInTheDocument() // Bob change

      expect(screen.getByText('1085')).toBeInTheDocument() // Charlie post-game
      expect(screen.getByText('-15')).toBeInTheDocument() // Charlie change

      expect(screen.getByText('1377')).toBeInTheDocument() // Diana post-game
      expect(screen.getByText('-23')).toBeInTheDocument() // Diana change

      // Check that pre-game rankings and arrows are NOT displayed
      expect(screen.queryByText('1200')).not.toBeInTheDocument() // Alice pre-game
      expect(screen.queryByText('1300')).not.toBeInTheDocument() // Bob pre-game
      expect(screen.queryByText('1100')).not.toBeInTheDocument() // Charlie pre-game
      expect(screen.queryByText('1400')).not.toBeInTheDocument() // Diana pre-game
      expect(screen.queryByText('→')).not.toBeInTheDocument() // Arrow indicator
    })

    it('shows trending icons for ranking changes', () => {
      render(
        <MatchHistory
          matches={[matchWithRankingData]}
          players={[mockPlayer1, mockPlayer2, mockPlayer3, mockPlayer4]}
          onAddMatch={mockOnAddMatch}
        />,
      )

      // Check that trend icons are present (we can't test the actual icons, but we can check classes)
      const positiveChanges = screen.getAllByText(/^\+\d+$/)
      const negativeChanges = screen.getAllByText(/^-\d+$/)

      expect(positiveChanges).toHaveLength(2) // Alice and Bob gained points
      expect(negativeChanges).toHaveLength(2) // Charlie and Diana lost points
    })
  })

  describe('Legacy match without historical data', () => {
    const legacyMatch: Match = {
      id: 'match2',
      team1: [mockPlayer1, mockPlayer2],
      team2: [mockPlayer3, mockPlayer4],
      score1: 7,
      score2: 10,
      date: '2024-01-10',
      time: '16:45',
      groupId: 'group1',
      recordedBy: 'user1',
      createdAt: '2024-01-10T16:45:00Z',
      // No playerStats - legacy match
    }

    it('renders legacy match without historical data', () => {
      render(
        <MatchHistory
          matches={[legacyMatch]}
          players={[mockPlayer1, mockPlayer2, mockPlayer3, mockPlayer4]}
          onAddMatch={mockOnAddMatch}
        />,
      )

      // Check match details
      expect(screen.getByText('2024-01-10 at 16:45')).toBeInTheDocument()
      expect(screen.getByText('7 - 10')).toBeInTheDocument()
      expect(screen.getByText('🎉 Team 2 wins! Great game, friends!')).toBeInTheDocument()

      // Check that current averages are displayed (not pre-game averages)
      expect(screen.getAllByText(/^Avg: \d+$/)).toHaveLength(2)
      expect(screen.getByText('Avg: 1269')).toBeInTheDocument() // (1220 + 1318) / 2
      expect(screen.getByText('Avg: 1231')).toBeInTheDocument() // (1085 + 1377) / 2

      // Check that no ranking change data is displayed
      expect(screen.queryByText('→')).not.toBeInTheDocument()
      expect(screen.queryByText(/^\+\d+$/)).not.toBeInTheDocument()
      expect(screen.queryByText(/^-\d+$/)).not.toBeInTheDocument()
    })
  })

  describe('Multiple matches', () => {
    const matches: Match[] = [
      {
        id: 'match1',
        team1: [mockPlayer1, mockPlayer2],
        team2: [mockPlayer3, mockPlayer4],
        score1: 10,
        score2: 8,
        date: '2024-01-15',
        time: '14:30',
        groupId: 'group1',
        playerStats: [
          { playerId: 'player1', preGameRanking: 1200, postGameRanking: 1220 },
          { playerId: 'player2', preGameRanking: 1300, postGameRanking: 1318 },
          { playerId: 'player3', preGameRanking: 1100, postGameRanking: 1085 },
          { playerId: 'player4', preGameRanking: 1400, postGameRanking: 1377 },
        ],
      },
      {
        id: 'match2',
        team1: [mockPlayer3, mockPlayer4],
        team2: [mockPlayer1, mockPlayer2],
        score1: 5,
        score2: 10,
        date: '2024-01-10',
        time: '16:45',
        groupId: 'group1',
        // No playerStats - legacy match
      },
    ]

    it('renders multiple matches with mixed data types', () => {
      render(
        <MatchHistory
          matches={matches}
          players={[mockPlayer1, mockPlayer2, mockPlayer3, mockPlayer4]}
          onAddMatch={mockOnAddMatch}
        />,
      )

      // Check both matches are rendered
      expect(screen.getByText('2024-01-15 at 14:30')).toBeInTheDocument()
      expect(screen.getByText('2024-01-10 at 16:45')).toBeInTheDocument()
      expect(screen.getByText('10 - 8')).toBeInTheDocument()
      expect(screen.getByText('5 - 10')).toBeInTheDocument()

      // Check that both types of averages are displayed
      expect(screen.getAllByText(/Pre-Avg:/)).toHaveLength(2) // New match has 2 teams
      expect(screen.getAllByText(/^Avg:/)).toHaveLength(2) // Legacy match has 2 teams
    })
  })

  describe('Edge cases', () => {
    it('handles matches with zero ranking change', () => {
      const matchWithZeroChange: Match = {
        id: 'match1',
        team1: [mockPlayer1, mockPlayer2],
        team2: [mockPlayer3, mockPlayer4],
        score1: 10,
        score2: 10, // Tie
        date: '2024-01-15',
        time: '14:30',
        groupId: 'group1',
        playerStats: [
          { playerId: 'player1', preGameRanking: 1200, postGameRanking: 1200 },
          { playerId: 'player2', preGameRanking: 1300, postGameRanking: 1300 },
          { playerId: 'player3', preGameRanking: 1100, postGameRanking: 1100 },
          { playerId: 'player4', preGameRanking: 1400, postGameRanking: 1400 },
        ],
      }

      render(
        <MatchHistory
          matches={[matchWithZeroChange]}
          players={[mockPlayer1, mockPlayer2, mockPlayer3, mockPlayer4]}
          onAddMatch={mockOnAddMatch}
        />,
      )

      // Check that post-game rankings are displayed
      expect(screen.getByText('1200')).toBeInTheDocument() // Alice post-game
      expect(screen.getByText('1300')).toBeInTheDocument() // Bob post-game
      expect(screen.getByText('1100')).toBeInTheDocument() // Charlie post-game
      expect(screen.getByText('1400')).toBeInTheDocument() // Diana post-game

      // Check that zero changes are displayed
      expect(screen.getAllByText('0')).toHaveLength(4) // All players had no change

      // Check that tie game doesn't show winner
      expect(screen.queryByText(/wins!/)).not.toBeInTheDocument()
    })
  })

  describe('Position icons and labels', () => {
    const matchWithPositions: Match = {
      id: 'match1',
      team1: [mockPlayer1, mockPlayer2],
      team2: [mockPlayer3, mockPlayer4],
      score1: 10,
      score2: 8,
      date: '2024-01-15',
      time: '14:30',
      groupId: 'group1',
      playerStats: [
        { playerId: 'player1', preGameRanking: 1200, postGameRanking: 1220 },
        { playerId: 'player2', preGameRanking: 1300, postGameRanking: 1318 },
        { playerId: 'player3', preGameRanking: 1100, postGameRanking: 1085 },
        { playerId: 'player4', preGameRanking: 1400, postGameRanking: 1377 },
      ],
    }

    it('displays position icons for each player', () => {
      render(
        <MatchHistory
          matches={[matchWithPositions]}
          players={[mockPlayer1, mockPlayer2, mockPlayer3, mockPlayer4]}
          onAddMatch={mockOnAddMatch}
        />,
      )

      // Check for sword icons (attackers) - should have orange color
      const swordIcons = document.querySelectorAll('svg.text-orange-500')
      expect(swordIcons.length).toBe(2) // 2 attackers (one per team)

      // Check for shield icons (defenders) - should have blue color
      const shieldIcons = document.querySelectorAll('svg.text-blue-500')
      expect(shieldIcons.length).toBe(2) // 2 defenders (one per team)
    })

    it('shows correct position assignments in teams', () => {
      render(
        <MatchHistory
          matches={[matchWithPositions]}
          players={[mockPlayer1, mockPlayer2, mockPlayer3, mockPlayer4]}
          onAddMatch={mockOnAddMatch}
        />,
      )

      // Team 1: Alice (attacker), Bob (defender)
      // Team 2: Charlie (attacker), Diana (defender)

      // All player names should be visible
      expect(screen.getByText('Alice')).toBeInTheDocument()
      expect(screen.getByText('Bob')).toBeInTheDocument()
      expect(screen.getByText('Charlie')).toBeInTheDocument()
      expect(screen.getByText('Diana')).toBeInTheDocument()

      // Position icons should be present with players
      const playerElements = screen
        .getAllByRole('button')
        .filter(
          (button) =>
            button.textContent?.includes('Alice') ||
            button.textContent?.includes('Bob') ||
            button.textContent?.includes('Charlie') ||
            button.textContent?.includes('Diana'),
        )

      expect(playerElements).toHaveLength(4) // All 4 players
    })

    it('maintains position consistency across multiple matches', () => {
      const multipleMatches: Match[] = [
        matchWithPositions,
        {
          id: 'match2',
          team1: [mockPlayer3, mockPlayer1], // Charlie (attacker), Alice (defender)
          team2: [mockPlayer2, mockPlayer4], // Bob (attacker), Diana (defender)
          score1: 6,
          score2: 10,
          date: '2024-01-16',
          time: '15:30',
          groupId: 'group1',
        },
      ]

      render(
        <MatchHistory
          matches={multipleMatches}
          players={[mockPlayer1, mockPlayer2, mockPlayer3, mockPlayer4]}
          onAddMatch={mockOnAddMatch}
        />,
      )

      // Should have 4 attackers (2 per match) and 4 defenders (2 per match)
      const swordIcons = document.querySelectorAll('svg.text-orange-500')
      expect(swordIcons.length).toBe(4) // 4 attackers total

      const shieldIcons = document.querySelectorAll('svg.text-blue-500')
      expect(shieldIcons.length).toBe(4) // 4 defenders total
    })

    it('handles player click events with position context', async () => {
      const mockOnPlayerClick = vi.fn()
      const user = userEvent.setup()

      render(
        <MatchHistory
          matches={[matchWithPositions]}
          players={[mockPlayer1, mockPlayer2, mockPlayer3, mockPlayer4]}
          onAddMatch={mockOnAddMatch}
          onPlayerClick={mockOnPlayerClick}
        />,
      )

      // Click on Alice (should be first player button)
      const aliceButton = screen.getByRole('button', { name: /alice/i })
      await user.click(aliceButton)

      expect(mockOnPlayerClick).toHaveBeenCalledWith('player1')
    })
  })
})
