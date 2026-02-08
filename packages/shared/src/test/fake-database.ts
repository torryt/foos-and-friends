import type {
  Database,
  DatabaseListResult,
  DatabaseResult,
  GroupCreationRpcResult,
  GroupDeletionRpcResult,
  GroupJoinRpcResult,
  GroupLeaveRpcResult,
  SeasonCreationRpcResult,
} from '../lib/database.ts'
import type {
  FriendGroup,
  GroupMembership,
  Match,
  MatchType,
  Player,
  PlayerSeasonStats,
  Season,
  SportType,
} from '../types/index.ts'

export class FakeDatabase implements Database {
  private groups: FriendGroup[] = []
  private memberships: GroupMembership[] = []
  private players: Player[] = []
  private matches: Match[] = []
  private seasons: Season[] = []
  // @ts-expect-error - Reserved for future implementation
  private _playerSeasonStats: PlayerSeasonStats[] = []
  private nextId = 1

  private generateId(): string {
    return `fake-id-${this.nextId++}`
  }

  // Group operations
  async getUserGroups(
    userId: string,
    sportType?: SportType,
  ): Promise<DatabaseListResult<FriendGroup>> {
    const userMemberships = this.memberships.filter((m) => m.userId === userId && m.isActive)
    let userGroups = this.groups.filter(
      (g) => userMemberships.some((m) => m.groupId === g.id) && g.isActive,
    )

    // Filter by sport type if provided
    if (sportType) {
      userGroups = userGroups.filter((g) => g.sportType === sportType)
    }

    const groupsWithMeta = userGroups.map((group) => ({
      ...group,
      playerCount: this.players.filter((p) => p.groupId === group.id).length,
      isOwner: group.ownerId === userId,
    }))

    return { data: groupsWithMeta, error: null }
  }

  async getGroupById(groupId: string): Promise<DatabaseResult<FriendGroup>> {
    const group = this.groups.find((g) => g.id === groupId && g.isActive)
    if (!group) {
      return { data: null, error: 'Group not found' }
    }
    return { data: group, error: null }
  }

  async getGroupByInviteCode(inviteCode: string): Promise<DatabaseResult<FriendGroup>> {
    const group = this.groups.find((g) => g.inviteCode === inviteCode && g.isActive)
    if (!group) {
      return { data: null, error: 'Invalid invite code' }
    }

    const groupWithPlayerCount = {
      ...group,
      playerCount: this.players.filter((p) => p.groupId === group.id).length,
    }

    return { data: groupWithPlayerCount, error: null }
  }

  async createGroup(
    name: string,
    description?: string,
    sportType: SportType = 'foosball',
  ): Promise<DatabaseResult<GroupCreationRpcResult>> {
    const groupId = this.generateId()
    const inviteCode = `fake-${Math.random().toString(36).substring(2, 8)}`

    const group: FriendGroup = {
      id: groupId,
      name,
      description: description || null,
      inviteCode,
      ownerId: 'fake-user-id',
      createdBy: 'fake-user-id',
      isActive: true,
      maxMembers: 50,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sportType,
      supportedMatchTypes: ['2v2'],
    }

    this.groups.push(group)

    // Add owner membership
    this.memberships.push({
      id: this.generateId(),
      groupId,
      userId: 'fake-user-id',
      role: 'owner',
      isActive: true,
      invitedBy: null,
      joinedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    })

    // Create initial season (Season 1) for the new group
    const seasonId = this.generateId()
    const season: Season = {
      id: seasonId,
      groupId,
      name: 'Season 1',
      description: 'Initial season',
      seasonNumber: 1,
      startDate: new Date().toISOString().split('T')[0],
      endDate: null,
      isActive: true,
      createdBy: 'fake-user-id',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    this.seasons.push(season)

    const result: GroupCreationRpcResult = {
      success: true,
      group_id: groupId,
      invite_code: inviteCode,
      name,
    }

    return { data: result, error: null }
  }

  async joinGroupByInvite(
    inviteCode: string,
    userId = 'fake-user-id',
  ): Promise<DatabaseResult<GroupJoinRpcResult>> {
    const group = this.groups.find((g) => g.inviteCode === inviteCode && g.isActive)
    if (!group) {
      return {
        data: { success: false, error: 'Invalid invite code' },
        error: null,
      }
    }

    // Check if already a member
    const existingMembership = this.memberships.find(
      (m) => m.groupId === group.id && m.userId === userId && m.isActive,
    )
    if (existingMembership) {
      return {
        data: { success: false, error: 'Already a member of this group' },
        error: null,
      }
    }

    // Check capacity
    const currentMembers = this.memberships.filter(
      (m) => m.groupId === group.id && m.isActive,
    ).length
    if (currentMembers >= group.maxMembers) {
      return {
        data: { success: false, error: 'Group is at maximum capacity' },
        error: null,
      }
    }

    // Add membership
    this.memberships.push({
      id: this.generateId(),
      groupId: group.id,
      userId,
      role: 'member',
      isActive: true,
      invitedBy: null,
      joinedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    })

    return {
      data: {
        success: true,
        group_id: group.id,
        group_name: group.name,
      },
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

    // Check if user is owner
    if (group.ownerId !== userId) {
      return {
        data: { success: false, error: 'Only group owner can delete the group' },
        error: null,
      }
    }

    // Count items to be deleted
    const memberships = this.memberships.filter((m) => m.groupId === groupId)
    const players = this.players.filter((p) => p.groupId === groupId)
    const matches = this.matches.filter((m) => m.groupId === groupId)

    // Delete all related data
    this.memberships = this.memberships.filter((m) => m.groupId !== groupId)
    this.players = this.players.filter((p) => p.groupId !== groupId)
    this.matches = this.matches.filter((m) => m.groupId !== groupId)
    this.groups = this.groups.filter((g) => g.id !== groupId)

    return {
      data: {
        success: true,
        deleted_counts: {
          members: memberships.length,
          players: players.length,
          matches: matches.length,
        },
      },
      error: null,
    }
  }

  async leaveGroup(groupId: string, userId: string): Promise<DatabaseResult<GroupLeaveRpcResult>> {
    const group = this.groups.find((g) => g.id === groupId && g.isActive)
    if (!group) {
      return { data: { success: false, error: 'Group not found' }, error: null }
    }

    // Check if user is owner (owners cannot leave, they must delete)
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

    // Remove membership
    this.memberships = this.memberships.filter(
      (m) => !(m.groupId === groupId && m.userId === userId),
    )

    // Remove user's players from this group
    this.players = this.players.filter((p) => !(p.groupId === groupId && p.createdBy === userId))

    return {
      data: { success: true },
      error: null,
    }
  }

  async getGroupMembers(groupId: string): Promise<DatabaseListResult<GroupMembership>> {
    const members = this.memberships.filter((m) => m.groupId === groupId && m.isActive)
    return { data: members, error: null }
  }

  // Player operations
  async getPlayersByGroup(groupId: string): Promise<DatabaseListResult<Player>> {
    const players = this.players
      .filter((p) => p.groupId === groupId)
      .sort((a, b) => b.ranking - a.ranking)
    return { data: players, error: null }
  }

  async getPlayerById(playerId: string): Promise<DatabaseResult<Player>> {
    const player = this.players.find((p) => p.id === playerId)
    if (!player) {
      return { data: null, error: 'Player not found' }
    }
    return { data: player, error: null }
  }

  async createPlayer(
    player: Omit<Player, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<DatabaseResult<Player>> {
    const newPlayer: Player = {
      ...player,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    this.players.push(newPlayer)
    return { data: newPlayer, error: null }
  }

  async updatePlayer(playerId: string, updates: Partial<Player>): Promise<DatabaseResult<Player>> {
    const playerIndex = this.players.findIndex((p) => p.id === playerId)
    if (playerIndex === -1) {
      return { data: null, error: 'Player not found' }
    }

    this.players[playerIndex] = {
      ...this.players[playerIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
    }

    return { data: this.players[playerIndex], error: null }
  }

  async updateMultiplePlayers(
    updates: Array<{ id: string } & Partial<Player>>,
  ): Promise<{ data?: Player[]; error?: string }> {
    const updatedPlayers: Player[] = []
    for (const update of updates) {
      const { id, ...playerUpdates } = update
      const result = await this.updatePlayer(id, playerUpdates)
      if (result.error) {
        return { error: result.error }
      }
      if (result.data) {
        updatedPlayers.push(result.data)
      }
    }
    return { data: updatedPlayers }
  }

  async deletePlayer(playerId: string): Promise<{ success?: boolean; error?: string }> {
    const playerIndex = this.players.findIndex((p) => p.id === playerId)
    if (playerIndex === -1) {
      return { error: 'Player not found' }
    }

    this.players.splice(playerIndex, 1)
    return { success: true }
  }

  // Match operations (simplified for now)
  async getMatchesByGroup(groupId: string): Promise<DatabaseListResult<Match>> {
    const matches = this.matches.filter((m) => m.groupId === groupId)
    return { data: matches, error: null }
  }

  async getMatchById(matchId: string): Promise<DatabaseResult<Match>> {
    const match = this.matches.find((m) => m.id === matchId)
    if (!match) {
      return { data: null, error: 'Match not found' }
    }
    return { data: match, error: null }
  }

  async recordMatch(
    _groupId: string,
    _seasonId: string,
    _matchType: MatchType,
    _team1Player1Id: string,
    _team1Player2Id: string | null,
    _team2Player1Id: string,
    _team2Player2Id: string | null,
    _score1: number,
    _score2: number,
    _recordedBy: string,
    _rankingData: {
      team1Player1PreRanking: number
      team1Player1PostRanking: number
      team1Player2PreRanking: number
      team1Player2PostRanking: number
      team2Player1PreRanking: number
      team2Player1PostRanking: number
      team2Player2PreRanking: number
      team2Player2PostRanking: number
    },
  ): Promise<DatabaseResult<Match>> {
    // Simplified implementation - would need full match logic
    return { data: null, error: 'Not implemented in fake' }
  }

  async getMatchesBySeason(_seasonId: string): Promise<DatabaseListResult<Match>> {
    return { data: [], error: 'Not implemented in fake' }
  }

  async getSeasonsByGroup(groupId: string): Promise<DatabaseListResult<Season>> {
    const seasons = this.seasons.filter((s) => s.groupId === groupId)
    return { data: seasons, error: null }
  }

  async getActiveSeason(groupId: string): Promise<DatabaseResult<Season>> {
    const season = this.seasons.find((s) => s.groupId === groupId && s.isActive)
    return { data: season || null, error: null }
  }

  async getSeasonById(seasonId: string): Promise<DatabaseResult<Season>> {
    const season = this.seasons.find((s) => s.id === seasonId)
    return { data: season || null, error: null }
  }

  async endSeasonAndCreateNew(
    _groupId: string,
    _newSeasonName: string,
    _newSeasonDescription?: string,
  ): Promise<DatabaseResult<SeasonCreationRpcResult>> {
    return { data: null, error: 'Not implemented in fake' }
  }

  async getPlayerSeasonStats(
    _playerId: string,
    _seasonId: string,
  ): Promise<DatabaseResult<PlayerSeasonStats>> {
    return { data: null, error: 'Not implemented in fake' }
  }

  async getSeasonLeaderboard(_seasonId: string): Promise<DatabaseListResult<PlayerSeasonStats>> {
    return { data: [], error: 'Not implemented in fake' }
  }

  async initializePlayerForSeason(
    _playerId: string,
    _seasonId: string,
  ): Promise<DatabaseResult<PlayerSeasonStats>> {
    return { data: null, error: 'Not implemented in fake' }
  }

  async updatePlayerSeasonStats(
    _playerId: string,
    _seasonId: string,
    _updates: Partial<PlayerSeasonStats>,
  ): Promise<DatabaseResult<PlayerSeasonStats>> {
    return { data: null, error: 'Not implemented in fake' }
  }

  async updateMultiplePlayerSeasonStats(
    _updates: Array<{ playerId: string; seasonId: string } & Partial<PlayerSeasonStats>>,
  ): Promise<{ data?: PlayerSeasonStats[]; error?: string }> {
    return { data: [], error: 'Not implemented in fake' }
  }

  // Test helper methods
  reset(): void {
    this.groups = []
    this.memberships = []
    this.players = []
    this.matches = []
    this.seasons = []
    this._playerSeasonStats = []
    this.nextId = 1
  }

  seed(data: {
    groups?: FriendGroup[]
    memberships?: GroupMembership[]
    players?: Player[]
    matches?: Match[]
    seasons?: Season[]
    playerSeasonStats?: PlayerSeasonStats[]
  }): void {
    if (data.groups) this.groups = [...data.groups]
    if (data.memberships) this.memberships = [...data.memberships]
    if (data.players) this.players = [...data.players]
    if (data.matches) this.matches = [...data.matches]
    if (data.seasons) this.seasons = [...data.seasons]
    if (data.playerSeasonStats) this._playerSeasonStats = [...data.playerSeasonStats]
  }
}
