/**
 * Regenerate Player Statistics Script
 *
 * This script replays all matches chronologically to recalculate:
 * - Player global stats (players table): ranking, matches_played, wins, losses
 * - Player season stats (player_season_stats table): ranking, matches_played, wins, losses, goals_for, goals_against
 * - Match ranking fields (matches table): pre/post ranking fields for each player
 *
 * Usage:
 *   SUPABASE_URL=<url> SUPABASE_SERVICE_ROLE_KEY=<key> npx tsx scripts/regenerate-stats.ts [options]
 *
 * Options:
 *   --group-id=<uuid>   Required. The group ID to regenerate stats for
 *   --season-id=<uuid>  Optional. Only process matches in this season
 *   --dry-run           Show what would happen without making changes
 *   --verbose, -v       Show detailed output for each match
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// === Types ===

interface DbMatch {
  id: string
  group_id: string
  season_id: string
  team1_player1_id: string
  team1_player2_id: string
  team2_player1_id: string
  team2_player2_id: string
  team1_score: number
  team2_score: number
  match_date: string
  match_time: string
  recorded_by: string
  created_at: string
  team1_player1_pre_ranking?: number
  team1_player1_post_ranking?: number
  team1_player2_pre_ranking?: number
  team1_player2_post_ranking?: number
  team2_player1_pre_ranking?: number
  team2_player1_post_ranking?: number
  team2_player2_pre_ranking?: number
  team2_player2_post_ranking?: number
}

interface DbPlayer {
  id: string
  name: string
  ranking: number
  matches_played: number
  wins: number
  losses: number
}

interface PlayerState {
  id: string
  name: string
  ranking: number
  matchesPlayed: number
  wins: number
  losses: number
}

interface PlayerSeasonState {
  playerId: string
  seasonId: string
  ranking: number
  matchesPlayed: number
  wins: number
  losses: number
  goalsFor: number
  goalsAgainst: number
}

interface MatchRankingUpdate {
  id: string
  rankings: {
    team1_player1_pre_ranking: number
    team1_player1_post_ranking: number
    team1_player2_pre_ranking: number
    team1_player2_post_ranking: number
    team2_player1_pre_ranking: number
    team2_player1_post_ranking: number
    team2_player2_pre_ranking: number
    team2_player2_post_ranking: number
  }
}

interface ReplayResult {
  matchId: string
  matchDate: string
  matchTime: string
  score: string
  playerChanges: Array<{
    playerId: string
    playerName: string
    preRanking: number
    postRanking: number
    change: number
  }>
}

interface ScriptConfig {
  dryRun: boolean
  groupId: string
  seasonId: string
  verbose: boolean
}

// === Constants ===

const K_FACTOR_WINNER = 35
const K_FACTOR_LOSER = 29
const MIN_RANKING = 800
const MAX_RANKING = 2400
const INITIAL_RANKING = 1200

// === ELO Calculation ===

function calculateNewRanking(
  playerRanking: number,
  opponentTeamAvgRanking: number,
  isWinner: boolean,
): number {
  const K = isWinner ? K_FACTOR_WINNER : K_FACTOR_LOSER
  const expectedScore = 1 / (1 + 10 ** ((opponentTeamAvgRanking - playerRanking) / 400))
  const actualScore = isWinner ? 1 : 0
  const newRanking = playerRanking + K * (actualScore - expectedScore)
  return Math.max(MIN_RANKING, Math.min(MAX_RANKING, Math.round(newRanking)))
}

// === Configuration ===

function loadConfig(): ScriptConfig {
  const args = process.argv.slice(2)
  return {
    dryRun: args.includes('--dry-run'),
    groupId: args.find((a) => a.startsWith('--group-id='))?.split('=')[1] || '',
    seasonId: args.find((a) => a.startsWith('--season-id='))?.split('=')[1] || '',
    verbose: args.includes('--verbose') || args.includes('-v'),
  }
}

function createSupabaseClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error(
      'Missing environment variables.\n' +
        'Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY\n\n' +
        'Example:\n' +
        '  SUPABASE_URL=https://xxx.supabase.co \\\n' +
        '  SUPABASE_SERVICE_ROLE_KEY=eyJ... \\\n' +
        '  npx tsx scripts/regenerate-stats.ts --group-id=<uuid>',
    )
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

// === Data Fetching ===

async function fetchPlayers(
  supabase: SupabaseClient,
  groupId: string,
): Promise<Map<string, PlayerState>> {
  const { data, error } = await supabase
    .from('players')
    .select('id, name, ranking, matches_played, wins, losses')
    .eq('group_id', groupId)

  if (error) throw new Error(`Failed to fetch players: ${error.message}`)

  const playerMap = new Map<string, PlayerState>()
  for (const p of (data as DbPlayer[]) || []) {
    playerMap.set(p.id, {
      id: p.id,
      name: p.name,
      ranking: INITIAL_RANKING, // Reset to initial
      matchesPlayed: 0,
      wins: 0,
      losses: 0,
    })
  }
  return playerMap
}

async function fetchMatches(
  supabase: SupabaseClient,
  groupId: string,
  seasonId?: string,
): Promise<DbMatch[]> {
  let query = supabase
    .from('matches')
    .select('*')
    .eq('group_id', groupId)
    .order('match_date', { ascending: true })
    .order('match_time', { ascending: true })
    .order('created_at', { ascending: true })

  if (seasonId) {
    query = query.eq('season_id', seasonId)
  }

  const { data, error } = await query

  if (error) throw new Error(`Failed to fetch matches: ${error.message}`)
  return (data as DbMatch[]) || []
}

// === Match Replay ===

function replayMatch(
  match: DbMatch,
  playerStates: Map<string, PlayerState>,
  seasonStates: Map<string, PlayerSeasonState>,
): ReplayResult {
  const team1Won = match.team1_score > match.team2_score

  // Get or initialize season state for a player
  const getOrInitSeasonState = (playerId: string): PlayerSeasonState => {
    const key = `${playerId}:${match.season_id}`
    const existing = seasonStates.get(key)
    if (existing) {
      return existing
    }
    const newState: PlayerSeasonState = {
      playerId,
      seasonId: match.season_id,
      ranking: INITIAL_RANKING,
      matchesPlayed: 0,
      wins: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
    }
    seasonStates.set(key, newState)
    return newState
  }

  // Get season stats for all 4 players
  const t1p1Season = getOrInitSeasonState(match.team1_player1_id)
  const t1p2Season = getOrInitSeasonState(match.team1_player2_id)
  const t2p1Season = getOrInitSeasonState(match.team2_player1_id)
  const t2p2Season = getOrInitSeasonState(match.team2_player2_id)

  // Calculate team average rankings using SEASON rankings
  const team1AvgRanking = (t1p1Season.ranking + t1p2Season.ranking) / 2
  const team2AvgRanking = (t2p1Season.ranking + t2p2Season.ranking) / 2

  // Store pre-rankings
  const preRankings: Record<string, number> = {
    [match.team1_player1_id]: t1p1Season.ranking,
    [match.team1_player2_id]: t1p2Season.ranking,
    [match.team2_player1_id]: t2p1Season.ranking,
    [match.team2_player2_id]: t2p2Season.ranking,
  }

  // Calculate new rankings
  const postRankings: Record<string, number> = {
    [match.team1_player1_id]: calculateNewRanking(t1p1Season.ranking, team2AvgRanking, team1Won),
    [match.team1_player2_id]: calculateNewRanking(t1p2Season.ranking, team2AvgRanking, team1Won),
    [match.team2_player1_id]: calculateNewRanking(t2p1Season.ranking, team1AvgRanking, !team1Won),
    [match.team2_player2_id]: calculateNewRanking(t2p2Season.ranking, team1AvgRanking, !team1Won),
  }

  // Update season stats helper
  const updateSeasonStats = (stats: PlayerSeasonState, isTeam1: boolean) => {
    const won = isTeam1 ? team1Won : !team1Won
    stats.ranking = postRankings[stats.playerId]
    stats.matchesPlayed++
    stats.wins += won ? 1 : 0
    stats.losses += won ? 0 : 1
    stats.goalsFor += isTeam1 ? match.team1_score : match.team2_score
    stats.goalsAgainst += isTeam1 ? match.team2_score : match.team1_score
  }

  updateSeasonStats(t1p1Season, true)
  updateSeasonStats(t1p2Season, true)
  updateSeasonStats(t2p1Season, false)
  updateSeasonStats(t2p2Season, false)

  // Update global player stats
  const updateGlobalStats = (playerId: string, isTeam1: boolean) => {
    const player = playerStates.get(playerId)
    if (!player) return
    const won = isTeam1 ? team1Won : !team1Won
    player.ranking = postRankings[playerId]
    player.matchesPlayed++
    player.wins += won ? 1 : 0
    player.losses += won ? 0 : 1
  }

  updateGlobalStats(match.team1_player1_id, true)
  updateGlobalStats(match.team1_player2_id, true)
  updateGlobalStats(match.team2_player1_id, false)
  updateGlobalStats(match.team2_player2_id, false)

  // Build result for logging
  const playerIds = [
    match.team1_player1_id,
    match.team1_player2_id,
    match.team2_player1_id,
    match.team2_player2_id,
  ]

  const playerChanges = playerIds.map((id) => ({
    playerId: id,
    playerName: playerStates.get(id)?.name || 'Unknown',
    preRanking: preRankings[id],
    postRanking: postRankings[id],
    change: postRankings[id] - preRankings[id],
  }))

  return {
    matchId: match.id,
    matchDate: match.match_date,
    matchTime: match.match_time,
    score: `${match.team1_score}-${match.team2_score}`,
    playerChanges,
  }
}

// === Database Updates ===

async function updateDatabase(
  supabase: SupabaseClient,
  players: Map<string, PlayerState>,
  seasonStats: Map<string, PlayerSeasonState>,
  matchUpdates: MatchRankingUpdate[],
  config: ScriptConfig,
): Promise<void> {
  if (config.dryRun) {
    console.log('\n[DRY RUN] Would update:')
    console.log(`  - ${players.size} players`)
    console.log(`  - ${seasonStats.size} player season stats entries`)
    console.log(`  - ${matchUpdates.length} match records`)
    return
  }

  console.log('\nUpdating database...')

  // Update players table
  let playerErrors = 0
  for (const player of players.values()) {
    const { error } = await supabase
      .from('players')
      .update({
        ranking: player.ranking,
        matches_played: player.matchesPlayed,
        wins: player.wins,
        losses: player.losses,
      })
      .eq('id', player.id)

    if (error) {
      console.error(`  Failed to update player ${player.name}: ${error.message}`)
      playerErrors++
    }
  }
  console.log(`  Updated ${players.size - playerErrors} players`)

  // Update player_season_stats table (upsert)
  let seasonErrors = 0
  for (const stats of seasonStats.values()) {
    const { error } = await supabase.from('player_season_stats').upsert(
      {
        player_id: stats.playerId,
        season_id: stats.seasonId,
        ranking: stats.ranking,
        matches_played: stats.matchesPlayed,
        wins: stats.wins,
        losses: stats.losses,
        goals_for: stats.goalsFor,
        goals_against: stats.goalsAgainst,
      },
      {
        onConflict: 'player_id,season_id',
      },
    )

    if (error) {
      console.error(
        `  Failed to update season stats for player ${stats.playerId}: ${error.message}`,
      )
      seasonErrors++
    }
  }
  console.log(`  Updated ${seasonStats.size - seasonErrors} season stats entries`)

  // Update match ranking fields
  let matchErrors = 0
  for (const update of matchUpdates) {
    const { error } = await supabase.from('matches').update(update.rankings).eq('id', update.id)

    if (error) {
      console.error(`  Failed to update match ${update.id}: ${error.message}`)
      matchErrors++
    }
  }
  console.log(`  Updated ${matchUpdates.length - matchErrors} match records`)
}

// === Main ===

async function main(): Promise<void> {
  console.log('=== Foosball Stats Regeneration Script ===\n')

  const config = loadConfig()

  if (!config.groupId) {
    console.error('Error: --group-id is required')
    console.log(
      '\nUsage: npx tsx scripts/regenerate-stats.ts --group-id=<uuid> [--season-id=<uuid>] [--dry-run] [--verbose]',
    )
    process.exit(1)
  }

  console.log('Configuration:')
  console.log(`  Group ID: ${config.groupId}`)
  console.log(`  Season ID: ${config.seasonId || '(all seasons)'}`)
  console.log(`  Dry Run: ${config.dryRun}`)
  console.log(`  Verbose: ${config.verbose}`)
  console.log('')

  const supabase = createSupabaseClient()

  // Fetch data
  console.log('Fetching data...')
  const players = await fetchPlayers(supabase, config.groupId)
  console.log(`  Found ${players.size} players`)

  const matches = await fetchMatches(supabase, config.groupId, config.seasonId || undefined)
  console.log(`  Found ${matches.length} matches to replay`)

  if (matches.length === 0) {
    console.log('\nNo matches to process. Exiting.')
    return
  }

  // Initialize season stats map
  const seasonStats = new Map<string, PlayerSeasonState>()

  // Track match updates for ranking fields
  const matchUpdates: MatchRankingUpdate[] = []

  // Replay all matches
  console.log('\nReplaying matches...')
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i]
    const result = replayMatch(match, players, seasonStats)

    // Store match ranking update
    matchUpdates.push({
      id: match.id,
      rankings: {
        team1_player1_pre_ranking: result.playerChanges[0].preRanking,
        team1_player1_post_ranking: result.playerChanges[0].postRanking,
        team1_player2_pre_ranking: result.playerChanges[1].preRanking,
        team1_player2_post_ranking: result.playerChanges[1].postRanking,
        team2_player1_pre_ranking: result.playerChanges[2].preRanking,
        team2_player1_post_ranking: result.playerChanges[2].postRanking,
        team2_player2_pre_ranking: result.playerChanges[3].preRanking,
        team2_player2_post_ranking: result.playerChanges[3].postRanking,
      },
    })

    if (config.verbose) {
      console.log(
        `  [${i + 1}/${matches.length}] ${result.matchDate} ${result.matchTime} (${result.score})`,
      )
      for (const pc of result.playerChanges) {
        const sign = pc.change >= 0 ? '+' : ''
        console.log(
          `    ${pc.playerName}: ${pc.preRanking} -> ${pc.postRanking} (${sign}${pc.change})`,
        )
      }
    } else if ((i + 1) % 10 === 0 || i === matches.length - 1) {
      console.log(`  Processed ${i + 1}/${matches.length} matches`)
    }
  }

  // Print final rankings
  console.log('\n=== Final Player Rankings ===')
  const sortedPlayers = [...players.values()].sort((a, b) => b.ranking - a.ranking)
  for (const player of sortedPlayers) {
    console.log(`  ${player.name}: ${player.ranking} (${player.wins}W-${player.losses}L)`)
  }

  // Print season stats summary
  console.log('\n=== Season Stats Summary ===')
  const sortedSeasonStats = [...seasonStats.values()].sort((a, b) => b.ranking - a.ranking)
  for (const stats of sortedSeasonStats) {
    const playerName = players.get(stats.playerId)?.name || 'Unknown'
    const goalDiff = stats.goalsFor - stats.goalsAgainst
    const goalDiffStr = goalDiff >= 0 ? `+${goalDiff}` : `${goalDiff}`
    console.log(
      `  ${playerName}: ${stats.ranking} (${stats.wins}W-${stats.losses}L, GF:${stats.goalsFor} GA:${stats.goalsAgainst} GD:${goalDiffStr})`,
    )
  }

  // Update database
  await updateDatabase(supabase, players, seasonStats, matchUpdates, config)

  console.log('\nDone!')
}

main().catch((err) => {
  console.error('Script failed:', err)
  process.exit(1)
})
