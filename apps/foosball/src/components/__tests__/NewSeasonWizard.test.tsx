import type { Season } from '@foos/shared'
// Plain RTL render (no provider wrapper): both context hooks are mocked below,
// and the real providers would pull unmocked services from @/lib/init.
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { NewSeasonWizard } from '../NewSeasonWizard'

const activeSeason: Season = {
  id: 'season2',
  groupId: 'group1',
  name: 'Season 2',
  seasonNumber: 2,
  startDate: '2024-03-01',
  endDate: null,
  isActive: true,
  createdAt: '2024-03-01T00:00:00Z',
  updatedAt: '2024-03-01T00:00:00Z',
} as Season

const archivedSeason: Season = {
  id: 'season1',
  groupId: 'group1',
  name: 'Season 1',
  seasonNumber: 1,
  startDate: '2024-01-01',
  endDate: '2024-02-28',
  isActive: false,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-02-28T00:00:00Z',
} as Season

const mockEndSeasonAndCreateNew = vi.fn()

// Stable object identities — the wizard depends on these in useEffect,
// so returning fresh objects per render would loop forever.
const mockGroup = { id: 'group1', name: 'Test Group', isOwner: true }
const mockSeasons = [activeSeason, archivedSeason]

vi.mock('@/contexts/GroupContext', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    useGroupContext: () => ({
      currentGroup: mockGroup,
      userGroups: [],
    }),
  }
})

vi.mock('@/contexts/SeasonContext', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    useSeasonContext: () => ({
      currentSeason: activeSeason,
      seasons: mockSeasons,
      loading: false,
      error: null,
      switchSeason: vi.fn(),
      refreshSeasons: vi.fn(),
      endSeasonAndCreateNew: mockEndSeasonAndCreateNew,
    }),
  }
})

vi.mock('@/lib/init', () => ({
  matchesService: {
    getMatchesByGroup: vi.fn().mockResolvedValue({ data: [] }),
    getMatchesBySeason: vi
      .fn()
      .mockResolvedValue({ data: [{ id: 'm1' }, { id: 'm2' }, { id: 'm3' }] }),
  },
  playersService: {
    getPlayersByGroup: vi.fn().mockResolvedValue({
      data: [{ id: 'player1', name: 'Alice' }],
    }),
  },
  playerSeasonStatsService: {
    getSeasonLeaderboard: vi.fn().mockResolvedValue({
      data: [
        { playerId: 'player1', ranking: 1350 },
        { playerId: 'player2', ranking: 1200 },
      ],
    }),
  },
}))

describe('NewSeasonWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('starts on the consequences step with live season facts', async () => {
    render(<NewSeasonWizard onClose={vi.fn()} onDone={vi.fn()} />)

    expect(screen.getByText('Start a new season?')).toBeInTheDocument()
    expect(screen.getByText('Season 2 ends today')).toBeInTheDocument()
    expect(screen.getByText('All rankings reset to 1200')).toBeInTheDocument()

    // Loaded async: match count and season leader
    await waitFor(() => {
      expect(screen.getByText(/3 matches/)).toBeInTheDocument()
      expect(screen.getByText('Alice is crowned champion')).toBeInTheDocument()
    })
  })

  it('prefills the next season name on the naming step', async () => {
    const user = userEvent.setup()
    render(<NewSeasonWizard onClose={vi.fn()} onDone={vi.fn()} />)

    await user.click(screen.getByText('Continue'))

    expect(screen.getByLabelText(/season name/i)).toHaveValue('Season 3')
  })

  it('requires a confirm step and calls endSeasonAndCreateNew on confirm', async () => {
    mockEndSeasonAndCreateNew.mockResolvedValue({ success: true })
    const user = userEvent.setup()
    const onDone = vi.fn()
    render(<NewSeasonWizard onClose={vi.fn()} onDone={onDone} />)

    await user.click(screen.getByText('Continue')) // -> name step
    const description = screen.getByLabelText(/description/i)
    await user.type(description, 'Summer showdown')
    await user.click(screen.getByText('Continue')) // -> confirm step

    // Nothing has been submitted yet
    expect(mockEndSeasonAndCreateNew).not.toHaveBeenCalled()
    expect(screen.getByText(/can't be undone/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /end season 2 & start season 3/i }))

    await waitFor(() => {
      expect(mockEndSeasonAndCreateNew).toHaveBeenCalledWith('Season 3', 'Summer showdown')
      expect(onDone).toHaveBeenCalled()
    })
  })

  it('shows the error and stays open when creation fails', async () => {
    mockEndSeasonAndCreateNew.mockResolvedValue({ success: false, error: 'Nope' })
    const user = userEvent.setup()
    const onDone = vi.fn()
    render(<NewSeasonWizard onClose={vi.fn()} onDone={onDone} />)

    await user.click(screen.getByText('Continue'))
    await user.click(screen.getByText('Continue'))
    await user.click(screen.getByRole('button', { name: /end season 2/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Nope')
    })
    expect(onDone).not.toHaveBeenCalled()
  })

  it('cannot continue from the naming step with an empty name', async () => {
    const user = userEvent.setup()
    render(<NewSeasonWizard onClose={vi.fn()} onDone={vi.fn()} />)

    await user.click(screen.getByText('Continue'))
    await user.clear(screen.getByLabelText(/season name/i))

    expect(screen.getByText('Continue')).toBeDisabled()
  })
})
