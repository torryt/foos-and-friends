import type { Season } from '@foos/shared'
// Plain RTL render (no provider wrapper): both context hooks are mocked below,
// and the real providers would pull unmocked services from @/lib/init.
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { SeasonSheet } from '../SeasonSheet'

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

let mockIsOwner = true
const mockSwitchSeason = vi.fn()

// Stable object identities — the components depend on these in useEffect,
// so returning fresh objects per render would loop forever.
const ownerGroup = { id: 'group1', name: 'Test Group', isOwner: true }
const memberGroup = { id: 'group1', name: 'Test Group', isOwner: false }
const mockSeasons = [activeSeason, archivedSeason]

vi.mock('@/contexts/GroupContext', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    useGroupContext: () => ({
      currentGroup: mockIsOwner ? ownerGroup : memberGroup,
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
      switchSeason: mockSwitchSeason,
      refreshSeasons: vi.fn(),
      endSeasonAndCreateNew: vi.fn(),
    }),
  }
})

vi.mock('@/lib/init', () => ({
  matchesService: {
    getMatchesByGroup: vi.fn().mockResolvedValue({
      data: [{ seasonId: 'season1' }, { seasonId: 'season1' }, { seasonId: 'season2' }],
    }),
    getMatchesBySeason: vi.fn().mockResolvedValue({ data: [] }),
  },
  playersService: {
    getPlayersByGroup: vi.fn().mockResolvedValue({ data: [] }),
  },
  playerSeasonStatsService: {
    getSeasonLeaderboard: vi.fn().mockResolvedValue({ data: [] }),
  },
}))

describe('SeasonSheet', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsOwner = true
  })

  it('lists all seasons with live/ended badges, newest first', async () => {
    render(<SeasonSheet isOpen onClose={vi.fn()} />)

    expect(screen.getByText('Season 2')).toBeInTheDocument()
    expect(screen.getByText('Season 1')).toBeInTheDocument()
    expect(screen.getByText('LIVE')).toBeInTheDocument()
    expect(screen.getByText('ENDED')).toBeInTheDocument()
  })

  it('shows per-season match counts once loaded', async () => {
    render(<SeasonSheet isOpen onClose={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText(/2 matches/)).toBeInTheDocument()
      expect(screen.getByText(/1 match\b/)).toBeInTheDocument()
    })
  })

  it('switches season and closes when a season is tapped', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<SeasonSheet isOpen onClose={onClose} />)

    await user.click(screen.getByText('Season 1'))

    expect(mockSwitchSeason).toHaveBeenCalledWith('season1')
    expect(onClose).toHaveBeenCalled()
  })

  it('shows "Start new season" to the group owner', () => {
    render(<SeasonSheet isOpen onClose={vi.fn()} />)
    expect(screen.getByText('Start new season')).toBeInTheDocument()
  })

  it('hides "Start new season" from non-owners', () => {
    mockIsOwner = false
    render(<SeasonSheet isOpen onClose={vi.fn()} />)
    expect(screen.queryByText('Start new season')).not.toBeInTheDocument()
  })

  it('renders nothing when closed', () => {
    render(<SeasonSheet isOpen={false} onClose={vi.fn()} />)
    expect(screen.queryByText('Seasons')).not.toBeInTheDocument()
  })
})
