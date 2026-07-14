import type { Match, Player } from '@foos/shared'
import { fireEvent, render, screen } from '@testing-library/react'
import PlayerRankings, { computeAllPlayerMatchStats } from '../PlayerRankings'

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

  describe('players without games', () => {
    const playersWithInactive: Player[] = [
      ...mockPlayers,
      {
        id: '4',
        name: 'Dana White',
        ranking: 1200,
        matchesPlayed: 0,
        wins: 0,
        losses: 0,
        avatar: '🧑‍🚀',
        department: 'Marketing',
      },
    ]

    test('hides players with no games by default', () => {
      render(<PlayerRankings players={playersWithInactive} />)

      expect(screen.queryByText('Dana White')).not.toBeInTheDocument()
      expect(screen.getByText('Show 1 player without games')).toBeInTheDocument()
    })

    test('reveals players with no games when the footer button is clicked', () => {
      render(<PlayerRankings players={playersWithInactive} />)

      fireEvent.click(screen.getByText('Show 1 player without games'))

      expect(screen.getByText('Dana White')).toBeInTheDocument()
      expect(screen.getByText('Hide players without games')).toBeInTheDocument()
    })

    test('hides them again when toggled back', () => {
      render(<PlayerRankings players={playersWithInactive} />)

      fireEvent.click(screen.getByText('Show 1 player without games'))
      fireEvent.click(screen.getByText('Hide players without games'))

      expect(screen.queryByText('Dana White')).not.toBeInTheDocument()
    })

    test('hides players with no games in the selected season', () => {
      render(
        <PlayerRankings
          players={playersWithInactive}
          seasonStats={[
            {
              id: 'stat-1',
              playerId: '1',
              seasonId: 's1',
              ranking: 1300,
              matchesPlayed: 5,
              wins: 3,
              losses: 2,
              goalsFor: 25,
              goalsAgainst: 20,
              createdAt: '2026-01-01T00:00:00Z',
              updatedAt: '2026-01-01T00:00:00Z',
            },
          ]}
        />,
      )

      // Only Alice has games this season; everyone else is hidden
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
      expect(screen.queryByText('Bob Smith')).not.toBeInTheDocument()
      expect(screen.queryByText('Charlie Brown')).not.toBeInTheDocument()
      expect(screen.getByText('Show 3 players without games')).toBeInTheDocument()
    })

    test('shows no footer button when all players have games', () => {
      render(<PlayerRankings players={mockPlayers} />)

      expect(screen.queryByText(/without games/)).not.toBeInTheDocument()
    })
  })

  describe('sorting by streaks', () => {
    // Alice (id 1) vs Bob (id 2), oldest to newest: L, W, W, W, L
    // -> Alice: longest win streak 3, longest lose streak 1
    // -> Bob (inverse results): longest win streak 1, longest lose streak 3
    const streakMatches: Match[] = [
      {
        id: 'm5',
        matchType: '1v1',
        team1: [mockPlayers[0], null],
        team2: [mockPlayers[1], null],
        score1: 5,
        score2: 10,
        date: '2024-01-05',
        time: '10:00',
      },
      {
        id: 'm4',
        matchType: '1v1',
        team1: [mockPlayers[0], null],
        team2: [mockPlayers[1], null],
        score1: 10,
        score2: 5,
        date: '2024-01-04',
        time: '10:00',
      },
      {
        id: 'm3',
        matchType: '1v1',
        team1: [mockPlayers[0], null],
        team2: [mockPlayers[1], null],
        score1: 10,
        score2: 5,
        date: '2024-01-03',
        time: '10:00',
      },
      {
        id: 'm2',
        matchType: '1v1',
        team1: [mockPlayers[0], null],
        team2: [mockPlayers[1], null],
        score1: 10,
        score2: 5,
        date: '2024-01-02',
        time: '10:00',
      },
      {
        id: 'm1',
        matchType: '1v1',
        team1: [mockPlayers[0], null],
        team2: [mockPlayers[1], null],
        score1: 5,
        score2: 10,
        date: '2024-01-01',
        time: '10:00',
      },
    ]

    test('sorts players by longest win streak', () => {
      const { container } = render(
        <PlayerRankings players={mockPlayers} matches={streakMatches} sortBy="longestWinStreak" />,
      )

      const playerNames = screen.getAllByText(/Alice Johnson|Bob Smith|Charlie Brown/)
      expect(playerNames[0]).toHaveTextContent('Alice Johnson')
      expect(playerNames[1]).toHaveTextContent('Bob Smith')
      expect(playerNames[2]).toHaveTextContent('Charlie Brown')

      const badges = container.querySelectorAll('.rounded-full')
      expect(badges[0]).toHaveTextContent('3')
      expect(badges[1]).toHaveTextContent('1')
      expect(badges[2]).toHaveTextContent('0')
    })

    test('sorts players by longest lose streak', () => {
      const { container } = render(
        <PlayerRankings players={mockPlayers} matches={streakMatches} sortBy="longestLoseStreak" />,
      )

      const playerNames = screen.getAllByText(/Alice Johnson|Bob Smith|Charlie Brown/)
      expect(playerNames[0]).toHaveTextContent('Bob Smith')
      expect(playerNames[1]).toHaveTextContent('Alice Johnson')
      expect(playerNames[2]).toHaveTextContent('Charlie Brown')

      const badges = container.querySelectorAll('.rounded-full')
      expect(badges[0]).toHaveTextContent('3')
      expect(badges[1]).toHaveTextContent('1')
      expect(badges[2]).toHaveTextContent('0')
    })
  })
})

// Reference implementation matching the old per-player computeStreaks +
// per-player goal-difference reduction this helper replaces, so we can
// verify the single O(matches) pass produces identical results.
const referenceStreaksAndGoalDiff = (
  playerId: string,
  matches: Match[],
): { longestWinStreak: number; longestLoseStreak: number; goalDifference: number } => {
  const playerMatches = matches
    .filter(
      (match) =>
        match.team1[0].id === playerId ||
        match.team1[1]?.id === playerId ||
        match.team2[0].id === playerId ||
        match.team2[1]?.id === playerId,
    )
    .toReversed() // oldest first

  let longestWinStreak = 0
  let longestLoseStreak = 0
  let currentWinStreak = 0
  let currentLoseStreak = 0
  let goalDifference = 0

  for (const match of playerMatches) {
    const wasInTeam1 = match.team1[0].id === playerId || match.team1[1]?.id === playerId
    const playerScore = wasInTeam1 ? match.score1 : match.score2
    const opponentScore = wasInTeam1 ? match.score2 : match.score1
    goalDifference += playerScore - opponentScore

    if (playerScore > opponentScore) {
      currentWinStreak += 1
      currentLoseStreak = 0
    } else if (playerScore < opponentScore) {
      currentLoseStreak += 1
      currentWinStreak = 0
    } else {
      currentWinStreak = 0
      currentLoseStreak = 0
    }

    longestWinStreak = Math.max(longestWinStreak, currentWinStreak)
    longestLoseStreak = Math.max(longestLoseStreak, currentLoseStreak)
  }

  return { longestWinStreak, longestLoseStreak, goalDifference }
}

const asPlayer = (id: string): Player => ({
  id,
  name: id,
  ranking: 1200,
  matchesPlayed: 0,
  wins: 0,
  losses: 0,
  avatar: '🙂',
  department: '',
})

describe('computeAllPlayerMatchStats', () => {
  const playerIds = ['p1', 'p2', 'p3', 'p4', 'p5']

  // 30 synthetic matches across a mix of 1v1 and 2v2, with varied scores
  // (including draws) so streaks reset in different ways per player.
  const syntheticMatches: Match[] = Array.from({ length: 30 }, (_, i): Match => {
    const isDoubles = i % 3 === 0
    const a = playerIds[i % playerIds.length]
    const b = playerIds[(i + 1) % playerIds.length]
    const c = playerIds[(i + 2) % playerIds.length]
    const d = playerIds[(i + 3) % playerIds.length]
    const score1 = (i * 7) % 11
    const score2 = (i * 3 + 2) % 11

    return {
      id: `synthetic-${i}`,
      matchType: isDoubles ? '2v2' : '1v1',
      team1: [asPlayer(a), isDoubles ? asPlayer(b) : null],
      team2: isDoubles ? [asPlayer(c), asPlayer(d)] : [asPlayer(b), null],
      score1,
      score2,
      date: `2024-02-${String((i % 28) + 1).padStart(2, '0')}`,
      time: '10:00',
    }
  })

  test('matches the old per-player computation for every player', () => {
    const statsById = computeAllPlayerMatchStats(syntheticMatches)

    for (const playerId of playerIds) {
      const expected = referenceStreaksAndGoalDiff(playerId, syntheticMatches)
      const actual = statsById.get(playerId)

      expect(actual).toBeDefined()
      expect(actual?.longestWinStreak).toBe(expected.longestWinStreak)
      expect(actual?.longestLoseStreak).toBe(expected.longestLoseStreak)
      expect(actual?.goalDifference).toBe(expected.goalDifference)
    }
  })
})
