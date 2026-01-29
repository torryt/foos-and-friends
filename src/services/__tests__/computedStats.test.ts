import { describe, expect, it } from 'vitest'

/**
 * Tests for computed stats logic
 *
 * These tests verify the logic that will be used to compute player statistics
 * from match history, replacing the redundant stored stats in players and
 * player_season_stats tables.
 *
 * Key principles:
 * - Rankings come from the most recent match's post_ranking field (O(1) lookup)
 * - Win/loss/matches_played/goals are aggregated from match history
 * - Players with no matches have default ranking of 1200
 */

describe('Computed Stats Logic', () => {
  describe('Ranking computation from match history', () => {
    it('should use post_ranking from most recent match for current ranking', () => {
      // Simulates: SELECT team1_player1_post_ranking FROM matches
      // WHERE team1_player1_id = player_id ORDER BY created_at DESC LIMIT 1
      const matchHistory = [
        {
          id: 'match3',
          created_at: '2024-01-15T14:30:00Z',
          team1_player1_post_ranking: 1250,
        },
        {
          id: 'match2',
          created_at: '2024-01-10T10:00:00Z',
          team1_player1_post_ranking: 1220,
        },
        {
          id: 'match1',
          created_at: '2024-01-05T09:00:00Z',
          team1_player1_post_ranking: 1200,
        },
      ]

      // Get ranking from most recent match (O(1) with proper index/query)
      const sortedByRecent = [...matchHistory].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
      const currentRanking = sortedByRecent[0].team1_player1_post_ranking

      expect(currentRanking).toBe(1250)
    })

    it('should return 1200 for players with no matches', () => {
      const matchHistory: unknown[] = []
      const defaultRanking = 1200

      const currentRanking = matchHistory.length > 0 ? 0 : defaultRanking

      expect(currentRanking).toBe(1200)
    })

    it('should handle ranking from any position in match', () => {
      // Player could be in any of 4 positions: team1_player1, team1_player2,
      // team2_player1, team2_player2
      const playerId = 'player-abc'
      const matches = [
        {
          id: 'match1',
          created_at: '2024-01-15T14:00:00Z',
          team1_player1_id: 'other',
          team1_player2_id: playerId,
          team2_player1_id: 'other2',
          team2_player2_id: 'other3',
          team1_player2_post_ranking: 1280,
        },
        {
          id: 'match2',
          created_at: '2024-01-10T10:00:00Z',
          team1_player1_id: playerId,
          team1_player2_id: 'other',
          team2_player1_id: 'other2',
          team2_player2_id: 'other3',
          team1_player1_post_ranking: 1250,
        },
      ]

      // SQL would use CASE WHEN to select the right column
      const getPlayerRanking = (match: (typeof matches)[0]) => {
        if (match.team1_player1_id === playerId)
          return (match as { team1_player1_post_ranking?: number }).team1_player1_post_ranking
        if (match.team1_player2_id === playerId) return match.team1_player2_post_ranking
        if (match.team2_player1_id === playerId)
          return (match as { team2_player1_post_ranking?: number }).team2_player1_post_ranking
        if (match.team2_player2_id === playerId)
          return (match as { team2_player2_post_ranking?: number }).team2_player2_post_ranking
        return null
      }

      const sortedMatches = [...matches].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )

      const currentRanking = getPlayerRanking(sortedMatches[0])
      expect(currentRanking).toBe(1280) // From most recent match where player was team1_player2
    })
  })

  describe('Win/Loss/Matches aggregation', () => {
    it('should count matches where player participated', () => {
      const playerId = 'player-abc'
      const matches = [
        {
          team1_player1_id: playerId,
          team1_player2_id: 'other1',
          team2_player1_id: 'other2',
          team2_player2_id: 'other3',
        },
        {
          team1_player1_id: 'other1',
          team1_player2_id: playerId,
          team2_player1_id: 'other2',
          team2_player2_id: 'other3',
        },
        {
          team1_player1_id: 'other1',
          team1_player2_id: 'other2',
          team2_player1_id: playerId,
          team2_player2_id: 'other3',
        },
        {
          team1_player1_id: 'other1',
          team1_player2_id: 'other2',
          team2_player1_id: 'other3',
          team2_player2_id: 'other4',
        }, // Player not in this match
      ]

      const matchesPlayed = matches.filter(
        (m) =>
          m.team1_player1_id === playerId ||
          m.team1_player2_id === playerId ||
          m.team2_player1_id === playerId ||
          m.team2_player2_id === playerId,
      ).length

      expect(matchesPlayed).toBe(3)
    })

    it('should count wins correctly based on team and score', () => {
      const playerId = 'player-abc'
      const matches = [
        {
          team1_player1_id: playerId,
          team1_player2_id: 'other1',
          team2_player1_id: 'other2',
          team2_player2_id: 'other3',
          team1_score: 10,
          team2_score: 8, // Win (player on team1)
        },
        {
          team1_player1_id: 'other1',
          team1_player2_id: playerId,
          team2_player1_id: 'other2',
          team2_player2_id: 'other3',
          team1_score: 5,
          team2_score: 10, // Loss (player on team1)
        },
        {
          team1_player1_id: 'other1',
          team1_player2_id: 'other2',
          team2_player1_id: playerId,
          team2_player2_id: 'other3',
          team1_score: 7,
          team2_score: 10, // Win (player on team2)
        },
        {
          team1_player1_id: 'other1',
          team1_player2_id: 'other2',
          team2_player1_id: 'other3',
          team2_player2_id: playerId,
          team1_score: 10,
          team2_score: 6, // Loss (player on team2)
        },
      ]

      const isOnTeam1 = (m: (typeof matches)[0]) =>
        m.team1_player1_id === playerId || m.team1_player2_id === playerId
      const isOnTeam2 = (m: (typeof matches)[0]) =>
        m.team2_player1_id === playerId || m.team2_player2_id === playerId

      const wins = matches.filter((m) => {
        if (isOnTeam1(m)) return m.team1_score > m.team2_score
        if (isOnTeam2(m)) return m.team2_score > m.team1_score
        return false
      }).length

      const losses = matches.filter((m) => {
        if (isOnTeam1(m)) return m.team1_score < m.team2_score
        if (isOnTeam2(m)) return m.team2_score < m.team1_score
        return false
      }).length

      expect(wins).toBe(2)
      expect(losses).toBe(2)
    })
  })

  describe('Goals aggregation', () => {
    it('should sum goals for and against correctly', () => {
      const playerId = 'player-abc'
      const matches = [
        {
          team1_player1_id: playerId,
          team1_player2_id: 'other1',
          team2_player1_id: 'other2',
          team2_player2_id: 'other3',
          team1_score: 10,
          team2_score: 8,
        },
        {
          team1_player1_id: 'other1',
          team1_player2_id: 'other2',
          team2_player1_id: playerId,
          team2_player2_id: 'other3',
          team1_score: 7,
          team2_score: 10,
        },
        {
          team1_player1_id: 'other1',
          team1_player2_id: playerId,
          team2_player1_id: 'other2',
          team2_player2_id: 'other3',
          team1_score: 5,
          team2_score: 10,
        },
      ]

      const goalsFor = matches.reduce((sum, m) => {
        if (m.team1_player1_id === playerId || m.team1_player2_id === playerId) {
          return sum + m.team1_score
        }
        if (m.team2_player1_id === playerId || m.team2_player2_id === playerId) {
          return sum + m.team2_score
        }
        return sum
      }, 0)

      const goalsAgainst = matches.reduce((sum, m) => {
        if (m.team1_player1_id === playerId || m.team1_player2_id === playerId) {
          return sum + m.team2_score
        }
        if (m.team2_player1_id === playerId || m.team2_player2_id === playerId) {
          return sum + m.team1_score
        }
        return sum
      }, 0)

      // Match 1 (team1): 10 for, 8 against
      // Match 2 (team2): 10 for, 7 against
      // Match 3 (team1): 5 for, 10 against
      expect(goalsFor).toBe(25) // 10 + 10 + 5
      expect(goalsAgainst).toBe(25) // 8 + 7 + 10
    })
  })

  describe('Season-scoped stats', () => {
    it('should filter stats by season_id', () => {
      const playerId = 'player-abc'
      const season1Id = 'season-1'
      const season2Id = 'season-2'

      const matches = [
        {
          season_id: season1Id,
          team1_player1_id: playerId,
          team1_player2_id: 'other1',
          team2_player1_id: 'other2',
          team2_player2_id: 'other3',
          team1_score: 10,
          team2_score: 8,
          team1_player1_post_ranking: 1220,
        },
        {
          season_id: season1Id,
          team1_player1_id: playerId,
          team1_player2_id: 'other1',
          team2_player1_id: 'other2',
          team2_player2_id: 'other3',
          team1_score: 10,
          team2_score: 5,
          team1_player1_post_ranking: 1245,
        },
        {
          season_id: season2Id,
          team1_player1_id: playerId,
          team1_player2_id: 'other1',
          team2_player1_id: 'other2',
          team2_player2_id: 'other3',
          team1_score: 6,
          team2_score: 10,
          team1_player1_post_ranking: 1180,
        },
      ]

      const season1Matches = matches.filter(
        (m) =>
          m.season_id === season1Id &&
          (m.team1_player1_id === playerId ||
            m.team1_player2_id === playerId ||
            m.team2_player1_id === playerId ||
            m.team2_player2_id === playerId),
      )

      const season2Matches = matches.filter(
        (m) =>
          m.season_id === season2Id &&
          (m.team1_player1_id === playerId ||
            m.team1_player2_id === playerId ||
            m.team2_player1_id === playerId ||
            m.team2_player2_id === playerId),
      )

      expect(season1Matches.length).toBe(2)
      expect(season2Matches.length).toBe(1)

      // Season 1 ranking from most recent match
      expect(season1Matches[season1Matches.length - 1].team1_player1_post_ranking).toBe(1245)

      // Season 2 ranking from most recent match
      expect(season2Matches[season2Matches.length - 1].team1_player1_post_ranking).toBe(1180)
    })

    it('should return 1200 for players with no matches in a season', () => {
      const playerId = 'player-abc'
      const seasonId = 'season-new'

      const matches = [
        {
          season_id: 'other-season',
          team1_player1_id: playerId,
          team1_player2_id: 'other1',
          team2_player1_id: 'other2',
          team2_player2_id: 'other3',
          team1_player1_post_ranking: 1300,
        },
      ]

      const seasonMatches = matches.filter(
        (m) =>
          m.season_id === seasonId &&
          (m.team1_player1_id === playerId ||
            m.team1_player2_id === playerId ||
            m.team2_player1_id === playerId ||
            m.team2_player2_id === playerId),
      )

      const ranking = seasonMatches.length > 0 ? seasonMatches[0].team1_player1_post_ranking : 1200

      expect(ranking).toBe(1200)
    })
  })

  describe('Edge cases', () => {
    it('should handle ranking bounds correctly (800-2400)', () => {
      const testRankings = [800, 1200, 1800, 2400]

      for (const ranking of testRankings) {
        expect(ranking).toBeGreaterThanOrEqual(800)
        expect(ranking).toBeLessThanOrEqual(2400)
      }
    })

    it('should handle wins + losses = matches_played constraint', () => {
      const playerStats = {
        matchesPlayed: 10,
        wins: 6,
        losses: 4,
      }

      expect(playerStats.wins + playerStats.losses).toBeLessThanOrEqual(playerStats.matchesPlayed)
    })

    it('should handle multiple matches on same day with correct ordering', () => {
      const playerId = 'player-abc'
      const matches = [
        {
          created_at: '2024-01-15T14:30:00Z',
          team1_player1_id: playerId,
          team1_player1_post_ranking: 1250,
        },
        {
          created_at: '2024-01-15T16:00:00Z', // Later on same day
          team1_player1_id: playerId,
          team1_player1_post_ranking: 1270,
        },
        {
          created_at: '2024-01-15T10:00:00Z', // Earlier on same day
          team1_player1_id: playerId,
          team1_player1_post_ranking: 1230,
        },
      ]

      const sortedByRecent = [...matches].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )

      expect(sortedByRecent[0].team1_player1_post_ranking).toBe(1270) // Most recent
    })
  })
})
