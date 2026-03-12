// Types

// Constants
export { AVAILABLE_AVATARS, getRandomAvatar } from './constants/avatars.ts'

// Database interfaces and implementations
export * from './lib/database.ts'
export * from './lib/supabase.ts'
export * from './lib/supabase-database.ts'
export { cn, scrollToTop } from './lib/utils.ts'

// Services
export { createGroupService, GroupService } from './services/groupService.ts'
export { createMatchesService, MatchesService } from './services/matchesService.ts'
export {
  createPlayerSeasonStatsService,
  PlayerSeasonStatsService,
} from './services/playerSeasonStatsService.ts'
export { createPlayersService, PlayersService } from './services/playersService.ts'
export {
  type SavedMatchup,
  SavedMatchupsService,
  savedMatchupsService,
} from './services/savedMatchupsService.ts'
export { createSeasonsService, SeasonsService } from './services/seasonsService.ts'
// Test utilities
export { FakeDatabase } from './test/fake-database.ts'
export {
  createSeededTestDatabase,
  createStandardTestScenario,
  createTestDatabase,
  createTestServices,
  type TestServices,
} from './test/test-database.ts'
// Theme
export { type ThemeName, ThemeProvider, useTheme } from './theme/ThemeContext.tsx'
export { ThemePicker } from './theme/ThemePicker.tsx'
export { useChartTheme } from './theme/useChartTheme.ts'
export * from './types/index.ts'
// Utils
export * from './utils/matchmaking.ts'
export * from './utils/streakCalculations.ts'
