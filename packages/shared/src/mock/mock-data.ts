import type {
  AuthUser,
  FriendGroup,
  GroupMembership,
  JoinRequest,
  Match,
  MatchType,
  Player,
  PlayerMatchStats,
  Season,
  SportType,
} from '../types/index.ts'

export const MOCK_USER_ID = 'mock-user-1'
export const MOCK_GROUP_ID = 'mock-group-1'
export const MOCK_SEASON_ID = 'mock-season-3'
// A public group the mock user is NOT a member of, with join_policy
// 'approval': exercises the non-member read-only view at /groups/<id> and the
// request-to-join flow (also reachable via /invite?code=MOCK99)
export const MOCK_APPROVAL_GROUP_ID = 'mock-group-2'
export const MOCK_APPROVAL_INVITE_CODE = 'mock99'
// A private group the mock user is NOT a member of: exercises the minimal
// name-plus-request-to-join landing page at /groups/<id>
export const MOCK_PRIVATE_GROUP_ID = 'mock-group-3'

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
  joinRequests: JoinRequest[]
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

// Players who never play any matches — they exercise the "hidden until
// revealed" behavior on the rankings page.
const INACTIVE_PLAYER_SEEDS: Array<{ name: string; avatar: string; department: string }> = [
  { name: 'Torstein', avatar: '🐢', department: 'Finance' },
  { name: 'Ragnhild', avatar: '🐧', department: 'HR' },
]

export interface MockSeedOptions {
  sportType?: SportType
}

export const buildMockSeed = (options?: MockSeedOptions): MockSeed => {
  const sportType = options?.sportType ?? 'foosball'
  const isChess = sportType === 'chess'
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
    sportType,
    supportedMatchTypes: isChess ? ['1v1'] : ['1v1', '2v2'],
    targetScore: isChess ? 1 : 10,
    joinPolicy: 'open',
    isPublic: true,
  }

  // A second group the mock user does not belong to; public with approval
  // policy, so it exercises the non-member read-only group page and the
  // request-to-join flow. Not returned by getUserGroups (no membership).
  const approvalGroup: FriendGroup = {
    id: MOCK_APPROVAL_GROUP_ID,
    name: 'Rival Office',
    description: 'Approval-gated mock group',
    inviteCode: MOCK_APPROVAL_INVITE_CODE,
    ownerId: 'mock-user-20',
    createdBy: 'mock-user-20',
    isActive: true,
    maxMembers: 50,
    createdAt: daysAgo(60).toISOString(),
    updatedAt: daysAgo(60).toISOString(),
    sportType,
    supportedMatchTypes: isChess ? ['1v1'] : ['1v1', '2v2'],
    targetScore: isChess ? 1 : 10,
    joinPolicy: 'approval',
    isPublic: true,
  }

  // A third group, private, that the mock user does not belong to: its group
  // page shows only the name and a request-to-join button.
  const privateGroup: FriendGroup = {
    id: MOCK_PRIVATE_GROUP_ID,
    name: 'Secret Society',
    description: 'Private mock group',
    inviteCode: 'MOCK77',
    ownerId: 'mock-user-20',
    createdBy: 'mock-user-20',
    isActive: true,
    maxMembers: 50,
    createdAt: daysAgo(50).toISOString(),
    updatedAt: daysAgo(50).toISOString(),
    sportType,
    supportedMatchTypes: isChess ? ['1v1'] : ['1v1', '2v2'],
    targetScore: isChess ? 1 : 10,
    joinPolicy: 'approval',
    isPublic: false,
  }

  const rivalOwnerMemberships: GroupMembership[] = [
    MOCK_APPROVAL_GROUP_ID,
    MOCK_PRIVATE_GROUP_ID,
  ].map((groupId, i) => ({
    id: `mock-membership-2${i}`,
    groupId,
    userId: 'mock-user-20',
    role: 'owner',
    isActive: true,
    invitedBy: null,
    joinedAt: daysAgo(60).toISOString(),
    createdAt: daysAgo(60).toISOString(),
  }))

  // A pending request into the main group so the notification bell has data
  // (the mock user is that group's owner)
  const joinRequests: JoinRequest[] = [
    {
      id: 'mock-join-request-1',
      groupId: MOCK_GROUP_ID,
      userId: 'mock-user-30',
      email: 'newcomer@mock.local',
      status: 'pending',
      requestedAt: daysAgo(1).toISOString(),
    },
  ]

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

  // Three seasons: two finished, one active. Rankings reset to 1200 each
  // season, matching the real no-carry-over behavior.
  // `sitOut` players have games in other seasons but none in that season, so
  // they are hidden in that season's rankings but visible in all-time scope.
  const seasonWindows = [
    { id: 'mock-season-1', name: 'Season 1', startDay: 90, endDay: 61, matches: 45, sitOut: [] as string[] },
    { id: 'mock-season-2', name: 'Season 2', startDay: 60, endDay: 31, matches: 50, sitOut: [] as string[] },
    { id: MOCK_SEASON_ID, name: 'Season 3', startDay: 30, endDay: 0, matches: 35, sitOut: ['Solveig'] },
  ]

  const seasons: Season[] = seasonWindows.map((w, i) => {
    const isActive = i === seasonWindows.length - 1
    return {
      id: w.id,
      groupId: MOCK_GROUP_ID,
      name: w.name,
      description: isActive ? 'Current mock season' : `Finished mock season ${i + 1}`,
      seasonNumber: i + 1,
      startDate: daysAgo(w.startDay).toISOString().split('T')[0],
      endDate: isActive ? null : daysAgo(w.endDay).toISOString().split('T')[0],
      isActive,
      createdBy: MOCK_USER_ID,
      createdAt: daysAgo(w.startDay).toISOString(),
      updatedAt: daysAgo(w.startDay).toISOString(),
    }
  })

  const players: Player[] = [...PLAYER_SEEDS, ...INACTIVE_PLAYER_SEEDS].map((p, i) => ({
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

  // Simulate matches per season so rankings, stats, and history are coherent.
  // Rankings reset to 1200 at each season start; the players table reflects
  // the current (active) season, like the real computed views.
  const matches: Match[] = []
  let rankings = new Map(players.map((p) => [p.id, 1200]))
  let matchId = 1

  const activePlayers = players.filter((p) =>
    PLAYER_SEEDS.some((seed) => seed.name === p.name),
  )

  for (const window of seasonWindows) {
    rankings = new Map(players.map((p) => [p.id, 1200]))
    const pool = activePlayers.filter((p) => !window.sitOut.includes(p.name))

    for (let i = 0; i < window.matches; i++) {
      const matchType: MatchType = isChess ? '1v1' : rng() < 0.2 ? '1v1' : '2v2'
      const playerCount = matchType === '1v1' ? 2 : 4

      const shuffled = [...pool].sort(() => rng() - 0.5)
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
      // Chess records 1-0 results; foosball plays to the group's target score
      const loserScore = isChess ? 0 : Math.floor(rng() * 9)
      const score1 = team1Won ? group.targetScore : loserScore
      const score2 = team1Won ? loserScore : group.targetScore

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

      // Spread matches over the season's window, oldest first
      const span = window.startDay - window.endDay
      const matchDate = daysAgo(window.startDay - Math.floor(span * (i / window.matches)))
      const hour = 11 + Math.floor(rng() * 7)
      const minute = Math.floor(rng() * 60)

      matches.push({
        id: `mock-match-${matchId++}`,
        matchType,
        team1: [team1[0], team1[1] ?? null],
        team2: [team2[0], team2[1] ?? null],
        score1,
        score2,
        date: matchDate.toISOString().split('T')[0],
        time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`,
        groupId: MOCK_GROUP_ID,
        seasonId: window.id,
        recordedBy: MOCK_USER_ID,
        createdAt: matchDate.toISOString(),
        playerStats,
      })
    }
  }

  // Players table reflects the last (active) season's rankings
  for (const p of players) {
    p.ranking = rankings.get(p.id) ?? 1200
  }

  // A small seed for the public Rival Office group so its non-member
  // read-only page has content: two players, one active season, one match.
  const rivalSeason: Season = {
    id: 'mock-rival-season-1',
    groupId: MOCK_APPROVAL_GROUP_ID,
    name: 'Season 1',
    description: 'Rival mock season',
    seasonNumber: 1,
    startDate: daysAgo(30).toISOString().split('T')[0],
    endDate: null,
    isActive: true,
    createdBy: 'mock-user-20',
    createdAt: daysAgo(30).toISOString(),
    updatedAt: daysAgo(30).toISOString(),
  }

  const rivalPlayers: Player[] = [
    { name: 'Magnus', avatar: '♟️', department: 'Engineering' },
    { name: 'Judit', avatar: '👑', department: 'Design' },
  ].map((p, i) => ({
    id: `mock-rival-player-${i + 1}`,
    name: p.name,
    ranking: 1200,
    matchesPlayed: 0,
    wins: 0,
    losses: 0,
    avatar: p.avatar,
    department: p.department,
    groupId: MOCK_APPROVAL_GROUP_ID,
    createdBy: 'mock-user-20',
    createdAt: daysAgo(30).toISOString(),
    updatedAt: daysAgo(30).toISOString(),
  }))

  const [magnus, judit] = rivalPlayers
  const magnusPost = calculateNewRanking(1200, 1200, true)
  const juditPost = calculateNewRanking(1200, 1200, false)
  magnus.ranking = magnusPost
  magnus.matchesPlayed = 1
  magnus.wins = 1
  judit.ranking = juditPost
  judit.matchesPlayed = 1
  judit.losses = 1

  const rivalMatch: Match = {
    id: `mock-match-${matchId++}`,
    matchType: '1v1',
    team1: [magnus, null],
    team2: [judit, null],
    score1: approvalGroup.targetScore,
    score2: 0,
    date: daysAgo(2).toISOString().split('T')[0],
    time: '12:00:00',
    groupId: MOCK_APPROVAL_GROUP_ID,
    seasonId: rivalSeason.id,
    recordedBy: 'mock-user-20',
    createdAt: daysAgo(2).toISOString(),
    playerStats: [
      { playerId: magnus.id, preGameRanking: 1200, postGameRanking: magnusPost },
      { playerId: judit.id, preGameRanking: 1200, postGameRanking: juditPost },
    ],
  }

  return {
    groups: [group, approvalGroup, privateGroup],
    memberships: [membership, ...extraMemberships, ...rivalOwnerMemberships],
    players: [...players, ...rivalPlayers],
    seasons: [...seasons, rivalSeason],
    matches: [...matches, rivalMatch],
    joinRequests,
  }
}
