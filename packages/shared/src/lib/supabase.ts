import { createClient, type SupabaseClient as SupabaseClientType } from '@supabase/supabase-js'

let supabaseInstance: SupabaseClientType | null = null

// Initialize Supabase client with environment variables
// This function should be called once at app startup
export function initSupabase(url: string, anonKey: string): SupabaseClientType {
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

// Database schema type definitions for Supabase
export interface DatabaseSchema {
  public: {
    Tables: {
      friend_groups: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          name: string
          description: string | null
          invite_code: string
          owner_id: string
          created_by: string
          is_active: boolean
          max_members: number
          sport_type: string
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          name: string
          description?: string | null
          invite_code?: string
          owner_id: string
          created_by: string
          is_active?: boolean
          max_members?: number
          sport_type?: string
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          name?: string
          description?: string | null
          invite_code?: string
          owner_id?: string
          created_by?: string
          is_active?: boolean
          max_members?: number
          sport_type?: string
        }
      }
      group_memberships: {
        Row: {
          id: string
          created_at: string
          group_id: string
          user_id: string
          role: 'owner' | 'admin' | 'member'
          is_active: boolean
          invited_by: string | null
          joined_at: string
        }
        Insert: {
          id?: string
          created_at?: string
          group_id: string
          user_id: string
          role?: 'owner' | 'admin' | 'member'
          is_active?: boolean
          invited_by?: string | null
          joined_at?: string
        }
        Update: {
          id?: string
          created_at?: string
          group_id?: string
          user_id?: string
          role?: 'owner' | 'admin' | 'member'
          is_active?: boolean
          invited_by?: string | null
          joined_at?: string
        }
      }
      players: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          name: string
          ranking: number
          matches_played: number
          wins: number
          losses: number
          avatar: string
          department: string
          group_id: string
          created_by: string
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          name: string
          ranking?: number
          matches_played?: number
          wins?: number
          losses?: number
          avatar?: string
          department?: string
          group_id: string
          created_by: string
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          name?: string
          ranking?: number
          matches_played?: number
          wins?: number
          losses?: number
          avatar?: string
          department?: string
          group_id?: string
          created_by?: string
        }
      }
      matches: {
        Row: {
          id: string
          created_at: string
          group_id: string
          team1_player1_id: string
          team1_player2_id: string
          team2_player1_id: string
          team2_player2_id: string
          team1_score: number
          team2_score: number
          match_date: string
          match_time: string
          recorded_by: string
        }
        Insert: {
          id?: string
          created_at?: string
          group_id: string
          team1_player1_id: string
          team1_player2_id: string
          team2_player1_id: string
          team2_player2_id: string
          team1_score: number
          team2_score: number
          match_date?: string
          match_time?: string
          recorded_by: string
        }
        Update: {
          id?: string
          created_at?: string
          group_id?: string
          team1_player1_id?: string
          team1_player2_id?: string
          team2_player1_id?: string
          team2_player2_id?: string
          team1_score?: number
          team2_score?: number
          match_date?: string
          match_time?: string
          recorded_by?: string
        }
      }
    }
    Functions: {
      create_friend_group: {
        Args: {
          p_name: string
          p_description?: string
        }
        Returns: {
          success: boolean
          group_id: string
          invite_code: string
          name: string
        }
      }
      join_group_by_invite_code: {
        Args: {
          p_invite_code: string
          p_user_id?: string
        }
        Returns: {
          success: boolean
          group_id?: string
          group_name?: string
          error?: string
        }
      }
    }
  }
}

// Export typed client type
export type SupabaseClient = SupabaseClientType
