import type {
  Database,
  DatabaseListResult,
  DatabaseResult,
  GroupCreationRpcResult,
  GroupDeletionRpcResult,
  GroupJoinRpcResult,
  GroupLeaveRpcResult,
  GroupSettingsUpdate,
  MemberActionRpcResult,
  SeasonCreationRpcResult,
} from '../lib/database.ts'
import type {
  FriendGroup,
  GroupMember,
  GroupMembership,
  Match,
  MatchType,
  Player,
  PlayerMatchStats,
  PlayerSeasonStats,
  Season,
  SeasonTrophy,
  SportType,
  TrophyRank,
} from '../types/index.ts'
import { replayContinuousElo } from '../utils/elo.ts'
import { buildMockSeed, MOCK_USER_ID, type MockSeed, type MockSeedOptions } from './mock-data.ts'

// In-memory Database implementation for local development without Supabase.
// Season stats are computed from match history, mirroring the
// player_season_stats_computed views in the real database.
export class MockDatabase implements Database {
  private groups: FriendGroup[]
  private memberships: GroupMembership[]
  private players: Player[]
  private matches: Match[]
  private seasons: Season[]
  private trophies: SeasonTrophy[] = []
  private nextId = 1

  constructor(seed: MockSeed) {
    this.groups = [...seed.groups]
    this.memberships = [...seed.memberships]
    this.players = [...seed.players]
    this.matches = [...seed.matches]
    this.seasons = [...seed.seasons]
    // Backfill podiums for seeded ended seasons, mirroring migration 021
    for (const season of this.seasons.filter((s) => !s.isActive)) {
      this.awardSeasonTrophies(season)
    }
  }

  private generateId(prefix: string): string {
    return `mock-${prefix}-gen-${this.nextId++}`
  }

  // ===== GROUP OPERATIONS =====

  async getUserGroups(
    userId: string,
    sportType?: SportType,
  ): Promise<DatabaseListResult<FriendGroup>> {
    const userMemberships = this.memberships.filter((m) => m.userId === userId && m.isActive)
    let userGroups = this.groups.filter(
      (g) => userMemberships.some((m) => m.groupId === g.id) && g.isActive,
    )
    if (sportType) {
      userGroups = userGroups.filter((g) => g.sportType === sportType)
    }

    const groupsWithMeta = userGroups.map((group) => ({
      ...group,
      playerCount: this.players.filter((p) => p.groupId === group.id).length,
      isOwner: group.ownerId === userId,
      currentUserRole: userMemberships.find((m) => m.groupId === group.id)?.role,
    }))

    return { data: groupsWithMeta, error: null }
  }

  async getGroupById(groupId: string): Promise<DatabaseResult<FriendGroup>> {
    const group = this.groups.find((g) => g.id === groupId && g.isActive)
    return group ? { data: group, error: null } : { data: null, error: 'Group not found' }
  }

  async updateGroup(
    groupId: string,
    updates: GroupSettingsUpdate,
  ): Promise<DatabaseResult<FriendGroup>> {
    const group = this.groups.find((g) => g.id === groupId && g.isActive)
    if (!group) {
      return { data: null, error: 'Group not found' }
    }
    if (updates.name !== undefined) group.name = updates.name
    if (updates.description !== undefined) group.description = updates.description
    if (updates.targetScore !== undefined) group.targetScore = updates.targetScore
    group.updatedAt = new Date().toISOString()
    return { data: { ...group }, error: null }
  }

  async getGroupByInviteCode(inviteCode: string): Promise<DatabaseResult<FriendGroup>> {
    const group = this.groups.find((g) => g.inviteCode === inviteCode && g.isActive)
    if (!group) {
      return { data: null, error: 'Invalid invite code' }
    }
    return {
      data: {
        ...group,
        playerCount: this.players.filter((p) => p.groupId === group.id).length,
      },
      error: null,
    }
  }

  async createGroup(
    name: string,
    description?: string,
    sportType: SportType = 'foosball',
    supportedMatchTypes: MatchType[] = ['2v2'],
  ): Promise<DatabaseResult<GroupCreationRpcResult>> {
    const groupId = this.generateId('group')
    const inviteCode = `MOCK${String(this.nextId).padStart(2, '0')}`
    const now = new Date().toISOString()

    this.groups.push({
      id: groupId,
      name,
      description: description || null,
      inviteCode,
      ownerId: MOCK_USER_ID,
      createdBy: MOCK_USER_ID,
      isActive: true,
      maxMembers: 50,
      createdAt: now,
      updatedAt: now,
      sportType,
      supportedMatchTypes,
      targetScore: 10,
    })

    this.memberships.push({
      id: this.generateId('membership'),
      groupId,
      userId: MOCK_USER_ID,
      role: 'owner',
      isActive: true,
      invitedBy: null,
      joinedAt: now,
      createdAt: now,
    })

    this.seasons.push({
      id: this.generateId('season'),
      groupId,
      name: 'Season 1',
      description: 'Initial season',
      seasonNumber: 1,
      startDate: now.split('T')[0],
      endDate: null,
      isActive: true,
      createdBy: MOCK_USER_ID,
      createdAt: now,
      updatedAt: now,
    })

    return {
      data: { success: true, group_id: groupId, invite_code: inviteCode, name },
      error: null,
    }
  }

  async joinGroupByInvite(
    inviteCode: string,
    userId = MOCK_USER_ID,
  ): Promise<DatabaseResult<GroupJoinRpcResult>> {
    const group = this.groups.find((g) => g.inviteCode === inviteCode && g.isActive)
    if (!group) {
      return { data: { success: false, error: 'Invalid invite code' }, error: null }
    }

    const existing = this.memberships.find(
      (m) => m.groupId === group.id && m.userId === userId && m.isActive,
    )
    if (existing) {
      return { data: { success: false, error: 'Already a member of this group' }, error: null }
    }

    const now = new Date().toISOString()
    this.memberships.push({
      id: this.generateId('membership'),
      groupId: group.id,
      userId,
      role: 'member',
      isActive: true,
      invitedBy: null,
      joinedAt: now,
      createdAt: now,
    })

    return {
      data: { success: true, group_id: group.id, group_name: group.name },
      error: null,
    }
  }

  async deleteGroup(
    groupId: string,
    userId: string,
  ): Promise<DatabaseResult<GroupDeletionRpcResult>> {
    const group = this.groups.find((g) => g.id === groupId && g.isActive)
    if (!group) {
      return { data: { success: false, error: 'Group not found' }, error: null }
    }
    if (group.ownerId !== userId) {
      return {
        data: { success: false, error: 'Only group owner can delete the group' },
        error: null,
      }
    }

    const counts = {
      members: this.memberships.filter((m) => m.groupId === groupId).length,
      players: this.players.filter((p) => p.groupId === groupId).length,
      matches: this.matches.filter((m) => m.groupId === groupId).length,
    }

    this.memberships = this.memberships.filter((m) => m.groupId !== groupId)
    this.players = this.players.filter((p) => p.groupId !== groupId)
    this.matches = this.matches.filter((m) => m.groupId !== groupId)
    this.seasons = this.seasons.filter((s) => s.groupId !== groupId)
    this.groups = this.groups.filter((g) => g.id !== groupId)

    return { data: { success: true, deleted_counts: counts }, error: null }
  }

  async leaveGroup(groupId: string, userId: string): Promise<DatabaseResult<GroupLeaveRpcResult>> {
    const group = this.groups.find((g) => g.id === groupId && g.isActive)
    if (!group) {
      return { data: { success: false, error: 'Group not found' }, error: null }
    }
    if (group.ownerId === userId) {
      return {
        data: {
          success: false,
          error: 'Group owner cannot leave the group. Delete the group instead.',
        },
        error: null,
      }
    }

    const membership = this.memberships.find(
      (m) => m.groupId === groupId && m.userId === userId && m.isActive,
    )
    if (!membership) {
      return { data: { success: false, error: 'You are not a member of this group' }, error: null }
    }

    this.memberships = this.memberships.filter(
      (m) => !(m.groupId === groupId && m.userId === userId),
    )
    return { data: { success: true }, error: null }
  }

  private getCallerRole(groupId: string): GroupMembership['role'] | null {
    const membership = this.memberships.find(
      (m) => m.groupId === groupId && m.userId === MOCK_USER_ID && m.isActive,
    )
    return membership?.role ?? null
  }

  async getGroupMembers(groupId: string): Promise<DatabaseListResult<GroupMember>> {
    const callerRole = this.getCallerRole(groupId)
    if (callerRole !== 'owner' && callerRole !== 'admin') {
      return { data: [], error: 'Only group owners and admins can list members' }
    }

    const roleOrder = { owner: 0, admin: 1, member: 2 }
    const members = this.memberships
      .filter((m) => m.groupId === groupId && m.isActive)
      .sort((a, b) => roleOrder[a.role] - roleOrder[b.role] || a.joinedAt.localeCompare(b.joinedAt))
      .map((m) => ({
        ...m,
        email: m.userId === MOCK_USER_ID ? 'dev@mock.local' : `${m.userId}@mock.local`,
      }))
    return { data: members, error: null }
  }

  async promoteGroupMember(
    groupId: string,
    targetUserId: string,
  ): Promise<DatabaseResult<MemberActionRpcResult>> {
    const callerRole = this.getCallerRole(groupId)
    if (callerRole !== 'owner' && callerRole !== 'admin') {
      return {
        data: { success: false, error: 'Only group owners and admins can promote members' },
        error: null,
      }
    }

    const target = this.memberships.find(
      (m) => m.groupId === groupId && m.userId === targetUserId && m.isActive,
    )
    if (!target) {
      return { data: { success: false, error: 'User is not a member of this group' }, error: null }
    }
    if (target.role !== 'member') {
      return { data: { success: false, error: 'User is already an owner or admin' }, error: null }
    }

    target.role = 'admin'
    return { data: { success: true }, error: null }
  }

  async demoteGroupMember(
    groupId: string,
    targetUserId: string,
  ): Promise<DatabaseResult<MemberActionRpcResult>> {
    const callerRole = this.getCallerRole(groupId)
    if (callerRole !== 'owner' && callerRole !== 'admin') {
      return {
        data: { success: false, error: 'Only group owners and admins can demote admins' },
        error: null,
      }
    }
    if (targetUserId === MOCK_USER_ID) {
      return { data: { success: false, error: 'You cannot demote yourself' }, error: null }
    }

    const target = this.memberships.find(
      (m) => m.groupId === groupId && m.userId === targetUserId && m.isActive,
    )
    if (!target) {
      return { data: { success: false, error: 'User is not a member of this group' }, error: null }
    }
    if (target.role === 'owner') {
      return { data: { success: false, error: 'The group owner cannot be demoted' }, error: null }
    }
    if (target.role !== 'admin') {
      return { data: { success: false, error: 'User is not an admin' }, error: null }
    }

    target.role = 'member'
    return { data: { success: true }, error: null }
  }

  async removeGroupMember(
    groupId: string,
    targetUserId: string,
  ): Promise<DatabaseResult<MemberActionRpcResult>> {
    const callerRole = this.getCallerRole(groupId)
    if (callerRole !== 'owner' && callerRole !== 'admin') {
      return {
        data: { success: false, error: 'Only group owners and admins can remove members' },
        error: null,
      }
    }
    if (targetUserId === MOCK_USER_ID) {
      return {
        data: { success: false, error: 'You cannot remove yourself. Leave the group instead.' },
        error: null,
      }
    }

    const target = this.memberships.find(
      (m) => m.groupId === groupId && m.userId === targetUserId && m.isActive,
    )
    if (!target) {
      return { data: { success: false, error: 'User is not a member of this group' }, error: null }
    }
    if (target.role === 'owner') {
      return { data: { success: false, error: 'The group owner cannot be removed' }, error: null }
    }
    if (target.role === 'admin' && callerRole !== 'owner') {
      return {
        data: { success: false, error: 'Only the group owner can remove an admin' },
        error: null,
      }
    }

    this.memberships = this.memberships.filter((m) => m.id !== target.id)
    return { data: { success: true }, error: null }
  }

  // ===== PLAYER OPERATIONS =====

  async getPlayersByGroup(groupId: string): Promise<DatabaseListResult<Player>> {
    const groupMatches = this.matches.filter((m) => m.groupId === groupId)
    // All-time ranking is the continuous unresetting chain, mirroring
    // compute_player_global_ranking in the real database (migration 020)
    const series = replayContinuousElo(groupMatches)
    const players = this.players
      .filter((p) => p.groupId === groupId)
      .map((p) => {
        // Career stats come from match history, mirroring player_stats_computed
        let matchesPlayed = 0
        let wins = 0
        let losses = 0
        for (const match of groupMatches) {
          const inTeam1 = match.team1.some((t) => t?.id === p.id)
          const inTeam2 = match.team2.some((t) => t?.id === p.id)
          if (!inTeam1 && !inTeam2) continue
          matchesPlayed++
          if (match.score1 === match.score2) continue
          const won = inTeam1 === match.score1 > match.score2
          if (won) {
            wins++
          } else {
            losses++
          }
        }
        return {
          ...p,
          ranking: series.get(p.id)?.at(-1)?.ranking ?? 1200,
          matchesPlayed,
          wins,
          losses,
        }
      })
      .sort((a, b) => b.ranking - a.ranking)
    return { data: players, error: null }
  }

  async getPlayerById(playerId: string): Promise<DatabaseResult<Player>> {
    const player = this.players.find((p) => p.id === playerId)
    return player ? { data: player, error: null } : { data: null, error: 'Player not found' }
  }

  async createPlayer(
    player: Omit<Player, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<DatabaseResult<Player>> {
    const now = new Date().toISOString()
    const newPlayer: Player = { ...player, id: this.generateId('player'), createdAt: now, updatedAt: now }
    this.players.push(newPlayer)
    return { data: newPlayer, error: null }
  }

  async updatePlayer(playerId: string, updates: Partial<Player>): Promise<DatabaseResult<Player>> {
    const index = this.players.findIndex((p) => p.id === playerId)
    if (index === -1) {
      return { data: null, error: 'Player not found' }
    }
    this.players[index] = { ...this.players[index], ...updates, updatedAt: new Date().toISOString() }
    return { data: this.players[index], error: null }
  }

  async updateMultiplePlayers(
    updates: Array<{ id: string } & Partial<Player>>,
  ): Promise<{ data?: Player[]; error?: string }> {
    const updated: Player[] = []
    for (const { id, ...rest } of updates) {
      const result = await this.updatePlayer(id, rest)
      if (result.error) return { error: result.error }
      if (result.data) updated.push(result.data)
    }
    return { data: updated }
  }

  async deletePlayer(playerId: string): Promise<{ success?: boolean; error?: string }> {
    const index = this.players.findIndex((p) => p.id === playerId)
    if (index === -1) {
      return { error: 'Player not found' }
    }
    this.players.splice(index, 1)
    return { success: true }
  }

  // ===== MATCH OPERATIONS =====

  private sortMatchesDesc(matches: Match[]): Match[] {
    return [...matches].sort((a, b) => {
      const aKey = `${a.date} ${a.time}`
      const bKey = `${b.date} ${b.time}`
      return bKey.localeCompare(aKey)
    })
  }

  async getMatchesByGroup(groupId: string): Promise<DatabaseListResult<Match>> {
    return {
      data: this.sortMatchesDesc(this.matches.filter((m) => m.groupId === groupId)),
      error: null,
    }
  }

  async getMatchesBySeason(
    seasonId: string,
    matchType?: MatchType,
  ): Promise<DatabaseListResult<Match>> {
    let matches = this.matches.filter((m) => m.seasonId === seasonId)
    if (matchType) {
      matches = matches.filter((m) => m.matchType === matchType)
    }
    return { data: this.sortMatchesDesc(matches), error: null }
  }

  async getMatchById(matchId: string): Promise<DatabaseResult<Match>> {
    const match = this.matches.find((m) => m.id === matchId)
    return match ? { data: match, error: null } : { data: null, error: 'Match not found' }
  }

  async recordMatch(
    groupId: string,
    seasonId: string,
    matchType: MatchType,
    team1Player1Id: string,
    team1Player2Id: string | null,
    team2Player1Id: string,
    team2Player2Id: string | null,
    score1: number,
    score2: number,
    recordedBy: string,
    rankingData: {
      team1Player1PreRanking: number
      team1Player1PostRanking: number
      team1Player2PreRanking?: number | null
      team1Player2PostRanking?: number | null
      team2Player1PreRanking: number
      team2Player1PostRanking: number
      team2Player2PreRanking?: number | null
      team2Player2PostRanking?: number | null
    },
  ): Promise<DatabaseResult<Match>> {
    const getPlayer = (id: string | null): Player | null =>
      id ? (this.players.find((p) => p.id === id) ?? null) : null

    const team1Player1 = getPlayer(team1Player1Id)
    const team2Player1 = getPlayer(team2Player1Id)
    if (!team1Player1 || !team2Player1) {
      return { data: null, error: 'One or more players not found' }
    }
    const team1Player2 = getPlayer(team1Player2Id)
    const team2Player2 = getPlayer(team2Player2Id)

    const playerStats: PlayerMatchStats[] = [
      {
        playerId: team1Player1Id,
        preGameRanking: rankingData.team1Player1PreRanking,
        postGameRanking: rankingData.team1Player1PostRanking,
      },
      {
        playerId: team2Player1Id,
        preGameRanking: rankingData.team2Player1PreRanking,
        postGameRanking: rankingData.team2Player1PostRanking,
      },
    ]
    if (team1Player2Id && rankingData.team1Player2PreRanking != null) {
      playerStats.push({
        playerId: team1Player2Id,
        preGameRanking: rankingData.team1Player2PreRanking,
        postGameRanking: rankingData.team1Player2PostRanking ?? rankingData.team1Player2PreRanking,
      })
    }
    if (team2Player2Id && rankingData.team2Player2PreRanking != null) {
      playerStats.push({
        playerId: team2Player2Id,
        preGameRanking: rankingData.team2Player2PreRanking,
        postGameRanking: rankingData.team2Player2PostRanking ?? rankingData.team2Player2PreRanking,
      })
    }

    const now = new Date()
    const match: Match = {
      id: this.generateId('match'),
      matchType,
      team1: [team1Player1, team1Player2],
      team2: [team2Player1, team2Player2],
      score1,
      score2,
      date: now.toISOString().split('T')[0],
      time: now.toTimeString().split(' ')[0],
      groupId,
      seasonId,
      recordedBy,
      createdAt: now.toISOString(),
      playerStats,
    }

    this.matches.push(match)

    // Keep the players table coherent with the new match, like the computed views do
    const team1Won = score1 > score2
    for (const stat of playerStats) {
      const player = this.players.find((p) => p.id === stat.playerId)
      if (!player) continue
      const isTeam1 = stat.playerId === team1Player1Id || stat.playerId === team1Player2Id
      player.ranking = stat.postGameRanking
      player.matchesPlayed++
      if (score1 !== score2 && isTeam1 === team1Won) {
        player.wins++
      } else if (score1 !== score2) {
        player.losses++
      }
    }

    return { data: match, error: null }
  }

  // ===== SEASON OPERATIONS =====

  async getSeasonsByGroup(groupId: string): Promise<DatabaseListResult<Season>> {
    return { data: this.seasons.filter((s) => s.groupId === groupId), error: null }
  }

  async getActiveSeason(groupId: string): Promise<DatabaseResult<Season>> {
    const season = this.seasons.find((s) => s.groupId === groupId && s.isActive)
    return { data: season ?? null, error: null }
  }

  async getSeasonById(seasonId: string): Promise<DatabaseResult<Season>> {
    const season = this.seasons.find((s) => s.id === seasonId)
    return { data: season ?? null, error: null }
  }

  async endSeasonAndCreateNew(
    groupId: string,
    newSeasonName: string,
    newSeasonDescription?: string,
  ): Promise<DatabaseResult<SeasonCreationRpcResult>> {
    const activeSeason = this.seasons.find((s) => s.groupId === groupId && s.isActive)
    if (!activeSeason) {
      return { data: { success: false, error: 'No active season found' }, error: null }
    }

    const now = new Date().toISOString()
    this.awardSeasonTrophies(activeSeason)
    activeSeason.isActive = false
    activeSeason.endDate = now.split('T')[0]
    activeSeason.updatedAt = now

    const newSeason: Season = {
      id: this.generateId('season'),
      groupId,
      name: newSeasonName,
      description: newSeasonDescription ?? null,
      seasonNumber: activeSeason.seasonNumber + 1,
      startDate: now.split('T')[0],
      endDate: null,
      isActive: true,
      createdBy: MOCK_USER_ID,
      createdAt: now,
      updatedAt: now,
    }
    this.seasons.push(newSeason)

    return {
      data: {
        success: true,
        old_season_id: activeSeason.id,
        new_season_id: newSeason.id,
        season_number: newSeason.seasonNumber,
      },
      error: null,
    }
  }

  // ===== PLAYER SEASON STATS (computed from matches) =====

  private computeSeasonStats(seasonId: string, matchType?: MatchType): PlayerSeasonStats[] {
    let matches = this.matches.filter((m) => m.seasonId === seasonId)
    if (matchType) {
      matches = matches.filter((m) => m.matchType === matchType)
    }
    const sorted = this.sortMatchesDesc(matches)

    const statsByPlayer = new Map<string, PlayerSeasonStats>()

    // Newest first: the first stat we see per player is their current ranking
    for (const match of sorted) {
      const team1Ids = match.team1.filter(Boolean).map((p) => (p as Player).id)
      const team1Won = match.score1 > match.score2
      const isDraw = match.score1 === match.score2

      for (const stat of match.playerStats ?? []) {
        const isTeam1 = team1Ids.includes(stat.playerId)
        const won = !isDraw && isTeam1 === team1Won
        const goalsFor = isTeam1 ? match.score1 : match.score2
        const goalsAgainst = isTeam1 ? match.score2 : match.score1

        const existing = statsByPlayer.get(stat.playerId)
        if (existing) {
          existing.matchesPlayed++
          if (!isDraw && won) existing.wins++
          if (!isDraw && !won) existing.losses++
          existing.goalsFor += goalsFor
          existing.goalsAgainst += goalsAgainst
        } else {
          statsByPlayer.set(stat.playerId, {
            id: `mock-stats-${stat.playerId}-${seasonId}`,
            playerId: stat.playerId,
            seasonId,
            ranking: stat.postGameRanking,
            matchesPlayed: 1,
            wins: !isDraw && won ? 1 : 0,
            losses: !isDraw && !won ? 1 : 0,
            goalsFor,
            goalsAgainst,
            createdAt: match.createdAt ?? new Date().toISOString(),
            updatedAt: match.createdAt ?? new Date().toISOString(),
          })
        }
      }
    }

    return [...statsByPlayer.values()].sort((a, b) => b.ranking - a.ranking)
  }

  async getPlayerSeasonStats(
    playerId: string,
    seasonId: string,
    matchType?: MatchType,
  ): Promise<DatabaseResult<PlayerSeasonStats>> {
    const stats = this.computeSeasonStats(seasonId, matchType).find(
      (s) => s.playerId === playerId,
    )
    return stats
      ? { data: stats, error: null }
      : { data: null, error: 'No stats found for player in season' }
  }

  async getSeasonLeaderboard(
    seasonId: string,
    matchType?: MatchType,
  ): Promise<DatabaseListResult<PlayerSeasonStats>> {
    return { data: this.computeSeasonStats(seasonId, matchType), error: null }
  }

  // ===== SEASON TROPHIES =====

  // Snapshot the top 3 of the combined season leaderboard, mirroring
  // award_season_trophies in migration 021 (idempotent, same tie-breaks)
  private awardSeasonTrophies(season: Season): void {
    if (this.trophies.some((t) => t.seasonId === season.id)) {
      return
    }

    const podium = this.computeSeasonStats(season.id)
      .toSorted(
        (a, b) =>
          b.ranking - a.ranking ||
          b.wins - a.wins ||
          b.matchesPlayed - a.matchesPlayed ||
          a.playerId.localeCompare(b.playerId),
      )
      .slice(0, 3)

    podium.forEach((stats, index) => {
      this.trophies.push({
        id: this.generateId('trophy'),
        groupId: season.groupId,
        seasonId: season.id,
        playerId: stats.playerId,
        rank: (index + 1) as TrophyRank,
        seasonName: season.name,
        seasonNumber: season.seasonNumber,
        createdAt: new Date().toISOString(),
      })
    })
  }

  async getTrophiesByGroup(groupId: string): Promise<DatabaseListResult<SeasonTrophy>> {
    const trophies = this.trophies
      .filter((t) => t.groupId === groupId)
      .toSorted((a, b) => b.seasonNumber - a.seasonNumber || a.rank - b.rank)
    return { data: trophies, error: null }
  }
}

// Factory: a MockDatabase pre-seeded with a group, season, players, and match history
export function createMockDatabase(options?: MockSeedOptions): MockDatabase {
  return new MockDatabase(buildMockSeed(options))
}
