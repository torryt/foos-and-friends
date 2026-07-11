/// <reference types="vite/client" />
import {
  createGroupService,
  createMatchesService,
  createMockDatabase,
  createPlayerSeasonStatsService,
  createPlayersService,
  createSeasonsService,
  createSupabaseDatabase,
  createTrophiesService,
  initSupabase,
} from '@foos/shared'

// Mock mode: run the app against an in-memory database, no Supabase needed.
// Enable with `pnpm dev:foos:mock` (sets VITE_MOCK_DATA=true).
export const isMockMode = import.meta.env.VITE_MOCK_DATA === 'true'

// Initialize Supabase with environment variables.
// In mock mode the client is created with dummy credentials and never contacted.
const supabaseUrl = isMockMode ? 'https://mock.invalid' : import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = isMockMode ? 'mock-anon-key' : import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = initSupabase(supabaseUrl, supabaseAnonKey, { mockMode: isMockMode })

// Create database instance
export const database = isMockMode ? createMockDatabase() : createSupabaseDatabase()

// Create service instances
export const groupService = createGroupService(database)
export const playersService = createPlayersService(database)
export const seasonsService = createSeasonsService(database)
export const playerSeasonStatsService = createPlayerSeasonStatsService(database)
export const matchesService = createMatchesService(
  database,
  playersService,
  playerSeasonStatsService,
)
export const trophiesService = createTrophiesService(database)
