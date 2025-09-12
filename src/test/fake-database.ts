import type {
  Database,
  DatabaseListResult,
  DatabaseResult,
  GroupCreationRpcResult,
  GroupJoinRpcResult,
} from '@/lib/database'
import type { FriendGroup, GroupMembership, Match, Player } from '@/types'

export class FakeDatabase implements Database {
  private groups: FriendGroup[] = []
  private memberships: GroupMembership[] = []
  private players: Player[] = []
  private matches: Match[] = []
  private nextId = 1

  private generateId(): string {
    return `fake-id-${this.nextId++}`
  }

  // Group operations
  async getUserGroups(userId: string): Promise<DatabaseListResult<FriendGroup>> {
    const userMemberships = this.memberships.filter((m) => m.userId === userId && m.isActive)
    const userGroups = this.groups
      .filter((g) => userMemberships.some((m) => m.groupId === g.id) && g.isActive)
      .map((group) => ({
        ...group,
        playerCount: this.players.filter((p) => p.groupId === group.id).length,
      }))

    return { data: userGroups, error: null }
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
    _team1Player1Id: string,
    _team1Player2Id: string,
    _team2Player1Id: string,
    _team2Player2Id: string,
    _score1: number,
    _score2: number,
    _recordedBy: string,
  ): Promise<DatabaseResult<Match>> {
    // Simplified implementation - would need full match logic
    return { data: null, error: 'Not implemented in fake' }
  }

  // Test helper methods
  reset(): void {
    this.groups = []
    this.memberships = []
    this.players = []
    this.matches = []
    this.nextId = 1
  }

  seed(data: {
    groups?: FriendGroup[]
    memberships?: GroupMembership[]
    players?: Player[]
    matches?: Match[]
  }): void {
    if (data.groups) this.groups = [...data.groups]
    if (data.memberships) this.memberships = [...data.memberships]
    if (data.players) this.players = [...data.players]
    if (data.matches) this.matches = [...data.matches]
  }
}
