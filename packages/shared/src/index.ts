// Auth
export {
  type AuthResult,
  MIN_PASSWORD_LENGTH,
  mapAuthError,
  type SignUpResult,
} from './auth/authApi.ts'
export { AuthForm } from './auth/AuthForm.tsx'
export { PasswordInput } from './auth/PasswordInput.tsx'
export { ResetPasswordPage } from './auth/ResetPasswordPage.tsx'
export { useAuth } from './auth/useAuth.ts'
export { UserSettingsPage } from './auth/UserSettingsPage.tsx'

// Constants
export { AVAILABLE_AVATARS, getRandomAvatar } from './constants/avatars.ts'

// Database interfaces and implementations
export * from './lib/database.ts'
export * from './lib/supabase.ts'
export * from './lib/supabase-database.ts'
export { useClickOutside } from './lib/useClickOutside.ts'
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
  type MatchupMode,
  type SavedMatchup,
  SavedMatchupsService,
  savedMatchupsService,
} from './services/savedMatchupsService.ts'
export { createSeasonsService, SeasonsService } from './services/seasonsService.ts'
export { createTrophiesService, TrophiesService } from './services/trophiesService.ts'
// Mock mode (local development without Supabase)
export {
  buildMockSeed,
  MOCK_GROUP_ID,
  MOCK_SEASON_ID,
  MOCK_USER,
  MOCK_USER_ID,
  type MockSeed,
  type MockSeedOptions,
} from './mock/mock-data.ts'
export { createMockDatabase, MockDatabase } from './mock/mock-database.ts'
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
export { type ThemeMode, type ThemeName, ThemeProvider, useTheme } from './theme/ThemeContext.tsx'
export { AppearanceSelector } from './theme/AppearanceSelector.tsx'
export { useChartTheme } from './theme/useChartTheme.ts'
export * from './types/index.ts'
// Utils
export * from './utils/badges.ts'
export * from './utils/elo.ts'
export * from './utils/matchmaking.ts'
export * from './utils/streakCalculations.ts'
