import type { Match, Player, PlayerPosition } from '@/types'

export interface TeamAssignment {
  team1: {
    attacker: Player
    defender: Player
  }
  team2: {
    attacker: Player
    defender: Player
  }
  rankingDifference: number
  confidence: number
}

export interface PositionPreference {
  playerId: string
  attackerWinRate: number
  defenderWinRate: number
  preferredPosition: PlayerPosition | null
  confidence: number // 0-1, based on number of games played
}

/**
 * Calculate position preferences for a player based on their match history
 *
 * MATHEMATICAL APPROACH:
 * 1. Without match data: Use neutral assumptions
 *    - Both positions get 50% win rate (no bias)
 *    - No preferred position (null)
 *    - Low confidence (30%) since we have no actual data
 *
 * 2. With match data: Use actual performance statistics
 *    - confidence = min(totalGames / 10, 1) - linear confidence growth to 100% at 10 games
 *    - Position preference threshold = 5% win rate difference to avoid noise
 */
export const calculatePositionPreferences = (
  player: Player,
  positionStats?: {
    gamesAsAttacker: number
    gamesAsDefender: number
    winRateAsAttacker: number
    winRateAsDefender: number
  },
): PositionPreference => {
  if (
    !positionStats ||
    (positionStats.gamesAsAttacker === 0 && positionStats.gamesAsDefender === 0)
  ) {
    // NEUTRAL HEURISTIC: No position data available
    // We make no assumptions about player skill affecting position preference
    return {
      playerId: player.id,
      attackerWinRate: 50, // Neutral 50% win rate for both positions
      defenderWinRate: 50, // Neutral 50% win rate for both positions
      preferredPosition: null, // No preference without data
      confidence: 0.3, // Low confidence without match data (30%)
    }
  }

  const totalGames = positionStats.gamesAsAttacker + positionStats.gamesAsDefender
  // CONFIDENCE CALCULATION: Linear growth to 100% confidence at 10 games
  const confidence = Math.min(totalGames / 10, 1)

  // PREFERENCE DETECTION: Require 5% win rate difference to establish preference
  // This threshold filters out statistical noise from small sample sizes
  const preferredPosition: PlayerPosition | null =
    positionStats.winRateAsAttacker > positionStats.winRateAsDefender + 5
      ? 'attacker'
      : positionStats.winRateAsDefender > positionStats.winRateAsAttacker + 5
        ? 'defender'
        : null // No clear preference if difference < 5%

  return {
    playerId: player.id,
    attackerWinRate: positionStats.winRateAsAttacker,
    defenderWinRate: positionStats.winRateAsDefender,
    preferredPosition,
    confidence,
  }
}

/**
 * Generate all possible team combinations from a pool of 4-7 players
 *
 * COMBINATORIAL MATHEMATICS:
 * For N players, we need to choose 4 players and split them into 2 teams of 2.
 *
 * Total combinations = C(N,2) × C(N-2,2) / 2
 * - C(N,2) ways to pick first team pair
 * - C(N-2,2) ways to pick second team pair from remaining players
 * - Divide by 2 because team order doesn't matter (Team1 vs Team2 is same as Team2 vs Team1)
 *
 * Examples:
 * - 4 players: C(4,2) × C(2,2) / 2 = 6 × 1 / 2 = 3 combinations
 * - 5 players: C(5,2) × C(3,2) = 10 × 3 = 30 combinations (4 players selected from 5)
 * - 6 players: C(6,2) × C(4,2) = 15 × 6 = 90 combinations (4 players selected from 6)
 */
export const generateTeamCombinations = (
  players: Player[],
): { team1: [Player, Player]; team2: [Player, Player] }[] => {
  if (players.length < 4 || players.length > 7) {
    throw new Error('Player pool must contain 4-7 players')
  }

  const combinations: { team1: [Player, Player]; team2: [Player, Player] }[] = []

  // NESTED LOOP ALGORITHM: Generate all C(N,2) × C(N-2,2) combinations
  // Outer loops: Select 2 players for team1 (C(N,2) combinations)
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const team1Players = [players[i], players[j]]
      const remainingPlayers = players.filter((_, idx) => idx !== i && idx !== j)

      // Inner loops: Select 2 players for team2 from remaining players (C(N-2,2) combinations)
      for (let k = 0; k < remainingPlayers.length; k++) {
        for (let l = k + 1; l < remainingPlayers.length; l++) {
          const team2Players = [remainingPlayers[k], remainingPlayers[l]]

          combinations.push({
            team1: [team1Players[0], team1Players[1]],
            team2: [team2Players[0], team2Players[1]],
          })
        }
      }
    }
  }

  return combinations
}

/**
 * Calculate the quality score for a team assignment based on ranking balance and position preferences
 *
 * QUALITY SCORING ALGORITHM:
 * The quality score combines two main factors:
 *
 * 1. RANKING BALANCE SCORE (80% weight):
 *    - rankingDifference = |sum(team1_rankings) - sum(team2_rankings)|
 *    - rankingScore = 1 - min(rankingDifference / maxExpectedDiff, 1)
 *    - Perfectly balanced teams (diff=0) get score 1.0
 *    - Teams with difference ≥ maxExpectedDiff get score 0.0
 *
 * 2. POSITION HAPPINESS SCORE (20% weight):
 *    - For each player: happiness = 0.5 + (assignedWinRate - alternativeWinRate) / 100
 *    - Weighted average by confidence: sum(happiness × confidence) / sum(confidence)
 *    - Players in preferred positions contribute more to overall happiness
 *
 * 3. COMBINED SCORE:
 *    - finalScore = rankingScore × 0.8 + positionHappiness × 0.2
 *    - This prioritizes balanced teams while considering position preferences
 */
export const calculateTeamQuality = (
  assignment: { team1: [Player, Player]; team2: [Player, Player] },
  positionAssignment: {
    team1: { attacker: Player; defender: Player }
    team2: { attacker: Player; defender: Player }
  },
  positionPreferences: PositionPreference[],
): { score: number; rankingDifference: number; positionHappiness: number } => {
  // STEP 1: RANKING BALANCE CALCULATION
  const team1Ranking = assignment.team1[0].ranking + assignment.team1[1].ranking
  const team2Ranking = assignment.team2[0].ranking + assignment.team2[1].ranking
  const rankingDifference = Math.abs(team1Ranking - team2Ranking)

  // STEP 2: POSITION HAPPINESS CALCULATION
  // Calculate how well players match their preferred positions
  let positionHappiness = 0
  let totalConfidence = 0

  const checkPositionFit = (player: Player, assignedPosition: PlayerPosition) => {
    const pref = positionPreferences.find((p) => p.playerId === player.id)
    if (!pref) return { happiness: 0.5, confidence: 0.3 } // Neutral if no data

    const assignedWinRate =
      assignedPosition === 'attacker' ? pref.attackerWinRate : pref.defenderWinRate
    const alternativeWinRate =
      assignedPosition === 'attacker' ? pref.defenderWinRate : pref.attackerWinRate

    // HAPPINESS FORMULA: Convert win rate difference to 0-1 happiness scale
    // If assigned position has 70% win rate and alternative has 50%, happiness = 0.5 + 20/100 = 0.7
    const winRateDiff = assignedWinRate - alternativeWinRate
    const happiness = 0.5 + winRateDiff / 100 // Convert percentage difference to 0-1 scale

    return {
      happiness: Math.max(0, Math.min(1, happiness)), // Clamp to [0,1] range
      confidence: pref.confidence,
    }
  }

  const team1AttackerFit = checkPositionFit(positionAssignment.team1.attacker, 'attacker')
  const team1DefenderFit = checkPositionFit(positionAssignment.team1.defender, 'defender')
  const team2AttackerFit = checkPositionFit(positionAssignment.team2.attacker, 'attacker')
  const team2DefenderFit = checkPositionFit(positionAssignment.team2.defender, 'defender')

  // WEIGHTED AVERAGE: Weight each player's happiness by their confidence level
  positionHappiness =
    team1AttackerFit.happiness * team1AttackerFit.confidence +
    team1DefenderFit.happiness * team1DefenderFit.confidence +
    team2AttackerFit.happiness * team2AttackerFit.confidence +
    team2DefenderFit.happiness * team2DefenderFit.confidence

  totalConfidence =
    team1AttackerFit.confidence +
    team1DefenderFit.confidence +
    team2AttackerFit.confidence +
    team2DefenderFit.confidence

  if (totalConfidence > 0) {
    positionHappiness = positionHappiness / totalConfidence
  } else {
    positionHappiness = 0.5 // Neutral if no confidence data
  }

  // STEP 3: COMBINE SCORES WITH WEIGHTED FORMULA
  // Ranking balance is prioritized (80%) over position happiness (20%)
  const maxRankingDiff = 400 // Maximum expected ranking difference for normalization (e.g., 2000+1600 vs 1200+800 = 400)
  const rankingScore = 1 - Math.min(rankingDifference / maxRankingDiff, 1)

  const combinedScore = rankingScore * 0.8 + positionHappiness * 0.2

  return {
    score: combinedScore,
    rankingDifference,
    positionHappiness,
  }
}

/**
 * Find the best position assignment for a given team pairing
 */
export const findBestPositions = (
  team1: [Player, Player],
  team2: [Player, Player],
  positionPreferences: PositionPreference[],
): {
  assignment: {
    team1: { attacker: Player; defender: Player }
    team2: { attacker: Player; defender: Player }
  }
  quality: { score: number; rankingDifference: number; positionHappiness: number }
} => {
  // There are 4 possible position assignments for each team pairing
  const possibleAssignments = [
    // Team1: [0]=attacker, [1]=defender, Team2: [0]=attacker, [1]=defender
    {
      team1: { attacker: team1[0], defender: team1[1] },
      team2: { attacker: team2[0], defender: team2[1] },
    },
    // Team1: [0]=attacker, [1]=defender, Team2: [1]=attacker, [0]=defender
    {
      team1: { attacker: team1[0], defender: team1[1] },
      team2: { attacker: team2[1], defender: team2[0] },
    },
    // Team1: [1]=attacker, [0]=defender, Team2: [0]=attacker, [1]=defender
    {
      team1: { attacker: team1[1], defender: team1[0] },
      team2: { attacker: team2[0], defender: team2[1] },
    },
    // Team1: [1]=attacker, [0]=defender, Team2: [1]=attacker, [0]=defender
    {
      team1: { attacker: team1[1], defender: team1[0] },
      team2: { attacker: team2[1], defender: team2[0] },
    },
  ]

  let bestAssignment = possibleAssignments[0]
  let bestQuality = calculateTeamQuality({ team1, team2 }, bestAssignment, positionPreferences)

  for (const assignment of possibleAssignments.slice(1)) {
    const quality = calculateTeamQuality({ team1, team2 }, assignment, positionPreferences)
    if (quality.score > bestQuality.score) {
      bestAssignment = assignment
      bestQuality = quality
    }
  }

  return {
    assignment: bestAssignment,
    quality: bestQuality,
  }
}

/**
 * Main matchmaking function: finds the best balanced teams from a player pool
 */
export const findBestMatchup = (
  players: Player[],
  positionPreferences?: PositionPreference[],
): TeamAssignment => {
  if (players.length < 4 || players.length > 7) {
    throw new Error('Player pool must contain 4-7 players')
  }

  // Generate position preferences if not provided
  const prefs = positionPreferences || players.map((player) => calculatePositionPreferences(player))

  // Generate all possible team combinations
  const teamCombinations = generateTeamCombinations(players)

  let bestMatchup: TeamAssignment | null = null
  let bestScore = -1

  for (const combination of teamCombinations) {
    const { assignment, quality } = findBestPositions(combination.team1, combination.team2, prefs)

    if (quality.score > bestScore) {
      bestScore = quality.score
      bestMatchup = {
        team1: assignment.team1,
        team2: assignment.team2,
        rankingDifference: quality.rankingDifference,
        confidence: Math.min(1, quality.score),
      }
    }
  }

  if (!bestMatchup) {
    throw new Error('Could not find suitable matchup')
  }

  return bestMatchup
}

/**
 * Calculate how frequently two players have played together
 */
export const calculatePairingFrequency = (
  player1Id: string,
  player2Id: string,
  matches: Match[],
): number => {
  let gamesAsSameTeam = 0
  let gamesAsOpponents = 0

  for (const match of matches) {
    const player1InTeam1 = match.team1[0].id === player1Id || match.team1[1].id === player1Id
    const player2InTeam1 = match.team1[0].id === player2Id || match.team1[1].id === player2Id
    const player1InTeam2 = match.team2[0].id === player1Id || match.team2[1].id === player1Id
    const player2InTeam2 = match.team2[0].id === player2Id || match.team2[1].id === player2Id

    // Check if they were on the same team
    if ((player1InTeam1 && player2InTeam1) || (player1InTeam2 && player2InTeam2)) {
      gamesAsSameTeam++
    }
    // Check if they were opponents
    else if ((player1InTeam1 && player2InTeam2) || (player1InTeam2 && player2InTeam1)) {
      gamesAsOpponents++
    }
  }

  return gamesAsSameTeam + gamesAsOpponents
}

/**
 * Calculate the rarity score for a team combination
 * Lower score = more rare (preferred in rare matchup mode)
 */
export const calculateRarityScore = (
  combination: { team1: [Player, Player]; team2: [Player, Player] },
  matches: Match[],
): number => {
  let totalFrequency = 0

  // Sum up frequencies of all pairings in this combination
  // Team 1 internal pairing
  totalFrequency += calculatePairingFrequency(
    combination.team1[0].id,
    combination.team1[1].id,
    matches,
  )

  // Team 2 internal pairing
  totalFrequency += calculatePairingFrequency(
    combination.team2[0].id,
    combination.team2[1].id,
    matches,
  )

  // Cross-team pairings (as opponents)
  totalFrequency += calculatePairingFrequency(
    combination.team1[0].id,
    combination.team2[0].id,
    matches,
  )
  totalFrequency += calculatePairingFrequency(
    combination.team1[0].id,
    combination.team2[1].id,
    matches,
  )
  totalFrequency += calculatePairingFrequency(
    combination.team1[1].id,
    combination.team2[0].id,
    matches,
  )
  totalFrequency += calculatePairingFrequency(
    combination.team1[1].id,
    combination.team2[1].id,
    matches,
  )

  return totalFrequency
}

/**
 * Find the best rare matchup from a player pool
 */
export const findRareMatchup = (players: Player[], matches: Match[]): TeamAssignment => {
  if (players.length < 4 || players.length > 7) {
    throw new Error('Player pool must contain 4-7 players')
  }

  // Generate all possible team combinations
  const teamCombinations = generateTeamCombinations(players)

  // Find the combination with the lowest rarity score
  let bestMatchup: { team1: [Player, Player]; team2: [Player, Player] } | null = null
  let lowestRarityScore = Infinity

  for (const combination of teamCombinations) {
    const rarityScore = calculateRarityScore(combination, matches)

    if (rarityScore < lowestRarityScore) {
      lowestRarityScore = rarityScore
      bestMatchup = combination
    }
  }

  if (!bestMatchup) {
    throw new Error('Could not find suitable matchup')
  }

  // For rare matchups, assign positions randomly
  const randomizePositions = (team: [Player, Player]): { attacker: Player; defender: Player } => {
    const randomIndex = Math.random() < 0.5 ? 0 : 1
    return {
      attacker: team[randomIndex],
      defender: team[1 - randomIndex],
    }
  }

  const team1Positions = randomizePositions(bestMatchup.team1)
  const team2Positions = randomizePositions(bestMatchup.team2)

  // Calculate ranking difference for display purposes
  const team1Ranking = bestMatchup.team1[0].ranking + bestMatchup.team1[1].ranking
  const team2Ranking = bestMatchup.team2[0].ranking + bestMatchup.team2[1].ranking
  const rankingDifference = Math.abs(team1Ranking - team2Ranking)

  return {
    team1: team1Positions,
    team2: team2Positions,
    rankingDifference,
    confidence: 1 - Math.min(lowestRarityScore / 20, 1), // Higher confidence for rarer matchups
  }
}

/**
 * Utility function to format team assignment for display
 */
export const formatTeamAssignment = (assignment: TeamAssignment): string => {
  const team1Str = `Team 1: ${assignment.team1.attacker.name} (A) + ${assignment.team1.defender.name} (D)`
  const team2Str = `Team 2: ${assignment.team2.attacker.name} (A) + ${assignment.team2.defender.name} (D)`
  const diffStr = `Ranking difference: ${assignment.rankingDifference}`
  const confStr = `Confidence: ${Math.round(assignment.confidence * 100)}%`

  return `${team1Str}\n${team2Str}\n${diffStr}, ${confStr}`
}
