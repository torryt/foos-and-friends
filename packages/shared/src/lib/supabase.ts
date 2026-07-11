import { createClient, type SupabaseClient as SupabaseClientType } from '@supabase/supabase-js'

let supabaseInstance: SupabaseClientType | null = null
let mockMode = false

export interface InitSupabaseOptions {
  // Mock mode: the client is created with dummy credentials and never contacted.
  // Auth methods (useAuth) become trivial success stubs.
  mockMode?: boolean
}

// Initialize Supabase client with environment variables
// This function should be called once at app startup
export function initSupabase(
  url: string,
  anonKey: string,
  options?: InitSupabaseOptions,
): SupabaseClientType {
  mockMode = options?.mockMode ?? false

  if (!url || !anonKey) {
    console.error(
      '❌ Supabase environment variables are missing!\n\n' +
        'Please create a .env.local file with:\n' +
        '  VITE_SUPABASE_URL=https://your-project.supabase.co\n' +
        '  VITE_SUPABASE_ANON_KEY=your-anon-key-here\n\n' +
        'Get these values from: https://app.supabase.com/project/_/settings/api',
    )
  }

  supabaseInstance = createClient(url, anonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  })

  return supabaseInstance
}

// Get the initialized Supabase client
export function getSupabase(): SupabaseClientType {
  if (!supabaseInstance) {
    throw new Error(
      'Supabase client not initialized. Call initSupabase() first with your credentials.',
    )
  }
  return supabaseInstance
}

// Whether the app runs against a mock backend (see InitSupabaseOptions.mockMode)
export function isSupabaseMockMode(): boolean {
  return mockMode
}

// Export typed client type
export type SupabaseClient = SupabaseClientType
