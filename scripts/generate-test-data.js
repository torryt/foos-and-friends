#!/usr/bin/env node

import { randomUUID } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { faker } from '@faker-js/faker'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Configuration defaults
const DEFAULT_CONFIG = {
  players: 30,
  matches: 100,
  groupName: 'Generated Champions',
  groupDescription: 'Auto-generated group with realistic test data',
  months: 12,
  locale: 'en',
  sportType: 'foosball',
}

const DEPARTMENTS = ['Engineering', 'Product', 'Design', 'Marketing', 'Sales', 'Operations']

const AVATARS = [
  '👑',
  '🏆',
  '⚡',
  '🎯',
  '🚀',
  '🎮',
  '💫',
  '🔥',
  '🌟',
  '⭐',
  '💎',
  '🏅',
  '🎨',
  '🎲',
  '🌈',
  '🎪',
  '🎭',
  '🌺',
  '🍀',
  '🎸',
  '🦋',
  '🏃',
  '🌸',
  '🌻',
  '⚡',
  '🎯',
]

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2)
  const config = { ...DEFAULT_CONFIG }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    if (arg === '--help' || arg === '-h') {
      showHelp()
      process.exit(0)
    }

    if (arg.startsWith('--')) {
      const [key, value] = arg.substring(2).split('=')

      switch (key) {
        case 'user-id':
          config.userId = value
          break
        case 'players':
          config.players = parseInt(value, 10) || DEFAULT_CONFIG.players
          break
        case 'matches':
          config.matches = parseInt(value, 10) || DEFAULT_CONFIG.matches
          break
        case 'group-name':
          config.groupName = value || DEFAULT_CONFIG.groupName
          break
        case 'group-description':
          config.groupDescription = value || DEFAULT_CONFIG.groupDescription
          break
        case 'months':
          config.months = parseInt(value, 10) || DEFAULT_CONFIG.months
          break
        case 'locale':
          config.locale = value || DEFAULT_CONFIG.locale
          break
        case 'sport-type':
          if (value === 'foosball' || value === 'padel') {
            config.sportType = value
          } else {
            console.error('❌ Error: --sport-type must be "foosball" or "padel"')
            process.exit(1)
          }
          break
      }
    }
  }

  if (!config.userId) {
    console.error('❌ Error: --user-id parameter is required')
    showHelp()
    process.exit(1)
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(config.userId)) {
    console.error('❌ Error: Invalid UUID format for user-id')
    process.exit(1)
  }

  return config
}

function showHelp() {
  console.log(`
🏓 Game Tracker Test Data Generator

Generate realistic SQL test data for foosball or padel groups with configurable parameters.

Usage:
  npm run generate -- --user-id=<UUID> [options]

Required Parameters:
  --user-id=<UUID>         UUID of existing user (owner/creator of all data)

Optional Parameters:
  --players=<number>       Number of players to generate (default: 30)
  --matches=<number>       Number of matches to generate (default: 100)
  --group-name=<string>    Name of the group (default: "Generated Champions")
  --group-description=<string>  Group description
  --months=<number>        Time span for matches in months (default: 12)
  --locale=<string>        Faker locale for names (default: "en")
  --sport-type=<string>    Sport type: "foosball" or "padel" (default: "foosball")

Examples:
  npm run generate -- --user-id="a29f3a94-99ff-45c3-8134-1c41ee6bc460"
  npm run generate -- --user-id="a29f3a94-99ff-45c3-8134-1c41ee6bc460" --sport-type=padel --group-name="Padel Pros"
  npm run generate -- --user-id="a29f3a94-99ff-45c3-8134-1c41ee6bc460" --players=50 --matches=200
  npm run generate -- --user-id="a29f3a94-99ff-45c3-8134-1c41ee6bc460" --group-name="Office Champions" --months=6
  `)
}

// ELO rating calculation
function calculateEloChange(playerRating, opponentRating, score, kFactor = 32) {
  const expectedScore = 1 / (1 + 10 ** ((opponentRating - playerRating) / 400))
  return Math.round(kFactor * (score - expectedScore))
}

// Generate realistic ELO distribution (bell curve around 1000-1200)
function generateEloRating() {
  // Use Box-Muller transform for normal distribution
  const u1 = Math.random()
  const u2 = Math.random()
  const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)

  // Mean: 1100, Standard deviation: 150
  const rating = Math.round(1100 + z0 * 150)

  // Clamp between 800-1600
  return Math.max(800, Math.min(1600, rating))
}

// Generate a player
function generatePlayer(groupId, userId) {
  const firstName = faker.person.firstName()
  const lastName = faker.person.lastName()
  const name = `${firstName} ${lastName}`
  const department = faker.helpers.arrayElement(DEPARTMENTS)
  const avatar = faker.helpers.arrayElement(AVATARS)
  const rating = generateEloRating()

  return {
    id: randomUUID(),
    name,
    avatar,
    department,
    group_id: groupId,
    created_by: userId,
    // Rating is used for match generation but not stored (computed from matches)
    _initialRating: rating,
  }
}

// Generate matches with realistic ELO progression
function generateMatches(players, groupId, seasonId, userId, config) {
  const matches = []
  const playerStats = players.map((p) => ({
    id: p.id,
    rating: p._initialRating,
    matches: 0,
    wins: 0,
    losses: 0,
  }))

  const startDate = new Date()
  startDate.setMonth(startDate.getMonth() - config.months)

  for (let i = 0; i < config.matches; i++) {
    // Pick 4 random players
    const shuffled = [...playerStats].sort(() => Math.random() - 0.5)
    const team1 = [shuffled[0], shuffled[1]]
    const team2 = [shuffled[2], shuffled[3]]

    // Calculate team averages
    const team1Avg = (team1[0].rating + team1[1].rating) / 2
    const team2Avg = (team2[0].rating + team2[1].rating) / 2

    // Generate realistic score (10-0 to 10-8, favoring closer games)
    let team1Score, team2Score
    const scoreDiff = Math.random()

    if (scoreDiff < 0.4) {
      // Close game (8-10, 9-10)
      team1Score = Math.random() > 0.5 ? 10 : 8 + Math.floor(Math.random() * 2)
      team2Score = team1Score === 10 ? 8 + Math.floor(Math.random() * 2) : 10
    } else {
      // More decisive win
      team1Score = Math.random() > 0.5 ? 10 : Math.floor(Math.random() * 8)
      team2Score = team1Score === 10 ? Math.floor(Math.random() * 8) : 10
    }

    // Determine winner and update ratings
    const team1Won = team1Score === 10
    const team1Players = [team1[0], team1[1]]
    const team2Players = [team2[0], team2[1]]

    // Store pre-game ratings
    const preRatings = {
      team1_player1: team1Players[0].rating,
      team1_player2: team1Players[1].rating,
      team2_player1: team2Players[0].rating,
      team2_player2: team2Players[1].rating,
    }

    // Update ratings using ELO
    team1Players.forEach((player) => {
      const change = calculateEloChange(team1Avg, team2Avg, team1Won ? 1 : 0)
      player.rating = Math.max(800, Math.min(2400, player.rating + change))
      player.matches++
      if (team1Won) player.wins++
      else player.losses++
    })

    team2Players.forEach((player) => {
      const change = calculateEloChange(team2Avg, team1Avg, team1Won ? 0 : 1)
      player.rating = Math.max(800, Math.min(2400, player.rating + change))
      player.matches++
      if (!team1Won) player.wins++
      else player.losses++
    })

    // Generate match date (distributed over time period)
    const dayOffset = Math.floor((i / config.matches) * (config.months * 30))
    const matchDate = new Date(startDate)
    matchDate.setDate(matchDate.getDate() + dayOffset)

    // Add some randomness to the time
    const hour = 12 + Math.floor(Math.random() * 6) // 12:00 to 17:59
    const minute = Math.floor(Math.random() * 60)

    matches.push({
      id: randomUUID(),
      group_id: groupId,
      season_id: seasonId,
      team1_player1_id: team1Players[0].id,
      team1_player2_id: team1Players[1].id,
      team2_player1_id: team2Players[0].id,
      team2_player2_id: team2Players[1].id,
      team1_score: team1Score,
      team2_score: team2Score,
      match_date: matchDate.toISOString().split('T')[0],
      match_time: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`,
      recorded_by: userId,
      created_at: matchDate.toISOString(),
      team1_player1_pre_ranking: preRatings.team1_player1,
      team1_player1_post_ranking: team1Players[0].rating,
      team1_player2_pre_ranking: preRatings.team1_player2,
      team1_player2_post_ranking: team1Players[1].rating,
      team2_player1_pre_ranking: preRatings.team2_player1,
      team2_player1_post_ranking: team2Players[0].rating,
      team2_player2_pre_ranking: preRatings.team2_player2,
      team2_player2_post_ranking: team2Players[1].rating,
    })
  }

  // Store final stats for summary (not stored in DB, computed from matches)
  players.forEach((player) => {
    const stats = playerStats.find((s) => s.id === player.id)
    player._finalRating = stats.rating
    player._matchesPlayed = stats.matches
  })

  return matches
}

// Generate SQL output
function generateSQL(config, groupId, seasonId, players, matches) {
  const inviteCode = faker.string.alphanumeric({ length: 8, casing: 'lower' })
  const now = new Date().toISOString()
  const groupCreatedAt = new Date()
  groupCreatedAt.setMonth(groupCreatedAt.getMonth() - config.months)

  const sportEmoji = config.sportType === 'padel' ? '🎾' : '🏓'

  let sql = `-- Generated Test Data for ${config.sportType.charAt(0).toUpperCase() + config.sportType.slice(1)} Group
-- Generated on: ${new Date().toLocaleString()}
-- Configuration: ${config.players} players, ${config.matches} matches over ${config.months} months
-- User ID: ${config.userId}
-- Sport Type: ${config.sportType}

`

  // Generate group
  sql += `-- Create the group
INSERT INTO friend_groups (
    id,
    name,
    description,
    invite_code,
    owner_id,
    created_by,
    is_active,
    max_members,
    sport_type,
    created_at,
    updated_at
) VALUES (
    '${groupId}'::uuid,
    '${config.groupName.replace(/'/g, "''")}',
    '${config.groupDescription.replace(/'/g, "''")}',
    '${inviteCode}',
    '${config.userId}'::uuid,
    '${config.userId}'::uuid,
    true,
    50,
    '${config.sportType}',
    '${groupCreatedAt.toISOString()}',
    '${now}'
) ON CONFLICT (id) DO NOTHING;

`

  // Generate group membership
  sql += `-- Add owner membership
INSERT INTO group_memberships (
    id,
    group_id,
    user_id,
    role,
    is_active,
    invited_by,
    joined_at,
    created_at
) VALUES (
    '${randomUUID()}'::uuid,
    '${groupId}'::uuid,
    '${config.userId}'::uuid,
    'owner',
    true,
    NULL,
    '${groupCreatedAt.toISOString()}',
    '${groupCreatedAt.toISOString()}'
) ON CONFLICT (group_id, user_id) DO NOTHING;

`

  // Generate season
  sql += `-- Create initial season
INSERT INTO seasons (
    id,
    group_id,
    name,
    description,
    season_number,
    start_date,
    is_active,
    created_by,
    created_at,
    updated_at
) VALUES (
    '${seasonId}'::uuid,
    '${groupId}'::uuid,
    'Season 1',
    'Initial season with generated test data',
    1,
    '${groupCreatedAt.toISOString().split('T')[0]}',
    true,
    '${config.userId}'::uuid,
    '${groupCreatedAt.toISOString()}',
    '${now}'
) ON CONFLICT (id) DO NOTHING;

`

  // Generate players (stats are computed from matches, not stored)
  sql += `-- Create players
INSERT INTO players (
    id,
    name,
    avatar,
    department,
    group_id,
    created_by,
    created_at,
    updated_at
) VALUES\n`

  const playerValues = players.map((player) => {
    const createdAt = new Date(groupCreatedAt)
    createdAt.setDate(createdAt.getDate() + Math.floor(Math.random() * 30))
    return `    ('${player.id}'::uuid, '${player.name.replace(/'/g, "''")}', '${player.avatar}', '${player.department}', '${groupId}'::uuid, '${config.userId}'::uuid, '${createdAt.toISOString()}', '${now}')`
  })

  sql += `${playerValues.join(',\n')}\nON CONFLICT (id) DO NOTHING;\n\n`

  // Generate matches
  if (matches.length > 0) {
    sql += `-- Create matches
INSERT INTO matches (
    id,
    group_id,
    season_id,
    team1_player1_id,
    team1_player2_id,
    team2_player1_id,
    team2_player2_id,
    team1_score,
    team2_score,
    match_date,
    match_time,
    recorded_by,
    created_at,
    team1_player1_pre_ranking,
    team1_player1_post_ranking,
    team1_player2_pre_ranking,
    team1_player2_post_ranking,
    team2_player1_pre_ranking,
    team2_player1_post_ranking,
    team2_player2_pre_ranking,
    team2_player2_post_ranking
) VALUES\n`

    const matchValues = matches.map(
      (match) =>
        `    ('${match.id}'::uuid, '${match.group_id}'::uuid, '${match.season_id}'::uuid, '${match.team1_player1_id}'::uuid, '${match.team1_player2_id}'::uuid, '${match.team2_player1_id}'::uuid, '${match.team2_player2_id}'::uuid, ${match.team1_score}, ${match.team2_score}, '${match.match_date}', '${match.match_time}', '${match.recorded_by}'::uuid, '${match.created_at}', ${match.team1_player1_pre_ranking}, ${match.team1_player1_post_ranking}, ${match.team1_player2_pre_ranking}, ${match.team1_player2_post_ranking}, ${match.team2_player1_pre_ranking}, ${match.team2_player1_post_ranking}, ${match.team2_player2_pre_ranking}, ${match.team2_player2_post_ranking})`,
    )

    sql += `${matchValues.join(',\n')}\nON CONFLICT (id) DO NOTHING;\n\n`
  }

  // Add summary
  sql += `-- Summary
DO $$
BEGIN
    RAISE NOTICE '${sportEmoji} Test data generated successfully!';
    RAISE NOTICE 'Group: ${config.groupName} (ID: ${groupId})';
    RAISE NOTICE 'Sport: ${config.sportType}';
    RAISE NOTICE 'Invite Code: ${inviteCode}';
    RAISE NOTICE 'Season ID: ${seasonId}';
    RAISE NOTICE 'Players: ${config.players} with realistic ELO distribution';
    RAISE NOTICE 'Matches: ${config.matches} over ${config.months} months';
    RAISE NOTICE 'All data created by user: ${config.userId}';
END $$;`

  return sql
}

// Main function
function main() {
  try {
    const config = parseArgs()

    // Set faker locale (newer Faker.js API)
    faker.locale = config.locale

    const sportEmoji = config.sportType === 'padel' ? '🎾' : '🏓'

    console.log(`${sportEmoji} Generating ${config.sportType} test data...`)
    console.log(`📊 Configuration:`)
    console.log(`   User ID: ${config.userId}`)
    console.log(`   Sport Type: ${config.sportType}`)
    console.log(`   Players: ${config.players}`)
    console.log(`   Matches: ${config.matches}`)
    console.log(`   Group: "${config.groupName}"`)
    console.log(`   Time span: ${config.months} months`)
    console.log(`   Locale: ${config.locale}`)
    console.log()

    const groupId = randomUUID()
    const seasonId = randomUUID()

    // Generate data
    console.log('👥 Generating players...')
    const players = Array.from({ length: config.players }, () =>
      generatePlayer(groupId, config.userId),
    )

    console.log('⚽ Generating matches with ELO progression...')
    const matches = generateMatches(players, groupId, seasonId, config.userId, config)

    console.log('📝 Generating SQL...')
    const sql = generateSQL(config, groupId, seasonId, players, matches)

    // Write output
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
    const filename = `${config.sportType}-test-data-${timestamp}.sql`
    const outputPath = join(__dirname, 'output', filename)

    writeFileSync(outputPath, sql, 'utf8')

    console.log('✅ Generated successfully!')
    console.log(`📁 Output file: ${outputPath}`)
    console.log()
    console.log('📈 Statistics:')

    // Calculate some stats (from computed values during generation)
    const avgRating = Math.round(players.reduce((sum, p) => sum + (p._finalRating || p._initialRating), 0) / players.length)
    const minRating = Math.min(...players.map((p) => p._finalRating || p._initialRating))
    const maxRating = Math.max(...players.map((p) => p._finalRating || p._initialRating))
    const totalMatches = players.reduce((sum, p) => sum + (p._matchesPlayed || 0), 0)

    console.log(`   Average ELO: ${avgRating}`)
    console.log(`   ELO Range: ${minRating} - ${maxRating}`)
    console.log(`   Total match participations: ${totalMatches}`)
    console.log(`   Matches per player (avg): ${Math.round(totalMatches / config.players)}`)
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

main()
