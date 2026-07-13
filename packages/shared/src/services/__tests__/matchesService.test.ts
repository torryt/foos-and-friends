import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Database } from '../../lib/database.ts'
import type { Match, MatchType, Player, PlayerSeasonStats } from '../../types/index.ts'
import { calculateNewRanking, DEFAULT_RANKING } from '../../utils/elo.ts'
import { createMatchesService, type MatchesService } from '../matchesService.ts'

const GROUP_ID = 'group-1'
const SEASON_ID = 'season-1'
const RECORDED_BY = 'user-1'

// Four distinct rankings, and team averages that differ from each other, so a
// mis-ordered ranking lookup changes the expected result instead of cancelling out.
const RANKINGS: Record<string, number> = {
  t1p1: 1300,
  t1p2: 1200, // team 1 average: 1250
  t2p1: 1000,
  t2p2: 1100, // team 2 average: 1050
}
const TEAM1_AVG = 1250
const TEAM2_AVG = 1050

const player = (id: string, groupId = GROUP_ID): Player => ({ id, groupId }) as Player

describe('MatchesService.addMatch', () => {
  let recordMatch: ReturnType<typeof vi.fn>
  let service: MatchesService
  // Players with no matches this season are absent from the stats view
  let seasonRankings: Record<string, number>
  let groupOf: Record<string, string>

  const rankingDataOf = () => recordMatch.mock.calls[0][10]

  beforeEach(() => {
    seasonRankings = { ...RANKINGS }
    groupOf = { t1p1: GROUP_ID, t1p2: GROUP_ID, t2p1: GROUP_ID, t2p2: GROUP_ID }

    recordMatch = vi.fn(async () => ({ data: {} as Match, error: null }))

    const playersService = {
      getPlayerById: async (id: string) => ({ data: player(id, groupOf[id]) }),
    }
    const playerSeasonStatsService = {
      getPlayerSeasonStats: async (playerId: string) => ({
        data:
          playerId in seasonRankings
            ? ({ ranking: seasonRankings[playerId] } as PlayerSeasonStats)
            : null,
      }),
    }

    service = createMatchesService(
      { recordMatch } as unknown as Database,
      playersService,
      playerSeasonStatsService,
    )
  })

  const add2v2 = (score1: number, score2: number) =>
    service.addMatch(
      GROUP_ID,
      SEASON_ID,
      '2v2' as MatchType,
      't1p1',
      't1p2',
      't2p1',
      't2p2',
      score1,
      score2,
      RECORDED_BY,
    )

  const add1v1 = (score1: number, score2: number) =>
    service.addMatch(
      GROUP_ID,
      SEASON_ID,
      '1v1' as MatchType,
      't1p1',
      null,
      't2p1',
      null,
      score1,
      score2,
      RECORDED_BY,
    )

  describe('2v2', () => {
    it('rates every player against the opposing team average of pre-match rankings', async () => {
      await add2v2(10, 5)

      expect(rankingDataOf()).toEqual({
        team1Player1PreRanking: 1300,
        team1Player1PostRanking: calculateNewRanking(1300, TEAM2_AVG, 'win'),
        team1Player2PreRanking: 1200,
        team1Player2PostRanking: calculateNewRanking(1200, TEAM2_AVG, 'win'),
        team2Player1PreRanking: 1000,
        team2Player1PostRanking: calculateNewRanking(1000, TEAM1_AVG, 'loss'),
        team2Player2PreRanking: 1100,
        team2Player2PostRanking: calculateNewRanking(1100, TEAM1_AVG, 'loss'),
      })
    })

    it('assigns each pre-ranking to the right player', async () => {
      // addMatch builds its player list interleaved as [t1p1, t2p1, t1p2, t2p2]
      // and destructures the ranking lookups back out in that same order. Reading
      // them team-major would silently swap t2p1 and t1p2.
      await add2v2(10, 5)

      const data = rankingDataOf()
      expect(data.team1Player1PreRanking).toBe(RANKINGS.t1p1)
      expect(data.team1Player2PreRanking).toBe(RANKINGS.t1p2)
      expect(data.team2Player1PreRanking).toBe(RANKINGS.t2p1)
      expect(data.team2Player2PreRanking).toBe(RANKINGS.t2p2)
    })

    it('gives the winning side a gain and the losing side a loss', async () => {
      await add2v2(5, 10)

      const data = rankingDataOf()
      expect(data.team1Player1PostRanking).toBeLessThan(data.team1Player1PreRanking)
      expect(data.team2Player1PostRanking).toBeGreaterThan(data.team2Player1PreRanking)
    })
  })

  describe('1v1', () => {
    it('rates the two players head to head and leaves the partner columns unset', async () => {
      await add1v1(10, 5)

      expect(rankingDataOf()).toEqual({
        team1Player1PreRanking: 1300,
        team1Player1PostRanking: calculateNewRanking(1300, 1000, 'win'),
        team2Player1PreRanking: 1000,
        team2Player1PostRanking: calculateNewRanking(1000, 1300, 'loss'),
      })
    })
  })

  describe('draws', () => {
    it('scores equal scores as a draw for both sides (chess remis)', async () => {
      await add1v1(1, 1)

      expect(rankingDataOf()).toEqual({
        team1Player1PreRanking: 1300,
        team1Player1PostRanking: calculateNewRanking(1300, 1000, 'draw'),
        team2Player1PreRanking: 1000,
        team2Player1PostRanking: calculateNewRanking(1000, 1300, 'draw'),
      })
    })

    it('moves the favourite down and the underdog up on a draw', async () => {
      await add1v1(1, 1)

      const data = rankingDataOf()
      expect(data.team1Player1PostRanking).toBeLessThan(1300)
      expect(data.team2Player1PostRanking).toBeGreaterThan(1000)
    })
  })

  describe('players new to the season', () => {
    it('starts them at the default ranking', async () => {
      delete seasonRankings.t2p1

      await add1v1(10, 5)

      const data = rankingDataOf()
      expect(data.team2Player1PreRanking).toBe(DEFAULT_RANKING)
      expect(data.team1Player1PostRanking).toBe(
        calculateNewRanking(1300, DEFAULT_RANKING, 'win'),
      )
    })
  })

  describe('validation', () => {
    const expectRejected = async (
      result: { error?: string },
      message: string,
    ) => {
      expect(result.error).toBe(message)
      expect(recordMatch).not.toHaveBeenCalled()
    }

    it('rejects a 1v1 that carries partners', async () => {
      const result = await service.addMatch(
        GROUP_ID, SEASON_ID, '1v1' as MatchType,
        't1p1', 't1p2', 't2p1', 't2p2', 10, 5, RECORDED_BY,
      )
      await expectRejected(result, '1v1 matches must have exactly 2 players')
    })

    it('rejects a 2v2 missing a partner', async () => {
      const result = await service.addMatch(
        GROUP_ID, SEASON_ID, '2v2' as MatchType,
        't1p1', 't1p2', 't2p1', null, 10, 5, RECORDED_BY,
      )
      await expectRejected(result, '2v2 matches must have exactly 4 players')
    })

    it('rejects a player appearing twice', async () => {
      const result = await service.addMatch(
        GROUP_ID, SEASON_ID, '2v2' as MatchType,
        't1p1', 't1p2', 't1p1', 't2p2', 10, 5, RECORDED_BY,
      )
      await expectRejected(result, 'All players must be different')
    })

    it('rejects a player from another group', async () => {
      groupOf.t2p2 = 'other-group'

      const result = await add2v2(10, 5)
      await expectRejected(result, 'All players must be in the same group')
    })
  })
})
