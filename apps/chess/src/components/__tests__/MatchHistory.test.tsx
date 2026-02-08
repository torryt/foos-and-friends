import type { Match, Player } from '@foos/shared'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { render, screen } from '@/test/test-utils'
import MatchHistory from '../MatchHistory'

// Mock the SeasonContext
vi.mock('@/contexts/SeasonContext', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    useSeasonContext: () => ({
      currentSeason: {
        id: 'season1',
        name: 'Season 1',
        startDate: '2024-01-01',
        endDate: null,
        isActive: true,
        seasonNumber: 1,
      },
      seasons: [],
      loading: false,
      error: null,
      switchSeason: vi.fn(),
      refreshSeasons: vi.fn(),
      endSeasonAndCreateNew: vi.fn(),
    }),
  }
})

describe('MatchHistory', () => {
  const mockOnAddMatch = vi.fn()

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

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Empty state', () => {
    it('renders empty state when no matches provided', () => {
      render(<MatchHistory matches={[]} players={[]} onAddMatch={mockOnAddMatch} />)

      expect(screen.getByText('Recent Games')).toBeInTheDocument()
      expect(
        screen.getByText('No games recorded yet. Tap + to record your first chess match!'),
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

  describe('1v1 match with historical data', () => {
    const matchWithRankingData: Match = {
      id: 'match1',
      matchType: '1v1',
      team1: [mockPlayer1, null],
      team2: [mockPlayer2, null],
      score1: 3,
      score2: 1,
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
      ],
    }

    it('renders 1v1 match with historical ranking data', () => {
      render(
        <MatchHistory
          matches={[matchWithRankingData]}
          players={[mockPlayer1, mockPlayer2]}
          onAddMatch={mockOnAddMatch}
        />,
      )

      // Check match details
      expect(screen.getByText('2024-01-15 at 14:30')).toBeInTheDocument()

      // Check player names
      expect(screen.getByText('Alice')).toBeInTheDocument()
      expect(screen.getByText('Bob')).toBeInTheDocument()

      // Check winner/loser labels (Alice won since score1 > score2)
      expect(screen.getByText('Winner')).toBeInTheDocument()
      expect(screen.getByText('Black ♚')).toBeInTheDocument()
    })

    it('displays individual player ranking changes', () => {
      render(
        <MatchHistory
          matches={[matchWithRankingData]}
          players={[mockPlayer1, mockPlayer2]}
          onAddMatch={mockOnAddMatch}
        />,
      )

      // Check that post-game rankings and changes are displayed
      expect(screen.getByText('1220')).toBeInTheDocument() // Alice post-game
      expect(screen.getByText('+20')).toBeInTheDocument() // Alice change

      expect(screen.getByText('1318')).toBeInTheDocument() // Bob post-game
      expect(screen.getByText('+18')).toBeInTheDocument() // Bob change
    })

    it('shows trending icons for ranking changes', () => {
      render(
        <MatchHistory
          matches={[matchWithRankingData]}
          players={[mockPlayer1, mockPlayer2]}
          onAddMatch={mockOnAddMatch}
        />,
      )

      const positiveChanges = screen.getAllByText(/^\+\d+$/)
      expect(positiveChanges).toHaveLength(2)
    })
  })

  describe('Legacy match without historical data', () => {
    const legacyMatch: Match = {
      id: 'match2',
      matchType: '1v1',
      team1: [mockPlayer1, null],
      team2: [mockPlayer2, null],
      score1: 1,
      score2: 3,
      date: '2024-01-10',
      time: '16:45',
      groupId: 'group1',
      recordedBy: 'user1',
      createdAt: '2024-01-10T16:45:00Z',
    }

    it('renders legacy match without historical data', () => {
      render(
        <MatchHistory
          matches={[legacyMatch]}
          players={[mockPlayer1, mockPlayer2]}
          onAddMatch={mockOnAddMatch}
        />,
      )

      // Check match details
      expect(screen.getByText('2024-01-10 at 16:45')).toBeInTheDocument()

      // Check winner label (Bob won since score2 > score1)
      expect(screen.getByText('Winner')).toBeInTheDocument()
      expect(screen.getByText('White ♔')).toBeInTheDocument()

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
        matchType: '1v1',
        team1: [mockPlayer1, null],
        team2: [mockPlayer2, null],
        score1: 3,
        score2: 1,
        date: '2024-01-15',
        time: '14:30',
        groupId: 'group1',
        playerStats: [
          { playerId: 'player1', preGameRanking: 1200, postGameRanking: 1220 },
          { playerId: 'player2', preGameRanking: 1300, postGameRanking: 1282 },
        ],
      },
      {
        id: 'match2',
        matchType: '1v1',
        team1: [mockPlayer2, null],
        team2: [mockPlayer1, null],
        score1: 2,
        score2: 3,
        date: '2024-01-10',
        time: '16:45',
        groupId: 'group1',
      },
    ]

    it('renders multiple 1v1 matches', () => {
      render(
        <MatchHistory
          matches={matches}
          players={[mockPlayer1, mockPlayer2]}
          onAddMatch={mockOnAddMatch}
        />,
      )

      // Check both matches are rendered
      expect(screen.getByText('2024-01-15 at 14:30')).toBeInTheDocument()
      expect(screen.getByText('2024-01-10 at 16:45')).toBeInTheDocument()

      // Check winner labels are shown
      const winners = screen.getAllByText('Winner')
      expect(winners).toHaveLength(2)
    })
  })

  describe('Edge cases', () => {
    it('handles matches with zero ranking change', () => {
      const matchWithZeroChange: Match = {
        id: 'match1',
        matchType: '1v1',
        team1: [mockPlayer1, null],
        team2: [mockPlayer2, null],
        score1: 1,
        score2: 0,
        date: '2024-01-15',
        time: '14:30',
        groupId: 'group1',
        playerStats: [
          { playerId: 'player1', preGameRanking: 1200, postGameRanking: 1200 },
          { playerId: 'player2', preGameRanking: 1300, postGameRanking: 1300 },
        ],
      }

      render(
        <MatchHistory
          matches={[matchWithZeroChange]}
          players={[mockPlayer1, mockPlayer2]}
          onAddMatch={mockOnAddMatch}
        />,
      )

      // Check that post-game rankings are displayed
      expect(screen.getByText('1200')).toBeInTheDocument()
      expect(screen.getByText('1300')).toBeInTheDocument()

      // Check that zero changes are displayed
      expect(screen.getAllByText('0')).toHaveLength(2)

      // Winner label should be shown
      expect(screen.getByText('Winner')).toBeInTheDocument()
    })
  })

  describe('Player interactions', () => {
    const match: Match = {
      id: 'match1',
      matchType: '1v1',
      team1: [mockPlayer1, null],
      team2: [mockPlayer2, null],
      score1: 3,
      score2: 1,
      date: '2024-01-15',
      time: '14:30',
      groupId: 'group1',
      playerStats: [
        { playerId: 'player1', preGameRanking: 1200, postGameRanking: 1220 },
        { playerId: 'player2', preGameRanking: 1300, postGameRanking: 1282 },
      ],
    }

    it('handles player click events', async () => {
      const mockOnPlayerClick = vi.fn()
      const user = userEvent.setup()

      render(
        <MatchHistory
          matches={[match]}
          players={[mockPlayer1, mockPlayer2]}
          onAddMatch={mockOnAddMatch}
          onPlayerClick={mockOnPlayerClick}
        />,
      )

      // Click on Alice
      const aliceButton = screen.getByRole('button', { name: /alice/i })
      await user.click(aliceButton)

      expect(mockOnPlayerClick).toHaveBeenCalledWith('player1')
    })
  })
})
