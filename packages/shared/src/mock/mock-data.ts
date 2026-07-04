import type {
  AuthUser,
  FriendGroup,
  GroupMembership,
  Match,
  MatchType,
  Player,
  PlayerMatchStats,
  Season,
} from '../types/index.ts'

export const MOCK_USER_ID = 'mock-user-1'
export const MOCK_GROUP_ID = 'mock-group-1'
export const MOCK_SEASON_ID = 'mock-season-1'

export const MOCK_USER: AuthUser = {
  id: MOCK_USER_ID,
  email: 'dev@mock.local',
  emailConfirmed: true,
  createdAt: '2025-01-01T00:00:00.000Z',
}

export interface MockSeed {
  groups: FriendGroup[]
  memberships: GroupMembership[]
  players: Player[]
  seasons: Season[]
  matches: Match[]
}

// Deterministic PRNG so mock data is identical on every reload
const mulberry32 = (seed: number) => {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Same ELO parameters as MatchesService so seeded history looks authentic
const calculateNewRanking = (
  playerRanking: number,
  opponentRanking: number,
  won: boolean,
): number => {
  const K = won ? 35 : 29
  const expectedScore = 1 / (1 + 10 ** ((opponentRanking - playerRanking) / 400))
  const actualScore = won ? 1 : 0
  const newRanking = playerRanking + K * (actualScore - expectedScore)
  return Math.max(800, Math.min(2400, Math.round(newRanking)))
}

const PLAYER_SEEDS: Array<{ name: string; avatar: string; department: string }> = [
  { name: 'Astrid', avatar: '🦊', department: 'Engineering' },
  { name: 'Birger', avatar: '🐻', department: 'Engineering' },
  { name: 'Dagny', avatar: '🦅', department: 'Design' },
  { name: 'Einar', avatar: '🐺', department: 'Sales' },
  { name: 'Gudrun', avatar: '🦁', department: 'Marketing' },
  { name: 'Halvor', avatar: '🐯', department: 'Engineering' },
  { name: 'Ingeborg', avatar: '🦉', department: 'Support' },
  { name: 'Leif', avatar: '🐸', department: 'Engineering' },
  { name: 'Oddvar', avatar: '🦋', department: 'Design' },
  { name: 'Solveig', avatar: '🚀', department: 'Engineering' },
]

export const buildMockSeed = (): MockSeed => {
  const rng = mulberry32(42)
  const now = new Date()
  const daysAgo = (days: number) => {
    const d = new Date(now)
    d.setDate(d.getDate() - days)
    return d
  }

  const group: FriendGroup = {
    id: MOCK_GROUP_ID,
    name: 'Office Legends',
    description: 'Mock data for local development',
    inviteCode: 'MOCK01',
    ownerId: MOCK_USER_ID,
    createdBy: MOCK_USER_ID,
    isActive: true,
    maxMembers: 50,
    createdAt: daysAgo(90).toISOString(),
    updatedAt: daysAgo(90).toISOString(),
    sportType: 'foosball',
    supportedMatchTypes: ['1v1', '2v2'],
    targetScore: 10,
  }

  const membership: GroupMembership = {
    id: 'mock-membership-1',
    groupId: MOCK_GROUP_ID,
    userId: MOCK_USER_ID,
    role: 'owner',
    isActive: true,
    invitedBy: null,
    joinedAt: group.createdAt,
    createdAt: group.createdAt,
  }

  // Extra members so the member management UI has data in mock mode
  const extraMemberships: GroupMembership[] = (['admin', 'member', 'member'] as const).map(
    (role, i) => ({
      id: `mock-membership-${i + 2}`,
      groupId: MOCK_GROUP_ID,
      userId: `mock-user-${i + 2}`,
      role,
      isActive: true,
      invitedBy: MOCK_USER_ID,
      joinedAt: daysAgo(80 - i * 5).toISOString(),
      createdAt: daysAgo(80 - i * 5).toISOString(),
    }),
  )

  const season: Season = {
    id: MOCK_SEASON_ID,
    groupId: MOCK_GROUP_ID,
    name: 'Season 1',
    description: 'First mock season',
    seasonNumber: 1,
    startDate: daysAgo(90).toISOString().split('T')[0],
    endDate: null,
    isActive: true,
    createdBy: MOCK_USER_ID,
    createdAt: group.createdAt,
    updatedAt: group.createdAt,
  }

  const players: Player[] = PLAYER_SEEDS.map((p, i) => ({
    id: `mock-player-${i + 1}`,
    name: p.name,
    ranking: 1200,
    matchesPlayed: 0,
    wins: 0,
    losses: 0,
    avatar: p.avatar,
    department: p.department,
    groupId: MOCK_GROUP_ID,
    createdBy: MOCK_USER_ID,
    createdAt: group.createdAt,
    updatedAt: group.createdAt,
  }))

  // Simulate a season of matches so rankings, stats, and history are coherent
  const rankings = new Map(players.map((p) => [p.id, 1200]))
  const matches: Match[] = []
  const totalMatches = 60

  for (let i = 0; i < totalMatches; i++) {
    const matchType: MatchType = rng() < 0.2 ? '1v1' : '2v2'
    const playerCount = matchType === '1v1' ? 2 : 4

    const shuffled = [...players].sort(() => rng() - 0.5)
    const [p1, p2, p3, p4] = shuffled.slice(0, playerCount)
    const team1 = matchType === '1v1' ? [p1] : [p1, p3]
    const team2 = matchType === '1v1' ? [p2] : [p2, p4]

    const team1Avg =
      team1.reduce((sum, p) => sum + (rankings.get(p.id) ?? 1200), 0) / team1.length
    const team2Avg =
      team2.reduce((sum, p) => sum + (rankings.get(p.id) ?? 1200), 0) / team2.length

    // Better-ranked team wins more often
    const team1WinProb = 1 / (1 + 10 ** ((team2Avg - team1Avg) / 400))
    const team1Won = rng() < team1WinProb
    const loserScore = Math.floor(rng() * 9)
    const score1 = team1Won ? 10 : loserScore
    const score2 = team1Won ? loserScore : 10

    const playerStats: PlayerMatchStats[] = []
    for (const p of team1) {
      const pre = rankings.get(p.id) ?? 1200
      const post = calculateNewRanking(pre, team2Avg, team1Won)
      rankings.set(p.id, post)
      playerStats.push({ playerId: p.id, preGameRanking: pre, postGameRanking: post })
    }
    for (const p of team2) {
      const pre = rankings.get(p.id) ?? 1200
      const post = calculateNewRanking(pre, team1Avg, !team1Won)
      rankings.set(p.id, post)
      playerStats.push({ playerId: p.id, preGameRanking: pre, postGameRanking: post })
    }

    for (const p of [...team1, ...team2]) {
      const player = players.find((pl) => pl.id === p.id)
      if (!player) continue
      player.matchesPlayed++
      if ((team1.includes(p) && team1Won) || (team2.includes(p) && !team1Won)) {
        player.wins++
      } else {
        player.losses++
      }
    }

    // Spread matches over the past ~85 days, oldest first
    const matchDate = daysAgo(Math.floor(85 * (1 - i / totalMatches)))
    const hour = 11 + Math.floor(rng() * 7)
    const minute = Math.floor(rng() * 60)

    matches.push({
      id: `mock-match-${i + 1}`,
      matchType,
      team1: [team1[0], team1[1] ?? null],
      team2: [team2[0], team2[1] ?? null],
      score1,
      score2,
      date: matchDate.toISOString().split('T')[0],
      time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`,
      groupId: MOCK_GROUP_ID,
      seasonId: MOCK_SEASON_ID,
      recordedBy: MOCK_USER_ID,
      createdAt: matchDate.toISOString(),
      playerStats,
    })
  }

  for (const p of players) {
    p.ranking = rankings.get(p.id) ?? 1200
  }

  return {
    groups: [group],
    memberships: [membership, ...extraMemberships],
    players,
    seasons: [season],
    matches,
  }
}
