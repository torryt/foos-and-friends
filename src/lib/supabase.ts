/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Validate Supabase environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '❌ Supabase environment variables are missing!\n\n' +
      'Please create a .env.local file with:\n' +
      '  VITE_SUPABASE_URL=https://your-project.supabase.co\n' +
      '  VITE_SUPABASE_ANON_KEY=your-anon-key-here\n\n' +
      'Get these values from: https://app.supabase.com/project/_/settings/api',
  )
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})

// Database type definitions
export interface Database {
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

// Export typed client
export type SupabaseClient = typeof supabase
