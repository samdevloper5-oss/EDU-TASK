export type TaskCategory =
  | 'Design'
  | 'Coding'
  | 'Research'
  | 'Writing'
  | 'Data Entry'
  | 'Translation'
  | 'Media'
  | 'Academic Help'
  | 'Other'

export type TaskStatus =
  | 'open'
  | 'hired'
  | 'in_progress'
  | 'under_review'
  | 'completed'
  | 'cancelled'
  | 'disputed'

export type TransactionType =
  | 'deposit'
  | 'withdrawal'
  | 'escrow_lock'
  | 'escrow_release'
  | 'earning'
  | 'platform_fee'
  | 'refund'
  | 'referral_bonus'

export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'reversed'

export type NotificationType =
  | 'task_applied'
  | 'task_hired'
  | 'task_submitted'
  | 'task_accepted'
  | 'task_revision'
  | 'task_disputed'
  | 'task_resolved'
  | 'escrow_locked'
  | 'escrow_released'
  | 'review_received'
  | 'message'
  | 'id_verified'
  | 'id_rejected'
  | 'leaderboard'
  | 'system'

export interface User {
  id: string
  email: string
  email_verified: boolean
  profile_complete: boolean
  full_name: string
  phone: string | null
  university_name: string
  department: string
  student_id_text: string
  student_id_image_url?: string | null
  student_id_verified: boolean
  profile_photo_url?: string | null
  bio: string
  location: string
  skills: string[]
  trust_score: number
  completed_tasks: number
  total_reviews: number
  average_rating?: number | null
  wallet_balance: number
  escrow_balance: number
  total_earned: number
  referral_code: string | null
  referred_by?: string | null
  bkash_number?: string | null
  nagad_number?: string | null
  is_banned: boolean
  is_admin: boolean
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  poster_id: string
  poster?: User
  title: string
  description: string
  category: TaskCategory
  task_mode: 'online' | 'offline'
  task_type: 'paid' | 'volunteer'
  budget: number
  deadline: string
  required_skills: string[]
  location?: string | null
  status: TaskStatus
  hired_worker_id?: string | null
  hired_worker?: User
  escrow_deposited: boolean
  revisions_used: number
  applicant_count: number
  submitted_at?: string | null
  completed_at?: string | null
  created_at: string
  updated_at: string
}

export interface Application {
  id: string
  task_id: string
  task?: Task
  worker_id: string
  worker?: User
  proposal: string
  estimated_hours?: number | null
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn'
  created_at: string
}

export interface Transaction {
  id: string
  user_id: string
  type: TransactionType
  amount: number
  fee: number
  net_amount: number
  method?: 'bkash' | 'nagad' | 'demo' | 'wallet' | null
  status: TransactionStatus
  reference_id?: string | null
  counterparty_id?: string | null
  external_ref?: string | null
  notes?: string | null
  created_at: string
}

export interface Message {
  id: string
  task_id: string
  sender_id: string | null
  sender?: User
  content: string
  message_type?: 'text' | 'file' | 'system'
  file_path?: string | null
  file_url?: string | null
  file_name?: string | null
  is_system_message: boolean
  flagged: boolean
  created_at: string
}

export interface Review {
  id: string
  task_id: string
  reviewer_id: string
  reviewed_id: string
  rating: number
  comment: string
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  message: string
  is_read: boolean
  link?: string | null
  reference_id?: string | null
  actor_id?: string | null
  created_at: string
}

export type { Database } from './database'
