import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Match, Player } from '@/types'
import { PlayerRelationshipStats } from '../player-profile/PlayerRelationshipStats'

// Mock the useRelationshipStats hook
vi.mock('@/hooks/useRelationshipStats', () => ({
  useRelationshipStats: vi.fn(),
}))

// Mock TanStack Router
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, params, onClick, className }: any) => (
    <a href={`${to}/${params?.playerId || ''}`} onClick={onClick} className={className}>
      {children}
    </a>
  ),
}))

const mockPlayers: Player[] = [
  {
    id: 'player1',
    name: 'Alice',
    avatar: '👩',
    ranking: 1200,
    matchesPlayed: 0,
    wins: 0,
    losses: 0,
    department: 'Engineering',
    createdAt: '2024-01-01',
    groupId: 'group1',
  },
  {
    id: 'player2',
    name: 'Bob',
    avatar: '👨',
    ranking: 1300,
    matchesPlayed: 0,
    wins: 0,
    losses: 0,
    department: 'Engineering',
    createdAt: '2024-01-01',
    groupId: 'group1',
  },
  {
    id: 'player3',
    name: 'Charlie',
    avatar: '👦',
    ranking: 1100,
    matchesPlayed: 0,
    wins: 0,
    losses: 0,
    department: 'Engineering',
    createdAt: '2024-01-01',
    groupId: 'group1',
  },
]

const mockMatches: Match[] = []

const createMockRelationshipData = () => ({
  teammates: [
    {
      playerId: 'player2',
      playerName: 'Bob',
      playerAvatar: '👨',
      gamesPlayed: 5,
      wins: 3,
      losses: 2,
      winRate: 60,
      goalDifference: 4,
      recentForm: ['W', 'L', 'W', 'W', 'L'] as ('W' | 'L')[],
    },
    {
      playerId: 'player3',
      playerName: 'Charlie',
      playerAvatar: '👦',
      gamesPlayed: 3,
      wins: 3,
      losses: 0,
      winRate: 100,
      goalDifference: 8,
      recentForm: ['W', 'W', 'W'] as ('W' | 'L')[],
    },
  ],
  opponents: [
    {
      playerId: 'player2',
      playerName: 'Bob',
      playerAvatar: '👨',
      gamesPlayed: 4,
      wins: 2,
      losses: 2,
      winRate: 50,
      goalDifference: -1,
      recentForm: ['W', 'L', 'W', 'L'] as ('W' | 'L')[],
    },
  ],
  topTeammate: {
    playerId: 'player3',
    playerName: 'Charlie',
    playerAvatar: '👦',
    gamesPlayed: 3,
    wins: 3,
    losses: 0,
    winRate: 100,
    goalDifference: 8,
    recentForm: ['W', 'W', 'W'] as ('W' | 'L')[],
  },
  worstTeammate: null,
  biggestRival: {
    playerId: 'player2',
    playerName: 'Bob',
    playerAvatar: '👨',
    gamesPlayed: 4,
    wins: 2,
    losses: 2,
    winRate: 50,
    goalDifference: -1,
    recentForm: ['W', 'L', 'W', 'L'] as ('W' | 'L')[],
  },
  easiestOpponent: null,
})

describe('PlayerRelationshipStats', () => {
  beforeEach(() => {
    // Reset the mock before each test
    vi.clearAllMocks()
  })

  it('should render empty state when no relationships exist', async () => {
    const { useRelationshipStats } = vi.mocked(await import('@/hooks/useRelationshipStats'))
    useRelationshipStats.mockReturnValue({
      teammates: [],
      opponents: [],
      topTeammate: null,
      worstTeammate: null,
      biggestRival: null,
      easiestOpponent: null,
    })

    render(
      <PlayerRelationshipStats playerId="player1" players={mockPlayers} matches={mockMatches} />,
    )

    expect(screen.getByText('No match history available')).toBeInTheDocument()
  })

  it('should render teammates tab by default', async () => {
    const { useRelationshipStats } = vi.mocked(await import('@/hooks/useRelationshipStats'))
    useRelationshipStats.mockReturnValue(createMockRelationshipData())

    render(
      <PlayerRelationshipStats playerId="player1" players={mockPlayers} matches={mockMatches} />,
    )

    expect(screen.getByText('Teammates (2)')).toBeInTheDocument()
    expect(screen.getByText('Opponents (1)')).toBeInTheDocument()
    expect(screen.getAllByText('Bob')).toHaveLength(2) // Bob appears as teammate and in summary
    expect(screen.getAllByText('Charlie')).toHaveLength(2) // Charlie appears as teammate and in summary
  })

  it('should switch to opponents tab when clicked', async () => {
    const { useRelationshipStats } = vi.mocked(await import('@/hooks/useRelationshipStats'))
    useRelationshipStats.mockReturnValue(createMockRelationshipData())

    render(
      <PlayerRelationshipStats playerId="player1" players={mockPlayers} matches={mockMatches} />,
    )

    fireEvent.click(screen.getByText('Opponents (1)'))

    // Should show opponents content
    expect(screen.getAllByText('Bob')).toHaveLength(2) // Bob appears as opponent and in summary
  })

  it('should display teammate stats correctly', async () => {
    const { useRelationshipStats } = vi.mocked(await import('@/hooks/useRelationshipStats'))
    useRelationshipStats.mockReturnValue(createMockRelationshipData())

    render(
      <PlayerRelationshipStats playerId="player1" players={mockPlayers} matches={mockMatches} />,
    )

    // Check Bob's stats
    expect(screen.getByText('5 games')).toBeInTheDocument()
    expect(screen.getByText('3W-2L')).toBeInTheDocument()
    expect(screen.getByText('60%')).toBeInTheDocument()
    expect(screen.getByText('+4')).toBeInTheDocument()

    // Check Charlie's stats
    expect(screen.getByText('3 games')).toBeInTheDocument()
    expect(screen.getByText('3W-0L')).toBeInTheDocument()
    expect(screen.getByText('100%')).toBeInTheDocument()
    expect(screen.getByText('+8')).toBeInTheDocument()
  })

  it('should display recent form indicators', async () => {
    const { useRelationshipStats } = vi.mocked(await import('@/hooks/useRelationshipStats'))
    useRelationshipStats.mockReturnValue(createMockRelationshipData())

    render(
      <PlayerRelationshipStats playerId="player1" players={mockPlayers} matches={mockMatches} />,
    )

    // Check that recent form circles are rendered
    const winCircles = screen.getAllByText('W')
    const lossCircles = screen.getAllByText('L')

    expect(winCircles.length).toBeGreaterThan(0)
    expect(lossCircles.length).toBeGreaterThan(0)
  })

  it('should display top teammate badge', async () => {
    const { useRelationshipStats } = vi.mocked(await import('@/hooks/useRelationshipStats'))
    useRelationshipStats.mockReturnValue(createMockRelationshipData())

    render(
      <PlayerRelationshipStats playerId="player1" players={mockPlayers} matches={mockMatches} />,
    )

    expect(screen.getByText('Best Partner')).toBeInTheDocument()
  })

  it('should display biggest rival badge in opponents tab', async () => {
    const { useRelationshipStats } = vi.mocked(await import('@/hooks/useRelationshipStats'))
    useRelationshipStats.mockReturnValue(createMockRelationshipData())

    render(
      <PlayerRelationshipStats playerId="player1" players={mockPlayers} matches={mockMatches} />,
    )

    fireEvent.click(screen.getByText('Opponents (1)'))
    expect(screen.getByText('Biggest Rival')).toBeInTheDocument()
  })

  it('should display summary stats at the bottom', async () => {
    const { useRelationshipStats } = vi.mocked(await import('@/hooks/useRelationshipStats'))
    useRelationshipStats.mockReturnValue(createMockRelationshipData())

    render(
      <PlayerRelationshipStats playerId="player1" players={mockPlayers} matches={mockMatches} />,
    )

    // Check summary stats components separately due to responsive text layout
    expect(screen.getAllByText('Charlie')).toHaveLength(2) // Teammate and summary
    expect(screen.getByText(': 100%')).toBeInTheDocument()
    expect(screen.getByText(': 4')).toBeInTheDocument()
  })

  it('should show expand/collapse button when more than 5 teammates', async () => {
    const { useRelationshipStats } = vi.mocked(await import('@/hooks/useRelationshipStats'))

    const manyTeammates = Array.from({ length: 7 }, (_, i) => ({
      playerId: `player${i + 2}`,
      playerName: `Player ${i + 2}`,
      playerAvatar: '👤',
      gamesPlayed: i + 1,
      wins: i,
      losses: 1,
      winRate: Math.round((i / (i + 1)) * 100),
      goalDifference: 0,
      recentForm: ['W'] as ('W' | 'L')[],
    }))

    useRelationshipStats.mockReturnValue({
      teammates: manyTeammates,
      opponents: [],
      topTeammate: null,
      worstTeammate: null,
      biggestRival: null,
      easiestOpponent: null,
    })

    render(
      <PlayerRelationshipStats playerId="player1" players={mockPlayers} matches={mockMatches} />,
    )

    expect(screen.getByText('Show All 7 Teammates')).toBeInTheDocument()
  })

  it('should expand teammates list when expand button is clicked', async () => {
    const { useRelationshipStats } = vi.mocked(await import('@/hooks/useRelationshipStats'))

    const manyTeammates = Array.from({ length: 7 }, (_, i) => ({
      playerId: `player${i + 2}`,
      playerName: `Player ${i + 2}`,
      playerAvatar: '👤',
      gamesPlayed: i + 1,
      wins: i,
      losses: 1,
      winRate: Math.round((i / (i + 1)) * 100),
      goalDifference: 0,
      recentForm: ['W'] as ('W' | 'L')[],
    }))

    useRelationshipStats.mockReturnValue({
      teammates: manyTeammates,
      opponents: [],
      topTeammate: null,
      worstTeammate: null,
      biggestRival: null,
      easiestOpponent: null,
    })

    render(
      <PlayerRelationshipStats playerId="player1" players={mockPlayers} matches={mockMatches} />,
    )

    // Initially should show first 5
    expect(screen.queryByText('Player 7')).not.toBeInTheDocument()

    // Click expand
    fireEvent.click(screen.getByText('Show All 7 Teammates'))

    // Now should show all 7
    expect(screen.getByText('Player 7')).toBeInTheDocument()
    expect(screen.getByText('Show Less')).toBeInTheDocument()
  })

  it('should display ranking numbers for relationships', async () => {
    const { useRelationshipStats } = vi.mocked(await import('@/hooks/useRelationshipStats'))
    useRelationshipStats.mockReturnValue(createMockRelationshipData())

    render(
      <PlayerRelationshipStats playerId="player1" players={mockPlayers} matches={mockMatches} />,
    )

    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('should handle negative goal difference correctly', async () => {
    const { useRelationshipStats } = vi.mocked(await import('@/hooks/useRelationshipStats'))

    const dataWithNegativeGoalDiff = {
      ...createMockRelationshipData(),
      teammates: [
        {
          playerId: 'player2',
          playerName: 'Bob',
          playerAvatar: '👨',
          gamesPlayed: 3,
          wins: 1,
          losses: 2,
          winRate: 33,
          goalDifference: -5,
          recentForm: ['L', 'L', 'W'] as ('W' | 'L')[],
        },
      ],
    }

    useRelationshipStats.mockReturnValue(dataWithNegativeGoalDiff)

    render(
      <PlayerRelationshipStats playerId="player1" players={mockPlayers} matches={mockMatches} />,
    )

    expect(screen.getByText('-5')).toBeInTheDocument()
  })
})
