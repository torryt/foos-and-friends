// Types
export * from './types/index.ts'

// Database interfaces and implementations
export * from './lib/database.ts'
export * from './lib/supabase.ts'
export * from './lib/supabase-database.ts'
export { cn, scrollToTop } from './lib/utils.ts'

// Services
export { GroupService, createGroupService } from './services/groupService.ts'
export { PlayersService, createPlayersService } from './services/playersService.ts'
export { MatchesService, createMatchesService } from './services/matchesService.ts'
export { SeasonsService, createSeasonsService } from './services/seasonsService.ts'
export {
  PlayerSeasonStatsService,
  createPlayerSeasonStatsService,
} from './services/playerSeasonStatsService.ts'
export {
  SavedMatchupsService,
  savedMatchupsService,
  type SavedMatchup,
} from './services/savedMatchupsService.ts'

// Utils
export * from './utils/matchmaking.ts'
export * from './utils/streakCalculations.ts'

// Constants
export { AVAILABLE_AVATARS, getRandomAvatar } from './constants/avatars.ts'

// Test utilities
export { FakeDatabase } from './test/fake-database.ts'
export {
  createTestDatabase,
  createSeededTestDatabase,
  createStandardTestScenario,
  createTestServices,
  type TestServices,
} from './test/test-database.ts'
