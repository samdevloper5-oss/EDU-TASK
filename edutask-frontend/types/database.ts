export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

import type {
  NotificationType,
  TaskCategory,
  TaskStatus,
  TransactionType,
} from './index'

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string
          phone: string | null
          university_name: string
          department: string
          student_id_text: string
          student_id_image_url: string | null
          student_id_verified: boolean
          profile_photo_url: string | null
          bio: string
          location: string
          skills: string[]
          wallet_balance: number
          escrow_balance: number
          total_earned: number
          trust_score: number
          completed_tasks: number
          total_reviews: number
          average_rating: number | null
          response_rate: number
          referral_code: string | null
          referred_by: string | null
          bkash_number: string | null
          nagad_number: string | null
          email_verified: boolean
          profile_complete: boolean
          is_banned: boolean
          is_admin: boolean
          ban_reason: string | null
          last_active_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string
          phone?: string | null
          university_name?: string
          department?: string
          student_id_text?: string
          student_id_image_url?: string | null
          student_id_verified?: boolean
          profile_photo_url?: string | null
          bio?: string
          location?: string
          skills?: string[]
          wallet_balance?: number
          escrow_balance?: number
          total_earned?: number
          trust_score?: number
          completed_tasks?: number
          total_reviews?: number
          average_rating?: number | null
          response_rate?: number
          referral_code?: string | null
          referred_by?: string | null
          bkash_number?: string | null
          nagad_number?: string | null
          email_verified?: boolean
          profile_complete?: boolean
          is_banned?: boolean
          is_admin?: boolean
          ban_reason?: string | null
          last_active_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['users']['Insert']>
        Relationships: []
      }
      tasks: {
        Row: {
          id: string
          poster_id: string
          title: string
          description: string
          category: TaskCategory
          task_mode: 'online' | 'offline'
          task_type: 'paid' | 'volunteer'
          budget: number
          deadline: string
          required_skills: string[]
          location: string | null
          attachment_urls: string[]
          status: TaskStatus
          hired_worker_id: string | null
          escrow_deposited: boolean
          revisions_used: number
          applicant_count: number
          submitted_at: string | null
          completed_at: string | null
          auto_release_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          poster_id: string
          title: string
          description: string
          category: TaskCategory
          task_mode?: 'online' | 'offline'
          task_type?: 'paid' | 'volunteer'
          budget: number
          deadline: string
          required_skills?: string[]
          location?: string | null
          attachment_urls?: string[]
          status?: TaskStatus
          hired_worker_id?: string | null
          escrow_deposited?: boolean
          revisions_used?: number
          applicant_count?: number
          submitted_at?: string | null
          completed_at?: string | null
          auto_release_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['tasks']['Insert']>
        Relationships: []
      }
      applications: {
        Row: {
          id: string
          task_id: string
          worker_id: string
          proposal: string
          estimated_hours: number | null
          status: 'pending' | 'accepted' | 'rejected' | 'withdrawn'
          created_at: string
        }
        Insert: {
          id?: string
          task_id: string
          worker_id: string
          proposal: string
          estimated_hours?: number | null
          status?: 'pending' | 'accepted' | 'rejected' | 'withdrawn'
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['applications']['Insert']>
        Relationships: []
      }
      messages: {
        Row: {
          id: string
          task_id: string
          sender_id: string | null
          content: string
          message_type: 'text' | 'file' | 'system'
          file_path: string | null
          file_url: string | null
          file_name: string | null
          file_size: number | null
          is_system_message: boolean
          read_by: string[]
          flagged: boolean
          created_at: string
        }
        Insert: {
          id?: string
          task_id: string
          sender_id?: string | null
          content: string
          message_type?: 'text' | 'file' | 'system'
          file_path?: string | null
          file_url?: string | null
          file_name?: string | null
          file_size?: number | null
          is_system_message?: boolean
          read_by?: string[]
          flagged?: boolean
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['messages']['Insert']>
        Relationships: []
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          type: TransactionType
          amount: number
          fee: number
          net_amount: number
          method: 'bkash' | 'nagad' | 'demo' | 'wallet' | null
          status: 'pending' | 'completed' | 'failed' | 'reversed'
          reference_id: string | null
          counterparty_id: string | null
          external_ref: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: TransactionType
          amount: number
          fee?: number
          net_amount: number
          method?: 'bkash' | 'nagad' | 'demo' | 'wallet' | null
          status?: 'pending' | 'completed' | 'failed' | 'reversed'
          reference_id?: string | null
          counterparty_id?: string | null
          external_ref?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['transactions']['Insert']>
        Relationships: []
      }
      reviews: {
        Row: {
          id: string
          task_id: string
          reviewer_id: string
          reviewed_id: string
          rating: number
          comment: string
          created_at: string
        }
        Insert: {
          id?: string
          task_id: string
          reviewer_id: string
          reviewed_id: string
          rating: number
          comment: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['reviews']['Insert']>
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: NotificationType
          title: string
          message: string
          is_read: boolean
          link: string | null
          reference_id: string | null
          actor_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type?: NotificationType
          title: string
          message: string
          is_read?: boolean
          link?: string | null
          reference_id?: string | null
          actor_id?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>
        Relationships: []
      }
      platform_earnings: {
        Row: {
          id: string
          task_id: string
          amount: number
          task_budget: number
          fee_rate: number
          created_at: string
        }
        Insert: {
          id?: string
          task_id: string
          amount: number
          task_budget: number
          fee_rate?: number
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['platform_earnings']['Insert']>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
