/// <reference types="vite/client" />
import {
  createGroupService,
  createMatchesService,
  createPlayerSeasonStatsService,
  createPlayersService,
  createSeasonsService,
  createSupabaseDatabase,
  initSupabase,
} from '@foos/shared'

// Initialize Supabase with environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = initSupabase(supabaseUrl, supabaseAnonKey)

// Create database instance
export const database = createSupabaseDatabase()

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
